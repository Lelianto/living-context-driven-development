import { FileRegistry, LifecycleManager, RuleEngine, type LifecycleStage, type Context, type Severity } from '@lcdd/core';
import chalk from 'chalk';
import { createInterface } from 'readline';

function ask(q: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, (a: string) => { rl.close(); resolve(a); }));
}

function mapSourceTypeToAuthorityType(sourceType: string): Context['authority']['source']['type'] {
  const valid: Context['authority']['source']['type'][] = ['individual', 'organization', 'standard-body', 'ai-system', 'community', 'automated'];
  if (sourceType === 'regulatory') return 'standard-body';
  if (sourceType === 'documentation') return 'organization';
  if (sourceType === 'meeting') return 'individual';
  if (sourceType === 'incident') return 'automated';
  if (sourceType === 'unknown') return 'individual';
  if (valid.includes(sourceType as Context['authority']['source']['type'])) {
    return sourceType as Context['authority']['source']['type'];
  }
  return 'individual';
}

export async function contextAddCommand(): Promise<void> {
  const registry = new FileRegistry(process.cwd());
  const ruleEngine = new RuleEngine();

  console.log(chalk.bold('\nCreate a new Context\n'));

  const title = await ask('Title: ');
  const description = await ask('Description: ');
  const category = await ask('Category (e.g., security, performance, compliance): ');
  const sourceType = await ask('Source type (individual/organization/standard-body/regulatory/community/ai-system) [individual]: ');

  const sourceTypeValid = [
    'individual', 'organization', 'standard-body', 'regulatory', 'community', 'ai-system', 'automated', 'documentation', 'meeting', 'incident'
  ].includes(sourceType.toLowerCase()) ? sourceType.toLowerCase() : 'individual';

  const suggestion = ruleEngine.classify({
    title,
    description,
    category: category || undefined,
    source_type: sourceTypeValid as Context['source']['type'],
  });

  console.log('');
  console.log(chalk.bold('Auto-suggestions (based on deterministic rules):'));
  console.log(chalk.dim(`  Authority:     level ${suggestion.authority_level} (${chalk.cyan(suggestion.authority_source_type)})`));
  console.log(chalk.dim(`  Governance:    ${chalk.cyan(suggestion.governance)}`));
  console.log(chalk.dim(`  Severity:      ${chalk.cyan(suggestion.severity)}`));
  if (suggestion.tags.length > 0) {
    console.log(chalk.dim(`  Tags:          ${chalk.cyan(suggestion.tags.join(', '))}`));
  }
  for (const r of suggestion.reasoning) {
    console.log(chalk.dim(`  └─ ${r}`));
  }
  console.log('');

  const useSuggested = await ask(chalk.dim('Accept auto-suggestions? [Y/n]: '));
  const override = useSuggested.toLowerCase() === 'n' || useSuggested.toLowerCase() === 'no';

  let authorityLevel = suggestion.authority_level;
  let governanceClass = suggestion.governance;
  let severityVal = suggestion.severity;
  let tags = suggestion.tags;

  if (override) {
    const sev = await ask('Severity (critical/high/medium/low/info) [medium]: ');
    severityVal = (sev || 'medium') as Severity;
    const owner = await ask('Owner: ');
    const tagsInput = await ask('Tags (comma-separated): ');

    const authSourceType = mapSourceTypeToAuthorityType(sourceTypeValid);

    const context = registry.create({
      title,
      description,
      category: category || undefined,
      severity: severityVal,
      owner: owner || undefined,
      authority: {
        source: {
          type: authSourceType,
          id: process.env.USER || 'unknown',
          name: process.env.USER || 'unknown',
        },
        level: sourceTypeValid === 'standard-body' || sourceTypeValid === 'regulatory' ? 4 :
               sourceTypeValid === 'organization' ? 3 : 2,
      },
      tags: tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : (category ? [category.toLowerCase()] : []),
    });

    console.log('');
    console.log(chalk.green(`✓ Context created: ${context.id}`));
    console.log(chalk.dim(`  lifecycle: ${context.lifecycle}`));
    console.log(chalk.dim(`  file: .lcdd/contexts/${context.id}.yaml`));
    return;
  }

  const authSourceType = mapSourceTypeToAuthorityType(suggestion.authority_source_type);

  const context = registry.create({
    title,
    description,
    category: category || undefined,
    severity: severityVal,
    owner: process.env.USER || undefined,
    authority: {
      source: {
        type: authSourceType,
        id: process.env.USER || 'unknown',
        name: process.env.USER || 'unknown',
      },
      level: suggestion.authority_level,
    },
    governance: {
      classification: suggestion.governance,
      approval_required: suggestion.authority_level >= 3,
    },
    tags,
    source: {
      type: sourceTypeValid as Context['source']['type'],
    },
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
