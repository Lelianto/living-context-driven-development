import { ContextNormalizer, FileRegistry, type CandidateContext } from '@lcdd/core';
import chalk from 'chalk';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

export async function normalizeCommand(options: {
  threshold?: string;
  autoMerge?: boolean;
  all?: boolean;
}): Promise<void> {
  const threshold = parseFloat(options.threshold || '0.8');
  const projectRoot = process.cwd();
  const candidatesDir = join(projectRoot, '.lcdd', 'sources', 'candidates');

  let candidates: CandidateContext[] = [];

  if (existsSync(candidatesDir)) {
    const { readdirSync } = await import('fs');
    for (const file of readdirSync(candidatesDir)) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        try {
          const data = yaml.load(readFileSync(join(candidatesDir, file), 'utf-8'));
          if (data && typeof data === 'object') {
            if (Array.isArray(data)) {
              candidates.push(...(data as CandidateContext[]));
            } else {
              candidates.push(data as CandidateContext);
            }
          }
        } catch { /* skip invalid files */ }
      }
    }
  }

  if (candidates.length === 0) {
    console.log('');
    console.log(chalk.yellow('No candidates found.'));
    console.log(chalk.dim('Run lcd extract <source-id> --output .lcdd/sources/candidates to generate candidate files,'));
    console.log(chalk.dim('or use lcd extract <source-id> --auto to extract and normalize in one step.'));
    console.log('');
    return;
  }

  console.log('');
  console.log(chalk.bold(`Normalizing ${candidates.length} candidate(s)`));
  console.log(chalk.dim('─'.repeat(60)));

  const registry = new FileRegistry(projectRoot);
  const normalizer = new ContextNormalizer();
  const existing = registry.list();

  const result = normalizer.normalize(candidates, existing);

  console.log('');
  console.log(chalk.bold('Results:'));
  console.log(`  ${chalk.green('Normalized:')} ${result.normalized.length}`);
  console.log(`  ${chalk.yellow('Skipped:')} ${result.skipped.length} (${result.skipped.map(s => s.reason).join(', ')})`);
  console.log(`  ${chalk.yellow('Flagged:')} ${result.flagged.length} near-duplicates`);
  console.log('');

  if (result.normalized.length > 0) {
    console.log(chalk.bold('Normalized Contexts:'));
    for (const ctx of result.normalized) {
      console.log(`  ${chalk.cyan(ctx.id)}  ${chalk.dim('draft')}  ${ctx.title}`);
    }
    console.log('');

    let written = 0;
    for (const ctx of result.normalized) {
      try {
        registry.save(ctx);
        written++;
      } catch (e) {
        console.log(chalk.red(`  Failed: ${ctx.id} — ${(e as Error).message}`));
      }
    }
    console.log(chalk.green(`✓ ${written} context(s) written to registry as draft`));
    console.log('');
  }

  if (result.flagged.length > 0) {
    console.log(chalk.bold('Near-Duplicates (flagged for review):'));
    for (const flag of result.flagged) {
      console.log(`  ${chalk.yellow('⚠')} New: "${flag.candidate.title}"`);
      console.log(`    vs  Existing: ${chalk.cyan(flag.existingId)} "${flag.existingTitle}"`);
      console.log(`    Similarity: ${(flag.similarity * 100).toFixed(0)}%`);
      console.log('');
    }
  }

  if (result.skipped.length > 0) {
    const duplicates = result.skipped.filter(s => s.reason === 'duplicate');
    const lowConf = result.skipped.filter(s => s.reason === 'low_confidence');
    const invalid = result.skipped.filter(s => s.reason === 'invalid');

    if (duplicates.length > 0) {
      console.log(chalk.dim(`Skipped ${duplicates.length} exact/near duplicates`));
    }
    if (lowConf.length > 0) {
      console.log(chalk.yellow(`Skipped ${lowConf.length} low-confidence candidates (confidence < 0.5)`));
    }
    if (invalid.length > 0) {
      console.log(chalk.red(`Skipped ${invalid.length} invalid candidates (failed schema validation)`));
    }
    console.log('');
  }
}
