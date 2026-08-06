import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileRegistry } from '../registry.js';
import type { Context } from '../types.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FileRegistry', () => {
  let tmpDir: string;
  let registry: FileRegistry;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'lcdd-test-'));
    registry = new FileRegistry(tmpDir);
    registry.ensureDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const baseFields = {
    title: 'Test Context',
    description: 'A test context for unit tests',
    authority: { source: { type: 'organization' as const, id: 'test', name: 'Test' }, level: 2 as const },
    enforcement: { mode: 'block' as const, specification: { type: 'regex-pattern', config: { patterns: ['test'] } } },
  };

  describe('create', () => {
    it('creates a context with default lifecycle draft', () => {
      const ctx = registry.create(baseFields);
      expect(ctx.id).toMatch(/^ctx-/);
      expect(ctx.version).toBe(1);
      expect(ctx.lifecycle).toBe('draft');
      expect(ctx.governance.classification).toBe('local-guideline');
    });

    it('assigns hardened-standard for high authority', () => {
      const ctx = registry.create({
        ...baseFields,
        authority: { source: { type: 'organization' as const, id: 'sec', name: 'Security' }, level: 3 },
      });
      expect(ctx.governance.classification).toBe('hardened-standard');
      expect(ctx.governance.approval_required).toBe(true);
    });

    it('accepts custom id', () => {
      const ctx = registry.create({ ...baseFields, id: 'my-custom-id' });
      expect(ctx.id).toBe('my-custom-id');
    });
  });

  describe('load', () => {
    it('loads a created context', () => {
      const created = registry.create(baseFields);
      const loaded = registry.load(created.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(created.id);
    });

    it('returns null for non-existent id', () => {
      expect(registry.load('nonexistent')).toBeNull();
    });
  });

  describe('list', () => {
    it('lists all contexts', () => {
      registry.create(baseFields);
      registry.create({ ...baseFields, title: 'Second' });
      const list = registry.list();
      expect(list).toHaveLength(2);
    });

    it('filters by lifecycle', () => {
      const ctx = registry.create(baseFields);
      registry.transition(ctx.id, 'candidate', 'user', 'review');
      registry.transition(ctx.id, 'approved', 'user', 'done');
      registry.transition(ctx.id, 'active', 'user', 'go');

      const active = registry.list({ lifecycle: 'active' });
      expect(active).toHaveLength(1);

      const draft = registry.list({ lifecycle: 'draft' });
      expect(draft).toHaveLength(0);
    });
  });

  describe('query', () => {
    it('queries with CQL-like conditions', () => {
      registry.create({ ...baseFields, category: 'security', title: 'Security Rule' });
      registry.create({ ...baseFields, category: 'performance', title: 'Perf Rule' });

      const result = registry.query({
        conditions: [{ field: 'category', op: '=', value: 'security' }],
      });
      expect(result.total).toBe(1);
      expect(result.contexts[0].category).toBe('security');
    });

    it('queries by lifecycle', () => {
      const ctx = registry.create(baseFields);
      registry.transition(ctx.id, 'candidate', 'user');
      registry.transition(ctx.id, 'approved', 'user');
      registry.transition(ctx.id, 'active', 'user');

      const result = registry.query({
        conditions: [{ field: 'lifecycle', op: '=', value: 'active' }],
      });
      expect(result.total).toBe(1);
    });

    it('supports limit and offset', () => {
      for (let i = 0; i < 5; i++) {
        registry.create({ ...baseFields, title: `Rule ${i}` });
      }
      const result = registry.query({
        conditions: [{ field: 'lifecycle', op: '=', value: 'draft' }],
        limit: 2,
        offset: 2,
      });
      expect(result.contexts).toHaveLength(2);
      expect(result.total).toBe(5);
    });
  });

  describe('transition', () => {
    it('transitions draft to candidate', () => {
      const ctx = registry.create(baseFields);
      const result = registry.transition(ctx.id, 'candidate', 'user:test', 'Ready');
      expect(result.context.lifecycle).toBe('candidate');
      expect(result.context.version).toBe(2);
    });

    it('throws on invalid transition', () => {
      const ctx = registry.create(baseFields);
      expect(() => registry.transition(ctx.id, 'active', 'user')).toThrow();
    });

    it('full lifecycle draft → active', () => {
      const ctx = registry.create(baseFields);
      registry.transition(ctx.id, 'candidate', 'user');
      registry.transition(ctx.id, 'approved', 'user');
      const final = registry.transition(ctx.id, 'active', 'user');
      expect(final.context.lifecycle).toBe('active');
      expect(final.context.version).toBe(4);
    });
  });

  describe('snapshot', () => {
    it('captures only active contexts', () => {
      const ctx = registry.create(baseFields);
      registry.transition(ctx.id, 'candidate', 'user');
      registry.transition(ctx.id, 'approved', 'user');
      registry.transition(ctx.id, 'active', 'user');

      registry.create({ ...baseFields, title: 'Draft only' });

      const snap = registry.snapshot();
      expect(snap.count).toBe(1);
      expect(snap.contexts[0].lifecycle).toBe('active');
    });
  });
});
