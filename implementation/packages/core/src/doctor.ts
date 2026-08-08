import { join } from 'path';
import type { Context, LifecycleEvent, EnforcementEvent, DismissalEvent } from './types.js';
import { readJsonl, daysSince } from './jsonl.js';
import { TriggerEvaluator, TRIGGER_THRESHOLDS, type Recommendation, type TriggerEvaluation } from './trigger-evaluator.js';

export interface HealthMetric {
  name: string;
  score: number;
  max_score: number;
  status: 'ok' | 'warning' | 'critical';
  details: string[];
}

export interface HealthReport {
  overall_score: number;
  max_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  timestamp: string;
  total_contexts: number;
  metrics: HealthMetric[];
  recommendations: string[];
  triggers?: TriggerResult[];
  /** Triggers that could not run for lack of observability data. */
  dormant_triggers?: TriggerEvaluation['dormant'];
}

/**
 * Trigger output projected for display. The authoritative shape is
 * `Recommendation` from trigger-evaluator; this is a narrowed view kept for
 * report readability and backwards compatibility with `lcd doctor --triggers`.
 */
export interface TriggerResult {
  trigger: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context_id?: string;
  description: string;
  recommendation: string;
}

function toTriggerResult(rec: Recommendation): TriggerResult {
  return {
    trigger: rec.trigger,
    severity: rec.severity,
    context_id: rec.context_id,
    description: rec.description,
    recommendation: rec.suggested_command
      ? `${rec.reason} — ${rec.suggested_command}`
      : rec.reason,
  };
}

export class ContextDoctor {
  private contextsDir: string;
  private evaluator: TriggerEvaluator;

  constructor(projectRoot: string, evaluator: TriggerEvaluator = new TriggerEvaluator()) {
    this.contextsDir = join(projectRoot, '.lcdd', 'contexts');
    this.evaluator = evaluator;
  }

  diagnose(contexts: Context[]): HealthReport {
    const events = this.readLifecycleEvents();
    const enforcements = this.readEnforcementEvents();
    const dismissals = this.readDismissalEvents();
    const metrics: HealthMetric[] = [];
    const recommendations: string[] = [];

    metrics.push(this.checkStaleContexts(contexts, events));
    metrics.push(this.checkMissingOwners(contexts));
    metrics.push(this.checkConflicts(contexts));
    metrics.push(this.checkDeprecationBacklog(contexts));
    metrics.push(this.checkDraftStagnation(contexts, events));
    metrics.push(this.checkAuthorityGaps(contexts));
    metrics.push(this.checkTagHygiene(contexts));
    metrics.push(this.checkReviewBacklog(contexts));

    // Trigger evaluation is owned by TriggerEvaluator. Doctor previously carried
    // a second implementation with divergent thresholds; that is now removed so
    // the two can never disagree.
    const evaluation = this.evaluator.evaluate(contexts, enforcements, dismissals);
    const triggers = evaluation.recommendations.map(toTriggerResult);

    for (const m of metrics) {
      if (m.status === 'warning' || m.status === 'critical') {
        recommendations.push(...m.details);
      }
    }

    for (const t of triggers) {
      recommendations.push(`[${t.trigger}] ${t.recommendation}`);
    }

    const totalScore = metrics.reduce((sum, m) => sum + m.score, 0);
    const maxScore = metrics.reduce((sum, m) => sum + m.max_score, 0);
    const ratio = maxScore > 0 ? totalScore / maxScore : 1;

    const grade: HealthReport['grade'] =
      ratio >= 0.9 ? 'A' : ratio >= 0.75 ? 'B' : ratio >= 0.6 ? 'C' : ratio >= 0.4 ? 'D' : 'F';

    return {
      overall_score: totalScore,
      max_score: maxScore,
      grade,
      timestamp: new Date().toISOString(),
      total_contexts: contexts.length,
      metrics,
      recommendations: [...new Set(recommendations)],
      triggers,
      dormant_triggers: evaluation.dormant,
    };
  }

  private readLifecycleEvents(): LifecycleEvent[] {
    return readJsonl<LifecycleEvent>(join(this.contextsDir, '.events.log'));
  }

  private readEnforcementEvents(): EnforcementEvent[] {
    return readJsonl<EnforcementEvent>(join(this.contextsDir, '.enforcements.log'));
  }

  private readDismissalEvents(): DismissalEvent[] {
    return readJsonl<DismissalEvent>(join(this.contextsDir, '.dismissals.log'));
  }

