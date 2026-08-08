import type {
  Context,
  EnforcementEvent,
  DismissalEvent,
  HealAction,
} from './types.js';
import { daysSince } from './jsonl.js';

/**
 * Every threshold used by trigger evaluation, in one place.
 *
 * These values are cited by docs/lcdd-self-healing.md and specification 0009/0017.
 * Changing one here changes it everywhere; do not inline copies.
 */
export const TRIGGER_THRESHOLDS = {
  /** Days without a violation before an active context is considered dormant. */
  STALE_DAYS: 90,
  /** dismissals / violations above this is a false positive problem. */
  FALSE_POSITIVE_RATE: 0.2,
  /** violations / evaluations above this is a noisy or widely-broken rule. */
  HIGH_VIOLATION_RATE: 0.2,
  /** AI violation rate divided by human rate above this indicates drift. */
  AI_DRIFT_RATIO: 2.0,
  /** Minimum enforcement events before any rate is trustworthy. */
  MIN_EVENTS_FOR_RATE: 10,
  /** Minimum total events before comparing actor populations. */
  MIN_EVENTS_FOR_DRIFT: 20,
  /** Minimum events per actor type before comparing their rates. */
  MIN_EVENTS_PER_ACTOR: 5,
  /** Minimum events before a violation trend is meaningful. */
  MIN_EVENTS_FOR_TREND: 6,
  /** Below this confidence a recommendation must go to a human. */
  CONFIDENCE_THRESHOLD: 0.7,
} as const;

export type TriggerName =
  | 'STALE_NO_VIOLATION'
  | 'HIGH_FALSE_POSITIVE'
  | 'HIGH_VIOLATION_RATE'
  | 'INCREASING_VIOLATIONS'
  | 'AI_DRIFT'
  | 'NEW_SOURCE_DETECTED';

export interface Recommendation {
  recommendation_id: string;
  trigger: TriggerName;
  priority: 'immediate' | 'short-term' | 'long-term';
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: HealAction;
  context_id?: string;
  title: string;
  description: string;
  reason: string;
  /** 0..1. Below TRIGGER_THRESHOLDS.CONFIDENCE_THRESHOLD requires human review. */
  confidence: number;
  /** Set by ImproveEngine's guardrail gate, never by a trigger. */
  auto_apply: boolean;
  proposed_change?: Partial<Context>;
  suggested_command?: string;
}

export interface TriggerEvaluation {
  triggers_fired: number;
  recommendations: Recommendation[];
  /** Triggers that could not run because the required observability data is absent. */
  dormant: { trigger: TriggerName; reason: string }[];
}

/**
 * Derive a stable id so that `lcd improve check` and a later `lcd improve apply`
 * agree on which recommendation is which, without persisting state between runs.
 */
function recommendationId(trigger: TriggerName, contextId?: string): string {
  const scope = contextId ?? 'registry';
  return `rec-${trigger.toLowerCase().replace(/_/g, '-')}-${scope}`;
}

export class TriggerEvaluator {
  evaluate(
    contexts: Context[],
    enforcements: EnforcementEvent[],
    dismissals: DismissalEvent[] = []
  ): TriggerEvaluation {
    const recommendations: Recommendation[] = [];
    const dormant: TriggerEvaluation['dormant'] = [];

    recommendations.push(...this.staleNoViolation(contexts, enforcements));
    recommendations.push(...this.highViolationRate(contexts, enforcements));
    recommendations.push(...this.increasingViolations(contexts, enforcements));
    recommendations.push(...this.aiDrift(enforcements));
    recommendations.push(...this.newSourceDetected(contexts));

    // A true false positive rate needs dismissal events. Nothing records them
    // yet (that needs an interactive surface), so report the trigger as dormant
    // rather than substituting violation rate, which measures something else.
    if (dismissals.length === 0) {
      dormant.push({
        trigger: 'HIGH_FALSE_POSITIVE',
        reason:
          'No dismissal events recorded. False positive rate requires dismissals/violations; ' +
          'violation rate is reported separately as HIGH_VIOLATION_RATE.',
      });
    } else {
      recommendations.push(...this.highFalsePositive(contexts, enforcements, dismissals));
    }

    return {
      triggers_fired: new Set(recommendations.map(r => r.trigger)).size,
      recommendations,
      dormant,
    };
  }

  private eventsFor(contextId: string, enforcements: EnforcementEvent[]): EnforcementEvent[] {
    return enforcements.filter(e => e.context_id === contextId);
  }

