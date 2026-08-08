import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
  });
});
