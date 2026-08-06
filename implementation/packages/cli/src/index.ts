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

program.parse();