  /**
   * An active context whose recent enforcement history contains no violations
   * may no longer be earning its keep.
   */
  private staleNoViolation(contexts: Context[], enforcements: EnforcementEvent[]): Recommendation[] {
    const recs: Recommendation[] = [];
    for (const ctx of contexts) {
      if (ctx.lifecycle !== 'active') continue;
      const recent = this.eventsFor(ctx.id, enforcements).filter(
        e => daysSince(e.timestamp) <= TRIGGER_THRESHOLDS.STALE_DAYS
      );
      if (recent.length === 0) continue;
      if (recent.some(e => e.status === 'violation')) continue;

      recs.push({
        recommendation_id: recommendationId('STALE_NO_VIOLATION', ctx.id),
        trigger: 'STALE_NO_VIOLATION',
        priority: 'short-term',
        severity: 'medium',
        action: 'deprecate',
        context_id: ctx.id,
        title: 'Active context with no recent violations',
        description: `"${ctx.title}" has been active with no violations in the last ${TRIGGER_THRESHOLDS.STALE_DAYS} days across ${recent.length} check(s).`,
        reason: `Zero violations in ${TRIGGER_THRESHOLDS.STALE_DAYS} days suggests the rule is either universally followed or no longer relevant.`,
        confidence: recent.length >= TRIGGER_THRESHOLDS.MIN_EVENTS_FOR_RATE ? 0.75 : 0.5,
        auto_apply: false,
        proposed_change: { lifecycle: 'deprecated' },
        suggested_command: `lcd improve apply ${recommendationId('STALE_NO_VIOLATION', ctx.id)}`,
      });
    }
    return recs;
  }

  /**
   * A high proportion of evaluations returning violations. This is what the
   * pre-0.5.0 code mislabelled as a false positive rate; it is a distinct and
   * still-useful signal, so it is retained under an accurate name.
   */
  private highViolationRate(contexts: Context[], enforcements: EnforcementEvent[]): Recommendation[] {
    const recs: Recommendation[] = [];
    for (const ctx of contexts) {
      if (ctx.lifecycle === 'archived') continue;
      const events = this.eventsFor(ctx.id, enforcements);
      if (events.length < TRIGGER_THRESHOLDS.MIN_EVENTS_FOR_RATE) continue;
      const violations = events.filter(e => e.status === 'violation').length;
      const rate = violations / events.length;
      if (rate <= TRIGGER_THRESHOLDS.HIGH_VIOLATION_RATE) continue;

      recs.push({
        recommendation_id: recommendationId('HIGH_VIOLATION_RATE', ctx.id),
        trigger: 'HIGH_VIOLATION_RATE',
        priority: 'short-term',
        severity: 'high',
        action: 'refine-scope',
        context_id: ctx.id,
        title: 'High violation rate',
        description: `"${ctx.title}" has a ${(rate * 100).toFixed(0)}% violation rate (${violations}/${events.length}).`,
        reason:
          'A sustained high violation rate means either the rule is too broadly scoped or the ' +
          'codebase genuinely does not comply. Narrowing scope is the safe first response.',
        confidence: 0.6,
        auto_apply: false,
        suggested_command: `lcd review show ${ctx.id}`,
      });
    }
    return recs;
  }

  /**
   * A true false positive rate: violations the team explicitly dismissed as
   * not applicable. This is the signal that justifies narrowing scope.
   */
  private highFalsePositive(
    contexts: Context[],
    enforcements: EnforcementEvent[],
    dismissals: DismissalEvent[]
  ): Recommendation[] {
    const recs: Recommendation[] = [];
    for (const ctx of contexts) {
      if (ctx.lifecycle === 'archived') continue;
      const violations = this.eventsFor(ctx.id, enforcements).filter(e => e.status === 'violation').length;
      if (violations < TRIGGER_THRESHOLDS.MIN_EVENTS_FOR_RATE) continue;
      const dismissed = dismissals.filter(d => d.context_id === ctx.id).length;
      const rate = dismissed / violations;
      if (rate <= TRIGGER_THRESHOLDS.FALSE_POSITIVE_RATE) continue;

      recs.push({
        recommendation_id: recommendationId('HIGH_FALSE_POSITIVE', ctx.id),
        trigger: 'HIGH_FALSE_POSITIVE',
        priority: 'immediate',
        severity: 'high',
        action: 'refine-scope',
        context_id: ctx.id,
        title: 'High false positive rate',
        description: `"${ctx.title}" has a ${(rate * 100).toFixed(0)}% false positive rate (${dismissed} dismissed of ${violations} violations).`,
        reason:
          'Developers are dismissing this rule as inapplicable more than one time in five. ' +
          'The scope is wrong, not the codebase.',
        confidence: Math.min(0.9, 0.6 + rate),
        auto_apply: false,
        suggested_command: `lcd improve apply ${recommendationId('HIGH_FALSE_POSITIVE', ctx.id)}`,
      });
    }
    return recs;
  }

