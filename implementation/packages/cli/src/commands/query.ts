import { FileRegistry, parseCQL } from '@lcdd/core';
import chalk from 'chalk';

export async function queryCommand(cqlInput: string): Promise<void> {
  const registry = new FileRegistry(process.cwd());

  try {
    const query = parseCQL(cqlInput);
    const result = registry.query(query);

    console.log(chalk.bold(`\nResults: ${result.total} context(s)\n`));

    for (const ctx of result.contexts) {
      const stageColor = ctx.lifecycle === 'active' ? chalk.green :
                          ctx.lifecycle === 'deprecated' ? chalk.yellow : chalk.dim;

      console.log(`  ${chalk.cyan(ctx.id)}  v${ctx.version}  ${stageColor(ctx.lifecycle)}`);
      console.log(`    ${ctx.title}`);
      if (ctx.category) console.log(chalk.dim(`    category: ${ctx.category}  authority: ${ctx.authority.level}`));
      console.log('');
    }

    if (result.total > (result.contexts?.length || 0)) {
      console.log(chalk.dim(`  ... and ${result.total - (result.contexts?.length || 0)} more`));
    }
  } catch (e) {
    console.log(chalk.red(`CQL parse error: ${(e as Error).message}`));
    process.exit(1);
  }
}
