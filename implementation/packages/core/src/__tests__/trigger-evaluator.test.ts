import { describe, it, expect } from 'vitest';
import { TriggerEvaluator, TRIGGER_THRESHOLDS } from '../trigger-evaluator.js';
import type { Context, EnforcementEvent, DismissalEvent } from '../types.js';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function ctx(overrides: Partial<Context> = {}): Context {
  return {
    id: 'ctx-a',
    version: 1,
    title: 'Rule A',
    description: 'A rule.',
    source: { type: 'organization', uri: 'https://example.com' },
    authority: { source: { type: 'organization', id: 'team', name: 'Team' }, level: 2 },
    lifecycle: 'active',
    governance: { classification: 'local-guideline', approval_required: false },
    enforcement: { mode: 'warn' },
    ...overrides,
  };
}

function events(
  contextId: string,
  specs: { status: EnforcementEvent['status']; days: number; actor?: 'human' | 'ai-agent' }[]
): EnforcementEvent[] {
  return specs.map((s, i) => ({
    event_id: `evt-${i}`,
    timestamp: daysAgo(s.days),
    context_id: contextId,
    context_version: 1,
    artifact_path: `src/f${i}.ts`,
    status: s.status,
    enforcement_action: 'none',
    actor: { type: s.actor ?? 'human', id: 'dev' },
    verifier: { type: 'regex-pattern', version: '0.2.0', duration_ms: 0 },
  }));
}

function repeat(
  status: EnforcementEvent['status'],
  count: number,
  actor?: 'human' | 'ai-agent'
): { status: EnforcementEvent['status']; days: number; actor?: 'human' | 'ai-agent' }[] {
  return Array.from({ length: count }, (_, i) => ({ status, days: i + 1, actor }));
}

