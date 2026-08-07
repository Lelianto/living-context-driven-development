import { SourceConnector, Extractor, ContextNormalizer, FileRegistry, type CandidateContext } from '@lcdd/core';
import chalk from 'chalk';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

export async function extractCommand(sourceId: string, options: {
  backend?: string;
  model?: string;
  dryRun?: boolean;
  output?: string;
  auto?: boolean;
}): Promise<void> {
  const connector = new SourceConnector(process.cwd());
  const sources = connector.listSources();
  const source = sources.find(s => s.id === sourceId);

  if (!source) {
    console.log(chalk.red(`Source not found: ${sourceId}`));
    console.log(chalk.dim('Use lcd source list to see registered sources.'));
    process.exit(1);
  }

  if (options.model) {
    process.env.LLM_MODEL = options.model;
  }

  console.log('');
  console.log(chalk.bold(`Extracting constraints from: ${source.url}`));
  console.log(chalk.dim(`Provider: ${options.backend || 'auto'} | Source type: ${source.type}`));
  console.log('');

  const extractor = new Extractor();
  await extractor.init();

  const warnings = extractor.getProviderWarnings();
  if (warnings.length > 0) {
    for (const w of warnings) {
      console.log(chalk.yellow(`⚠ ${w}`));
    }
    console.log('');
  }

  try {
    const candidates = await extractor.extract(source, options.backend);

    if (candidates.length === 0) {
      console.log(chalk.yellow('No constraints found in this source.'));
      console.log('');
      return;
    }

    console.log(chalk.bold(`Found ${candidates.length} candidate constraint(s):`));
    console.log(chalk.dim('─'.repeat(70)));

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const confidenceColor = c.confidence >= 0.8 ? chalk.green : c.confidence >= 0.6 ? chalk.yellow : chalk.red;
      console.log(`  ${chalk.cyan(`${i + 1}.`)} ${c.title}`);
      console.log(`     ${chalk.dim(c.description.slice(0, 80))}`);
      console.log(`     confidence: ${confidenceColor(c.confidence.toFixed(2))}  severity: ${c.severity || '?'}  category: ${c.category || '?'}`);
      if (c.source_location) {
        console.log(`     ${chalk.dim('source: ' + c.source_location)}`);
      }
      console.log('');
    }

    if (options.dryRun) {
      if (options.output) {
        mkdirSync(options.output, { recursive: true });
        for (let i = 0; i < candidates.length; i++) {
          const filePath = join(options.output, `candidate-${i + 1}.yaml`);
          writeFileSync(filePath, yaml.dump(candidates[i], { lineWidth: 120 }));
        }
        console.log(chalk.green(`✓ ${candidates.length} candidate(s) written to ${options.output}/`));
      } else {
        console.log(chalk.dim('Dry-run mode — no contexts written to registry.'));
        console.log(chalk.dim('Use --output <dir> to write candidate YAML files, or remove --dry-run to write to registry.'));
      }
      console.log('');
      return;
    }

    if (options.auto) {
      const registry = new FileRegistry(process.cwd());
      const normalizer = new ContextNormalizer();
      const existing = registry.list();
      const result = normalizer.normalize(candidates, existing);

      let written = 0;
      for (const ctx of result.normalized) {
        try {
          registry.save(ctx);
          written++;
        } catch (e) {
          console.log(chalk.red(`  Failed to write ${ctx.id}: ${(e as Error).message}`));
        }
      }

      console.log(chalk.green(`✓ ${written} context(s) written to registry as draft`));

      if (result.skipped.length > 0) {
        console.log(chalk.yellow(`  ${result.skipped.length} skipped (${result.skipped.map(s => s.reason).join(', ')})`));
      }

      if (result.flagged.length > 0) {
        console.log(chalk.yellow(`  ${result.flagged.length} flagged as near-duplicates — review manually`));
      }
    } else {
      console.log(chalk.dim('To write these to the registry, use --auto to extract + normalize + write drafts.'));
      console.log(chalk.dim('Or use --dry-run --output ./candidates to write candidate YAML files.'));
    }

    console.log('');
  } catch (e) {
    const msg = (e as Error).message;
    console.log(chalk.red(`Extraction failed: ${msg}`));

    if (msg.includes('ECONNREFUSED') || msg.includes('fetch') || msg.includes('Ollama')) {
      console.log(chalk.dim('\nHint: Make sure Ollama is running:'));
      console.log(chalk.dim('  ollama serve'));
      console.log(chalk.dim('  ollama pull llama3.2'));
    }

    if (msg.includes('not available') || msg.includes('Provider')) {
      console.log(chalk.dim(`\nAvailable providers: ${extractor.getAvailableProviders().join(', ')}`));
      console.log(chalk.dim('For OpenAI:  export OPENAI_API_KEY=sk-... && npm install openai'));
      console.log(chalk.dim('For Anthropic: export ANTHROPIC_API_KEY=sk-ant-... && npm install @anthropic-ai/sdk'));
      console.log(chalk.dim('For free local: ollama serve (no API key needed)'));
    }

    if (msg.includes('OPENAI_API_KEY') || msg.includes('ANTHROPIC_API_KEY')) {
      console.log(chalk.dim('\nHint: Set the API key environment variable, or use Ollama for free local extraction:'));
      console.log(chalk.dim('  ollama pull llama3.2 && lcd extract ' + sourceId));
    }

    process.exit(1);
  }
}
