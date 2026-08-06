import { FileRegistry } from '@lcdd/core';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

export async function initCommand(): Promise<void> {
  const cwd = process.cwd();
  const registry = new FileRegistry(cwd);
  registry.ensureDir();

  const lcddDir = join(cwd, '.lcdd');
  mkdirSync(join(lcddDir, 'contexts', 'hardened'), { recursive: true });
  mkdirSync(join(lcddDir, 'contexts', 'local'), { recursive: true });
  mkdirSync(join(lcddDir, 'contexts', 'experimental'), { recursive: true });

  const configPath = join(lcddDir, 'config.yaml');
  writeFileSync(configPath, `# LCDD Configuration
# See https://github.com/Lelianto/living-context-driven-development

version: "0.2.0"

pipeline:
  enabled: false

enforcement:
  default_mode: warn
  ci_mode: block
`);

  const readmePath = join(lcddDir, 'README.md');
  writeFileSync(readmePath, `# .lcdd/

This directory contains your project's Living Contexts — the rules, constraints,
and policies that govern this codebase.

## Structure

- \`contexts/hardened/\` — Slow-changing rules requiring explicit approval to modify.
- \`contexts/local/\` — Team-level rules that can evolve more freely.
- \`contexts/experimental/\` — Experimental or AI-suggested rules.

## Quick Start

1. Add a context: \`lcd context add\`
2. List contexts: \`lcd list\`
3. Validate code: \`lcd validate\`
4. Query contexts: \`lcd query "SELECT * FROM contexts WHERE lifecycle = 'active'"\`

## Learn More

https://github.com/Lelianto/living-context-driven-development
`);

  console.log(chalk.green('✓ LCDD initialized in .lcdd/'));
  console.log(chalk.dim('  .lcdd/config.yaml'));
  console.log(chalk.dim('  .lcdd/contexts/hardened/'));
  console.log(chalk.dim('  .lcdd/contexts/local/'));
  console.log(chalk.dim('  .lcdd/contexts/experimental/'));
  console.log('');
  console.log('Next: ' + chalk.cyan('lcd context add') + ' to create your first context.');
}
