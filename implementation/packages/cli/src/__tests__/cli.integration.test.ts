import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cliPath = join(packageRoot, 'dist', 'index.js');
const packageVersion = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version as string;
const tempDirs: string[] = [];

function run(args: string[], cwd = packageRoot) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
}

function git(args: string[], cwd: string) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('lcd CLI integration', () => {
  it('reports help and version with successful exit codes', () => {
    const help = run(['--help']);
    expect(help.status).toBe(0);
    expect(help.stdout).toContain('Living Context Driven Development');

    const version = run(['--version']);
    expect(version.status).toBe(0);
    expect(version.stdout.trim()).toBe(packageVersion);
  });

  it('returns a non-zero exit code for an unknown command', () => {
    const result = run(['definitely-not-a-command']);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('unknown command');
  });

  it('initializes a complete temporary registry', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lcdd-cli-'));
    tempDirs.push(dir);
    const result = run(['init'], dir);

    expect(result.status).toBe(0);
    expect(existsSync(join(dir, '.lcdd', 'config.yaml'))).toBe(true);
    expect(existsSync(join(dir, '.lcdd', 'contexts', 'hardened'))).toBe(true);
    expect(existsSync(join(dir, '.lcdd', 'contexts', 'local'))).toBe(true);
    expect(existsSync(join(dir, '.lcdd', 'contexts', 'experimental'))).toBe(true);
    expect(existsSync(join(dir, '.lcdd', 'templates', 'hardened.context.yaml'))).toBe(true);
    expect(existsSync(join(dir, '.lcdd', 'templates', 'local.context.yaml'))).toBe(true);
    expect(existsSync(join(dir, '.lcdd', 'templates', 'experimental.context.yaml'))).toBe(true);
    expect(readFileSync(join(dir, '.lcdd', 'config.yaml'), 'utf8')).toContain('version: \'1\'');
    expect(result.stdout).toContain('Active Contexts: 0');
  });

  it('keeps initialization idempotent and preserves the generated configuration', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lcdd-cli-'));
    tempDirs.push(dir);
    expect(run(['init'], dir).status).toBe(0);
    const configPath = join(dir, '.lcdd', 'config.yaml');
    const before = readFileSync(configPath, 'utf8');

    const second = run(['init'], dir);
    expect(second.status).toBe(0);
    expect(second.stdout).toContain('already initialized; no changes made');
    expect(readFileSync(configPath, 'utf8')).toBe(before);
  });

  it('detects TypeScript and the package manager without creating active contexts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lcdd-cli-'));
    tempDirs.push(dir);
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'detected-app', devDependencies: { eslint: '1.0.0', vitest: '1.0.0' } }));
    writeFileSync(join(dir, 'tsconfig.json'), '{}');
    writeFileSync(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9');

    expect(run(['init'], dir).status).toBe(0);
    const config = readFileSync(join(dir, '.lcdd', 'config.yaml'), 'utf8');
    expect(config).toContain('name: detected-app');
    expect(config).toContain('- typescript');
    expect(config).toContain('package_manager: pnpm');
    expect(config).toContain('- eslint');
    expect(config).toContain('- vitest');
    expect(run(['list'], dir).stdout).toContain('No contexts found');
  });

  it('preserves an existing configuration instead of overwriting it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lcdd-cli-'));
    tempDirs.push(dir);
    mkdirSync(join(dir, '.lcdd'), { recursive: true });
    const marker = 'version: "custom"\nmarker: keep-me\n';
    writeFileSync(join(dir, '.lcdd', 'config.yaml'), marker);

    expect(run(['init'], dir).status).toBe(0);
    expect(readFileSync(join(dir, '.lcdd', 'config.yaml'), 'utf8')).toBe(marker);
  });

  it('migrates the legacy config with a dry-run and recoverable backup', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lcdd-cli-'));
    tempDirs.push(dir);
    mkdirSync(join(dir, '.lcdd'), { recursive: true });
    const configPath = join(dir, '.lcdd', 'config.yaml');
    const legacy = 'version: "0.2.0"\npipeline:\n  enabled: false\nenforcement:\n  default_mode: warn\n';
    writeFileSync(configPath, legacy);

    const dryRun = run(['migrate', 'config', '--to', '1', '--dry-run'], dir);
    expect(dryRun.status).toBe(0);
    expect(dryRun.stdout).toContain('Dry run only');
    expect(readFileSync(configPath, 'utf8')).toBe(legacy);

    const migrated = run(['migrate', 'config', '--to', '1', '--yes'], dir);
    expect(migrated.status).toBe(0);
    expect(readFileSync(configPath, 'utf8')).toContain('version: \'1\'');
    expect(readFileSync(`${configPath}.0.2.0.bak`, 'utf8')).toBe(legacy);
  });

  it('runs the beginner check successfully for an empty Registry', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lcdd-cli-'));
    tempDirs.push(dir);
    expect(run(['init'], dir).status).toBe(0);

    const check = run(['check'], dir);
    expect(check.status).toBe(0);
    expect(check.stdout).toContain('No active contexts found');
  });

  it('previews and creates an idempotent least-privilege GitHub workflow', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lcdd-cli-'));
    tempDirs.push(dir);
    expect(run(['init'], dir).status).toBe(0);

    const preview = run(['setup', 'ci', '--provider', 'github', '--dry-run'], dir);
    expect(preview.status).toBe(0);
    expect(preview.stdout).toContain('pull_request:');
    expect(preview.stdout).toContain('merge_group:');
    expect(preview.stdout).toContain(`@lcdd/cli@${packageVersion}`);
    expect(existsSync(join(dir, '.github', 'workflows', 'lcdd.yml'))).toBe(false);

    const create = run(['setup', 'ci', '--provider', 'github', '--yes'], dir);
    expect(create.status).toBe(0);
    const workflowPath = join(dir, '.github', 'workflows', 'lcdd.yml');
    const workflow = readFileSync(workflowPath, 'utf8');
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('fetch-depth: 0');
    expect(workflow).toContain('name: LCDD');
    expect(workflow).toContain('name: validate');
    expect(workflow).toMatch(/actions\/checkout@[0-9a-f]{40}/);
    expect(workflow).toMatch(/actions\/setup-node@[0-9a-f]{40}/);
    expect(workflow).not.toContain('pull-requests: write');

    const second = run(['setup', 'ci', '--provider', 'github', '--yes'], dir);
    expect(second.status).toBe(0);
    expect(second.stdout).toContain('already up to date');
    expect(readFileSync(workflowPath, 'utf8')).toBe(workflow);
  });

  it('refuses to overwrite an unmanaged GitHub workflow', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lcdd-cli-'));
    tempDirs.push(dir);
    mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
    const workflowPath = join(dir, '.github', 'workflows', 'lcdd.yml');
    writeFileSync(workflowPath, 'name: Existing workflow\n');

    const result = run(['setup', 'ci', '--provider', 'github', '--yes'], dir);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Refusing to overwrite unmanaged');
    expect(readFileSync(workflowPath, 'utf8')).toBe('name: Existing workflow\n');
  });

  it('does not assume GitHub when automatic provider detection has no evidence', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lcdd-cli-'));
    tempDirs.push(dir);

    const result = run(['setup', 'ci', '--yes'], dir);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Could not detect a supported CI provider');
    expect(existsSync(join(dir, '.github', 'workflows', 'lcdd.yml'))).toBe(false);
  });

  it('creates and diagnoses an empty ownership Registry', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lcdd-cli-'));
    tempDirs.push(dir);
    expect(run(['init'], dir).status).toBe(0);

    const preview = run(['ownership', 'init', '--dry-run'], dir);
    expect(preview.status).toBe(0);
    expect(preview.stdout).toContain('boundaries: []');
    expect(existsSync(join(dir, '.lcdd', 'ownership.yaml'))).toBe(false);

    expect(run(['ownership', 'init', '--yes'], dir).status).toBe(0);
    const doctor = run(['ownership', 'doctor', '--json'], dir);
    expect(doctor.status).toBe(0);
    const report = JSON.parse(doctor.stdout);
    expect(report.status).toBe('warning');
    expect(report.data.boundaries).toBe(0);
    expect(report.data.trust_resolved).toBe(false);
  });

  it('reports staged cross-team impact using verified ownership', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lcdd-cli-'));
    tempDirs.push(dir);
    expect(git(['init'], dir).status).toBe(0);
    expect(git(['config', 'user.name', 'Test'], dir).status).toBe(0);
    expect(git(['config', 'user.email', 'test@example.com'], dir).status).toBe(0);
    mkdirSync(join(dir, 'services', 'payments'), { recursive: true });
    writeFileSync(join(dir, 'services', 'payments', 'refund.ts'), 'export const refund = 1;\n');
    expect(git(['add', '.'], dir).status).toBe(0);
    expect(git(['commit', '-m', 'initial'], dir).status).toBe(0);
    expect(run(['init'], dir).status).toBe(0);

    writeFileSync(join(dir, '.lcdd', 'trust.yaml'), `version: "1"
root:
  threshold: 1
  principals: [principal:bambang]
principals:
  - id: principal:bambang
    type: human
    display_name: Bambang
    status: active
    identities: []
    signing_keys: []
teams:
  - id: team:payments
    name: Payments
    members: [principal:bambang]
    provider_bindings: []
roles: []
permissions: []
`);
    writeFileSync(join(dir, '.lcdd', 'ownership.yaml'), `version: "1"
boundaries:
  - id: boundary:payments
    name: Payments
    paths:
      include: [services/payments/**]
    code_owners: [team:payments]
    required_reviewers: [team:payments]
`);
    expect(git(['add', '.lcdd'], dir).status).toBe(0);
    expect(git(['commit', '-m', 'bootstrap governance'], dir).status).toBe(0);
    writeFileSync(join(dir, 'services', 'payments', 'refund.ts'), 'export const refund = 2;\n');
    expect(git(['add', 'services/payments/refund.ts'], dir).status).toBe(0);

    const impact = run(['impact', '--staged', '--json'], dir);
    expect(impact.status).toBe(0);
    const report = JSON.parse(impact.stdout);
    expect(report.data.decision).toBe('pass');
    expect(report.data.trusted_base).toBe('HEAD');
    expect(report.data.boundaries[0].boundary_id).toBe('boundary:payments');
    expect(report.data.notifications).toContainEqual(expect.objectContaining({ entity: 'team:payments', action: 'require-approval' }));

    writeFileSync(join(dir, '.lcdd', 'ownership.yaml'), `version: "1"
boundaries:
  - id: boundary:payments
    name: Payments
    paths:
      include: [services/payments/**]
    code_owners: [team:attacker]
    required_reviewers: [team:attacker]
`);
    expect(git(['add', '.lcdd/ownership.yaml'], dir).status).toBe(0);
    const protectedImpact = run(['impact', '--staged', '--json'], dir);
    expect(protectedImpact.status).toBe(0);
    const protectedReport = JSON.parse(protectedImpact.stdout);
    expect(protectedReport.data.notifications).toContainEqual(expect.objectContaining({ entity: 'team:payments', action: 'require-approval' }));
    expect(JSON.stringify(protectedReport.data.notifications)).not.toContain('team:attacker');
  });
});
