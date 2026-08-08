import { describe, it, expect, beforeEach } from 'vitest';
import { ContextVerifier, VERIFIER_LIMITS } from '../verifier.js';
import type { Context } from '../types.js';
import { writeFileSync, unlinkSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function makeContext(overrides: Partial<Context> = {}): Context {
  return {
    id: 'ctx-test',
    version: 1,
    title: 'Test',
    description: 'Test',
    source: { type: 'organization' },
    authority: { source: { type: 'organization', id: 't', name: 'T' }, level: 2 },
    lifecycle: 'active',
    governance: { classification: 'local-guideline', approval_required: false },
    effective_date: '2026-01-01T00:00:00Z',
    enforcement: { mode: 'block' },
    ...overrides,
  } as Context;
}

describe('ContextVerifier', () => {
  let verifier: ContextVerifier;

  beforeEach(() => {
    verifier = new ContextVerifier();
  });

  describe('verify', () => {
    it('returns not_applicable for draft contexts', async () => {
      const ctx = makeContext({ lifecycle: 'draft' });
      const result = await verifier.verify(ctx, 'test.ts', 'content');
      expect(result.status).toBe('not_applicable');
    });

    it('returns not_applicable for archived contexts', async () => {
      const ctx = makeContext({ lifecycle: 'archived' });
      const result = await verifier.verify(ctx, 'test.ts', 'content');
      expect(result.status).toBe('not_applicable');
    });

    it('returns not_applicable when glob does not match', async () => {
      const ctx = makeContext({ applies_to: ['src/**'] });
      const result = await verifier.verify(ctx, 'test/test.ts', 'content');
      expect(result.status).toBe('not_applicable');
    });

    it('returns compliant for matching glob and no enforcement spec', async () => {
      const ctx = makeContext({ applies_to: ['**/*.ts'] });
      const result = await verifier.verify(ctx, 'src/test.ts', 'content');
      expect(result.status).toBe('compliant');
    });

    it('returns error for unknown verifier type', async () => {
      const ctx = makeContext({
        enforcement: { mode: 'block', specification: { type: 'unknown-verifier' } },
      });
      const result = await verifier.verify(ctx, 'test.ts', 'content');
      expect(result.status).toBe('error');
    });
  });

  describe('regex verifier', () => {
    it('detects forbidden pattern match', async () => {
      const ctx = makeContext({
        enforcement: {
          mode: 'block',
          specification: {
            type: 'regex-pattern',
            config: { patterns: ['eval\\('], should_not_match: true },
          },
        },
      });
      const result = await verifier.verify(ctx, 'test.ts', "eval('hello')");
      expect(result.status).toBe('violation');
    });

    it('passes when forbidden pattern does not match', async () => {
      const ctx = makeContext({
        enforcement: {
          mode: 'block',
          specification: {
            type: 'regex-pattern',
            config: { patterns: ['eval\\('], should_not_match: true },
          },
        },
      });
      const result = await verifier.verify(ctx, 'test.ts', "console.log('ok')");
      expect(result.status).toBe('compliant');
    });

    it('detects missing required pattern', async () => {
      const ctx = makeContext({
        enforcement: {
          mode: 'block',
          specification: {
            type: 'regex-pattern',
            config: { patterns: ['import.*from'], should_match: true },
          },
        },
      });
      const result = await verifier.verify(ctx, 'test.ts', 'const x = 1;');
      expect(result.status).toBe('violation');
    });

    it('handles inline regex flags (?i)', async () => {
      const ctx = makeContext({
        enforcement: {
          mode: 'block',
          specification: {
            type: 'regex-pattern',
            config: { patterns: ['(?i)secret'], should_not_match: true },
          },
        },
      });
      const result = await verifier.verify(ctx, 'test.ts', 'const SECRET = "abc"');
      expect(result.status).toBe('violation');
    });

    it('handles invalid regex gracefully', async () => {
      const ctx = makeContext({
        enforcement: {
          mode: 'block',
          specification: {
            type: 'regex-pattern',
            config: { patterns: ['[unclosed'], should_not_match: true },
          },
        },
      });
      const result = await verifier.verify(ctx, 'test.ts', 'content');
      expect(result.status).toBe('error');
    });

    it('rejects nested quantified patterns', async () => {
      const ctx = makeContext({
        enforcement: {
          mode: 'block',
          specification: {
            type: 'regex-pattern',
            config: { patterns: ['(a+)+$'], should_not_match: true },
          },
        },
      });
      const result = await verifier.verify(ctx, 'test.txt', 'a'.repeat(100));
      expect(result.status).toBe('error');
      expect(result.violations?.[0].description).toContain('safety limits');
    });

    it('rejects oversized artifacts before regex evaluation', async () => {
      const ctx = makeContext({
        enforcement: {
          mode: 'block',
          specification: {
            type: 'regex-pattern',
            config: { patterns: ['secret'], should_not_match: true },
          },
        },
      });
      const result = await verifier.verify(ctx, 'large.txt', 'a'.repeat(VERIFIER_LIMITS.MAX_ARTIFACT_BYTES + 1));
      expect(result.status).toBe('error');
      expect(result.violations?.[0].description).toContain('exceeds regex verification limit');
    });
  });

  describe('file-exists verifier', () => {
    it('detects missing required file', async () => {
      const ctx = makeContext({
        enforcement: {
          mode: 'block',
          specification: {
            type: 'file-exists',
            config: { files: ['definitely-does-not-exist-xyz.yaml'], at_least_one: false },
          },
        },
      });
      const result = await verifier.verify(ctx, 'any-file.ts', '');
      expect(result.status).toBe('violation');
    });
  });

  describe('custom verifier registration', () => {
    it('supports registering custom verifiers', async () => {
      verifier.register('always-violate', (_spec, artifactPath, _content) => ({
        context_id: '',
        artifact_path: artifactPath,
        status: 'violation',
        violations: [{ description: 'Custom violation' }],
        confidence: 1,
      }));

      const ctx = makeContext({
        enforcement: { mode: 'block', specification: { type: 'always-violate' } },
      });
      const result = await verifier.verify(ctx, 'test.ts', 'content');
      expect(result.status).toBe('violation');
    });
  });

  describe('enforce', () => {
    it('blocks on violation with block mode', async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'lcdd-verify-'));
      const tmpFile = join(tmpDir, 'test.ts');
      writeFileSync(tmpFile, "eval('hello')");

      try {
        const ctx = makeContext({
          authority: { source: { type: 'organization', id: 'sec', name: 'Sec' }, level: 3 },
          enforcement: {
            mode: 'block',
            specification: {
              type: 'regex-pattern',
              config: { patterns: ['eval\\('], should_not_match: true },
            },
          },
        });
        const { blocked } = await verifier.enforce(
          [ctx],
          tmpFile,
          { type: 'human', id: 'dev' }
        );
        expect(blocked).toBe(true);
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('does not block on warn-mode violation', async () => {
      const ctx = makeContext({
        enforcement: {
          mode: 'warn',
          specification: {
            type: 'regex-pattern',
            config: { patterns: ['eval\\('], should_not_match: true },
          },
        },
      });
      const { blocked } = await verifier.enforce(
        [ctx],
        'test.ts',
        { type: 'human', id: 'dev' }
      );
      expect(blocked).toBe(false);
    });
  });

  describe('glob matching', () => {
    it('matches root-level files with **/*', async () => {
      const ctx = makeContext({
        applies_to: ['**/*'],
        enforcement: {
          mode: 'block',
          specification: {
            type: 'regex-pattern',
            config: { patterns: ['eval\\('], should_not_match: true },
          },
        },
      });
      const result = await verifier.verify(ctx, 'file.txt', "eval('test')");
      expect(result.status).toBe('violation');
    });

    it('matches nested files with **/*', async () => {
      const ctx = makeContext({
        applies_to: ['**/*.ts'],
        enforcement: {
          mode: 'block',
          specification: {
            type: 'regex-pattern',
            config: { patterns: ['eval\\('], should_not_match: true },
          },
        },
      });
      const result = await verifier.verify(ctx, 'src/deep/nested/file.ts', "eval('test')");
      expect(result.status).toBe('violation');
    });
  });
});
