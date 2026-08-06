import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Context, LifecycleEvent, EnforcementEvent, VerificationViolation } from './types.js';

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
}

export interface TriggerResult {
  trigger: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context_id?: string;
  description: string;
  recommendation: string;
}

export class ContextDoctor {
  private contextsDir: string;

  constructor(projectRoot: string) {
    this.contextsDir = join(projectRoot, '.lcdd', 'contexts');
  }

  diagnose(contexts: Context[]): HealthReport {
    const events = this.readLifecycleEvents();
    const enforcements = this.readEnforcementEvents();
    const metrics: HealthMetric[] = [];
    const recommendations: string[] = [];
    const triggers: TriggerResult[] = [];

    metrics.push(this.checkStaleContexts(contexts, events));
    metrics.push(this.checkMissingOwners(contexts));
    metrics.push(this.checkConflicts(contexts));
    metrics.push(this.checkDeprecationBacklog(contexts));
    metrics.push(this.checkDraftStagnation(contexts, events));
    metrics.push(this.checkAuthorityGaps(contexts));
    metrics.push(this.checkTagHygiene(contexts));
    metrics.push(this.checkReviewBacklog(contexts));

    triggers.push(...this.evaluateStaleNoViolation(contexts, enforcements));
    triggers.push(...this.evaluateHighFalsePositive(contexts, enforcements));
    triggers.push(...this.evaluateIncreasingViolations(contexts, enforcements));
    triggers.push(...this.evaluateAiDrift(enforcements));
    triggers.push(...this.evaluateNewSourceDetected(contexts));

    for (const m of metrics) {
      if (m.status === 'warning' || m.status === 'critical') {
        recommendations.push(...m.details);
      }
    }

    if (triggers.length > 0) {
      for (const t of triggers) {
        recommendations.push(`[${t.trigger}] ${t.recommendation}`);
      }
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
    };
  }

