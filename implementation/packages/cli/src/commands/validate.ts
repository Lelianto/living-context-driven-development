import { FileRegistry, ContextVerifier, GitChangeDetector, ChangeValidator, type Context, type ChangeValidationReport } from '@lcdd/core';
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import chalk from 'chalk';

interface ValidateOptions { strict?: boolean; changes?: boolean; staged?: boolean; base?: string; head?: string; json?: boolean; ci?: boolean }

export async function validateCommand(targetPath: string, options: ValidateOptions): Promise<void> {
  const registry = new FileRegistry(process.cwd());
  const activeContexts = registry.list({ lifecycle: 'active' as const });

  if (options.changes) {
    if (targetPath !== '.') throw new Error('A positional path cannot be combined with --changes');
    const changeSet = new GitChangeDetector(process.cwd()).detect(options);
    const report = await new ChangeValidator(process.cwd()).validate(changeSet, activeContexts);
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else printChangeReport(report, Boolean(options.ci));
    if (report.merge_decision === 'block' || (options.strict && report.merge_decision === 'warn')) process.exitCode = 1;
    return;
  }

  if (options.staged || options.base || options.head || options.json || options.ci) {
    throw new Error('--staged, --base, --head, --json, and --ci require --changes');
  }

  const verifier = new ContextVerifier();

  if (activeContexts.length === 0) {
    console.log(chalk.yellow('No active contexts found. Nothing to validate.'));
    console.log(chalk.dim('Create a context with: lcd context add'));
    return;
  }

  console.log(chalk.bold(`\nValidating against ${activeContexts.length} active contexts...\n`));

  const files = collectFiles(targetPath);
  let totalViolations = 0;
  let totalWarnings = 0;
  let blocked = false;

  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    const { results, events } = await verifier.enforce(
      activeContexts,
      relative(process.cwd(), file),
      { type: 'human', id: process.env.USER || 'unknown' }
    );

    for (const result of results) {
      if (result.status === 'violation') {
        const ctx = activeContexts.find(c => c.id === result.context_id);
        const mode = ctx?.enforcement?.mode || 'warn';

        if (mode === 'block') {
          blocked = true;
          totalViolations++;
          console.log(chalk.red(`  ✗ ${relative(process.cwd(), file)}`));
          for (const v of result.violations || []) {
            console.log(chalk.red(`    [${result.context_id}] ${v.description}`));
          }
        } else if (mode === 'warn') {
          totalWarnings++;
          console.log(chalk.yellow(`  ⚠ ${relative(process.cwd(), file)}`));
          for (const v of result.violations || []) {
            console.log(chalk.yellow(`    [${result.context_id}] ${v.description}`));
          }
        } else {
          console.log(chalk.dim(`  ℹ ${relative(process.cwd(), file)} [${result.context_id}] comment`));
        }
      }
    }
  }

  console.log('');
  if (blocked) {
    console.log(chalk.red(`✗ Validation FAILED — ${totalViolations} blocking violation(s)`));
    if (totalWarnings > 0) console.log(chalk.yellow(`  ${totalWarnings} warning(s)`));
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log(chalk.yellow(`⚠ Validation passed with ${totalWarnings} warning(s)`));
  } else {
    console.log(chalk.green(`✓ All ${files.length} files passed validation`));
  }
}

function printChangeReport(report: ChangeValidationReport, ci: boolean): void {
  console.log(chalk.bold(`\nLCDD change validation: ${report.merge_decision.toUpperCase()}\n`));
  if (ci) {
    console.log('| File | Status | Contexts | Decision |');
    console.log('| --- | --- | ---: | --- |');
    for (const item of report.files) console.log(`| ${item.file.path.replace(/\|/g, '\\|')} | ${item.file.status} | ${item.relevant_context_ids.length} | ${item.decision} |`);
  } else {
    for (const item of report.files) console.log(`  ${item.decision.padEnd(14)} ${item.file.path} (${item.relevant_context_ids.length} contexts)`);
  }
  console.log(`\nChanged ${report.totals.changed}; checked ${report.totals.checked}; skipped ${report.totals.skipped}; blocking ${report.totals.violations}; warnings ${report.totals.warnings}`);
}

function collectFiles(root: string): string[] {
  const results: string[] = [];

  function walk(dir: string): void {
    if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('.lcdd')) return;

    let entries;
    try { entries = readdirSync(dir); } catch { return; }

    for (const entry of entries) {
      const full = join(dir, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else if (stat.isFile() && /\.(ts|js|tsx|jsx|py|go|rs|yaml|yml|json|tf|md)$/.test(entry)) {
          results.push(full);
        }
      } catch { /* skip */ }
    }
  }

  const fullPath = join(process.cwd(), root);
  if (!existsSync(fullPath)) {
    console.log(chalk.red(`Path not found: ${root}`));
    process.exit(1);
  }

  const stat = statSync(fullPath);
  if (stat.isFile()) {
    results.push(fullPath);
  } else {
    walk(fullPath);
  }

  return results;
}
