import { validateCommand } from './validate.js';

interface CheckOptions {
  staged?: boolean; changes?: boolean; base?: string; head?: string;
  stage?: string; strict?: boolean; json?: boolean; ci?: boolean;
}

const STAGES = new Set(['editor', 'pre-commit', 'pre-push', 'ci']);

export async function checkCommand(options: CheckOptions): Promise<void> {
  if (options.stage && !STAGES.has(options.stage)) {
    throw new Error(`Unknown check stage: ${options.stage}`);
  }
  if (options.staged && (options.changes || options.base || options.head)) {
    throw new Error('--staged cannot be combined with --changes, --base, or --head');
  }
  if (options.head && !options.base) throw new Error('--head requires --base');

  const changeScoped = Boolean(options.staged || options.changes || options.base || options.head || options.stage === 'pre-commit' || options.stage === 'pre-push' || options.stage === 'ci');
  if (!changeScoped) {
    await validateCommand('.', { strict: options.strict });
    return;
  }

  await validateCommand('.', {
    changes: true,
    staged: options.staged || options.stage === 'pre-commit',
    base: options.base,
    head: options.head,
    strict: options.strict,
    json: options.json,
    ci: options.ci || options.stage === 'ci',
  });
}
