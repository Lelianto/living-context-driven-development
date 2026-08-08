import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ContextVerifier } from './verifier.js';
import { matchesAnyPath } from './path-matcher.js';
import type { ChangeSet, ChangeValidationReport, Context, FileGovernanceResult } from './types.js';

export class ChangeValidator {
  constructor(private readonly root = process.cwd(), private readonly verifier = new ContextVerifier()) {}

  async validate(changeSet: ChangeSet, contexts: Context[]): Promise<ChangeValidationReport> {
    const active = contexts.filter(context => context.lifecycle === 'active');
    const files: FileGovernanceResult[] = [];
    for (const file of changeSet.files) {
      const relevant = active
        .filter(context => matchesAnyPath(file.path, context.applies_to ?? ['**/*']))
        .sort((a, b) => b.authority.level - a.authority.level || a.id.localeCompare(b.id));
      if (!relevant.length) {
        files.push({ file, relevant_context_ids: [], results: [], decision: 'not-applicable' });
        continue;
      }
      if (file.status === 'deleted' || file.binary) {
        files.push({ file, relevant_context_ids: relevant.map(c => c.id), results: [], decision: 'not-verifiable' });
        continue;
      }
      const target = path.resolve(this.root, file.path);
      if (!target.startsWith(`${path.resolve(this.root)}${path.sep}`)) throw new Error(`Path escapes repository: ${file.path}`);
      let content: string;
      try { content = readFileSync(target, 'utf8'); }
      catch {
        files.push({ file, relevant_context_ids: relevant.map(c => c.id), results: [], decision: 'not-verifiable' });
        continue;
      }
      const results = await this.verifier.verifyAll(relevant, file.path, content);
      let decision: FileGovernanceResult['decision'] = 'pass';
      for (const result of results.filter(item => item.status === 'violation')) {
        const mode = relevant.find(context => context.id === result.context_id)?.enforcement?.mode;
        if (mode === 'block') decision = 'block';
        else if (mode === 'warn' && decision !== 'block') decision = 'warn';
      }
      files.push({ file, relevant_context_ids: relevant.map(c => c.id), results, decision });
    }
    const violations = files.filter(file => file.decision === 'block').length;
    const warnings = files.filter(file => file.decision === 'warn').length;
    return {
      schema_version: '1', generated_at: new Date().toISOString(), change_set: changeSet, files,
      totals: { changed: files.length, checked: files.filter(f => ['pass', 'warn', 'block'].includes(f.decision)).length, skipped: files.filter(f => f.decision === 'not-verifiable').length, violations, warnings },
      merge_decision: violations ? 'block' : warnings ? 'warn' : 'pass',
    };
  }
}
