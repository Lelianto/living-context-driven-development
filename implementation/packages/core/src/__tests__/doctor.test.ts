import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ContextDoctor } from '../doctor.js';
import { TriggerEvaluator } from '../trigger-evaluator.js';
import type { Context, EnforcementEvent } from '../types.js';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

/** A context that scores full marks on every health metric. */
function healthy(overrides: Partial<Context> = {}): Context {
  return {
    id: 'ctx-healthy',
    version: 1,
    created_at: daysAgo(5),
    updated_at: daysAgo(1),
    title: 'Healthy rule',
    description: 'Scores well on every metric.',
    source: { type: 'organization', uri: 'https://example.com' },
    authority: { source: { type: 'organization', id: 'team', name: 'Team' }, level: 2 },
    lifecycle: 'active',
    governance: { classification: 'local-standard', approval_required: false },
    effective_date: daysAgo(5),
    owner: 'team',
    tags: ['ops'],
    enforcement: { mode: 'warn' },
    ...overrides,
  };
}

describe('ContextDoctor', () => {
  let tmpDir: string;
  let doctor: ContextDoctor;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'lcdd-test-'));
    mkdirSync(join(tmpDir, '.lcdd', 'contexts'), { recursive: true });
    doctor = new ContextDoctor(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeEnforcements(events: EnforcementEvent[]): void {
    writeFileSync(
      join(tmpDir, '.lcdd', 'contexts', '.enforcements.log'),
      events.map(e => JSON.stringify(e)).join('\n') + '\n'
    );
  }

  function enforcement(status: EnforcementEvent['status'], days: number, i: number): EnforcementEvent {
    return {
      event_id: `evt-${i}`,
      timestamp: daysAgo(days),
      context_id: 'ctx-healthy',
      context_version: 1,
      artifact_path: `src/f${i}.ts`,
      status,
      enforcement_action: 'none',
      actor: { type: 'human', id: 'dev' },
      verifier: { type: 'regex-pattern', version: '0.2.0', duration_ms: 0 },
    };
  }

  describe('diagnose', () => {
    it('awards a full score and grade A to a healthy registry', () => {
      const report = doctor.diagnose([healthy()]);
      expect(report.overall_score).toBe(report.max_score);
      expect(report.grade).toBe('A');
      expect(report.total_contexts).toBe(1);
    });

    it('reports all eight metrics', () => {
      const report = doctor.diagnose([healthy()]);
      expect(report.metrics).toHaveLength(8);
      expect(report.metrics.map(m => m.name)).toEqual([
        'Stale Contexts',
        'Missing Owners',
        'Enforcement Conflicts',
        'Deprecation Backlog',
        'Draft Stagnation',
        'Authority Gaps',
        'Tag Hygiene',
        'Review Backlog',
      ]);
    });

    it('metric max scores sum to 100', () => {
      const report = doctor.diagnose([healthy()]);
      expect(report.max_score).toBe(100);
    });

    it('penalizes a missing owner', () => {
      const report = doctor.diagnose([healthy({ owner: undefined })]);
      const metric = report.metrics.find(m => m.name === 'Missing Owners')!;
      expect(metric.score).toBeLessThan(metric.max_score);
      expect(metric.status).not.toBe('ok');
    });

    it('penalizes an untagged context', () => {
      const report = doctor.diagnose([healthy({ tags: [] })]);
      const metric = report.metrics.find(m => m.name === 'Tag Hygiene')!;
      expect(metric.score).toBeLessThan(metric.max_score);
    });

    it('penalizes a stale context', () => {
      const report = doctor.diagnose([
        healthy({ updated_at: daysAgo(200), created_at: daysAgo(200) }),
      ]);
      const metric = report.metrics.find(m => m.name === 'Stale Contexts')!;
      expect(metric.score).toBeLessThan(metric.max_score);
    });

    it('penalizes a pending review', () => {
      const report = doctor.diagnose([healthy({ review_status: 'pending' })]);
      const metric = report.metrics.find(m => m.name === 'Review Backlog')!;
      expect(metric.score).toBeLessThan(metric.max_score);
    });

    it('grades an empty registry as A rather than dividing by zero', () => {
      const report = doctor.diagnose([]);
      expect(report.grade).toBe('A');
      expect(Number.isFinite(report.overall_score)).toBe(true);
    });

    it('degrades the grade as problems accumulate', () => {
      const broken = Array.from({ length: 8 }, (_, i) =>
        healthy({
          id: `ctx-broken-${i}`,
          owner: undefined,
          tags: [],
          review_status: 'pending',
          authority: { source: { type: 'organization', id: 'x', name: 'X' }, level: 0 },
          updated_at: daysAgo(200),
          created_at: daysAgo(200),
        })
      );
      const report = doctor.diagnose(broken);
      expect(report.grade).toBe('F');
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('trigger delegation', () => {
    // Regression test for the pre-0.5.0 defect where ContextDoctor carried a
    // second trigger implementation whose thresholds diverged from
    // TriggerEvaluator's. Both must now report identical triggers.
    it('reports the same triggers as TriggerEvaluator for the same data', () => {
      const events = Array.from({ length: 12 }, (_, i) => enforcement('compliant', i + 1, i));
      writeEnforcements(events);
      const contexts = [healthy()];

      const report = doctor.diagnose(contexts);
      const direct = new TriggerEvaluator().evaluate(contexts, events, []);

      expect(report.triggers!.map(t => t.trigger).sort()).toEqual(
        direct.recommendations.map(r => r.trigger).sort()
      );
    });

    it('surfaces dormant triggers when observability data is missing', () => {
      writeEnforcements([enforcement('compliant', 1, 0)]);
      const report = doctor.diagnose([healthy()]);
      expect(report.dormant_triggers!.map(d => d.trigger)).toContain('HIGH_FALSE_POSITIVE');
    });

    it('includes trigger output in the recommendation list', () => {
      writeEnforcements(Array.from({ length: 12 }, (_, i) => enforcement('compliant', i + 1, i)));
      const report = doctor.diagnose([healthy()]);
      expect(report.recommendations.some(r => r.startsWith('[STALE_NO_VIOLATION]'))).toBe(true);
    });

    it('tolerates a malformed enforcement log line', () => {
      writeFileSync(
        join(tmpDir, '.lcdd', 'contexts', '.enforcements.log'),
        `${JSON.stringify(enforcement('compliant', 1, 0))}\nnot json at all\n`
      );
      expect(() => doctor.diagnose([healthy()])).not.toThrow();
    });
  });
});
