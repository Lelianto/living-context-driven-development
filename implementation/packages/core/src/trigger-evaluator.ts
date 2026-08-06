import type { Context, EnforcementEvent } from './types.js';

export interface Recommendation {
  priority: 'immediate' | 'short-term' | 'long-term';
  action: 'deprecate' | 'refine-scope' | 'review-clarity' | 'adjust-threshold' | 'register-source' | 'archive';
  context_id?: string;
  title: string;
  description: string;
  suggested_command?: string;
}

export interface TriggerEvaluation {
  triggers_fired: number;
  recommendations: Recommendation[];
}

export class TriggerEvaluator {
  evaluate(contexts: Context[], enforcements: EnforcementEvent[]): TriggerEvaluation {
    const recommendations: Recommendation[] = [];

    recommendations.push(...this.staleContextTrigger(contexts, enforcements));
    recommendations.push(...this.highFalsePositiveTrigger(contexts, enforcements));
    recommendations.push(...this.increasingViolationsTrigger(contexts, enforcements));
    recommendations.push(...this.aiDriftTrigger(enforcements));
    recommendations.push(...this.newSourceTrigger(contexts));

    return {
      triggers_fired: recommendations.length > 0 ? new Set(recommendations.map(r => r.title)).size : 0,
      recommendations,
    };
  }

  private daysSince(dateStr: string | undefined | null): number {
    if (!dateStr) return Infinity;
    return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  }

  private staleContextTrigger(contexts: Context[], enforcements: EnforcementEvent[]): Recommendation[] {
    const recs: Recommendation[] = [];
    for (const ctx of contexts) {
      if (ctx.lifecycle !== 'active') continue;
      const ctxEnfs = enforcements
        .filter(e => e.context_id === ctx.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (ctxEnfs.length === 0) continue;
      const recent = ctxEnfs.filter(e => this.daysSince(e.timestamp) <= 90);
      if (recent.length === 0) continue;
      if (recent.every(e => e.status === 'compliant' || e.status === 'not_applicable')) {
        recs.push({
          priority: 'short-term',
          action: 'deprecate',
          context_id: ctx.id,
          title: 'Stale active context with no violations',
          description: `"${ctx.title}" has been active with no violations in the last 90 days. It may no longer be needed.`,
          suggested_command: `lcd transition ${ctx.id} deprecated --reason "No violations in >90 days; consider removing"`,
        });
      }
    }
    return recs;
  }

  private highFalsePositiveTrigger(contexts: Context[], enforcements: EnforcementEvent[]): Recommendation[] {
    const recs: Recommendation[] = [];
    for (const ctx of contexts) {
      if (ctx.lifecycle === 'archived') continue;
      const ctxEnfs = enforcements.filter(e => e.context_id === ctx.id);
      if (ctxEnfs.length < 10) continue;
      const violationCount = ctxEnfs.filter(e => e.status === 'violation').length;
      const rate = violationCount / ctxEnfs.length;
      if (rate > 0.2) {
        recs.push({
          priority: 'short-term',
          action: 'refine-scope',
          context_id: ctx.id,
          title: 'High false-positive rate',
          description: `"${ctx.title}" has a ${(rate * 100).toFixed(0)}% violation rate (${violationCount}/${ctxEnfs.length}). Consider refining scope or enforcement to reduce noise.`,
          suggested_command: `lcd review show ${ctx.id}`,
        });
      }
    }
    return recs;
  }

  private increasingViolationsTrigger(contexts: Context[], enforcements: EnforcementEvent[]): Recommendation[] {
    const recs: Recommendation[] = [];
    for (const ctx of contexts) {
      if (ctx.lifecycle === 'archived') continue;
      const ctxEnfs = enforcements
        .filter(e => e.context_id === ctx.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (ctxEnfs.length < 6) continue;
      const recentViolations = ctxEnfs.slice(0, 3).filter(e => e.status === 'violation').length;
      const earlierViolations = ctxEnfs.slice(3, 6).filter(e => e.status === 'violation').length;
      if (recentViolations > earlierViolations) {
        recs.push({
          priority: 'immediate',
          action: 'review-clarity',
          context_id: ctx.id,
          title: 'Increasing violations trend',
          description: `"${ctx.title}" violations increased from ${earlierViolations}/3 to ${recentViolations}/3 in the most recent checks.`,
          suggested_command: `lcd review show ${ctx.id}`,
        });
      }
    }
    return recs;
  }

  private aiDriftTrigger(enforcements: EnforcementEvent[]): Recommendation[] {
    if (enforcements.length < 20) return [];
    const humanEnfs = enforcements.filter(e => e.actor.type === 'human');
    const aiEnfs = enforcements.filter(e => e.actor.type === 'ai-agent');
    if (humanEnfs.length < 5 || aiEnfs.length < 5) return [];
    const humanRate = humanEnfs.filter(e => e.status === 'violation').length / humanEnfs.length;
    const aiRate = aiEnfs.filter(e => e.status === 'violation').length / aiEnfs.length;
    if (humanRate > 0 && aiRate / humanRate > 2) {
      return [{
        priority: 'immediate',
        action: 'review-clarity',
        title: 'AI specification drift detected',
        description: `AI agent violation rate (${(aiRate * 100).toFixed(0)}%) is >2x the human rate (${(humanRate * 100).toFixed(0)}%). AI agents may be misunderstanding context specifications.`,
        suggested_command: 'lcd doctor',
      }];
    }
    return [];
  }

  private newSourceTrigger(contexts: Context[]): Recommendation[] {
    const recs: Recommendation[] = [];
    for (const ctx of contexts) {
      if (ctx.source.type === 'unknown' && ctx.source.uri && ctx.lifecycle !== 'archived') {
        recs.push({
          priority: 'long-term',
          action: 'register-source',
          context_id: ctx.id,
          title: 'Unregistered external source detected',
          description: `"${ctx.title}" references "${ctx.source.uri}" but the source is not registered.`,
          suggested_command: `lcd source add ${ctx.source.uri}`,
        });
      }
    }
    return recs;
  }
}