  private readLifecycleEvents(): LifecycleEvent[] {
    const logPath = join(this.contextsDir, '.events.log');
    if (!existsSync(logPath)) return [];
    const content = readFileSync(logPath, 'utf-8').trim();
    if (!content) return [];
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try { return JSON.parse(line) as LifecycleEvent; } catch { return null; }
      })
      .filter((e): e is LifecycleEvent => e !== null);
  }

  private readEnforcementEvents(): EnforcementEvent[] {
    const logPath = join(this.contextsDir, '.enforcements.log');
    if (!existsSync(logPath)) return [];
    const content = readFileSync(logPath, 'utf-8').trim();
    if (!content) return [];
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try { return JSON.parse(line) as EnforcementEvent; } catch { return null; }
      })
      .filter((e): e is EnforcementEvent => e !== null);
  }

  private daysSince(dateStr: string | undefined | null): number {
    if (!dateStr) return Infinity;
    return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  }

  private checkStaleContexts(contexts: Context[], events: LifecycleEvent[]): HealthMetric {
    const staleThreshold = 90;
    const staleIds: string[] = [];

    for (const ctx of contexts) {
      if (ctx.lifecycle === 'archived' || ctx.lifecycle === 'draft') continue;
      const ctxEvents = events
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
    const stalled = drafts.filter(c => {
      const lastEvent = events
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

  evaluateStaleNoViolation(contexts: Context[], enforcements: EnforcementEvent[]): TriggerResult[] {
    const results: TriggerResult[] = [];
    for (const ctx of contexts) {
      if (ctx.lifecycle !== 'active') continue;
      const ctxEnfs = enforcements.filter(e => e.context_id === ctx.id);
      if (ctxEnfs.length === 0) continue;
      const recent = ctxEnfs.filter(e => this.daysSince(e.timestamp) <= 90);
      if (recent.length === 0) continue;
      const hasViolation = recent.some(e => e.status === 'violation');
      if (!hasViolation) {
        results.push({
          trigger: 'STALE_NO_VIOLATION',
          severity: 'medium',
          context_id: ctx.id,
          description: `Context "${ctx.title}" is active with no violations in 90+ days.`,
          recommendation: `Consider deprecating "${ctx.id}" — lcd transition ${ctx.id} deprecated --reason "No violations in >90 days"`,
        });
      }
    }
    return results;
  }

  evaluateHighFalsePositive(contexts: Context[], enforcements: EnforcementEvent[]): TriggerResult[] {
    const results: TriggerResult[] = [];
    for (const ctx of contexts) {
      if (ctx.lifecycle === 'archived') continue;
      const ctxEnfs = enforcements.filter(e => e.context_id === ctx.id);
      if (ctxEnfs.length < 10) continue;
      const violations = ctxEnfs.filter(e => e.status === 'violation').length;
      const rate = violations / ctxEnfs.length;
      if (rate > 0.2) {
        results.push({
          trigger: 'HIGH_FALSE_POSITIVE',
          severity: 'high',
          context_id: ctx.id,
          description: `Context "${ctx.title}" has ${(rate * 100).toFixed(0)}% violation rate (${violations}/${ctxEnfs.length}).`,
          recommendation: `Consider refining scope or enforcement threshold for "${ctx.id}" — lcd review show ${ctx.id}`,
        });
      }
    }
    return results;
  }

  evaluateIncreasingViolations(contexts: Context[], enforcements: EnforcementEvent[]): TriggerResult[] {
    const results: TriggerResult[] = [];
    for (const ctx of contexts) {
      if (ctx.lifecycle === 'archived') continue;
      const ctxEnfs = enforcements
        .filter(e => e.context_id === ctx.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (ctxEnfs.length < 6) continue;
      const recent = ctxEnfs.slice(0, 3);
      const earlier = ctxEnfs.slice(3, 6);
      const recentViolations = recent.filter(e => e.status === 'violation').length;
      const earlierViolations = earlier.filter(e => e.status === 'violation').length;
      if (recentViolations > earlierViolations) {
        results.push({
          trigger: 'INCREASING_VIOLATIONS',
          severity: 'medium',
          context_id: ctx.id,
          description: `Context "${ctx.title}" violations increased from ${earlierViolations}/3 to ${recentViolations}/3 in recent checks.`,
          recommendation: `Review context clarity for "${ctx.id}" — consider updating description or enforcement.`,
        });
      }
    }
    return results;
  }

  evaluateAiDrift(enforcements: EnforcementEvent[]): TriggerResult[] {
    if (enforcements.length === 0) return [];
    const humanEnfs = enforcements.filter(e => e.actor.type === 'human');
    const aiEnfs = enforcements.filter(e => e.actor.type === 'ai-agent');
    if (humanEnfs.length < 5 || aiEnfs.length < 5) return [];
    const humanViolationRate = humanEnfs.filter(e => e.status === 'violation').length / humanEnfs.length;
    const aiViolationRate = aiEnfs.filter(e => e.status === 'violation').length / aiEnfs.length;
    if (humanViolationRate > 0 && aiViolationRate / humanViolationRate > 2) {
      return [{
        trigger: 'AI_DRIFT',
        severity: 'critical',
        description: `AI agent violation rate (${(aiViolationRate * 100).toFixed(0)}%) is >2x human rate (${(humanViolationRate * 100).toFixed(0)}%).`,
        recommendation: 'Specification drift detected — AI is triggering enforcement more than humans. Review context clarity and enforcement thresholds. Run lcd doctor for detailed analysis.',
      }];
    }
    return [];
  }

  evaluateNewSourceDetected(contexts: Context[]): TriggerResult[] {
    const results: TriggerResult[] = [];
    for (const ctx of contexts) {
      if (ctx.source.type !== 'unknown' || ctx.lifecycle === 'archived') continue;
      if (ctx.source.uri) {
        results.push({
          trigger: 'NEW_SOURCE_DETECTED',
          severity: 'low',
          context_id: ctx.id,
          description: `Context "${ctx.title}" references source URI "${ctx.source.uri}" without extraction.`,
          recommendation: `Register the source with lcd source add ${ctx.source.uri} to enable automated change detection.`,
        });
      }
    }
    return results;
  }
}
