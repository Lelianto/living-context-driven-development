import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import yaml from 'js-yaml';
import { detectProjectConfig } from './init.js';

interface MigrateOptions { to: string; dryRun?: boolean; yes?: boolean; json?: boolean }

function envelope(status: 'success' | 'error', data: unknown, errors: string[] = []) {
  return {
    schema_version: '1', command: 'migrate.config', status,
    generated_at: new Date().toISOString(), project_root: process.cwd(), data, warnings: [], errors,
  };
}

export async function migrateConfigCommand(options: MigrateOptions): Promise<void> {
  if (options.to !== '1') throw new Error(`Unsupported target config version: ${options.to}`);
  const configPath = join(process.cwd(), '.lcdd', 'config.yaml');
  if (!existsSync(configPath)) throw new Error('.lcdd/config.yaml does not exist; run `lcd init` first');

  const originalText = readFileSync(configPath, 'utf8');
  const original = yaml.load(originalText) as { version?: string } | null;
  if (original?.version === '1') {
    const data = { migrated: false, reason: 'already-current', target_version: '1' };
    if (options.json) console.log(JSON.stringify(envelope('success', data), null, 2));
    else console.log(chalk.green('✓ Configuration is already at schema version 1; no changes made.'));
    return;
  }
  if (!original?.version) throw new Error('Existing configuration has no version field');

  const proposed = detectProjectConfig(process.cwd());
  const proposedText = yaml.dump(proposed, { lineWidth: 120, noRefs: true });
  const backupPath = `${configPath}.${original.version}.bak`;
  const data = { migrated: !options.dryRun, from_version: original.version, target_version: '1', backup_path: backupPath, proposed };

  if (options.dryRun) {
    if (options.json) console.log(JSON.stringify(envelope('success', data), null, 2));
    else {
      console.log(chalk.bold(`Proposed migration: ${original.version} → 1\n`));
      console.log(proposedText);
      console.log(chalk.dim('Dry run only; no files changed.'));
    }
    return;
  }
  if (!options.yes) throw new Error('Migration requires --yes after reviewing `lcd migrate config --to 1 --dry-run`');
  if (existsSync(backupPath)) throw new Error(`Backup already exists: ${backupPath}`);

  copyFileSync(configPath, backupPath);
  writeFileSync(configPath, proposedText);
  if (options.json) console.log(JSON.stringify(envelope('success', data), null, 2));
  else {
    console.log(chalk.green(`✓ Migrated configuration ${original.version} → 1`));
    console.log(chalk.dim(`  Backup: ${backupPath}`));
  }
}
