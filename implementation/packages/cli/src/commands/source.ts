import { SourceConnector } from '@lcdd/core';
import chalk from 'chalk';

export async function sourceAddCommand(url: string, options: { type?: string; label?: string }): Promise<void> {
  const connector = new SourceConnector(process.cwd());

  const validTypes = ['git', 'website'];
  const type = options.type && validTypes.includes(options.type)
    ? (options.type as 'git' | 'website')
    : undefined;

  const source = connector.addSource({ url, type, label: options.label });

  console.log('');
  console.log(chalk.green(`✓ Source registered: ${source.id}`));
  console.log(chalk.dim(`  URL:   ${source.url}`));
  console.log(chalk.dim(`  Type:  ${source.type}`));
  if (source.label) console.log(chalk.dim(`  Label: ${source.label}`));
  console.log('');
}

export async function sourceListCommand(): Promise<void> {
  const connector = new SourceConnector(process.cwd());
  const sources = connector.listSources();

  if (sources.length === 0) {
    console.log(chalk.dim('\nNo sources registered.\n'));
    return;
  }

  console.log('');
  console.log(chalk.bold(`Registered Sources (${sources.length})`));
  console.log(chalk.dim('─'.repeat(80)));

  for (const src of sources) {
    const statusIcon = src.status === 'active' ? chalk.green('●') :
                        src.status === 'error' ? chalk.red('●') : chalk.yellow('●');
    const type = chalk.cyan(src.type.padEnd(7));
    const lastChecked = src.last_checked
      ? chalk.dim(`last checked: ${new Date(src.last_checked).toLocaleString()}`)
      : chalk.dim('never checked');

    console.log(`  ${statusIcon} ${chalk.bold(src.id)}  ${type}  ${src.url}`);
    if (src.label) console.log(chalk.dim(`      label: ${src.label}`));
    console.log(`      ${lastChecked}`);
    console.log('');
  }
  console.log('');
}

export async function sourceCheckCommand(id?: string): Promise<void> {
  const connector = new SourceConnector(process.cwd());
  const results = connector.checkSource(id);

  if (results.length === 0) {
    console.log(chalk.dim('\nNo sources to check.\n'));
    return;
  }

  console.log('');
  console.log(chalk.bold(`Source Check Results (${results.length})`));
  console.log(chalk.dim('─'.repeat(80)));

  for (const result of results) {
    const icon = result.error
      ? chalk.red('✗')
      : result.has_changes ? chalk.yellow('⚠') : chalk.green('✓');
    const changeLabel = result.error
      ? chalk.red('ERROR')
      : result.has_changes ? chalk.yellow('CHANGED') : chalk.green('UNCHANGED');

    console.log(`  ${icon} ${chalk.bold(result.source_id)}  [${changeLabel}]  ${result.url}`);
    console.log(chalk.dim(`      ${result.changes_summary || result.error}`));
    console.log('');
  }
  console.log('');
}

export async function sourceRemoveCommand(id: string): Promise<void> {
  const connector = new SourceConnector(process.cwd());
  const removed = connector.removeSource(id);

  if (removed) {
    console.log(chalk.green(`✓ Source removed: ${id}`));
  } else {
    console.log(chalk.red(`Source not found: ${id}`));
    process.exit(1);
  }
}
