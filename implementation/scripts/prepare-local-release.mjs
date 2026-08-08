import { cpSync, mkdirSync, readFileSync, rmSync, mkdtempSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageNames = ['core', 'cli', 'mcp'];
const manifests = packageNames.map(name => ({ name, data: JSON.parse(readFileSync(join(root, 'packages', name, 'package.json'), 'utf8')) }));
const sourceVersion = manifests[0].data.version;
const targetVersion = process.argv[2] ?? sourceVersion;

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(targetVersion)) {
  throw new Error(`Invalid target version: ${targetVersion}`);
}

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, NPM_CONFIG_CACHE: join(root, '.artifacts', 'npm-cache') },
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 120_000,
    maxBuffer: 10_000_000,
  });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}${result.stderr}`);
  return result.stdout.trim();
}

for (const { name, data } of manifests) {
  if (data.version !== sourceVersion) throw new Error(`@lcdd/${name} is ${data.version}; expected source version ${sourceVersion}`);
  if (name !== 'core' && data.dependencies?.['@lcdd/core'] !== `^${sourceVersion}`) throw new Error(`@lcdd/${name} must depend on source @lcdd/core ^${sourceVersion}`);
}

run('npm', ['run', 'verify:release']);

const output = join(root, '.artifacts', 'npm', targetVersion);
const stagingRoot = join(root, '.artifacts', 'staging', targetVersion);
rmSync(output, { recursive: true, force: true });
rmSync(stagingRoot, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
const tarballs = [];
try {
  for (const { name, data } of manifests) {
    const staging = join(stagingRoot, name);
    mkdirSync(staging, { recursive: true });
    cpSync(join(root, 'packages', name, 'dist'), join(staging, 'dist'), { recursive: true });
    cpSync(join(root, 'packages', name, 'README.md'), join(staging, 'README.md'));
    const stagedManifest = structuredClone(data);
    stagedManifest.version = targetVersion;
    if (name !== 'core') stagedManifest.dependencies['@lcdd/core'] = `^${targetVersion}`;
    writeFileSync(join(staging, 'package.json'), `${JSON.stringify(stagedManifest, null, 2)}\n`);

    const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', output], staging));
    const entry = packed[0];
    const filenames = entry.files.map(file => file.path);
    for (const required of ['package.json', 'README.md', 'dist/index.js']) {
      if (!filenames.includes(required)) throw new Error(`@lcdd/${name} tarball is missing ${required}`);
    }
    if (filenames.some(file => file.includes('__tests__') || file.startsWith('src/'))) throw new Error(`@lcdd/${name} tarball contains tests or src/ files`);
    tarballs.push(join(output, entry.filename));
  }
} finally {
  rmSync(stagingRoot, { recursive: true, force: true });
}

const smoke = mkdtempSync(join(tmpdir(), 'lcdd-local-release-'));
try {
  run('npm', ['install', '--ignore-scripts', ...tarballs], smoke);
  run(process.execPath, ['--input-type=module', '-e', "import { validateContext } from '@lcdd/core'; if (validateContext({}).valid) process.exit(1)"], smoke);
  run(join(smoke, 'node_modules', '.bin', 'lcd'), ['--version'], smoke);
} finally {
  rmSync(smoke, { recursive: true, force: true });
}

console.log(`Local npm release ${targetVersion} prepared from source ${sourceVersion} and smoke-tested:`);
tarballs.forEach(tarball => console.log(`- ${tarball}`));
console.log('Nothing was published. These next-version tarballs are for local testing; publishing still requires version and documentation reconciliation.');
