import type { Context, LifecycleStage, LifecycleEvent } from './types.js';

interface TransitionRule {
  from: LifecycleStage | null;
  to: LifecycleStage;
  requires_approval: boolean;
  allowed_from: LifecycleStage[];
}

const TRANSITION_RULES: TransitionRule[] = [
  { from: null, to: 'draft', requires_approval: false, allowed_from: [] },
  { from: 'draft', to: 'candidate', requires_approval: false, allowed_from: ['draft'] },
  { from: 'draft', to: 'archived', requires_approval: false, allowed_from: ['draft'] },
  { from: 'candidate', to: 'approved', requires_approval: true, allowed_from: ['candidate'] },
  { from: 'candidate', to: 'draft', requires_approval: false, allowed_from: ['candidate'] },
  { from: 'approved', to: 'active', requires_approval: true, allowed_from: ['approved'] },
  { from: 'approved', to: 'archived', requires_approval: true, allowed_from: ['approved'] },
  { from: 'active', to: 'deprecated', requires_approval: true, allowed_from: ['active'] },
  { from: 'active', to: 'approved', requires_approval: true, allowed_from: ['active'] },
  { from: 'deprecated', to: 'active', requires_approval: true, allowed_from: ['deprecated'] },
  { from: 'deprecated', to: 'archived', requires_approval: false, allowed_from: ['deprecated'] },
  { from: 'archived', to: 'draft', requires_approval: false, allowed_from: ['archived'] },
];

export class LifecycleManager {
  static getAllowedTransitions(current: LifecycleStage): LifecycleStage[] {
    return TRANSITION_RULES
      .filter(r => r.from === current)
      .map(r => r.to);
  }

  static canTransition(context: Context, to: LifecycleStage): boolean {
    const rule = TRANSITION_RULES.find(r => r.from === context.lifecycle && r.to === to);
    if (!rule) return false;

    if (rule.requires_approval) {
      if (context.governance.approval_required && context.lifecycle === 'candidate' && !context.review_status) return false;
    }

    return true;
  }

  static transition(
    context: Context,
    to: LifecycleStage,
    actor: string,
    reason?: string
  ): { context: Context; event: LifecycleEvent } {
    if (!this.canTransition(context, to)) {
      throw new Error(`Invalid transition: ${context.lifecycle} → ${to} for context ${context.id}`);
    }

    const event: LifecycleEvent = {
      context_id: context.id,
      from_stage: context.lifecycle,
      to_stage: to,
      timestamp: new Date().toISOString(),
      actor,
      reason,
    };

    const updated: Context = {
      ...context,
      lifecycle: to,
      version: context.version + 1,
      updated_at: event.timestamp,
      review_status: to === 'candidate' ? 'pending' : to === 'approved' ? 'approved' : context.review_status,
    };

    if (to === 'active') {
      updated.effective_date = event.timestamp;
    }

    if (to === 'deprecated') {
      updated.deprecated_date = event.timestamp;
    }

    return { context: updated, event };
  }

  static isEnforceable(stage: LifecycleStage): boolean {
    switch (stage) {
      case 'active': return true;
      case 'deprecated': return true;
      case 'approved': return true;
      default: return false;
    }
  }

  static getEnforcementMode(context: Context): 'block' | 'warn' | 'comment' | 'silent' {
    if (context.enforcement?.mode) return context.enforcement.mode;

    switch (context.lifecycle) {
      case 'draft': return 'silent';
      case 'candidate': return 'comment';
      case 'approved': return 'warn';
      case 'active': return context.authority.level >= 3 ? 'block' : 'warn';
      case 'deprecated': return 'warn';
      case 'archived': return 'silent';
    }
  }
}
