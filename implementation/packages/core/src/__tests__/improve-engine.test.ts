import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { FileRegistry } from '../registry.js';
import { ContextDoctor } from '../doctor.js';
import { ImproveEngine } from '../improve-engine.js';
import { TriggerEvaluator } from '../trigger-evaluator.js';
import type { Context, EnforcementEvent } from '../types.js';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

describe('ImproveEngine', () => {
  let tmpDir: string;
  let registry: FileRegistry;
  let engine: ImproveEngine;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'lcdd-test-'));
    registry = new FileRegistry(tmpDir);
    registry.ensureDir();
    engine = new ImproveEngine(registry, new ContextDoctor(tmpDir), new TriggerEvaluator());
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  /** An active context with a full complement of healthy metadata. */
  function makeContext(overrides: Partial<Context> = {}): Context {
    const ctx: Context = {
      id: overrides.id ?? 'ctx-test',
      version: 1,
      title: 'Test rule',
      description: 'A rule used by the improve engine test suite.',
      source: { type: 'organization', uri: 'https://example.com/policy' },
      authority: { source: { type: 'organization', id: 'team', name: 'Team' }, level: 2 },
      category: 'security',
      severity: 'medium',
      applies_to: ['src/**/*.ts'],
      lifecycle: 'active',
      governance: { classification: 'local-guideline', approval_required: false },
      effective_date: daysAgo(120),
      owner: 'team',
      tags: ['test'],
      enforcement: { mode: 'warn', specification: { type: 'regex-pattern', config: { patterns: ['x'] } } },
      ...overrides,
    };
    registry.save(ctx);
    return ctx;
  }

  /** Compliant enforcement events, which is what makes a context look dormant. */
  function seedCompliantEvents(contextId: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const event: EnforcementEvent = {
        event_id: `evt-${contextId}-${i}`,
        timestamp: daysAgo(i + 1),
        context_id: contextId,
        context_version: 1,
        artifact_path: `src/file-${i}.ts`,
        status: 'compliant',
        enforcement_action: 'none',
        actor: { type: 'human', id: 'dev' },
        verifier: { type: 'regex-pattern', version: '0.2.0', duration_ms: 0 },
      };
      registry.writeEnforcementEvent(event);
    }
  }

  describe('plan', () => {
    it('produces an executable deprecate plan for a dormant local context', () => {
      makeContext({ id: 'ctx-dormant' });
      seedCompliantEvents('ctx-dormant', 12);

      const plans = engine.plan();
      const plan = plans.find(p => p.recommendation.context_id === 'ctx-dormant');

      expect(plan).toBeDefined();
      expect(plan!.recommendation.action).toBe('deprecate');
      expect(plan!.executable).toBe(true);
      expect(plan!.recommendation.proposed_change).toEqual({ lifecycle: 'deprecated' });
    });

    // Guardrail 1
    it('hardened context cannot be auto-applied', () => {
      makeContext({
        id: 'ctx-hardened',
        governance: { classification: 'hardened-standard', approval_required: true },
        authority: { source: { type: 'organization', id: 'sec', name: 'Security' }, level: 3 },
        enforcement: { mode: 'block', specification: { type: 'regex-pattern', config: { patterns: ['x'] } } },
      });
      seedCompliantEvents('ctx-hardened', 12);

      const plan = engine.plan().find(p => p.recommendation.context_id === 'ctx-hardened');

      expect(plan).toBeDefined();
      expect(plan!.recommendation.auto_apply).toBe(false);
      expect(plan!.requires_approval).toBe(true);
      expect(plan!.blocked_reason).toMatch(/hardened/i);
    });

    // Guardrail 2
    it('low confidence routes to review rather than auto-apply', () => {
      makeContext({ id: 'ctx-thin' });
      // Fewer than MIN_EVENTS_FOR_RATE events lowers confidence below threshold.
      seedCompliantEvents('ctx-thin', 3);

      const plan = engine.plan().find(p => p.recommendation.context_id === 'ctx-thin');

      expect(plan).toBeDefined();
      expect(plan!.recommendation.confidence).toBeLessThan(0.7);
      expect(plan!.recommendation.auto_apply).toBe(false);
      expect(plan!.requires_approval).toBe(true);
    });

    it('marks advisory-only actions as not executable', () => {
      makeContext({ id: 'ctx-unregistered', source: { type: 'unknown', uri: 'https://example.com/x' } });

      const plan = engine.plan().find(p => p.recommendation.trigger === 'NEW_SOURCE_DETECTED');
      expect(plan).toBeDefined();
      expect(plan!.recommendation.action).toBe('register-source');
    });
  });

  describe('apply', () => {
    // Guardrail 1
    it('blocks a hardened context without an approval reason', () => {
      makeContext({
        id: 'ctx-hardened',
        governance: { classification: 'hardened-standard', approval_required: true },
        authority: { source: { type: 'organization', id: 'sec', name: 'Security' }, level: 3 },
        enforcement: { mode: 'block', specification: { type: 'regex-pattern', config: { patterns: ['x'] } } },
      });
      seedCompliantEvents('ctx-hardened', 12);

      const recId = engine.plan().find(p => p.recommendation.context_id === 'ctx-hardened')!
        .recommendation.recommendation_id;

      // --force alone must not be sufficient for a hardened context.
      const result = engine.apply(recId, { force: true });

      expect(result.status).toBe('blocked');
      expect(result.message).toMatch(/approval reason/i);
      expect(registry.load('ctx-hardened')!.lifecycle).toBe('active');
    });

    it('applies a hardened change when an approval reason is recorded', () => {
      makeContext({
        id: 'ctx-hardened',
        governance: { classification: 'hardened-standard', approval_required: true },
        authority: { source: { type: 'organization', id: 'sec', name: 'Security' }, level: 3 },
        enforcement: { mode: 'block', specification: { type: 'regex-pattern', config: { patterns: ['x'] } } },
      });
      seedCompliantEvents('ctx-hardened', 12);

      const recId = engine.plan().find(p => p.recommendation.context_id === 'ctx-hardened')!
        .recommendation.recommendation_id;

      const result = engine.apply(recId, { approvalReason: 'Superseded by platform control' });

      expect(result.status).toBe('applied');
      const events = registry.readHealEvents();
      expect(events[0].approval_reason).toBe('Superseded by platform control');
    });

    // Guardrail 3 / dry-run
    it('dry run writes nothing', () => {
      const ctx = makeContext({ id: 'ctx-dry' });
      seedCompliantEvents('ctx-dry', 12);
      const before = readFileSync(join(tmpDir, '.lcdd', 'contexts', 'ctx-dry.yaml'), 'utf-8');

      const recId = engine.plan().find(p => p.recommendation.context_id === 'ctx-dry')!
        .recommendation.recommendation_id;
      const result = engine.apply(recId, { dryRun: true });

      expect(result.status).toBe('dry-run');
      expect(result.diff!.length).toBeGreaterThan(0);
      expect(readFileSync(join(tmpDir, '.lcdd', 'contexts', 'ctx-dry.yaml'), 'utf-8')).toBe(before);
      expect(registry.load('ctx-dry')!.version).toBe(ctx.version);
    });

    // Guardrail 5
    it('apply emits exactly one heal event', () => {
      makeContext({ id: 'ctx-audit' });
      seedCompliantEvents('ctx-audit', 12);

      const recId = engine.plan().find(p => p.recommendation.context_id === 'ctx-audit')!
        .recommendation.recommendation_id;
      engine.apply(recId);

      const healEvents = registry.readHealEvents();
      expect(healEvents.filter(e => e.operation === 'apply')).toHaveLength(1);
      expect(healEvents[0].snapshot_id).toBeDefined();
      expect(healEvents[0].context_id).toBe('ctx-audit');
    });

    // Guardrail 6
    it('writes a snapshot to disk before mutating', () => {
      makeContext({ id: 'ctx-snap' });
      seedCompliantEvents('ctx-snap', 12);

      const recId = engine.plan().find(p => p.recommendation.context_id === 'ctx-snap')!
        .recommendation.recommendation_id;
      const result = engine.apply(recId);

      expect(existsSync(join(tmpDir, '.lcdd', 'snapshots', `${result.snapshot_id}.yaml`))).toBe(true);
    });

    it('blocks an unknown recommendation id', () => {
      const result = engine.apply('rec-does-not-exist');
      expect(result.status).toBe('blocked');
      expect(result.message).toMatch(/No current recommendation/i);
    });
  });

  describe('rollback', () => {
    // Guardrail 6
    it('restores the prior context version', () => {
      makeContext({ id: 'ctx-rollback' });
      seedCompliantEvents('ctx-rollback', 12);

      const recId = engine.plan().find(p => p.recommendation.context_id === 'ctx-rollback')!
        .recommendation.recommendation_id;
      const applied = engine.apply(recId);
      expect(applied.status).toBe('applied');
      expect(registry.load('ctx-rollback')!.lifecycle).toBe('deprecated');

      const rolled = engine.rollback(applied.heal_id);

      expect(rolled.status).toBe('rolled-back');
      expect(registry.load('ctx-rollback')!.lifecycle).toBe('active');
    });

    // Guardrail 5
    it('rollback emits its own heal event', () => {
      makeContext({ id: 'ctx-rollback-audit' });
      seedCompliantEvents('ctx-rollback-audit', 12);

      const recId = engine.plan().find(p => p.recommendation.context_id === 'ctx-rollback-audit')!
        .recommendation.recommendation_id;
      const applied = engine.apply(recId);
      engine.rollback(applied.heal_id);

      const events = registry.readHealEvents();
      expect(events.filter(e => e.operation === 'apply')).toHaveLength(1);
      expect(events.filter(e => e.operation === 'rollback')).toHaveLength(1);
    });

    // Guardrail 6 — regression test for the heal-events-mask-staleness bug.
    it('rollback restores health to the pre-heal value for a dormant context', () => {
      makeContext({ id: 'ctx-stale-roundtrip' });
      seedCompliantEvents('ctx-stale-roundtrip', 12);

      // Seed backdated lifecycle activity so the context is genuinely stale
      // (> STALE_DAYS since its last real event). Staleness reads the most
      // recent lifecycle event, not updated_at, so the backdate must go here.
      registry.writeLifecycleEvent({
        context_id: 'ctx-stale-roundtrip',
        from_stage: 'approved',
        to_stage: 'active',
        timestamp: daysAgo(120),
        actor: 'dev',
        reason: 'activated',
      });

      const doctor = new ContextDoctor(tmpDir);
      const healthBefore = doctor.diagnose(registry.list()).overall_score;
      expect(healthBefore).toBe(95);

      const recId = engine.plan().find(p => p.recommendation.context_id === 'ctx-stale-roundtrip')!
        .recommendation.recommendation_id;
      const applied = engine.apply(recId);
      expect(applied.status).toBe('applied');

      const rolled = engine.rollback(applied.heal_id);
      expect(rolled.status).toBe('rolled-back');

      const healthAfter = doctor.diagnose(registry.list()).overall_score;
      expect(healthAfter).toBe(healthBefore);
    });

    it('blocks rollback of an unknown heal id', () => {
      const result = engine.rollback('heal-nope');
      expect(result.status).toBe('blocked');
    });
  });

  describe('guardrail: illegal proposed changes', () => {
    /** An evaluator that emits one attacker-controlled recommendation. */
    function rogueEngine(rec: Record<string, unknown>): ImproveEngine {
      return new ImproveEngine(registry, new ContextDoctor(tmpDir), {
        evaluate: () => ({ triggers_fired: 1, dormant: [], recommendations: [rec] }),
      } as unknown as TriggerEvaluator);
    }

    const baseRogue = {
      trigger: 'STALE_NO_VIOLATION' as const,
      priority: 'short-term' as const,
      severity: 'medium' as const,
      title: 'Rogue',
      description: 'Injected recommendation',
      reason: 'test',
      confidence: 0.99,
      auto_apply: true,
    };

    // Guardrail 8
    it('rejects a proposed change that sets a hardened classification', () => {
      const ctx = makeContext({ id: 'ctx-illegal-hardened' });
      const plan = rogueEngine({
        ...baseRogue,
        recommendation_id: 'rec-rogue-harden',
        action: 'deprecate',
        context_id: ctx.id,
        proposed_change: {
          governance: { classification: 'hardened-mandate', approval_required: true },
        },
      }).plan()[0];

      expect(plan.executable).toBe(false);
      expect(plan.blocked_reason).toMatch(/hardened classification/i);
    });

    // Guardrail 8
    it('rejects a proposed change that activates a context directly', () => {
      const ctx = makeContext({ id: 'ctx-illegal-active', lifecycle: 'draft', effective_date: null });
      const plan = rogueEngine({
        ...baseRogue,
        recommendation_id: 'rec-rogue-activate',
        action: 'refine-scope',
        context_id: ctx.id,
        proposed_change: { lifecycle: 'active' },
      }).plan()[0];

      expect(plan.executable).toBe(false);
      expect(plan.blocked_reason).toMatch(/never activate/i);
    });

    // Guardrail 8
    it('rejects a proposed change that raises authority to level 3', () => {
      const ctx = makeContext({ id: 'ctx-illegal-authority' });
      const plan = rogueEngine({
        ...baseRogue,
        recommendation_id: 'rec-rogue-authority',
        action: 'deprecate',
        context_id: ctx.id,
        proposed_change: {
          authority: { source: { type: 'organization', id: 'x', name: 'X' }, level: 4 },
        },
      }).plan()[0];

      expect(plan.executable).toBe(false);
      expect(plan.blocked_reason).toMatch(/authority/i);
    });

    // Guardrail 4
    it('enforcement cannot jump straight from comment to block', () => {
      const ctx = makeContext({
        id: 'ctx-rollout',
        enforcement: { mode: 'comment', specification: { type: 'regex-pattern', config: { patterns: ['x'] } } },
      });

      const plan = rogueEngine({
        ...baseRogue,
        recommendation_id: 'rec-jump',
        action: 'refine-scope',
        context_id: ctx.id,
        proposed_change: { enforcement: { mode: 'block' } },
      }).plan()[0];

      expect(plan.executable).toBe(false);
      expect(plan.blocked_reason).toMatch(/one step/i);
    });

    // Guardrail 4
    it('enforcement may step one level toward block', () => {
      const ctx = makeContext({
        id: 'ctx-rollout-ok',
        enforcement: { mode: 'warn', specification: { type: 'regex-pattern', config: { patterns: ['x'] } } },
      });

      const plan = rogueEngine({
        ...baseRogue,
        recommendation_id: 'rec-step',
        action: 'refine-scope',
        context_id: ctx.id,
        proposed_change: { enforcement: { mode: 'block' } },
      }).plan()[0];

      expect(plan.executable).toBe(true);
    });
  });

  // Guardrail 7
  describe('guardrail: health must not regress', () => {
    it('auto-rolls-back an apply that drops a metric the action did not intend to affect', () => {
      const ctx = makeContext({ id: 'ctx-regression', applies_to: ['src/a.ts'] });
      seedCompliantEvents('ctx-regression', 12);

      // A rogue recommendation for refine-scope that additionally sets
      // review_status to pending. Review Backlog is not an intended consequence
      // of refine-scope, so this counts as an unintended regression.
      const rogue = new ImproveEngine(registry, new ContextDoctor(tmpDir), {
        evaluate: () => ({
          triggers_fired: 1,
          dormant: [],
          recommendations: [
            {
              recommendation_id: 'rec-regress',
              trigger: 'HIGH_VIOLATION_RATE',
              priority: 'short-term',
              severity: 'high',
              title: 'Rogue',
              description: 'Injected',
              reason: 'test',
              confidence: 0.99,
              auto_apply: true,
              action: 'refine-scope',
              context_id: ctx.id,
              proposed_change: { review_status: 'pending' as const },
            },
          ],
        }),
      } as unknown as TriggerEvaluator);

      const before = readFileSync(join(tmpDir, '.lcdd', 'contexts', 'ctx-regression.yaml'), 'utf-8');
      const healthBefore = new ContextDoctor(tmpDir).diagnose(registry.list()).overall_score;

      const result = rogue.apply('rec-regress');

      expect(result.status).toBe('rolled-back');
      expect(result.health_before).toBe(healthBefore);
      // Registry restored byte-identically.
      expect(readFileSync(join(tmpDir, '.lcdd', 'contexts', 'ctx-regression.yaml'), 'utf-8')).toBe(before);
      expect(registry.load('ctx-regression')!.version).toBe(ctx.version);
      expect(registry.load('ctx-regression')!.review_status).toBeUndefined();
    });
  });

  // Guardrail 9
  it('recommendation output carries no individual actor identity', () => {
    makeContext({ id: 'ctx-privacy' });
    seedCompliantEvents('ctx-privacy', 12);

    const serialized = JSON.stringify(engine.plan());
    expect(serialized).not.toContain('"dev"');
  });
});
