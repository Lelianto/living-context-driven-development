import { v4 as uuid } from 'uuid';
import type { Context, HealEvent, HealAction, EnforcementMode } from './types.js';
import { FileRegistry } from './registry.js';
import { ContextDoctor, type HealthReport } from './doctor.js';
import {
  TriggerEvaluator,
  TRIGGER_THRESHOLDS,
  type Recommendation,
} from './trigger-evaluator.js';

/** Actions ImproveEngine can execute in Phase A. Everything else is advisory. */
const EXECUTABLE_ACTIONS: ReadonlySet<HealAction> = new Set<HealAction>([
  'deprecate',
  'refine-scope',
  'register-source',
]);

/** Enforcement modes ordered from least to most disruptive. */
const MODE_SEVERITY: Record<EnforcementMode, number> = {
  silent: 0,
  comment: 1,
  warn: 2,
  block: 3,
};

/**
 * Health metrics each action is expected to move, by doctor metric name.
 *
 * Guardrail 7 forbids a heal from reducing health, but some reductions are the
 * intended consequence of the action: deprecating a dormant context trades a
 * stale-context penalty for a deprecation-backlog penalty, because deprecate is
 * step one of deprecate-then-archive. Without this allowance the engine would
 * roll back the exact remedy the trigger recommended, and could never deprecate
 * anything. A drop in any metric NOT listed here is unintended and still
 * triggers rollback.
 */
const EXPECTED_METRIC_IMPACT: Partial<Record<HealAction, readonly string[]>> = {
  deprecate: ['Deprecation Backlog', 'Stale Contexts'],
  'refine-scope': ['Enforcement Conflicts'],
  archive: ['Deprecation Backlog'],
};

export interface HealPlan {
  recommendation: Recommendation;
  /** Whether ImproveEngine can carry this out, as opposed to only advising. */
  executable: boolean;
  /** Why a human is required. Present whenever executable is false or approval is needed. */
  blocked_reason?: string;
  requires_approval: boolean;
}

export interface HealResult {
  heal_id: string;
  recommendation_id: string;
  status: 'applied' | 'rolled-back' | 'blocked' | 'dry-run';
  snapshot_id?: string;
  health_before?: number;
  health_after?: number;
  diff?: string[];
  message: string;
}

export interface ApplyOptions {
  dryRun?: boolean;
  /**
   * Permits applying a plan that requires approval. For hardened contexts this
   * is not sufficient on its own; approvalReason is also mandatory so that the
   * audit trail records a human justification.
   */
  force?: boolean;
  approvalReason?: string;
  actor?: string;
}

export class ImproveEngine {
  constructor(
    private registry: FileRegistry,
    private doctor: ContextDoctor,
    private evaluator: TriggerEvaluator = new TriggerEvaluator()
  ) {}

  /**
   * Evaluate current observability data and return executable plans.
   *
   * Guardrails 1, 2 and 8 are decided here. `apply()` re-checks them, because a
   * plan produced by an earlier `check` run may have gone stale.
   */
  plan(): HealPlan[] {
    const contexts = this.registry.list();
    const evaluation = this.evaluator.evaluate(
      contexts,
      this.registry.readEnforcementEvents(),
      this.registry.readDismissalEvents()
    );

    return evaluation.recommendations.map(rec => this.toPlan(rec, contexts));
  }