  private daysSince(dateStr: string | undefined | null): number {
    return daysSince(dateStr);
  }

  /**
   * Lifecycle events that represent real context activity.
   *
   * Heal bookkeeping (actor_role 'improve-engine') is excluded deliberately: a
   * heal records that the *governance system* touched the context, not that the
   * context is being actively maintained. Counting it would let a single heal
   * permanently mask a dormant context, and rollback could not restore health.
   */
  private activityEvents(events: LifecycleEvent[]): LifecycleEvent[] {
    return events.filter(e => e.actor_role !== 'improve-engine');
  }

  private checkStaleContexts(contexts: Context[], events: LifecycleEvent[]): HealthMetric {
    const staleThreshold = TRIGGER_THRESHOLDS.STALE_DAYS;
    const staleIds: string[] = [];
    const activity = this.activityEvents(events);

    for (const ctx of contexts) {
      if (ctx.lifecycle === 'archived' || ctx.lifecycle === 'draft') continue;
      const ctxEvents = activity
        .filter(e => e.context_id === ctx.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const lastEventDate = ctxEvents.length > 0
        ? ctxEvents[0].timestamp
        : ctx.updated_at || ctx.created_at;
      if (this.daysSince(lastEventDate) > staleThreshold) {
        staleIds.push(ctx.id);
      }
    }

    const score = staleIds.length === 0 ? 15 : staleIds.length <= 2 ? 10 : staleIds.length <= 5 ? 5 : 0;
    const status = staleIds.length === 0 ? 'ok' : staleIds.length <= 3 ? 'warning' : 'critical';

    return {
      name: 'Stale Contexts',
      score,
      max_score: 15,
      status,
      details: staleIds.length === 0
        ? ['All active contexts have recent activity.']
        : [`${staleIds.length} context(s) with no activity in ${staleThreshold}+ days: ${staleIds.join(', ')}`],
    };
  }

  private checkMissingOwners(contexts: Context[]): HealthMetric {
    const missing = contexts.filter(c => !c.owner && c.lifecycle !== 'archived');
    const score = missing.length === 0 ? 15 : missing.length <= 2 ? 10 : missing.length <= 5 ? 5 : 0;
    const status = missing.length === 0 ? 'ok' : missing.length <= 3 ? 'warning' : 'critical';

    return {
      name: 'Missing Owners',
      score,
      max_score: 15,
      status,
      details: missing.length === 0
        ? ['All non-archived contexts have assigned owners.']
        : [`${missing.length} context(s) without owner: ${missing.map(c => c.id).join(', ')}`],
    };
  }

  private checkConflicts(contexts: Context[]): HealthMetric {
    const conflicts: string[] = [];
    const enforceable = contexts.filter(c =>
      c.lifecycle === 'active' || c.lifecycle === 'approved' || c.lifecycle === 'deprecated'
    );

    for (let i = 0; i < enforceable.length; i++) {
      for (let j = i + 1; j < enforceable.length; j++) {
        const a = enforceable[i];
        const b = enforceable[j];
        const aPatterns = a.applies_to || ['**/*'];
        const bPatterns = b.applies_to || ['**/*'];
        const overlap = aPatterns.some(ap => bPatterns.some(bp => this.patternsOverlap(ap, bp)));
        if (overlap && a.enforcement?.mode === 'block' && b.enforcement?.mode === 'block') {
          conflicts.push(`${a.id} ↔ ${b.id}`);
        }
      }
    }

    const score = conflicts.length === 0 ? 10 : conflicts.length <= 2 ? 5 : 0;
    const status = conflicts.length === 0 ? 'ok' : 'warning';

    return {
      name: 'Enforcement Conflicts',
      score,
      max_score: 10,
      status,
      details: conflicts.length === 0
        ? ['No overlapping enforcement conflicts detected.']
        : [`${conflicts.length} potential enforcement overlap(s): ${conflicts.join(', ')}`],
    };
  }

  private patternsOverlap(a: string, b: string): boolean {
    if (a === '**/*' || b === '**/*') return true;
    const aDir = a.replace(/\/?\*\*?\/?\*?$/, '');
    const bDir = b.replace(/\/?\*\*?\/?\*?$/, '');
    return aDir.startsWith(bDir) || bDir.startsWith(aDir);
  }

  private checkDeprecationBacklog(contexts: Context[]): HealthMetric {
    const deprecated = contexts.filter(c => c.lifecycle === 'deprecated');
    const oldThreshold = 180;
    const old = deprecated.filter(c => this.daysSince(c.deprecated_date) > oldThreshold);

    const score = deprecated.length === 0 ? 10 : old.length === 0 ? 5 : 0;
    const status = deprecated.length === 0 ? 'ok' : old.length > 0 ? 'critical' : 'warning';

    return {
      name: 'Deprecation Backlog',
      score,
      max_score: 10,
      status,
      details: deprecated.length === 0
        ? ['No deprecated contexts — backlog clean.']
        : old.length > 0
          ? [`${deprecated.length} deprecated context(s), ${old.length} stale >${oldThreshold} days: ${old.map(c => c.id).join(', ')}`]
          : [`${deprecated.length} deprecated context(s) pending archive: ${deprecated.map(c => c.id).join(', ')}`],
    };
  }

  private checkDraftStagnation(contexts: Context[], events: LifecycleEvent[]): HealthMetric {
    const drafts = contexts.filter(c => c.lifecycle === 'draft');
    const stalledThreshold = 30;
    const activity = this.activityEvents(events);
    const stalled = drafts.filter(c => {
      const lastEvent = activity
        .filter(e => e.context_id === c.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      const baseDate = lastEvent ? lastEvent.timestamp : c.updated_at || c.created_at;
      return this.daysSince(baseDate) > stalledThreshold;
    });

    const score = drafts.length === 0 ? 10 : stalled.length === 0 ? 7 : stalled.length <= 3 ? 3 : 0;
    const status = stalled.length === 0 ? 'ok' : stalled.length <= 3 ? 'warning' : 'critical';

    return {
      name: 'Draft Stagnation',
      score,
      max_score: 10,
      status,
      details: stalled.length === 0
        ? drafts.length === 0 ? ['No draft contexts.']
          : [`${drafts.length} draft context(s) — all within ${stalledThreshold} day threshold.`]
        : [`${stalled.length} draft context(s) stalled >${stalledThreshold} days: ${stalled.map(c => c.id).join(', ')}`],
    };
  }

  private checkAuthorityGaps(contexts: Context[]): HealthMetric {
    const weak = contexts.filter(c => c.authority.level === 0 && c.lifecycle !== 'archived' && c.lifecycle !== 'draft');
    const moderate = contexts.filter(c => c.authority.level === 1 && c.lifecycle !== 'archived' && c.lifecycle !== 'draft');

    const issues = weak.length + moderate.length;
    const score = issues === 0 ? 10 : weak.length === 0 ? 7 : weak.length <= 2 ? 4 : 0;
    const status = weak.length === 0 ? (moderate.length <= 2 ? 'ok' : 'warning') : 'critical';

    return {
      name: 'Authority Gaps',
      score,
      max_score: 10,
      status,
      details: issues === 0
        ? ['All non-archived contexts have sufficient authority levels.']
        : weak.length > 0
          ? [`${weak.length} context(s) with authority level 0 (weakest): ${weak.map(c => c.id).join(', ')}`]
          : [`${moderate.length} context(s) with authority level 1: ${moderate.map(c => c.id).join(', ')}`],
    };
  }

  private checkTagHygiene(contexts: Context[]): HealthMetric {
    const untagged = contexts.filter(c => (!c.tags || c.tags.length === 0) && c.lifecycle !== 'archived');
    const score = untagged.length === 0 ? 10 : untagged.length <= 3 ? 6 : untagged.length <= 8 ? 3 : 0;
    const status = untagged.length === 0 ? 'ok' : untagged.length <= 5 ? 'warning' : 'critical';

    return {
      name: 'Tag Hygiene',
      score,
      max_score: 10,
      status,
      details: untagged.length === 0
        ? ['All non-archived contexts are tagged.']
        : [`${untagged.length} context(s) without tags: ${untagged.map(c => c.id).join(', ')}`],
    };
  }

  private checkReviewBacklog(contexts: Context[]): HealthMetric {
    const pending = contexts.filter(c =>
      c.review_status === 'pending' || c.review_status === 'in-review' || c.review_status === 'needs-revision'
    );
    const score = pending.length === 0 ? 20 : pending.length <= 3 ? 12 : pending.length <= 7 ? 6 : 0;
    const status = pending.length === 0 ? 'ok' : pending.length <= 4 ? 'warning' : 'critical';

    return {
      name: 'Review Backlog',
      score,
      max_score: 20,
      status,
      details: pending.length === 0
        ? ['No contexts pending review.']
        : [`${pending.length} context(s) awaiting review: ${pending.map(c => c.id).join(', ')}`],
    };
  }
}
