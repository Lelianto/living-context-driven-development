import type { Context, ReviewStatus, LifecycleStage } from './types.js';
import { FileRegistry } from './registry.js';
import { LifecycleManager } from './lifecycle.js';

export interface ReviewItem {
  context: Context;
  review_age_days: number;
  can_auto_approve: boolean;
  auto_approve_reason?: string;
}

export interface ReviewResult {
  action: 'approved' | 'rejected' | 'revision-requested';
  context_id: string;
  timestamp: string;
  message: string;
}

export class ReviewManager {
  private registry: FileRegistry;

  constructor(registry: FileRegistry) {
    this.registry = registry;
  }

  listPending(): ReviewItem[] {
    const all = this.registry.list();
    const pending = all.filter(c =>
      c.review_status === 'pending' ||
      c.review_status === 'in-review' ||
      c.review_status === 'needs-revision'
    );

    return pending.map(c => ({
      context: c,
      review_age_days: this.reviewAgeDays(c),
      can_auto_approve: this.canAutoApprove(c),
      auto_approve_reason: this.canAutoApprove(c) ? this.getAutoApproveReason(c) : undefined,
    }));
  }

  listAll(): ReviewItem[] {
    const all = this.registry.list();
    return all
      .filter(c => c.review_status !== undefined)
      .map(c => ({
        context: c,
        review_age_days: this.reviewAgeDays(c),
        can_auto_approve: this.canAutoApprove(c),
        auto_approve_reason: this.canAutoApprove(c) ? this.getAutoApproveReason(c) : undefined,
      }));
  }

  getReviewItem(id: string): ReviewItem | null {
    const ctx = this.registry.load(id);
    if (!ctx) return null;
    return {
      context: ctx,
      review_age_days: this.reviewAgeDays(ctx),
      can_auto_approve: this.canAutoApprove(ctx),
      auto_approve_reason: this.canAutoApprove(ctx) ? this.getAutoApproveReason(ctx) : undefined,
    };
  }

  approve(id: string, actor: string, reason?: string): ReviewResult {
    const ctx = this.registry.load(id);
    if (!ctx) throw new Error(`Context not found: ${id}`);

    const validStatuses: ReviewStatus[] = ['pending', 'in-review', 'needs-revision'];
    if (ctx.review_status && !validStatuses.includes(ctx.review_status)) {
      throw new Error(`Cannot approve context with review status "${ctx.review_status}"`);
    }

    const updated: Context = {
      ...ctx,
      review_status: 'approved',
      version: ctx.version + 1,
      updated_at: new Date().toISOString(),
    };

    if (ctx.lifecycle === 'candidate') {
      updated.lifecycle = 'approved';
    }

    this.registry.save(updated);

    return {
      action: 'approved',
      context_id: id,
      timestamp: new Date().toISOString(),
      message: reason || 'Approved via review workflow.',
    };
  }

  reject(id: string, actor: string, reason?: string): ReviewResult {
    const ctx = this.registry.load(id);
    if (!ctx) throw new Error(`Context not found: ${id}`);

    const updated: Context = {
      ...ctx,
      review_status: 'rejected',
      version: ctx.version + 1,
      updated_at: new Date().toISOString(),
    };

    this.registry.save(updated);

    return {
      action: 'rejected',
      context_id: id,
      timestamp: new Date().toISOString(),
      message: reason || 'Rejected via review workflow.',
    };
  }

  requestRevision(id: string, actor: string, reason?: string): ReviewResult {
    const ctx = this.registry.load(id);
    if (!ctx) throw new Error(`Context not found: ${id}`);

    const updated: Context = {
      ...ctx,
      review_status: 'needs-revision',
      version: ctx.version + 1,
      updated_at: new Date().toISOString(),
    };

    this.registry.save(updated);

    return {
      action: 'revision-requested',
      context_id: id,
      timestamp: new Date().toISOString(),
      message: reason || 'Revision requested via review workflow.',
    };
  }

  autoApprove(actor: string): ReviewResult[] {
    const results: ReviewResult[] = [];
    const pending = this.listPending();

    for (const item of pending) {
      if (item.can_auto_approve) {
        try {
          const result = this.approve(item.context.id, actor, item.auto_approve_reason);
          results.push(result);
        } catch {
          // skip contexts that fail auto-approval
        }
      }
    }

    return results;
  }

  canAutoApprove(ctx: Context): boolean {
    if (ctx.review_status !== 'pending' && ctx.review_status !== 'in-review') return false;
    const gov = ctx.governance.classification;
    if (gov.startsWith('local-')) return true;
    if (ctx.authority.level < 3 && ctx.governance.approval_required !== true) return true;
    return false;
  }

  private getAutoApproveReason(ctx: Context): string {
    if (ctx.governance.classification.startsWith('local-')) {
      return `Auto-approved: Local governance (${ctx.governance.classification}) with authority level ${ctx.authority.level}.`;
    }
    return `Auto-approved: Authority level ${ctx.authority.level} does not require explicit approval.`;
  }

  private reviewAgeDays(ctx: Context): number {
    const date = ctx.updated_at || ctx.created_at;
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  }
}