  private toPlan(rec: Recommendation, contexts: Context[]): HealPlan {
    const ctx = rec.context_id ? contexts.find(c => c.id === rec.context_id) : undefined;
    const proposed = this.buildProposedChange(rec, ctx);
    const enriched: Recommendation = { ...rec, proposed_change: proposed ?? rec.proposed_change };

    // Guardrail: only three conservative actions are executable in Phase A.
    if (!EXECUTABLE_ACTIONS.has(rec.action)) {
      return {
        recommendation: { ...enriched, auto_apply: false },
        executable: false,
        requires_approval: true,
        blocked_reason: `Action "${rec.action}" is advisory only; it requires human judgment about wording or thresholds.`,
      };
    }

    if (rec.context_id && !ctx) {
      return {
        recommendation: { ...enriched, auto_apply: false },
        executable: false,
        requires_approval: true,
        blocked_reason: `Context ${rec.context_id} no longer exists.`,
      };
    }

    // Guardrail 8: never propose a hardened classification or direct activation.
    const illegal = this.rejectIllegalChange(enriched.proposed_change);
    if (illegal) {
      return {
        recommendation: { ...enriched, auto_apply: false },
        executable: false,
        requires_approval: true,
        blocked_reason: illegal,
      };
    }

    // Guardrail 4: enforcement may only step one level toward block at a time.
    const rollout = this.rejectUnsafeRollout(ctx, enriched.proposed_change);
    if (rollout) {
      return {
        recommendation: { ...enriched, auto_apply: false },
        executable: false,
        requires_approval: true,
        blocked_reason: rollout,
      };
    }

    // Guardrail 1: hardened contexts are never modified without explicit human approval.
    const isHardened = ctx?.governance.classification.startsWith('hardened-') ?? false;
    if (isHardened) {
      return {
        recommendation: { ...enriched, auto_apply: false },
        executable: true,
        requires_approval: true,
        blocked_reason:
          `Context is ${ctx?.governance.classification}. Hardened contexts require explicit human ` +
          'approval with a recorded reason and must never be modified automatically.',
      };
    }

    // Guardrail 2: low confidence is a human decision, not an automated one.
    const confident = enriched.confidence >= TRIGGER_THRESHOLDS.CONFIDENCE_THRESHOLD;
    if (!confident) {
      return {
        recommendation: { ...enriched, auto_apply: false },
        executable: true,
        requires_approval: true,
        blocked_reason:
          `Confidence ${enriched.confidence.toFixed(2)} is below the ` +
          `${TRIGGER_THRESHOLDS.CONFIDENCE_THRESHOLD} threshold; a human must decide.`,
      };
    }

    return {
      recommendation: { ...enriched, auto_apply: true },
      executable: true,
      requires_approval: false,
    };
  }

  /**
   * Derive the concrete mutation for an executable action.
   *
   * The derived change is merged OVER any incoming proposed_change rather than
   * replacing it, so that fields the engine does not derive still pass through
   * the guardrail checks instead of being silently discarded.
   *
   * refine-scope narrows `applies_to` by excluding common test paths, which is
   * the usual cause of dismissed violations. It never widens scope.
   */
  private buildProposedChange(rec: Recommendation, ctx?: Context): Partial<Context> | undefined {
    if (!ctx) return rec.proposed_change;

    const derived = this.deriveChange(rec, ctx);
    if (!derived && !rec.proposed_change) return undefined;
    return { ...rec.proposed_change, ...derived };
  }

  private deriveChange(rec: Recommendation, ctx: Context): Partial<Context> | undefined {
    switch (rec.action) {
      case 'deprecate':
        return { lifecycle: 'deprecated' };

      case 'refine-scope': {
        const current = ctx.applies_to ?? ['**/*'];
        const exclusions = ['!**/__tests__/**', '!**/*.test.*', '!**/*.spec.*', '!**/fixtures/**'];
        const missing = exclusions.filter(e => !current.includes(e));
        if (missing.length === 0) return undefined;
        return { applies_to: [...current, ...missing] };
      }

      case 'register-source':
        // Handled by `lcd source add`; nothing on the context itself changes.
        return undefined;

      default:
        return undefined;
    }
  }

  private rejectIllegalChange(change?: Partial<Context>): string | null {
    if (!change) return null;
    if (change.governance?.classification?.startsWith('hardened-')) {
      return 'A proposed change may never set a hardened classification. Hardening is a human decision.';
    }
    if (change.lifecycle === 'active') {
      return 'A proposed change may never activate a context directly; activation requires review.';
    }
    if (change.authority && change.authority.level >= 3) {
      return 'A proposed change may never raise authority to level 3 or above.';
    }
    return null;
  }

  private rejectUnsafeRollout(ctx?: Context, change?: Partial<Context>): string | null {
    const nextMode = change?.enforcement?.mode;
    if (!ctx || !nextMode) return null;
    const currentMode = ctx.enforcement?.mode ?? 'silent';
    const step = MODE_SEVERITY[nextMode] - MODE_SEVERITY[currentMode];
    if (step > 1) {
      return `Enforcement cannot move from "${currentMode}" to "${nextMode}" in one step. Escalate one level at a time so the change can be observed.`;
    }
    return null;
  }

