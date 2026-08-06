import { describe, it, expect } from 'vitest';
import { ContextNormalizer } from '../normalizer.js';
import { buildExtractionPrompt, parseLlmJsonResponse } from '../extractor.js';
import type { CandidateContext } from '../extractor.js';
import type { Context } from '../types.js';

function makeCandidate(overrides: Partial<CandidateContext> = {}): CandidateContext {
  return {
    title: 'All API endpoints must use HTTPS',
    description: 'Every production API endpoint must enforce HTTPS. HTTP must redirect to HTTPS.',
    category: 'security',
    severity: 'critical',
    source_location: 'Section 3.1',
    confidence: 0.9,
    raw_text: 'All API endpoints must use HTTPS...',
    ...overrides,
  };
}

describe('ContextNormalizer', () => {
  const normalizer = new ContextNormalizer();

  describe('normalize', () => {
    it('maps candidate to full Context schema', () => {
      const candidate = makeCandidate();
      const result = normalizer.normalize([candidate], []);

      expect(result.normalized).toHaveLength(1);
      const ctx = result.normalized[0];
      expect(ctx.id).toMatch(/^ctx-/);
      expect(ctx.title).toBe('All API endpoints must use HTTPS');
      expect(ctx.description).toContain('HTTPS');
      expect(ctx.lifecycle).toBe('draft');
      expect(ctx.version).toBe(1);
      expect(ctx.source?.type).toBe('automated');
      expect(ctx.source?.extraction_method).toBe('llm');
      expect(ctx.source?.confidence).toBe(0.9);
      expect(ctx.review_status).toBe('pending');
    });

    it('generates unique IDs', () => {
      const c1 = makeCandidate({ title: 'Rule A' });
      const c2 = makeCandidate({ title: 'Rule B' });
      const result = normalizer.normalize([c1, c2], []);

      expect(result.normalized).toHaveLength(2);
      expect(result.normalized[0].id).not.toBe(result.normalized[1].id);
    });

    it('applies RuleEngine defaults', () => {
      const candidate = makeCandidate({
        title: 'All systems must encrypt data at rest',
        description: 'Strong encryption is mandatory for stored data.',
        category: 'security',
      });
      const result = normalizer.normalize([candidate], []);

      expect(result.normalized).toHaveLength(1);
      const ctx = result.normalized[0];
      expect(ctx.authority.level).toBeGreaterThanOrEqual(1);
      expect(ctx.governance.classification).toBeTruthy();
      expect(ctx.tags).toBeDefined();
      expect(ctx.tags!.length).toBeGreaterThan(0);
    });

    it('writes source_location to evidence', () => {
      const candidate = makeCandidate({ source_location: 'Article 5, Paragraph 2' });
      const result = normalizer.normalize([candidate], []);

      expect(result.normalized[0].evidence).toBeDefined();
      expect(result.normalized[0].evidence![0].description).toContain('Article 5');
    });

    it('skips low-confidence candidates', () => {
      const candidate = makeCandidate({ confidence: 0.3 });
      const result = normalizer.normalize([candidate], []);

      expect(result.normalized).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('low_confidence');
    });

    it('skips candidates with empty title', () => {
      const candidate = makeCandidate({ title: '' });
      const result = normalizer.normalize([candidate], []);

      expect(result.normalized).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
    });
  });

  describe('jaccardSimilarity', () => {
    it('returns 1.0 for identical strings', () => {
      const sim = normalizer.jaccardSimilarity('hello world test', 'hello world test');
      expect(sim).toBeCloseTo(1.0, 1);
    });

    it('returns ~0 for completely different strings', () => {
      const sim = normalizer.jaccardSimilarity('hello world', 'goodbye planet');
      expect(sim).toBe(0);
    });

    it('returns moderate score for partially similar strings', () => {
      const sim = normalizer.jaccardSimilarity(
        'all API endpoints must use HTTPS',
        'all API endpoints should use TLS'
      );
      expect(sim).toBeGreaterThan(0.2);
      expect(sim).toBeLessThan(0.9);
    });

    it('is case-insensitive', () => {
      const sim = normalizer.jaccardSimilarity('HELLO WORLD', 'hello world');
      expect(sim).toBeCloseTo(1.0, 1);
    });

    it('ignores punctuation', () => {
      const sim = normalizer.jaccardSimilarity('hello, world!', 'hello world');
      expect(sim).toBeCloseTo(1.0, 1);
    });
  });

  describe('hashContext', () => {
    it('produces deterministic hash', () => {
      const ctx1 = normalizer.normalize([makeCandidate()], []) as { normalized: Context[] };
      const ctx2 = normalizer.normalize([makeCandidate()], []) as { normalized: Context[] };
      const hash1 = normalizer.hashContext(ctx1.normalized[0]);
      const hash2 = normalizer.hashContext(ctx2.normalized[0]);
      expect(hash1).toBe(hash2);
    });
  });

  describe('dedup', () => {
    it('skips exact duplicates against existing contexts', () => {
      const candidate = makeCandidate();
      const firstPass = normalizer.normalize([candidate], []);
      const existing = firstPass.normalized;
      const secondPass = normalizer.normalize([candidate], existing);

      expect(secondPass.normalized).toHaveLength(0);
      expect(secondPass.skipped).toHaveLength(1);
      expect(secondPass.skipped[0].reason).toBe('duplicate');
    });

    it('flags near-duplicates when similarity is high', () => {
      const candidate = makeCandidate({
        title: 'All API endpoints must use HTTPS',
        description: 'Every production API endpoint must enforce HTTPS. HTTP must redirect to HTTPS.',
      });

      const existingCtx = normalizer.normalize([makeCandidate()], []);
      const result = normalizer.normalize([candidate], existingCtx.normalized);

      expect(result.normalized).toHaveLength(0);
      expect(result.flagged.length + result.skipped.length).toBeGreaterThan(0);
    });
  });
});

