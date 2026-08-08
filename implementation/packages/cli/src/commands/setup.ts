import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import chalk from 'chalk';

const MANAGED_MARKER = '# Managed by @lcdd/cli. Re-run `lcd setup ci --provider github` to update.';
const WORKFLOW_PATH = '.github/workflows/lcdd.yml';

export interface SetupCiOptions {
  provider?: string;
  dryRun?: boolean;
  yes?: boolean;
  json?: boolean;
}

export function githubWorkflow(cliVersion: string): string {
  return `${MANAGED_MARKER}
name: LCDD

on:
  pull_request:
  merge_group:

permissions:
  contents: read

jobs:
  validate:
    name: validate
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@08eba0b27e820071cde6df949e0beb9ba4906955 # v4.3.0
        with:
          fetch-depth: 0

      - name: Set up Node.js
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22

      - name: Validate LCDD change
        env:
          LCDD_BASE: \${{ github.event.pull_request.base.sha || github.event.merge_group.base_sha }}
          LCDD_HEAD: \${{ github.event.pull_request.head.sha || github.sha }}
        run: npx --yes @lcdd/cli@${cliVersion} check --stage ci --base "$LCDD_BASE" --head "$LCDD_HEAD" --strict --json
`;
}

function detectCiProvider(root: string): 'github' | null {
  if (existsSync(join(root, '.github'))) return 'github';
  const remote = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' });
  if (remote.status === 0 && /(^|[/:])github\.com[/:]/i.test(remote.stdout.trim())) return 'github';
  return null;
}

function reportJson(status: string, path: string, changed: boolean, dryRun: boolean): void {
  console.log(JSON.stringify({ status, provider: 'github', path, changed, dry_run: dryRun }, null, 2));
}

export async function setupCiCommand(options: SetupCiOptions, cliVersion: string): Promise<void> {
  const requestedProvider = options.provider ?? 'auto';
  const provider = requestedProvider === 'auto' ? detectCiProvider(process.cwd()) : requestedProvider;
  if (provider === null) {
    throw new Error('Could not detect a supported CI provider. Use `--provider github` explicitly.');
  }
  if (!['auto', 'github'].includes(provider)) {
    throw new Error(`Provider '${provider}' is not implemented yet. Phase A currently supports GitHub.`);
  }

  const root = process.cwd();
  const relativePath = WORKFLOW_PATH;
  const target = join(root, relativePath);
  const desired = githubWorkflow(cliVersion);
  const current = existsSync(target) ? readFileSync(target, 'utf8') : null;

  if (current !== null && !current.startsWith(MANAGED_MARKER)) {
    throw new Error(`Refusing to overwrite unmanaged ${relativePath}. Move it or add LCDD manually.`);
  }

  if (current === desired) {
    if (options.json) reportJson('unchanged', relativePath, false, Boolean(options.dryRun));
    else console.log(chalk.green(`✓ ${relativePath} is already up to date.`));
    return;
  }

  if (options.dryRun || !options.yes) {
    if (options.json) reportJson('preview', relativePath, true, true);
    else {
      console.log(desired);
      console.log(chalk.yellow(`Preview only. Re-run with --yes to write ${relativePath}.`));
    }
    return;
  }

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, desired);
  if (options.json) reportJson('created', relativePath, true, false);
  else {
    console.log(chalk.green(`✓ Created ${relativePath}`));
    console.log(chalk.dim('  Required check name: LCDD / validate'));
    console.log(chalk.dim('  Next: commit this workflow, push it, then require the check in your GitHub ruleset.'));
  }
}