  apply(recommendationId: string, opts: ApplyOptions = {}): HealResult {
    const actor = opts.actor ?? 'improve-engine';
    const healId = `heal-${uuid().slice(0, 8)}`;

    // Re-derive rather than trusting a possibly stale id from an earlier check.
    const plan = this.plan().find(p => p.recommendation.recommendation_id === recommendationId);
    if (!plan) {
      return {
        heal_id: healId,
        recommendation_id: recommendationId,
        status: 'blocked',
        message: `No current recommendation with id "${recommendationId}". State may have changed since the last check; run "lcd improve check" again.`,
      };
    }

    const rec = plan.recommendation;

    if (!plan.executable) {
      return {
        heal_id: healId,
        recommendation_id: recommendationId,
        status: 'blocked',
        message: plan.blocked_reason ?? 'This recommendation is advisory only.',
      };
    }

    const ctx = rec.context_id ? this.registry.load(rec.context_id) : null;
    const isHardened = ctx?.governance.classification.startsWith('hardened-') ?? false;

    // Guardrail 1: --force alone is never enough for hardened. A recorded reason
    // is mandatory, so the audit trail always shows who accepted the risk.
    if (isHardened && !opts.approvalReason) {
      return {
        heal_id: healId,
        recommendation_id: recommendationId,
        status: 'blocked',
        message:
          `Context ${ctx?.id} is ${ctx?.governance.classification}. Applying a change to a hardened ` +
          'context requires an explicit approval reason for the audit trail.',
      };
    }

    if (plan.requires_approval && !opts.force && !opts.approvalReason) {
      return {
        heal_id: healId,
        recommendation_id: recommendationId,
        status: 'blocked',
        message: plan.blocked_reason ?? 'This recommendation requires explicit approval.',
      };
    }

    const diff = this.describeDiff(ctx, rec);

    if (opts.dryRun) {
      return {
        heal_id: healId,
        recommendation_id: recommendationId,
        status: 'dry-run',
        diff,
        message: `Dry run: no changes written. ${diff.length} field(s) would change.`,
      };
    }

    if (rec.action === 'register-source') {
      return {
        heal_id: healId,
        recommendation_id: recommendationId,
        status: 'blocked',
        message: `Run "lcd source add ${ctx?.source.uri ?? ''}" to register this source. ImproveEngine does not execute network operations.`,
      };
    }

    if (!ctx || !rec.proposed_change) {
      return {
        heal_id: healId,
        recommendation_id: recommendationId,
        status: 'blocked',
        message: 'Nothing to change: the proposed change resolved to a no-op.',
      };
    }

    const reportBefore = this.doctor.diagnose(this.registry.list());
    const healthBefore = reportBefore.overall_score;
    const snapshot = this.registry.snapshot();

    try {
      this.mutate(ctx, rec, actor);
    } catch (err) {
      this.registry.restoreSnapshot(snapshot.snapshot_id);
      return {
        heal_id: healId,
        recommendation_id: recommendationId,
        status: 'rolled-back',
        snapshot_id: snapshot.snapshot_id,
        health_before: healthBefore,
        message: `Mutation failed and was rolled back: ${(err as Error).message}`,
      };
    }

    const reportAfter = this.doctor.diagnose(this.registry.list());
    const healthAfter = reportAfter.overall_score;

    // Guardrail 7: a heal must never degrade health in a way it did not intend.
    const regression = this.unintendedRegression(rec.action, reportBefore, reportAfter);
    if (regression) {
      this.registry.restoreSnapshot(snapshot.snapshot_id);
      const event = this.healEvent(healId, rec, 'rollback', actor, snapshot.snapshot_id, healthBefore, healthAfter, opts.approvalReason);
      this.registry.writeHealEvent(event);
      return {
        heal_id: healId,
        recommendation_id: recommendationId,
        status: 'rolled-back',
        snapshot_id: snapshot.snapshot_id,
        health_before: healthBefore,
        health_after: healthAfter,
        message: `Rolled back automatically: ${regression}`,
      };
    }

    const event = this.healEvent(healId, rec, 'apply', actor, snapshot.snapshot_id, healthBefore, healthAfter, opts.approvalReason);
    this.registry.writeHealEvent(event);

    return {
      heal_id: healId,
      recommendation_id: recommendationId,
      status: 'applied',
      snapshot_id: snapshot.snapshot_id,
      health_before: healthBefore,
      health_after: healthAfter,
      diff,
      message: `Applied ${rec.action} to ${ctx.id}. Health ${healthBefore} → ${healthAfter}.`,
    };
  }

