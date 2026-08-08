import { ContextBundleBuilder, FileRegistry } from '@lcdd/core';

export function bundleCommand(task: string, options: { path?: string[]; tag?: string[]; category?: string[]; maxContexts?: string; maxCharacters?: string; json?: boolean }): void {
  const contexts = new FileRegistry(process.cwd()).list();
  const bundle = new ContextBundleBuilder().build(contexts, {
    task, paths: options.path, tags: options.tag, categories: options.category,
    max_contexts: options.maxContexts ? Number(options.maxContexts) : undefined,
    max_characters: options.maxCharacters ? Number(options.maxCharacters) : undefined,
  });
  if (options.json) { console.log(JSON.stringify(bundle, null, 2)); return; }
  console.log(`Context Bundle: ${bundle.entries.length} selected, ${bundle.excluded.length} excluded`);
  for (const entry of bundle.entries) console.log(`${entry.mandatory ? '!' : '-'} ${entry.context.id} (rank ${entry.rank}): ${entry.reasons.join(', ')}`);
  console.log(`Estimated tokens: ${bundle.budget.estimated_tokens}`);
}
