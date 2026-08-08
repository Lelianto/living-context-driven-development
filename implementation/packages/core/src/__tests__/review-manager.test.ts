import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { FileRegistry } from '../registry.js';
import { ReviewManager } from '../review-manager.js';
import type { Context } from '../types.js';

describe('ReviewManager', () => {
  let tmpDir: string;
  let registry: FileRegistry;
  let manager: ReviewManager;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'lcdd-test-'));
    registry = new FileRegistry(tmpDir);
    registry.ensureDir();
    manager = new ReviewManager(registry);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function pending(overrides: Partial<Context> = {}): Context {
    const ctx: Context = {
      id: overrides.id ?? 'ctx-review',
      version: 1,
      title: 'Under review',
      description: 'A context awaiting review.',
      source: { type: 'organization', uri: 'https://example.com' },
      authority: { source: { type: 'organization', id: 'team', name: 'Team' }, level: 2 },
      lifecycle: 'candidate',
      governance: { classification: 'local-guideline', approval_required: false },
      review_status: 'pending',
      owner: 'team',
      tags: ['ops'],
      enforcement: { mode: 'warn' },
      ...overrides,
    };
    registry.save(ctx);
    return ctx;
  }

  describe('audit trail', () => {
    // Before 0.5.0 these three methods wrote straight to disk with no event,
    // so approvals were invisible to auditors and to lcd doctor.
    it('approve emits a lifecycle event', () => {
      const ctx = pending();
      manager.approve(ctx.id, 'reviewer-1', 'looks good');

      const events = registry.readLifecycleEvents();
      expect(events).toHaveLength(1);
      expect(events[0].actor).toBe('reviewer-1');
      expect(events[0].actor_role).toBe('reviewer');
      expect(events[0].reason).toMatch(/review:approved/);
      expect(events[0].metadata!.review_status_to).toBe('approved');
    });

    it('reject emits a lifecycle event', () => {
      const ctx = pending({ id: 'ctx-reject' });
      manager.reject(ctx.id, 'reviewer-2', 'conflicts with policy');

      const events = registry.readLifecycleEvents();
      expect(events).toHaveLength(1);
      expect(events[0].reason).toMatch(/review:rejected/);
    });

    it('requestRevision emits a lifecycle event', () => {
      const ctx = pending({ id: 'ctx-revise' });
      manager.requestRevision(ctx.id, 'reviewer-3', 'needs a clearer description');

      const events = registry.readLifecycleEvents();
      expect(events).toHaveLength(1);
      expect(events[0].reason).toMatch(/review:needs-revision/);
    });

    it('records the lifecycle promotion from candidate to approved', () => {
      const ctx = pending({ id: 'ctx-promote' });
      manager.approve(ctx.id, 'reviewer-1');

      const events = registry.readLifecycleEvents();
      expect(events[0].from_stage).toBe('candidate');
      expect(events[0].to_stage).toBe('approved');
      expect(registry.load(ctx.id)!.lifecycle).toBe('approved');
    });

    it('autoApprove emits one event per approved context', () => {
      pending({ id: 'ctx-auto-1' });
      pending({ id: 'ctx-auto-2' });

      const results = manager.autoApprove('improve-engine');

      expect(results).toHaveLength(2);
      expect(registry.readLifecycleEvents()).toHaveLength(2);
    });
  });

  describe('canAutoApprove', () => {
    it('permits local classifications', () => {
      expect(manager.canAutoApprove(pending({ id: 'ctx-local' }))).toBe(true);
    });

    it('refuses hardened classifications', () => {
      const ctx = pending({
        id: 'ctx-hard',
        governance: { classification: 'hardened-standard', approval_required: true },
        authority: { source: { type: 'organization', id: 'sec', name: 'Sec' }, level: 3 },
        enforcement: { mode: 'block' },
      });
      expect(manager.canAutoApprove(ctx)).toBe(false);
    });

    it('refuses a context that is not awaiting review', () => {
      const ctx = pending({ id: 'ctx-done', review_status: 'approved' });
      expect(manager.canAutoApprove(ctx)).toBe(false);
    });
  });

  it('throws for an unknown context', () => {
    expect(() => manager.approve('ctx-missing', 'reviewer')).toThrow(/not found/i);
  });
});