  /**
   * Mutate through registry.transition or registry.save so that lifecycle rules,
   * schema validation and version bumping all still apply.
   */
  private mutate(ctx: Context, rec: Recommendation, actor: string): void {
    const change = rec.proposed_change!;

    if (change.lifecycle && change.lifecycle !== ctx.lifecycle) {
      this.registry.transition(ctx.id, change.lifecycle, actor, rec.reason, 'improve-engine');
      return;
    }

    this.registry.save({ ...ctx, ...change, version: ctx.version + 1 });
  }

  rollback(healId: string): HealResult {
    const event = this.registry.readHealEvents().find(e => e.heal_id === healId && e.operation === 'apply');
    if (!event) {
      return {
        heal_id: healId,
        recommendation_id: '',
        status: 'blocked',
        message: `No applied heal found with id "${healId}".`,
      };
    }
    if (!event.snapshot_id) {
      return {
        heal_id: healId,
        recommendation_id: event.recommendation_id,
        status: 'blocked',
        message: `Heal ${healId} has no snapshot and cannot be rolled back.`,
      };
    }

    const healthBefore = this.doctor.diagnose(this.registry.list()).overall_score;
    this.registry.restoreSnapshot(event.snapshot_id);
    const healthAfter = this.doctor.diagnose(this.registry.list()).overall_score;

    this.registry.writeHealEvent({
      heal_id: healId,
      timestamp: new Date().toISOString(),
      recommendation_id: event.recommendation_id,
      trigger: event.trigger,
      context_id: event.context_id,
      action: event.action,
      operation: 'rollback',
      actor: 'improve-engine',
      snapshot_id: event.snapshot_id,
      health_before: healthBefore,
      health_after: healthAfter,
      reason: `Manual rollback of heal ${healId}`,
    });

    return {
      heal_id: healId,
      recommendation_id: event.recommendation_id,
      status: 'rolled-back',
      snapshot_id: event.snapshot_id,
      health_before: healthBefore,
      health_after: healthAfter,
      message: `Restored snapshot ${event.snapshot_id}. Health ${healthBefore} → ${healthAfter}.`,
    };
  }

  /**
   * Return a description of any health regression the action did not intend, or
   * null when the only drops were in metrics the action is expected to move.
   */
  private unintendedRegression(
    action: HealAction,
    before: HealthReport,
    after: HealthReport
  ): string | null {
    const expected = new Set(EXPECTED_METRIC_IMPACT[action] ?? []);
    const beforeByName = new Map(before.metrics.map(m => [m.name, m.score]));

    for (const metric of after.metrics) {
      if (expected.has(metric.name)) continue;
      const prior = beforeByName.get(metric.name);
      if (prior === undefined) continue;
      if (metric.score < prior) {
        return `metric "${metric.name}" fell from ${prior} to ${metric.score}, which this ${action} was not expected to affect.`;
      }
    }
    return null;
  }

  private describeDiff(ctx: Context | null, rec: Recommendation): string[] {
    if (!ctx || !rec.proposed_change) return [];
    const diff: string[] = [];
    for (const [key, next] of Object.entries(rec.proposed_change)) {
      const current = (ctx as unknown as Record<string, unknown>)[key];
      diff.push(`${key}: ${JSON.stringify(current)} → ${JSON.stringify(next)}`);
    }
    return diff;
  }

  private healEvent(
    healId: string,
    rec: Recommendation,
    operation: 'apply' | 'rollback',
    actor: string,
    snapshotId: string,
    healthBefore: number,
    healthAfter: number,
    approvalReason?: string
  ): HealEvent {
    return {
      heal_id: healId,
      timestamp: new Date().toISOString(),
      recommendation_id: rec.recommendation_id,
      trigger: rec.trigger,
      context_id: rec.context_id,
      action: rec.action,
      operation,
      actor,
      snapshot_id: snapshotId,
      health_before: healthBefore,
      health_after: healthAfter,
      approval_reason: approvalReason,
      reason: rec.reason,
    };
  }
}