describe('buildExtractionPrompt', () => {
  it('contains constraint detection keywords', () => {
    const prompt = buildExtractionPrompt('test content', 'website');
    expect(prompt).toContain('MUST');
    expect(prompt).toContain('SHALL');
    expect(prompt).toContain('candidates');
    expect(prompt).toContain('constraint');
  });

  it('includes source type', () => {
    const prompt = buildExtractionPrompt('test', 'git');
    expect(prompt).toContain('git');
  });
});

describe('parseLlmJsonResponse', () => {
  it('parses valid JSON response', () => {
    const json = JSON.stringify({
      candidates: [{
        title: 'Test Rule',
        description: 'A test constraint.',
        category: 'security',
        severity: 'critical',
        confidence: 0.95,
      }],
    });
    const result = parseLlmJsonResponse(json);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test Rule');
    expect(result[0].confidence).toBeCloseTo(0.95);
  });

  it('parses JSON inside markdown code block', () => {
    const text = '```json\n{"candidates":[{"title":"Test","description":"Desc","confidence":0.8}]}\n```';
    const result = parseLlmJsonResponse(text);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test');
  });

  it('returns empty for no candidates', () => {
    const result = parseLlmJsonResponse('{"candidates":[]}');
    expect(result).toHaveLength(0);
  });

  it('clamps confidence to 0-1', () => {
    const json = JSON.stringify({
      candidates: [{ title: 'T', description: 'D', confidence: 1.5 }],
    });
    const result = parseLlmJsonResponse(json);
    expect(result[0].confidence).toBe(1.0);
  });

  it('throws on malformed JSON', () => {
    expect(() => parseLlmJsonResponse('not json')).toThrow();
  });

  it('handles missing optional fields', () => {
    const json = JSON.stringify({
      candidates: [{ title: 'Minimal', description: 'Just enough', confidence: 0.5 }],
    });
    const result = parseLlmJsonResponse(json);
    expect(result[0].severity).toBe('medium');
    expect(result[0].category).toBeUndefined();
  });
});
