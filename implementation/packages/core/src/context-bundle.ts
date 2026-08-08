import type { Context, ContextBundle, ContextBundleEntry, ContextBundleRequest } from './types.js';
import { matchesAnyPath } from './path-matcher.js';

const SEVERITY = { critical: 25, high: 20, medium: 10, low: 5, info: 0 } as const;
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'implement', 'create', 'update']);
const tokens = (value: string) => [...new Set(value.toLowerCase().match(/[\p{L}\p{N}_-]{3,}/gu) ?? [])].filter(t => !STOP.has(t));

export class ContextBundleBuilder {
  build(contexts: Context[], request: ContextBundleRequest): ContextBundle {
    if (!request.task.trim()) throw new Error('Bundle task must not be empty');
    const maxContexts = request.max_contexts ?? 20;
    const maxCharacters = request.max_characters ?? 24_000;
    if (maxContexts < 1 || maxCharacters < 1) throw new Error('Bundle budgets must be positive');
    const taskTokens = tokens(request.task);
    const excluded: ContextBundle['excluded'] = [];
    const candidates: ContextBundleEntry[] = [];

    for (const context of contexts) {
      if (context.lifecycle !== 'active') { excluded.push({ context_id: context.id, reason: `lifecycle:${context.lifecycle}` }); continue; }
      const pathMatch = !request.paths?.length || request.paths.some(p => matchesAnyPath(p, context.applies_to ?? ['**/*']));
      if (!pathMatch) { excluded.push({ context_id: context.id, reason: 'path-scope-mismatch' }); continue; }
      let rank = context.authority.level * 10 + SEVERITY[context.severity ?? 'info'];
      const reasons = [`authority:${context.authority.level}`];
      if (request.paths?.length) { rank += 100; reasons.push('path-match'); }
      const tagMatches = request.tags?.filter(tag => context.tags?.includes(tag)).length ?? 0;
      if (tagMatches) { rank += tagMatches * 40; reasons.push(`tags:${tagMatches}`); }
      if (request.categories?.includes(context.category ?? '')) { rank += 40; reasons.push('category-match'); }
      for (const token of taskTokens) {
        if (context.title.toLowerCase().includes(token)) { rank += 20; reasons.push(`title:${token}`); }
        if (context.tags?.some(tag => tag.toLowerCase().includes(token))) { rank += 15; reasons.push(`tag:${token}`); }
      }
      const descriptionMatches = taskTokens.filter(token => context.description.toLowerCase().includes(token)).length;
      rank += Math.min(descriptionMatches * 5, 25);
      if (descriptionMatches) reasons.push(`description:${descriptionMatches}`);
      const mandatory = context.enforcement?.mode === 'block' && Boolean(request.paths?.length);
      const serialized = JSON.stringify(context);
      candidates.push({ context, rank, reasons, mandatory, estimated_tokens: Math.ceil(serialized.length / 4) });
    }

    candidates.sort((a, b) => Number(b.mandatory) - Number(a.mandatory) || b.rank - a.rank || b.context.authority.level - a.context.authority.level || a.context.id.localeCompare(b.context.id));
    const entries: ContextBundleEntry[] = [];
    let used = 0;
    let exceeded = false;
    for (const entry of candidates) {
      const size = JSON.stringify(entry.context).length;
      if (!entry.mandatory && (entries.length >= maxContexts || used + size > maxCharacters)) {
        excluded.push({ context_id: entry.context.id, reason: 'budget' }); continue;
      }
      if (entry.mandatory && (entries.length >= maxContexts || used + size > maxCharacters)) exceeded = true;
      entries.push(entry); used += size;
    }
    return {
      schema_version: '1', task: request.task, generated_at: new Date().toISOString(), entries,
      excluded: excluded.sort((a, b) => a.context_id.localeCompare(b.context_id)), conflicts: [],
      budget: { max_contexts: maxContexts, max_characters: maxCharacters, used_characters: used, estimated_tokens: Math.ceil(used / 4), exceeded_for_mandatory_contexts: exceeded },
    };
  }
}
