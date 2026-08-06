import { describe, it, expect } from 'vitest';
import { LifecycleManager } from '../lifecycle.js';
import type { Context, LifecycleStage } from '../types.js';

function makeContext(lifecycle: LifecycleStage, overrides: Partial<Context> = {}): Context {
  return {
    id: 'ctx-test',
    version: 1,
    title: 'Test Context',
    description: 'Test',
    source: { type: 'organization' },
    authority: { source: { type: 'organization', id: 'test', name: 'Test' }, level: 2 },
    lifecycle,
    governance: { classification: 'local-guideline', approval_required: false },
    ...overrides,
  } as Context;
}

describe('LifecycleManager', () => {
  describe('getAllowedTransitions', () => {
    it('draft can go to candidate or archived', () => {
      const allowed = LifecycleManager.getAllowedTransitions('draft');
      expect(allowed).toContain('candidate');
      expect(allowed).toContain('archived');
      expect(allowed).not.toContain('active');
    });

    it('active can go to deprecated or approved', () => {
      const allowed = LifecycleManager.getAllowedTransitions('active');
      expect(allowed).toContain('deprecated');
      expect(allowed).toContain('approved');
      expect(allowed).not.toContain('draft');
    });

    it('deprecated can go to active or archived', () => {
      const allowed = LifecycleManager.getAllowedTransitions('deprecated');
      expect(allowed).toContain('active');
      expect(allowed).toContain('archived');
    });
  });

  describe('canTransition', () => {
    it('allows draft → candidate', () => {
      const ctx = makeContext('draft');
      expect(LifecycleManager.canTransition(ctx, 'candidate')).toBe(true);
    });

    it('rejects active → draft', () => {
      const ctx = makeContext('active');
      expect(LifecycleManager.canTransition(ctx, 'draft')).toBe(false);
    });

    it('rejects candidate → candidate', () => {
      const ctx = makeContext('candidate');
      expect(LifecycleManager.canTransition(ctx, 'candidate')).toBe(false);
    });

    it('allows approved → active even without review_status set', () => {
      const ctx = makeContext('approved');
      expect(LifecycleManager.canTransition(ctx, 'active')).toBe(true);
    });
  });

  describe('transition', () => {
    it('transitions draft → candidate and sets review_status', () => {
      const ctx = makeContext('draft');
      const result = LifecycleManager.transition(ctx, 'candidate', 'user:test');
      expect(result.context.lifecycle).toBe('candidate');
      expect(result.context.version).toBe(2);
      expect(result.context.review_status).toBe('pending');
      expect(result.event.from_stage).toBe('draft');
      expect(result.event.to_stage).toBe('candidate');
    });

    it('increments version on transition', () => {
      const ctx = makeContext('draft');
      const r1 = LifecycleManager.transition(ctx, 'candidate', 'user:test');
      const r2 = LifecycleManager.transition(r1.context, 'approved', 'user:test');
      expect(r2.context.version).toBe(3);
    });

    it('sets effective_date when transitioning to active', () => {
      const ctx = makeContext('approved');
      const result = LifecycleManager.transition(ctx, 'active', 'user:admin');
      expect(result.context.effective_date).toBeDefined();
      expect(result.context.lifecycle).toBe('active');
    });

    it('sets deprecated_date when transitioning to deprecated', () => {
      const ctx = makeContext('active');
      const result = LifecycleManager.transition(ctx, 'deprecated', 'user:admin');
      expect(result.context.deprecated_date).toBeDefined();
    });

    it('throws on invalid transition', () => {
      const ctx = makeContext('active');
      expect(() => LifecycleManager.transition(ctx, 'draft', 'user:test')).toThrow();
    });
  });

  describe('isEnforceable', () => {
    it('active is enforceable', () => {
      expect(LifecycleManager.isEnforceable('active')).toBe(true);
    });

    it('approved is enforceable (warn mode)', () => {
      expect(LifecycleManager.isEnforceable('approved')).toBe(true);
    });

    it('deprecated is enforceable', () => {
      expect(LifecycleManager.isEnforceable('deprecated')).toBe(true);
    });

    it('draft is not enforceable', () => {
      expect(LifecycleManager.isEnforceable('draft')).toBe(false);
    });

    it('archived is not enforceable', () => {
      expect(LifecycleManager.isEnforceable('archived')).toBe(false);
    });
  });

  describe('getEnforcementMode', () => {
    it('draft returns silent', () => {
      expect(LifecycleManager.getEnforcementMode(makeContext('draft'))).toBe('silent');
    });

    it('candidate returns comment', () => {
      expect(LifecycleManager.getEnforcementMode(makeContext('candidate'))).toBe('comment');
    });

    it('active with level 4 returns block', () => {
      const ctx = makeContext('active', { authority: { source: { type: 'standard-body', id: 'ojk', name: 'OJK' }, level: 4 } });
      expect(LifecycleManager.getEnforcementMode(ctx)).toBe('block');
    });

    it('respects explicit enforcement mode', () => {
      const ctx = makeContext('active', { enforcement: { mode: 'warn' } });
      expect(LifecycleManager.getEnforcementMode(ctx)).toBe('warn');
    });
  });
});
