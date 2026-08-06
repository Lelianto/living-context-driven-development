import { createHash } from 'crypto';
import { v4 as uuid } from 'uuid';
import type { Context } from './types.js';
import type { CandidateContext } from './extractor.js';
import { validateContextFull } from './schema.js';
import { RuleEngine } from './rule-engine.js';

export type { CandidateContext };

export interface NormalizationResult {
  normalized: Context[];
  skipped: { reason: 'duplicate' | 'invalid' | 'low_confidence'; candidate: CandidateContext; detail?: string }[];
  flagged: { reason: 'near-duplicate'; similarity: number; existingId: string; existingTitle: string; candidate: CandidateContext }[];
}

export class ContextNormalizer {
  private ruleEngine: RuleEngine;

  constructor() {
    this.ruleEngine = new RuleEngine();
  }

  normalize(candidates: CandidateContext[], existing: Context[]): NormalizationResult {
    const result: NormalizationResult = { normalized: [], skipped: [], flagged: [] };
    const existingHashes = new Set(existing.map(c => this.hashContext(c)));

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];

      if (candidate.confidence < 0.5) {
        result.skipped.push({
          reason: 'low_confidence',
          candidate,
          detail: `Confidence ${candidate.confidence} below threshold 0.5`,
        });
        continue;
      }

      const context = this.mapToContext(candidate, i);
      const validation = validateContextFull(context);

      if (!validation.valid) {
        result.skipped.push({
          reason: 'invalid',
          candidate,
          detail: validation.errors.join('; '),
        });
        continue;
      }

      const hash = this.hashContext(context);

      if (existingHashes.has(hash)) {
        result.skipped.push({
          reason: 'duplicate',
          candidate,
          detail: `Exact duplicate of an existing context`,
        });
        continue;
      }

      let isNearDuplicate = false;
      for (const existingCtx of existing) {
        const sim = this.jaccardSimilarity(
          `${context.title} ${context.description}`,
          `${existingCtx.title} ${existingCtx.description}`
        );
        if (sim > 0.8) {
          result.flagged.push({
            reason: 'near-duplicate',
            similarity: parseFloat(sim.toFixed(2)),
            existingId: existingCtx.id,
            existingTitle: existingCtx.title,
            candidate,
          });
          isNearDuplicate = true;
          break;
        }
      }

      if (!isNearDuplicate) {
        result.normalized.push(context);
      } else {
        result.skipped.push({
          reason: 'duplicate',
          candidate,
          detail: 'Near-duplicate — flagged for review. Use --force to override.',
        });
      }
    }

    return result;
  }

  private mapToContext(candidate: CandidateContext, index: number): Context {
    const classification = this.ruleEngine.classify({
      title: candidate.title,
      description: candidate.description,
      category: candidate.category,
    });

    return {
      id: `ctx-${uuid().slice(0, 8)}`,
      version: 1,
      title: candidate.title,
      description: candidate.description,
      source: {
        type: 'automated',
        extraction_method: 'llm',
        confidence: candidate.confidence,
        location: candidate.source_location,
      },
      authority: {
        source: {
          type: classification.authority_source_type === 'regulatory' ? 'standard-body' : classification.authority_source_type === 'documentation' ? 'organization' : classification.authority_source_type === 'meeting' ? 'individual' : classification.authority_source_type === 'incident' ? 'automated' : classification.authority_source_type === 'unknown' ? 'individual' : classification.authority_source_type as Context['authority']['source']['type'],
          id: 'extractor',
          name: 'Automated Extraction',
        },
        level: classification.authority_level,
      },
      lifecycle: 'draft',
      governance: {
        classification: classification.governance,
        approval_required: classification.authority_level >= 3,
      },
      category: candidate.category || classification.tags[0] || undefined,
      severity: (candidate.severity as Context['severity']) || classification.severity,
      applies_to: ['**/*'],
      review_status: 'pending',
      enforcement: {
        mode: 'comment',
      },
      evidence: candidate.source_location
        ? [{ type: 'source', description: `Extracted from: ${candidate.source_location}` }]
        : [],
      tags: classification.tags,
      metadata: {
        extraction_confidence: candidate.confidence,
        raw_text: candidate.raw_text.slice(0, 500),
      },
    };
  }

  hashContext(ctx: Context): string {
    const normalized = `${ctx.title.trim().toLowerCase()}|${ctx.description.trim().toLowerCase()}`;
    return createHash('sha256').update(normalized).digest('hex');
  }

  jaccardSimilarity(a: string, b: string): number {
    const tokenize = (s: string): Set<string> => {
      const tokens = s.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 2);
      return new Set(tokens);
    };

    const setA = tokenize(a);
    const setB = tokenize(b);

    if (setA.size === 0 && setB.size === 0) return 1;
    if (setA.size === 0 || setB.size === 0) return 0;

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }
}
