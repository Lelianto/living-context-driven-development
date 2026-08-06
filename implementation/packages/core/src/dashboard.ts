import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { EnforcementEvent, LifecycleEvent, Context } from './types.js';

export interface ViolationTrend {
  period: string;
  total_checks: number;
  violations: number;
  violation_rate: number;
}

export interface ActorBreakdown {
  type: 'human' | 'ai-agent';
  total_checks: number;
  violations: number;
  violation_rate: number;
}

export interface ContextViolationRanking {
  context_id: string;
  title: string;
  severity: string;
  lifecycle: string;
  total_violations: number;
  total_checks: number;
  violation_rate: number;
}

export interface ModeDistribution {
  mode: string;
  count: number;
}

export interface LifecycleVelocity {
  context_id: string;
  title: string;
  from_stage: string;
  to_stage: string;
  days: number;
}

export interface DashboardMetrics {
  timestamp: string;
  period_days: number;
  total_enforcement_events: number;
  total_lifecycle_events: number;
  total_contexts: number;
  violation_trend: ViolationTrend[];
  actor_breakdown: ActorBreakdown[];
  top_violated: ContextViolationRanking[];
  mode_distribution: ModeDistribution[];
  lifecycle_velocity: LifecycleVelocity[];
  health_score: number;
  health_grade: string;
}

export class DashboardService {
  private contextsDir: string;

  constructor(projectRoot: string) {
    this.contextsDir = join(projectRoot, '.lcdd', 'contexts');
  }

  compute(contexts: Context[]): DashboardMetrics {
    const enforcements = this.readEnforcementEvents();
    const lifecycleEvents = this.readLifecycleEvents();
    const maxPeriod = 90;

    const now = Date.now();
    const recentEnfs = enforcements.filter(
      e => now - new Date(e.timestamp).getTime() <= maxPeriod * 24 * 60 * 60 * 1000
    );

    const periods = [7, 30, 90];
    const violationTrend: ViolationTrend[] = periods.map(days => {
      const pdMs = days * 24 * 60 * 60 * 1000;
      const pdEnfs = recentEnfs.filter(e => now - new Date(e.timestamp).getTime() <= pdMs);
      const violations = pdEnfs.filter(e => e.status === 'violation').length;
      return {
        period: `${days}d`,
        total_checks: pdEnfs.length,
        violations,
        violation_rate: pdEnfs.length > 0 ? violations / pdEnfs.length : 0,
      };
    });

    const actorBreakdown: ActorBreakdown[] = ['human', 'ai-agent'].map(type => {
      const actorEnfs = recentEnfs.filter(e => e.actor.type === type);
      const violations = actorEnfs.filter(e => e.status === 'violation').length;
      return {
        type: type as 'human' | 'ai-agent',
        total_checks: actorEnfs.length,
        violations,
        violation_rate: actorEnfs.length > 0 ? violations / actorEnfs.length : 0,
      };
    });

    const contextMap = new Map<string, Context>();
    for (const ctx of contexts) contextMap.set(ctx.id, ctx);

    const ctxViolations = new Map<string, { violations: number; total: number }>();
    for (const enf of recentEnfs) {
      const existing = ctxViolations.get(enf.context_id) || { violations: 0, total: 0 };
      existing.total++;
      if (enf.status === 'violation') existing.violations++;
      ctxViolations.set(enf.context_id, existing);
    }

    const topViolated: ContextViolationRanking[] = Array.from(ctxViolations.entries())
      .map(([id, stats]) => {
        const ctx = contextMap.get(id);
        return {
          context_id: id,
          title: ctx?.title || '(unknown)',
          severity: ctx?.severity || 'medium',
          lifecycle: ctx?.lifecycle || 'unknown',
          total_violations: stats.violations,
          total_checks: stats.total,
          violation_rate: stats.total > 0 ? stats.violations / stats.total : 0,
        };
      })
      .sort((a, b) => b.total_violations - a.total_violations)
      .slice(0, 10);

    const modeCounts = new Map<string, number>();
    for (const enf of recentEnfs) {
      modeCounts.set(enf.enforcement_action, (modeCounts.get(enf.enforcement_action) || 0) + 1);
    }
    const modeDistribution: ModeDistribution[] = Array.from(modeCounts.entries())
      .map(([mode, count]) => ({ mode, count }))
      .sort((a, b) => b.count - a.count);

    const lifecycleVelocity: LifecycleVelocity[] = [];
    const ctxEvents = new Map<string, LifecycleEvent[]>();
    for (const evt of lifecycleEvents) {
      const existing = ctxEvents.get(evt.context_id) || [];
      existing.push(evt);
      ctxEvents.set(evt.context_id, existing);
    }
    for (const [ctxId, events] of ctxEvents) {
      const sorted = events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (first && last && first.context_id === last.context_id && first.from_stage !== last.to_stage) {
        const days = Math.round(
          (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (days > 0) {
          lifecycleVelocity.push({
            context_id: ctxId,
            title: contextMap.get(ctxId)?.title || '(unknown)',
            from_stage: first.from_stage,
            to_stage: last.to_stage,
            days,
          });
        }
      }
    }
    lifecycleVelocity.sort((a, b) => a.days - b.days);

    const totalChecks = recentEnfs.length;
    const totalViolations = recentEnfs.filter(e => e.status === 'violation').length;
    const healthScore = totalChecks > 0
      ? Math.round((1 - totalViolations / totalChecks) * 100)
      : 100;
    const healthGrade =
      healthScore >= 90 ? 'A' : healthScore >= 75 ? 'B' : healthScore >= 60 ? 'C' : healthScore >= 40 ? 'D' : 'F';

    return {
      timestamp: new Date().toISOString(),
      period_days: maxPeriod,
      total_enforcement_events: enforcements.length,
      total_lifecycle_events: lifecycleEvents.length,
      total_contexts: contexts.length,
      violation_trend: violationTrend,
      actor_breakdown: actorBreakdown,
      top_violated: topViolated,
      mode_distribution: modeDistribution,
      lifecycle_velocity: lifecycleVelocity,
      health_score: healthScore,
      health_grade: healthGrade,
    };
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
}
