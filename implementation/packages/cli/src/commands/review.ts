import { FileRegistry, ReviewManager, type ReviewItem } from '@lcdd/core';
import chalk from 'chalk';

const reviewStatusColor = (status: string | undefined) => {
  switch (status) {
    case 'pending': return chalk.yellow(status);
    case 'in-review': return chalk.blue(status);
    case 'approved': return chalk.green(status);
    case 'rejected': return chalk.red(status);
    case 'needs-revision': return chalk.magenta(status);
    default: return chalk.dim(status || 'none');
  }
};

export async function reviewListCommand(): Promise<void> {
  const registry = new FileRegistry(process.cwd());
  const manager = new ReviewManager(registry);
  const items = manager.listPending();

  if (items.length === 0) {
    console.log('');
    console.log(chalk.green('No pending reviews.'));
    console.log('');
    return;
  }

  console.log('');
  console.log(chalk.bold(`Pending Reviews (${items.length})`));
  console.log(chalk.dim('─'.repeat(80)));

  for (const item of items) {
    const status = reviewStatusColor(item.context.review_status);
    const gov = chalk.dim(`[${item.context.governance.classification}]`);
    const auto = item.can_auto_approve ? chalk.green(' ● auto') : '';
    const age = item.review_age_days > 0 ? chalk.dim(` ${item.review_age_days}d`) : '';

    console.log(`  ${chalk.cyan(item.context.id)}  v${item.context.version}  ${status}  ${gov}${auto}${age}`);
    console.log(`    ${item.context.title}`);
    if (item.can_auto_approve) {
      console.log(`    ${chalk.dim('↳')} ${chalk.dim(item.auto_approve_reason)}`);
    }
    console.log('');
  }
  console.log('');
}

export async function reviewShowCommand(id: string): Promise<void> {
  const registry = new FileRegistry(process.cwd());
  const manager = new ReviewManager(registry);
  const item = manager.getReviewItem(id);

  if (!item) {
    console.log(chalk.red(`No review found for context: ${id}`));
    process.exit(1);
  }

  const ctx = item.context;

  console.log('');
  console.log(chalk.bold(`Review: ${ctx.id}  v${ctx.version}`));
  console.log(chalk.dim('─'.repeat(80)));
  console.log('');
  console.log(chalk.underline('Context'));
  console.log(`  Title:       ${ctx.title}`);
  console.log(`  Lifecycle:   ${chalk.cyan(ctx.lifecycle)}`);
  console.log(`  Review:      ${reviewStatusColor(ctx.review_status)}`);
  console.log(`  Governance:  ${ctx.governance.classification}`);
  console.log(`  Authority:   level ${ctx.authority.level} (${ctx.authority.source.name})`);
  console.log(`  Severity:    ${ctx.severity || 'not set'}`);
  console.log(`  Owner:       ${ctx.owner || chalk.dim('(none)')}`);
  console.log(`  Age:         ${item.review_age_days}d`);
  console.log('');
  console.log(chalk.underline('Source'));
  console.log(`  Type:        ${ctx.source.type}`);
  console.log(`  URI:         ${ctx.source.uri || 'none'}`);
  console.log(`  Confidence:  ${ctx.source.confidence ?? 'N/A'}`);
  console.log('');
  console.log(chalk.underline('Description'));
  console.log(`  ${ctx.description}`);
  console.log('');

  if (ctx.enforcement?.specification) {
    console.log(chalk.underline('Enforcement'));
    console.log(`  Mode:    ${ctx.enforcement.mode}`);
    console.log(`  Type:    ${ctx.enforcement.specification.type}`);
    if (ctx.enforcement.specification.config) {
      console.log(`  Config:  ${JSON.stringify(ctx.enforcement.specification.config)}`);
    }
    console.log('');
  }

  console.log(chalk.underline('Description'));
  console.log(`  ${ctx.description}`);
  console.log('');

  if (ctx.tags && ctx.tags.length > 0) {
    console.log(chalk.dim(`  Tags: ${ctx.tags.join(', ')}`));
  }

  if (item.can_auto_approve) {
    console.log(chalk.green(`\n  Eligible for auto-approval: ${item.auto_approve_reason}`));
  }

  console.log('');
  console.log(chalk.dim('Commands:'));
  console.log(chalk.dim(`  lcd review approve ${ctx.id}`));
  console.log(chalk.dim(`  lcd review reject ${ctx.id} --reason "..."`));
  console.log(chalk.dim(`  lcd review revision ${ctx.id} --reason "..."`));
  console.log('');
}

export async function reviewApproveCommand(id: string, options: { reason?: string }): Promise<void> {
  const registry = new FileRegistry(process.cwd());
  const manager = new ReviewManager(registry);

  try {
    const result = manager.approve(id, process.env.USER || 'cli', options.reason);
    console.log(chalk.green(`✓ Approved: ${result.context_id}`));
    console.log(chalk.dim(`  ${result.message}`));
  } catch (e) {
    console.log(chalk.red(`Approve failed: ${(e as Error).message}`));
    process.exit(1);
  }
}

export async function reviewRejectCommand(id: string, options: { reason?: string }): Promise<void> {
  const registry = new FileRegistry(process.cwd());
  const manager = new ReviewManager(registry);

  try {
    const result = manager.reject(id, process.env.USER || 'cli', options.reason);
    console.log(chalk.red(`✗ Rejected: ${result.context_id}`));
    console.log(chalk.dim(`  ${result.message}`));
  } catch (e) {
    console.log(chalk.red(`Reject failed: ${(e as Error).message}`));
    process.exit(1);
  }
}

export async function reviewRevisionCommand(id: string, options: { reason?: string }): Promise<void> {
  const registry = new FileRegistry(process.cwd());
  const manager = new ReviewManager(registry);

  try {
    const result = manager.requestRevision(id, process.env.USER || 'cli', options.reason);
    console.log(chalk.yellow(`↻ Revision requested: ${result.context_id}`));
    console.log(chalk.dim(`  ${result.message}`));
  } catch (e) {
    console.log(chalk.red(`Revision request failed: ${(e as Error).message}`));
    process.exit(1);
  }
}

export async function reviewAutoApproveCommand(): Promise<void> {
  const registry = new FileRegistry(process.cwd());
  const manager = new ReviewManager(registry);
  const results = manager.autoApprove(process.env.USER || 'cli');

  if (results.length === 0) {
    console.log(chalk.dim('No contexts eligible for auto-approval.'));
    return;
  }

  console.log('');
  console.log(chalk.green(`Auto-approved ${results.length} context(s):`));
  for (const r of results) {
    console.log(`  ${chalk.cyan(r.context_id)} — ${r.message}`);
  }
  console.log('');
}