  private increasingViolations(contexts: Context[], enforcements: EnforcementEvent[]): Recommendation[] {
    const recs: Recommendation[] = [];
    for (const ctx of contexts) {
      if (ctx.lifecycle === 'archived') continue;
      const events = this.eventsFor(ctx.id, enforcements).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      if (events.length < TRIGGER_THRESHOLDS.MIN_EVENTS_FOR_TREND) continue;
      const window = Math.floor(TRIGGER_THRESHOLDS.MIN_EVENTS_FOR_TREND / 2);
      const recentViolations = events.slice(0, window).filter(e => e.status === 'violation').length;
      const earlierViolations = events.slice(window, window * 2).filter(e => e.status === 'violation').length;
      if (recentViolations <= earlierViolations) continue;

      recs.push({
        recommendation_id: recommendationId('INCREASING_VIOLATIONS', ctx.id),
        trigger: 'INCREASING_VIOLATIONS',
        priority: 'immediate',
        severity: 'medium',
        action: 'review-clarity',
        context_id: ctx.id,
        title: 'Increasing violation trend',
        description: `"${ctx.title}" violations rose from ${earlierViolations}/${window} to ${recentViolations}/${window} in the most recent checks.`,
        reason:
          'A rising trend usually means the rule is being misunderstood or the codebase is ' +
          'drifting away from it. Both need a human to read the wording.',
        confidence: 0.5,
        auto_apply: false,
        suggested_command: `lcd show ${ctx.id}`,
      });
    }
    return recs;
  }

  private aiDrift(enforcements: EnforcementEvent[]): Recommendation[] {
    if (enforcements.length < TRIGGER_THRESHOLDS.MIN_EVENTS_FOR_DRIFT) return [];
    const human = enforcements.filter(e => e.actor.type === 'human');
    const ai = enforcements.filter(e => e.actor.type === 'ai-agent');
    if (
      human.length < TRIGGER_THRESHOLDS.MIN_EVENTS_PER_ACTOR ||
      ai.length < TRIGGER_THRESHOLDS.MIN_EVENTS_PER_ACTOR
    ) {
      return [];
    }
    const humanRate = human.filter(e => e.status === 'violation').length / human.length;
    const aiRate = ai.filter(e => e.status === 'violation').length / ai.length;
    if (humanRate <= 0 || aiRate / humanRate <= TRIGGER_THRESHOLDS.AI_DRIFT_RATIO) return [];

    return [
      {
        recommendation_id: recommendationId('AI_DRIFT'),
        trigger: 'AI_DRIFT',
        priority: 'immediate',
        severity: 'critical',
        action: 'review-clarity',
        title: 'AI specification drift detected',
        description: `AI agent violation rate (${(aiRate * 100).toFixed(0)}%) is ${(aiRate / humanRate).toFixed(1)}x the human rate (${(humanRate * 100).toFixed(0)}%).`,
        reason:
          'AI agents violate rules at a materially higher rate than humans, which points to ' +
          'ambiguous context wording or inadequate prompt injection rather than agent malice.',
        confidence: 0.65,
        auto_apply: false,
        suggested_command: 'lcd dashboard',
      },
    ];
  }

  private newSourceDetected(contexts: Context[]): Recommendation[] {
    const recs: Recommendation[] = [];
    for (const ctx of contexts) {
      if (ctx.source.type !== 'unknown' || ctx.lifecycle === 'archived') continue;
      if (!ctx.source.uri) continue;

      recs.push({
        recommendation_id: recommendationId('NEW_SOURCE_DETECTED', ctx.id),
        trigger: 'NEW_SOURCE_DETECTED',
        priority: 'long-term',
        severity: 'low',
        action: 'register-source',
        context_id: ctx.id,
        title: 'Unregistered external source',
        description: `"${ctx.title}" references "${ctx.source.uri}" but that source is not registered for change detection.`,
        reason:
          'An unregistered source cannot be watched, so changes upstream will not be noticed.',
        confidence: 0.8,
        auto_apply: false,
        suggested_command: `lcd source add ${ctx.source.uri}`,
      });
    }
    return recs;
  }
}
