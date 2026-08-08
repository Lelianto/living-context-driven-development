import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { validateContextFull } from '../packages/core/dist/index.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, '../..');
const registryRoot = path.join(repositoryRoot, '.lcdd');
const contextsRoot = path.join(registryRoot, 'contexts');
const errors = [];

async function yamlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return yamlFiles(target);
    return /\.ya?ml$/i.test(entry.name) ? [target] : [];
  }));
  return nested.flat().sort();
}

const files = await yamlFiles(contextsRoot);
const contexts = [];

for (const file of files) {
  const relative = path.relative(repositoryRoot, file);
  const context = yaml.load(await readFile(file, 'utf8'));
  const result = validateContextFull(context);

  if (!result.valid) {
    errors.push(`${relative}: ${result.errors.join('; ')}`);
    continue;
  }

  const expectedKind = relative.includes('/hardened/') ? 'hardened-' : 'local-';
  if (!context.governance.classification.startsWith(expectedKind)) {
    errors.push(`${relative}: classification must start with ${expectedKind}`);
  }
  if (!context.metadata?.observability || !context.metadata?.enforcement_point) {
    errors.push(`${relative}: metadata must declare observability and enforcement_point`);
  }
  contexts.push({ ...context, relative });
}

const manifest = yaml.load(await readFile(path.join(registryRoot, 'pack.yaml'), 'utf8'));
const declared = new Map(manifest.contexts.map(item => [item.id, item.version]));
const actual = new Map(contexts.map(context => [context.id, context.version]));

for (const [id, version] of declared) {
  if (!actual.has(id)) errors.push(`pack.yaml: declared context ${id} is missing`);
  else if (actual.get(id) !== version) errors.push(`pack.yaml: ${id} version does not match its Context`);
}
for (const id of actual.keys()) {
  if (!declared.has(id)) errors.push(`pack.yaml: Context ${id} is not declared`);
}

const eventLines = (await readFile(path.join(contextsRoot, '.events.log'), 'utf8'))
  .split('\n')
  .filter(Boolean);
const events = eventLines.map((line, index) => {
  try {
    return JSON.parse(line);
  } catch {
    errors.push(`.events.log:${index + 1}: invalid JSON`);
    return null;
  }
}).filter(Boolean);

const requiredTransitions = [
  ['draft', 'candidate'],
  ['candidate', 'approved'],
  ['approved', 'active'],
];
for (const context of contexts.filter(item => item.lifecycle === 'active')) {
  const history = events
    .filter(event => event.context_id === context.id)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  let cursor = 0;
  for (const [from, to] of requiredTransitions) {
    const found = history.findIndex(
      (event, index) => index >= cursor && event.from_stage === from && event.to_stage === to,
    );
    if (found < 0) {
      errors.push(`.events.log: ${context.id} is active without ${from} -> ${to}`);
      break;
    }
    cursor = found + 1;
  }
}

if (errors.length) {
  console.error(`Self-governance check failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Self-governance check passed: ${contexts.length} Contexts match the pack, schema, classification, and lifecycle history.`);
}
