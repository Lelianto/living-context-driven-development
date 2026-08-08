import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import chalk from 'chalk';
import yaml from 'js-yaml';

type ProjectConfig = {
  version: '1';
  project: { name: string; root: '..'; languages: string[] };
  registry: { path: './contexts' };
  validation: {
    default_mode: 'warn'; include: string[]; exclude: string[];
    verifier_failure: { local: 'warn'; ci: 'block' };
  };
  change_detection: { enabled: true; default_base: 'auto' };
  integrations: { package_manager?: string; linters: string[]; test_runners: string[]; scm_provider: 'auto' };
  governance: {
    mode: 'individual';
    minimum_assurance: {
      local_change: 'unverified'; hardened_proposal: 'signed';
      hardened_approval: 'provider-verified'; trust_change: 'provider-verified';
    };
  };
  notifications: {
    primary_owner: 'request-review'; required_reviewer: 'require-approval';
    affected_reviewer: 'mention'; subscriber: 'summary'; prefer_team_mentions: true;
    deduplicate: true; max_direct_mentions: 3;
  };
  security: {
    protect_hardened: true; trusted_base_required_in_ci: true;
    external_identity_sync_requires_confirmation: true;
  };
  ai: {
    code_changes: 'allow'; context_candidates: 'allow'; local_context_direct_changes: 'deny';
    hardened_context_direct_changes: 'deny'; governance_approval: 'deny'; trust_changes: 'deny';
    ownership_changes: 'deny';
  };
};

