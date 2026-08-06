import { describe, it, expect } from 'vitest';
import { validateContext, validateContextFull, validateSemanticRules } from '../schema.js';
import type { Context } from '../types.js';

function makeContext(overrides: Partial<Context> = {}): Context {
  return {
    id: 'ctx-test',
    version: 1,
    title: 'Test',
    description: 'Test description',
    source: { type: 'organization' },
    authority: { source: { type: 'organization', id: 'test', name: 'Test' }, level: 2 },
    lifecycle: 'draft',
    governance: { classification: 'local-guideline', approval_required: false },
    ...overrides,
  } as Context;
}

describe('validateContext', () => {
  it('validates a minimal context', () => {
    const ctx = makeContext();
    const result = validateContext(ctx);
    expect(result.valid).toBe(true);
  });

  it('rejects null', () => {
    const result = validateContext(null);
    expect(result.valid).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = validateContext({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid lifecycle value', () => {
    const ctx = makeContext({ lifecycle: 'invalid' as any });
    const result = validateContext(ctx);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid authority level', () => {
    const ctx = makeContext({ authority: { source: { type: 'organization', id: 't', name: 'T' }, level: 99 as any } });
    const result = validateContext(ctx);
    expect(result.valid).toBe(false);
  });

  it('accepts valid severity values', () => {
    for (const sev of ['critical', 'high', 'medium', 'low', 'info']) {
      const ctx = makeContext({ severity: sev as Context['severity'] });
      expect(validateContext(ctx).valid).toBe(true);
    }
  });

  it('accepts valid lifecycle values', () => {
    for (const stage of ['draft', 'candidate', 'approved', 'active', 'deprecated', 'archived']) {
      const ctx = makeContext({ lifecycle: stage as Context['lifecycle'] });
      expect(validateContext(ctx).valid).toBe(true);
    }
  });
});

describe('validateSemanticRules', () => {
  it('requires review_status for candidate', () => {
    const ctx = makeContext({ lifecycle: 'candidate' });
    const errors = validateSemanticRules(ctx);
    expect(errors).toContain('Candidate contexts must have a review_status');
  });

  it('requires effective_date for active', () => {
    const ctx = makeContext({ lifecycle: 'active', enforcement: { mode: 'block' } });
    const errors = validateSemanticRules(ctx);
    expect(errors).toContain('Active contexts must have an effective_date');
  });

  it('requires enforcement for active', () => {
    const ctx = makeContext({ lifecycle: 'active', effective_date: '2026-01-01T00:00:00Z' });
    const errors = validateSemanticRules(ctx);
    expect(errors).toContain('Active contexts must have enforcement configured');
  });

  it('requires deprecated_date for deprecated', () => {
    const ctx = makeContext({ lifecycle: 'deprecated' });
    const errors = validateSemanticRules(ctx);
    expect(errors).toContain('deprecated contexts must have a deprecated_date');
  });

  it('warns about level >= 3 without block mode', () => {
    const ctx = makeContext({
      lifecycle: 'active',
      effective_date: '2026-01-01T00:00:00Z',
      enforcement: { mode: 'warn' },
      authority: { source: { type: 'organization', id: 't', name: 'T' }, level: 3 },
    });
    const errors = validateSemanticRules(ctx);
    expect(errors).toContain('Active contexts with authority level >= 3 should use block enforcement mode');
  });

  it('checks effective_date before deprecated_date', () => {
    const ctx = makeContext({
      lifecycle: 'active',
      effective_date: '2026-06-01T00:00:00Z',
      deprecated_date: '2026-01-01T00:00:00Z',
      enforcement: { mode: 'block' },
    });
    const errors = validateSemanticRules(ctx);
    expect(errors).toContain('effective_date must be before deprecated_date');
  });

  it('passes a well-formed active context', () => {
    const ctx = makeContext({
      lifecycle: 'active',
      effective_date: '2026-01-01T00:00:00Z',
      enforcement: { mode: 'block' },
    });
    const errors = validateSemanticRules(ctx);
    expect(errors).toEqual([]);
  });
});

describe('validateContextFull', () => {
  it('combines schema and semantic validation', () => {
    const ctx = makeContext({ lifecycle: 'candidate' });
    const result = validateContextFull(ctx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Candidate contexts must have a review_status');
  });

  it('passes a complete valid context', () => {
    const ctx = makeContext({
      lifecycle: 'active',
      effective_date: '2026-01-01T00:00:00Z',
      enforcement: { mode: 'block' },
      review_status: 'approved',
      category: 'security',
      severity: 'high',
      owner: 'team',
      tags: ['api'],
    });
    const result = validateContextFull(ctx);
    expect(result.valid).toBe(true);
  });
});
