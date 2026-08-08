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

const improveCmd = program
  .command('improve')
  .description('Review and apply self-healing recommendations');

improveCmd
  .command('check')
  .description('List actionable improvement recommendations')
  .option('--json', 'Output in JSON format')
  .option('--priority <priority>', 'Filter by priority: immediate, short-term, long-term')
  .action(async (options) => {
    const { improveCheckCommand } = await import('./commands/improve.js');
    await improveCheckCommand(options);
  });

improveCmd
  .command('apply')
  .description('Apply a recommendation, with guardrail checks and auto-rollback')
  .argument('<recommendation-id>', 'Recommendation ID from lcd improve check')
  .option('--dry-run', 'Show the change without writing it')
  .option('--yes', 'Skip the confirmation prompt')
  .option('--reason <reason>', 'Approval reason (required for hardened contexts)')
  .action(async (recommendationId: string, options) => {
    const { improveApplyCommand } = await import('./commands/improve.js');
    await improveApplyCommand(recommendationId, options);
  });

improveCmd
  .command('rollback')
  .description('Restore the registry to its state before a heal')
  .argument('<heal-id>', 'Heal ID reported by lcd improve apply')
  .action(async (healId: string) => {
    const { improveRollbackCommand } = await import('./commands/improve.js');
    await improveRollbackCommand(healId);
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
  .option('--confidential', 'Prevent this source from being sent to cloud LLM providers')
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

sourceCmd
  .command('watch')
  .description('Watch sources for changes at intervals')
  .option('--interval <minutes>', 'Poll interval in minutes', '60')
  .option('--once', 'Run a single check and exit')
  .action(async (options) => {
    const { sourceWatchCommand } = await import('./commands/source.js');
    await sourceWatchCommand(options);
  });

sourceCmd
  .command('schedule')
  .description('Generate cron or GitHub Actions schedule for source monitoring')
  .option('--cron', 'Output cron schedule line')
  .option('--github', 'Output GitHub Actions workflow YAML')
  .option('--interval <minutes>', 'Interval in minutes', '60')
  .action(async (options) => {
    const { sourceScheduleCommand } = await import('./commands/source.js');
    await sourceScheduleCommand(options);
  });

program
  .command('extract')
  .description('Extract constraints from a source using LLM')
  .argument('<source-id>', 'Source ID to extract from')
  .option('--backend <name>', 'LLM provider (ollama, openai, anthropic)')
  .option('--model <model>', 'Override default model')
  .option('--dry-run', 'Output to stdout, do not write to registry')
  .option('--output <dir>', 'Write candidate YAML files to directory')
  .option('--auto', 'Extract + normalize + write drafts to registry')
  .action(async (sourceId: string, options) => {
    const { extractCommand } = await import('./commands/extract.js');
    await extractCommand(sourceId, options);
  });

program
  .command('normalize')
  .description('Normalize extracted candidates into draft contexts')
  .option('--threshold <n>', 'Similarity threshold for dedup (default 0.8)', '0.8')
  .option('--auto-merge', 'Auto-skip exact duplicates')
  .option('--all', 'Process all unnormalized candidates')
  .action(async (options) => {
    const { normalizeCommand } = await import('./commands/normalize.js');
    await normalizeCommand(options);
  });

program
  .command('dashboard')
  .description('View enforcement metrics and lifecycle observability')
  .option('--web', 'Start a web dashboard with charts (default: terminal)')
  .option('--port <number>', 'Web server port', '9321')
  .action(async (options) => {
    const { dashboardCommand } = await import('./commands/dashboard.js');
    await dashboardCommand(options);
  });

program.parse();
