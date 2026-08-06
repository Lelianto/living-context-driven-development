import { FileRegistry, LifecycleManager, type LifecycleStage, type Context } from '@lcdd/core';
import chalk from 'chalk';
import { createInterface } from 'readline';

function ask(q: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, (a: string) => { rl.close(); resolve(a); }));
}

export async function contextAddCommand(): Promise<void> {
  const registry = new FileRegistry(process.cwd());

  console.log(chalk.bold('\nCreate a new Context\n'));

  const title = await ask('Title: ');
  const description = await ask('Description: ');
  const category = await ask('Category (e.g., security, performance, compliance): ');
  const severity = await ask('Severity (critical/high/medium/low/info) [medium]: ');
  const owner = await ask('Owner: ');

  const context = registry.create({
    title,
    description,
    category: category || undefined,
    severity: (severity || 'medium') as Context['severity'],
    owner: owner || undefined,
    authority: {
      source: { type: 'individual', id: process.env.USER || 'unknown', name: process.env.USER || 'unknown' },
      level: 2,
    },
    tags: category ? [category.toLowerCase()] : [],
  });

  console.log('');
  console.log(chalk.green(`✓ Context created: ${context.id}`));
  console.log(chalk.dim(`  lifecycle: ${context.lifecycle}`));
  console.log(chalk.dim(`  file: .lcdd/contexts/${context.id}.yaml`));
}

export async function listCommand(options: { lifecycle?: string; category?: string; tags?: string }): Promise<void> {
  const registry = new FileRegistry(process.cwd());
  const filter: Partial<Context> = {};

  if (options.lifecycle) filter.lifecycle = options.lifecycle as LifecycleStage;
  if (options.category) filter.category = options.category;

  const contexts = registry.list(filter);

  if (contexts.length === 0) {
    console.log(chalk.dim('No contexts found.'));
    return;
  }

  console.log(chalk.bold(`\nContexts (${contexts.length})\n`));

  for (const ctx of contexts) {
    const stageColor = ctx.lifecycle === 'active' ? chalk.green :
                        ctx.lifecycle === 'deprecated' ? chalk.yellow :
                        ctx.lifecycle === 'draft' ? chalk.dim : chalk.blue;

    console.log(`  ${chalk.cyan(ctx.id)}  v${ctx.version}  ${stageColor(ctx.lifecycle)}  ${chalk.dim(ctx.title)}`);
  }
  console.log('');
}

export async function showCommand(id: string): Promise<void> {
  const registry = new FileRegistry(process.cwd());
  const ctx = registry.load(id);

  if (!ctx) {
    console.log(chalk.red(`Context not found: ${id}`));
    process.exit(1);
  }

  console.log(chalk.bold(`\n${ctx.id}  v${ctx.version}\n`));
  console.log(chalk.underline(ctx.title));
  console.log('');
  console.log(ctx.description);
  console.log('');
  console.log(chalk.dim(`  Lifecycle: ${ctx.lifecycle}`));
  console.log(chalk.dim(`  Authority: level ${ctx.authority.level} (${ctx.authority.source.name})`));
  console.log(chalk.dim(`  Governance: ${ctx.governance.classification}`));
  console.log(chalk.dim(`  Enforcement: ${ctx.enforcement?.mode || 'not configured'}`));
  if (ctx.tags && ctx.tags.length > 0) {
    console.log(chalk.dim(`  Tags: ${ctx.tags.join(', ')}`));
  }
  console.log('');
}

export async function transitionCommand(id: string, stage: string, options: { reason?: string }): Promise<void> {
  const registry = new FileRegistry(process.cwd());
  const ctx = registry.load(id);

  if (!ctx) {
    console.log(chalk.red(`Context not found: ${id}`));
    process.exit(1);
  }

  const allowedStages: LifecycleStage[] = ['draft', 'candidate', 'approved', 'active', 'deprecated', 'archived'];
  if (!allowedStages.includes(stage as LifecycleStage)) {
    console.log(chalk.red(`Invalid stage: ${stage}. Must be one of: ${allowedStages.join(', ')}`));
    process.exit(1);
  }

  try {
    const result = registry.transition(id, stage as LifecycleStage, process.env.USER || 'cli', options.reason);
    console.log(chalk.green(`✓ ${result.context.id}: ${result.event.from_stage} → ${result.event.to_stage}`));
  } catch (e) {
    console.log(chalk.red(`Transition failed: ${(e as Error).message}`));
    process.exit(1);
  }
}
