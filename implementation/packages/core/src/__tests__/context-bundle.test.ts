import { describe, expect, it } from 'vitest';
import { ContextBundleBuilder } from '../context-bundle.js';
import type { Context } from '../types.js';

const context = (id: string, lifecycle: Context['lifecycle'], mode: 'block' | 'warn', applies_to = ['src/**']): Context => ({
  id, version: 1, title: `${id} security`, description: 'Authentication security requirement',
  source: { type: 'organization' }, authority: { source: { type: 'organization', id: 'x', name: 'X' }, level: mode === 'block' ? 3 : 1 },
  lifecycle, governance: { classification: mode === 'block' ? 'hardened-standard' : 'local-guideline', approval_required: true },
  effective_date: lifecycle === 'active' ? '2026-01-01T00:00:00Z' : null, enforcement: { mode }, applies_to, tags: ['security'], severity: 'high',
});

describe('ContextBundleBuilder', () => {
  it('filters lifecycle and path, retaining mandatory contexts over budget', () => {
    const bundle = new ContextBundleBuilder().build([
      context('mandatory', 'active', 'block'), context('warning', 'active', 'warn'), context('old', 'deprecated', 'warn'),
    ], { task: 'authentication security', paths: ['src/auth.ts'], max_contexts: 1, max_characters: 1 });
    expect(bundle.entries.map(e => e.context.id)).toEqual(['mandatory']);
    expect(bundle.budget.exceeded_for_mandatory_contexts).toBe(true);
    expect(bundle.excluded.map(e => e.context_id)).toContain('old');
  });

  it('is deterministic apart from generated time', () => {
    const builder = new ContextBundleBuilder();
    const input = [context('b', 'active', 'warn'), context('a', 'active', 'warn')];
    expect(builder.build(input, { task: 'security' }).entries.map(e => e.context.id)).toEqual(['a', 'b']);
  });
});