describe('TriggerEvaluator', () => {
  const evaluator = new TriggerEvaluator();

  describe('STALE_NO_VIOLATION', () => {
    it('fires when an active context has recent checks but no violations', () => {
      const result = evaluator.evaluate([ctx()], events('ctx-a', repeat('compliant', 12)));
      const rec = result.recommendations.find(r => r.trigger === 'STALE_NO_VIOLATION');
      expect(rec).toBeDefined();
      expect(rec!.action).toBe('deprecate');
    });

    it('does not fire when a violation is present', () => {
      const result = evaluator.evaluate(
        [ctx()],
        events('ctx-a', [...repeat('compliant', 11), { status: 'violation', days: 2 }])
      );
      expect(result.recommendations.some(r => r.trigger === 'STALE_NO_VIOLATION')).toBe(false);
    });

    it('does not fire without any enforcement history', () => {
      const result = evaluator.evaluate([ctx()], []);
      expect(result.recommendations.some(r => r.trigger === 'STALE_NO_VIOLATION')).toBe(false);
    });

    it('ignores checks older than the stale window', () => {
      const old = TRIGGER_THRESHOLDS.STALE_DAYS + 10;
      const result = evaluator.evaluate([ctx()], events('ctx-a', [{ status: 'compliant', days: old }]));
      expect(result.recommendations.some(r => r.trigger === 'STALE_NO_VIOLATION')).toBe(false);
    });

    it('does not fire for a non-active context', () => {
      const result = evaluator.evaluate([ctx({ lifecycle: 'draft' })], events('ctx-a', repeat('compliant', 12)));
      expect(result.recommendations.some(r => r.trigger === 'STALE_NO_VIOLATION')).toBe(false);
    });

    it('raises confidence once enough events exist to trust the signal', () => {
      const thin = evaluator.evaluate([ctx()], events('ctx-a', repeat('compliant', 3)));
      const thick = evaluator.evaluate([ctx()], events('ctx-a', repeat('compliant', 15)));

      const thinRec = thin.recommendations.find(r => r.trigger === 'STALE_NO_VIOLATION')!;
      const thickRec = thick.recommendations.find(r => r.trigger === 'STALE_NO_VIOLATION')!;
      expect(thickRec.confidence).toBeGreaterThan(thinRec.confidence);
      expect(thinRec.confidence).toBeLessThan(TRIGGER_THRESHOLDS.CONFIDENCE_THRESHOLD);
    });
  });

  describe('HIGH_VIOLATION_RATE', () => {
    it('fires above the threshold', () => {
      const specs = [...repeat('violation', 4), ...repeat('compliant', 8)];
      const result = evaluator.evaluate([ctx()], events('ctx-a', specs));
      const rec = result.recommendations.find(r => r.trigger === 'HIGH_VIOLATION_RATE');
      expect(rec).toBeDefined();
      expect(rec!.action).toBe('refine-scope');
    });

    it('does not fire below the minimum event count', () => {
      const specs = [...repeat('violation', 3), ...repeat('compliant', 4)];
      const result = evaluator.evaluate([ctx()], events('ctx-a', specs));
      expect(result.recommendations.some(r => r.trigger === 'HIGH_VIOLATION_RATE')).toBe(false);
    });
  });

  describe('HIGH_FALSE_POSITIVE', () => {
    it('is dormant when no dismissal events exist', () => {
      const result = evaluator.evaluate([ctx()], events('ctx-a', repeat('violation', 12)));
      expect(result.recommendations.some(r => r.trigger === 'HIGH_FALSE_POSITIVE')).toBe(false);
      expect(result.dormant.map(d => d.trigger)).toContain('HIGH_FALSE_POSITIVE');
    });

    it('fires on a genuine dismissal ratio', () => {
      const dismissals: DismissalEvent[] = Array.from({ length: 5 }, (_, i) => ({
        event_id: `dis-${i}`,
        timestamp: daysAgo(i + 1),
        context_id: 'ctx-a',
        artifact_path: `src/f${i}.ts`,
        actor: { type: 'human', id: 'dev' },
      }));

      const result = evaluator.evaluate([ctx()], events('ctx-a', repeat('violation', 12)), dismissals);
      const rec = result.recommendations.find(r => r.trigger === 'HIGH_FALSE_POSITIVE');

      expect(rec).toBeDefined();
      // 5 dismissals / 12 violations = 0.42, well above the 0.2 threshold.
      expect(rec!.description).toMatch(/42%/);
      expect(result.dormant).toHaveLength(0);
    });

    it('measures dismissals against violations, not against all evaluations', () => {
      // 10 violations, 20 compliant. One dismissal per 10 violations = 10%,
      // below threshold. A naive denominator of 30 would also be below, so use
      // a ratio that only the correct denominator classifies as firing.
      const specs = [...repeat('violation', 10), ...repeat('compliant', 20)];
      const dismissals: DismissalEvent[] = Array.from({ length: 4 }, (_, i) => ({
        event_id: `dis-${i}`,
        timestamp: daysAgo(1),
        context_id: 'ctx-a',
        artifact_path: 'src/f.ts',
        actor: { type: 'human', id: 'dev' },
      }));

      // 4/10 = 0.4 fires; 4/30 = 0.13 would not.
      const result = evaluator.evaluate([ctx()], events('ctx-a', specs), dismissals);
      expect(result.recommendations.some(r => r.trigger === 'HIGH_FALSE_POSITIVE')).toBe(true);
    });
  });

  describe('AI_DRIFT', () => {
    it('fires when the AI violation rate exceeds the ratio', () => {
      const specs = [
        ...repeat('violation', 9, 'ai-agent'),
        ...repeat('compliant', 1, 'ai-agent'),
        ...repeat('violation', 1, 'human'),
        ...repeat('compliant', 9, 'human'),
      ];
      const result = evaluator.evaluate([ctx()], events('ctx-a', specs));
      expect(result.recommendations.some(r => r.trigger === 'AI_DRIFT')).toBe(true);
    });

    it('does not fire below the minimum total event count', () => {
      const specs = [
        ...repeat('violation', 5, 'ai-agent'),
        ...repeat('compliant', 5, 'human'),
      ];
      const result = evaluator.evaluate([ctx()], events('ctx-a', specs));
      expect(result.recommendations.some(r => r.trigger === 'AI_DRIFT')).toBe(false);
    });

    it('does not fire when humans never violate, avoiding division by zero', () => {
      const specs = [
        ...repeat('violation', 10, 'ai-agent'),
        ...repeat('compliant', 10, 'human'),
      ];
      const result = evaluator.evaluate([ctx()], events('ctx-a', specs));
      expect(result.recommendations.some(r => r.trigger === 'AI_DRIFT')).toBe(false);
    });
  });

  describe('NEW_SOURCE_DETECTED', () => {
    it('fires for an unregistered source', () => {
      const result = evaluator.evaluate(
        [ctx({ source: { type: 'unknown', uri: 'https://example.com/reg' } })],
        []
      );
      const rec = result.recommendations.find(r => r.trigger === 'NEW_SOURCE_DETECTED');
      expect(rec).toBeDefined();
      expect(rec!.action).toBe('register-source');
    });

    it('does not fire without a uri', () => {
      const result = evaluator.evaluate([ctx({ source: { type: 'unknown' } })], []);
      expect(result.recommendations.some(r => r.trigger === 'NEW_SOURCE_DETECTED')).toBe(false);
    });
  });

  describe('INCREASING_VIOLATIONS', () => {
    it('fires when recent violations exceed earlier ones', () => {
      // Newest first after sorting: 3 violations then 3 compliant.
      const specs = [
        { status: 'violation' as const, days: 1 },
        { status: 'violation' as const, days: 2 },
        { status: 'violation' as const, days: 3 },
        { status: 'compliant' as const, days: 10 },
        { status: 'compliant' as const, days: 11 },
        { status: 'compliant' as const, days: 12 },
      ];
      const result = evaluator.evaluate([ctx()], events('ctx-a', specs));
      expect(result.recommendations.some(r => r.trigger === 'INCREASING_VIOLATIONS')).toBe(true);
    });
  });

  it('reports the number of distinct triggers fired', () => {
    const specs = [...repeat('violation', 4), ...repeat('compliant', 8)];
    const result = evaluator.evaluate(
      [ctx(), ctx({ id: 'ctx-b', source: { type: 'unknown', uri: 'https://x.example' } })],
      events('ctx-a', specs)
    );
    expect(result.triggers_fired).toBe(new Set(result.recommendations.map(r => r.trigger)).size);
  });

  it('never leaks an individual actor id into recommendations', () => {
    const specs = [...repeat('violation', 4), ...repeat('compliant', 8)];
    const result = evaluator.evaluate([ctx()], events('ctx-a', specs));
    expect(JSON.stringify(result)).not.toContain('"dev"');
  });
});