type PackageJson = { name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

function readPackage(root: string): PackageJson | null {
  const path = join(root, 'package.json');
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')) as PackageJson; }
  catch { return null; }
}

function has(root: string, path: string): boolean { return existsSync(join(root, path)); }

export function detectProjectConfig(root: string, languageOverrides: string[] = []): ProjectConfig {
  const pkg = readPackage(root);
  const dependencies = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  const languages = new Set(languageOverrides.map(value => value.toLowerCase()));

  if (pkg || has(root, 'tsconfig.json')) languages.add(has(root, 'tsconfig.json') ? 'typescript' : 'javascript');
  if (has(root, 'pyproject.toml') || has(root, 'requirements.txt')) languages.add('python');
  if (has(root, 'go.mod')) languages.add('go');
  if (has(root, 'Cargo.toml')) languages.add('rust');
  if (has(root, 'pom.xml') || has(root, 'build.gradle') || has(root, 'build.gradle.kts')) languages.add('java');

  const include: string[] = [];
  if (languages.has('typescript')) include.push('../src/**/*.ts', '../src/**/*.tsx');
  if (languages.has('javascript')) include.push('../src/**/*.js', '../src/**/*.jsx');
  if (languages.has('python')) include.push('../**/*.py');
  if (languages.has('go')) include.push('../**/*.go');
  if (languages.has('rust')) include.push('../**/*.rs');
  if (languages.has('java')) include.push('../**/*.java');
  if (include.length === 0) include.push('../**/*');

  const packageManager = has(root, 'pnpm-lock.yaml') ? 'pnpm'
    : has(root, 'yarn.lock') ? 'yarn'
      : has(root, 'bun.lock') || has(root, 'bun.lockb') ? 'bun'
        : pkg ? 'npm' : undefined;
  const linters = ['eslint', 'ruff', 'golangci-lint'].filter(name => name in dependencies || has(root, `${name}.config.js`));
  if (has(root, 'eslint.config.js') || has(root, 'eslint.config.mjs') || has(root, '.eslintrc')) {
    if (!linters.includes('eslint')) linters.push('eslint');
  }
  const testRunners = ['vitest', 'jest', 'pytest'].filter(name => name in dependencies || has(root, `${name}.ini`));

  return {
    version: '1',
    project: { name: pkg?.name ?? basename(root), root: '..', languages: [...languages].sort() },
    registry: { path: './contexts' },
    validation: {
      default_mode: 'warn', include,
      exclude: ['../node_modules/**', '../dist/**', '../coverage/**', '../.git/**'],
      verifier_failure: { local: 'warn', ci: 'block' },
    },
    change_detection: { enabled: true, default_base: 'auto' },
    integrations: { ...(packageManager ? { package_manager: packageManager } : {}), linters, test_runners: testRunners, scm_provider: 'auto' },
    governance: {
      mode: 'individual',
      minimum_assurance: {
        local_change: 'unverified', hardened_proposal: 'signed',
        hardened_approval: 'provider-verified', trust_change: 'provider-verified',
      },
    },
    notifications: {
      primary_owner: 'request-review', required_reviewer: 'require-approval', affected_reviewer: 'mention',
      subscriber: 'summary', prefer_team_mentions: true, deduplicate: true, max_direct_mentions: 3,
    },
    security: {
      protect_hardened: true, trusted_base_required_in_ci: true,
      external_identity_sync_requires_confirmation: true,
    },
    ai: {
      code_changes: 'allow', context_candidates: 'allow', local_context_direct_changes: 'deny',
      hardened_context_direct_changes: 'deny', governance_approval: 'deny', trust_changes: 'deny',
      ownership_changes: 'deny',
    },
  };
}

function template(classification: 'hardened-standard' | 'local-standard' | 'local-experimental') {
  const hardened = classification === 'hardened-standard';
  const experimental = classification === 'local-experimental';
  return {
    id: `replace-me-${classification}`,
    version: 1,
    title: 'Replace with a concise rule title',
    description: 'Replace with the constraint, rationale, compliant example, and counter-example.',
    source: { type: experimental ? 'ai-system' : 'organization' },
    authority: {
      source: {
        type: experimental ? 'ai-system' : 'organization',
        id: experimental ? 'replace-me-agent' : 'replace-me-team',
        name: experimental ? 'Replace with agent name' : 'Replace with authority name',
      },
      level: experimental ? 0 : hardened ? 3 : 2,
    },
    category: 'replace-me',
    severity: hardened ? 'high' : 'medium',
    applies_to: ['**/*'],
    lifecycle: 'draft',
    governance: { classification, approval_required: hardened || classification === 'local-standard' },
    owner: 'replace-me-owner',
    enforcement: { mode: experimental ? 'silent' : hardened ? 'block' : 'warn' },
    evidence: [],
    tags: [],
  };
}

function writeIfAbsent(path: string, content: string, created: string[]): void {
  if (existsSync(path)) return;
  writeFileSync(path, content);
  created.push(path);
}

export interface InitOptions { language?: string[]; minimal?: boolean; forceDetect?: boolean }

export async function initCommand(options: InitOptions = {}): Promise<void> {
  const root = process.cwd();
  const lcddDir = join(root, '.lcdd');
  const created: string[] = [];
  const dirs = [
    join(lcddDir, 'contexts', 'hardened'), join(lcddDir, 'contexts', 'local'),
    join(lcddDir, 'contexts', 'experimental'), join(lcddDir, 'templates'),
  ];
  for (const dir of dirs) mkdirSync(dir, { recursive: true });
  for (const dir of dirs.slice(0, 3)) writeIfAbsent(join(dir, '.gitkeep'), '', created);

  const configPath = join(lcddDir, 'config.yaml');
  if (!existsSync(configPath) || options.forceDetect) {
    if (existsSync(configPath) && options.forceDetect) {
      throw new Error('Refusing to overwrite .lcdd/config.yaml; use `lcd migrate config` for existing configuration');
    }
    const config = detectProjectConfig(root, options.language ?? []);
    writeIfAbsent(configPath, yaml.dump(config, { lineWidth: 120, noRefs: true }), created);
  }

  writeIfAbsent(join(lcddDir, 'README.md'), `# LCDD Registry

This directory contains the project Context Registry and local LCDD configuration.

- Create a Context: \`lcd context add\`
- Check the project: \`lcd check\`
- Inspect Registry health: \`lcd doctor\`

Templates are stored outside \`contexts/\` and are never enforced automatically.
`, created);

  if (!options.minimal) {
    writeIfAbsent(join(lcddDir, 'templates', 'hardened.context.yaml'), yaml.dump(template('hardened-standard'), { lineWidth: 120 }), created);
    writeIfAbsent(join(lcddDir, 'templates', 'local.context.yaml'), yaml.dump(template('local-standard'), { lineWidth: 120 }), created);
    writeIfAbsent(join(lcddDir, 'templates', 'experimental.context.yaml'), yaml.dump(template('local-experimental'), { lineWidth: 120 }), created);
  }

  if (created.length === 0) {
    console.log(chalk.green('✓ LCDD is already initialized; no changes made.'));
    return;
  }

  const config = yaml.load(readFileSync(configPath, 'utf8')) as ProjectConfig;
  console.log(chalk.green('✓ LCDD initialized in .lcdd/'));
  console.log(chalk.dim(`  Languages: ${config.project?.languages?.join(', ') || 'not detected'}`));
  console.log(chalk.dim(`  Created ${created.length} file(s); Active Contexts: 0; Blocking Contexts: 0`));
  console.log('Next: ' + chalk.cyan('lcd context add') + ' to create your first Context.');
}
