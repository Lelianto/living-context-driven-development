#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));

const program = new Command();

program
  .name('lcd')
  .description('Living Context Driven Development — CLI')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize LCDD in the current project')
  .action(async () => {
    const { initCommand } = await import('./commands/init.js');
    await initCommand();
  });

program
  .command('context')
  .description('Manage contexts')
  .command('add')
  .description('Create a new context interactively')
  .action(async () => {
    const { contextAddCommand } = await import('./commands/context.js');
    await contextAddCommand();
  });

program
  .command('list')
  .description('List contexts')
  .option('--lifecycle <stage>', 'Filter by lifecycle stage')
  .option('--category <cat>', 'Filter by category')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .action(async (options) => {
    const { listCommand } = await import('./commands/context.js');
    await listCommand(options);
  });

program
  .command('show')
  .description('Show a specific context')
  .argument('<id>', 'Context ID')
  .action(async (id: string) => {
    const { showCommand } = await import('./commands/context.js');
    await showCommand(id);
  });

program
  .command('validate')
  .description('Validate artifacts against active contexts')
  .argument('[path]', 'File or directory to validate', '.')
  .option('--strict', 'Treat warnings as errors')
  .action(async (path: string, options) => {
    const { validateCommand } = await import('./commands/validate.js');
    await validateCommand(path, options);
  });

program
  .command('query')
  .description('Query contexts using CQL')
  .argument('<cql>', 'CQL query string')
  .action(async (cql: string) => {
    const { queryCommand } = await import('./commands/query.js');
    await queryCommand(cql);
  });

program
  .command('transition')
  .description('Transition a context to a new lifecycle stage')
  .argument('<id>', 'Context ID')
  .argument('<stage>', 'Target lifecycle stage')
  .option('--reason <text>', 'Reason for transition')
  .action(async (id: string, stage: string, options) => {
    const { transitionCommand } = await import('./commands/context.js');
    await transitionCommand(id, stage, options);
  });

program
  .command('doctor')
  .description('Run context health check and get recommendations')
  .option('--json', 'Output in JSON format')
  .option('--triggers', 'Show trigger evaluation details')
  .action(async (options) => {
    const { doctorCommand } = await import('./commands/doctor.js');
    await doctorCommand(options);
  });

const reviewCmd = program
  .command('review')
  .description('Manage review workflow');

reviewCmd
  .command('list')
  .description('List pending reviews')
  .action(async () => {
    const { reviewListCommand } = await import('./commands/review.js');
    await reviewListCommand();
  });

reviewCmd
  .command('show')
  .description('Show review details for a context')
  .argument('<id>', 'Context ID')
  .action(async (id: string) => {
    const { reviewShowCommand } = await import('./commands/review.js');
    await reviewShowCommand(id);
  });

reviewCmd
  .command('approve')
  .description('Approve a pending review')
  .argument('<id>', 'Context ID')
  .option('--reason <text>', 'Reason for approval')
  .action(async (id: string, options) => {
    const { reviewApproveCommand } = await import('./commands/review.js');
    await reviewApproveCommand(id, options);
  });

reviewCmd
  .command('reject')
  .description('Reject a pending review')
  .argument('<id>', 'Context ID')
  .option('--reason <text>', 'Reason for rejection')
  .action(async (id: string, options) => {
    const { reviewRejectCommand } = await import('./commands/review.js');
    await reviewRejectCommand(id, options);
  });

reviewCmd
  .command('revision')
  .description('Request revision for a context under review')
  .argument('<id>', 'Context ID')
  .option('--reason <text>', 'Reason for revision request')
  .action(async (id: string, options) => {
    const { reviewRevisionCommand } = await import('./commands/review.js');
    await reviewRevisionCommand(id, options);
  });

reviewCmd
  .command('auto-approve')
  .description('Auto-approve local contexts with high confidence')
  .action(async () => {
    const { reviewAutoApproveCommand } = await import('./commands/review.js');
    await reviewAutoApproveCommand();
  });

const sourceCmd = program
  .command('source')
  .description('Manage external sources (Git repos, websites)');

sourceCmd
  .command('add')
  .description('Register an external source for change detection')
  .argument('<url>', 'Source URL (git repo or website)')
  .option('--type <type>', 'Source type (git | website)')
  .option('--label <label>', 'Human-readable label')
  .action(async (url: string, options) => {
    const { sourceAddCommand } = await import('./commands/source.js');
    await sourceAddCommand(url, options);
  });

sourceCmd
  .command('list')
  .description('List registered sources')
  .action(async () => {
    const { sourceListCommand } = await import('./commands/source.js');
    await sourceListCommand();
  });

sourceCmd
  .command('check')
  .description('Check sources for changes')
  .argument('[id]', 'Source ID (omit to check all)')
  .action(async (id?: string) => {
    const { sourceCheckCommand } = await import('./commands/source.js');
    await sourceCheckCommand(id);
  });

sourceCmd
  .command('remove')
  .description('Remove a registered source')
  .argument('<id>', 'Source ID')
  .action(async (id: string) => {
    const { sourceRemoveCommand } = await import('./commands/source.js');
    await sourceRemoveCommand(id);
  });

program.parse();
