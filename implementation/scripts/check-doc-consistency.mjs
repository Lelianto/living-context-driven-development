import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const implementationRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(implementationRoot, '..');

function read(relativePath) {
  return readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

const packagePaths = [
  'implementation/package.json',
  'implementation/packages/core/package.json',
  'implementation/packages/cli/package.json',
  'implementation/packages/mcp/package.json',
];
const packageVersions = packagePaths.map(path => [path, readJson(path).version]);
const releaseVersion = packageVersions[0][1];

for (const [path, version] of packageVersions) {
  requireCondition(version === releaseVersion, `${path} is ${version}; expected ${releaseVersion}`);
}

const changelog = read('CHANGELOG.md');
const roadmap = read('ROADMAP.md');
const detailedRoadmap = read('specification/0016-roadmap.md');
const readme = read('README.md');
const faq = read('docs/faq.md');

requireCondition(changelog.includes(`## [${releaseVersion}]`), `CHANGELOG.md has no ${releaseVersion} release section`);
requireCondition(roadmap.includes(`**Version:** ${releaseVersion}`), `ROADMAP.md does not declare ${releaseVersion}`);
requireCondition(detailedRoadmap.includes(`**Version:** ${releaseVersion}`), `0016-roadmap.md does not declare ${releaseVersion}`);
requireCondition(readme.includes(`Implementation Phase (v${releaseVersion})`), `README.md maturity does not match v${releaseVersion}`);
requireCondition(faq.includes(`**Version:** ${releaseVersion}`), `docs/faq.md does not declare ${releaseVersion}`);

const mcpSource = read('implementation/packages/mcp/src/index.ts');
const mcpToolCount = [...mcpSource.matchAll(/name:\s*["']lcdd_[a-z_]+["']/g)].length;
requireCondition(readme.includes(`${mcpToolCount} tools via Model Context Protocol`), `README.md MCP tool count does not match implementation (${mcpToolCount})`);
requireCondition(read('website/src/pages/index.astro').includes(`MCP Server — ${mcpToolCount} tools`), `website MCP tool count does not match implementation (${mcpToolCount})`);

requireCondition(
  read('reference/schema/context-schema.json') === read('implementation/packages/core/src/context-schema.json'),
  'reference and runtime Context schemas differ',
);

const stalePublicClaims = [
  ['README.md', readme, 'Specification Phase (v0.1.0)'],
  ['README.md', readme, 'Reference Implementation (v0.3.1)'],
  ['docs/faq.md', faq, 'reference CLI be available'],
  ['ROADMAP.md', roadmap, 'v0.5.0 — Ecosystem'],
];

for (const [path, content, marker] of stalePublicClaims) {
  requireCondition(!content.includes(marker), `${path} contains stale marker: ${marker}`);
}

if (failures.length > 0) {
  console.error('Documentation consistency check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Documentation consistency check passed for v${releaseVersion} with ${mcpToolCount} MCP tools.`);
