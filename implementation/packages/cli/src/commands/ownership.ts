import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import yaml from 'js-yaml';
import {
  GitChangeDetector, OwnershipResolver, matchesAnyPath,
  validateOwnershipRegistry, validateTrustRegistry,
  type Context, type OwnershipRegistry, type TrustRegistry,
} from '@lcdd/core';

interface CommonOptions { json?: boolean }
interface InitOptions extends CommonOptions { dryRun?: boolean; yes?: boolean }
interface DoctorOptions extends CommonOptions { strict?: boolean }
interface ImpactOptions extends CommonOptions { staged?: boolean; changes?: boolean; base?: string; head?: string }

function result(command: string, status: 'success' | 'warning' | 'blocked' | 'error', data: unknown, warnings: string[] = [], errors: string[] = []) {
  return { schema_version: '1', command, status, generated_at: new Date().toISOString(), project_root: process.cwd(), data, warnings, errors };
}

function loadYaml<T>(path: string): T {
  return yaml.load(readFileSync(path, 'utf8')) as T;
}

function paths() {
  const lcdd = join(process.cwd(), '.lcdd');
  return { ownership: join(lcdd, 'ownership.yaml'), trust: join(lcdd, 'trust.yaml') };
}

function gitText(args: string[]): string {
  try { return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8', timeout: 10_000, maxBuffer: 5_000_000 }); }
  catch { return ''; }
}

function trustedYaml<T>(ref: string, path: string): T | undefined {
  const value = gitText(['show', `${ref}:${path}`]);
  return value ? yaml.load(value) as T : undefined;
}

function trustedContexts(ref: string): Context[] {
  const files = gitText(['ls-tree', '-r', '--name-only', ref, '--', '.lcdd/contexts'])
    .split('\n').filter(path => /\.ya?ml$/.test(path));
  return files.flatMap(path => {
    const context = trustedYaml<Context>(ref, path);
    return context?.lifecycle === 'active' ? [context] : [];
  });
}

export async function ownershipInitCommand(options: InitOptions): Promise<void> {
  const target = paths().ownership;
  if (existsSync(target)) {
    if (options.json) console.log(JSON.stringify(result('ownership.init', 'success', { created: false, path: target }), null, 2));
    else console.log(chalk.green('✓ Ownership Registry already exists; no changes made.'));
    return;
  }
  const ownership: OwnershipRegistry = { version: '1', boundaries: [] };
  const output = yaml.dump(ownership, { lineWidth: 120, noRefs: true });
  if (options.dryRun) {
    if (options.json) console.log(JSON.stringify(result('ownership.init', 'success', { created: false, proposed: ownership }), null, 2));
    else console.log(output);
    return;
  }
  if (!options.yes) throw new Error('Ownership initialization requires --yes after reviewing `lcd ownership init --dry-run`');
  if (!existsSync(join(process.cwd(), '.lcdd', 'config.yaml'))) throw new Error('LCDD is not initialized; run `lcd init` first');
  writeFileSync(target, output);
  if (options.json) console.log(JSON.stringify(result('ownership.init', 'success', { created: true, path: target }), null, 2));
  else console.log(chalk.green('✓ Created .lcdd/ownership.yaml'));
}

export async function ownershipDoctorCommand(options: DoctorOptions): Promise<void> {
  const files = paths();
  if (!existsSync(files.ownership)) throw new Error('.lcdd/ownership.yaml does not exist; run `lcd ownership init --yes`');
  const ownership = loadYaml<OwnershipRegistry>(files.ownership);
  const trust = existsSync(files.trust) ? loadYaml<TrustRegistry>(files.trust) : undefined;
  const validation = validateOwnershipRegistry(ownership, trust);
  const trustValidation = trust ? validateTrustRegistry(trust) : undefined;
  const warnings = [...validation.warnings];
  const errors = [...validation.errors];
  if (!trust) warnings.push('Trust Registry not found; ownership identities are structurally valid but unresolved');
  if (trustValidation) {
    errors.push(...trustValidation.errors.map(value => `Trust: ${value}`));
    warnings.push(...trustValidation.warnings.map(value => `Trust: ${value}`));
  }
  const included = ownership.boundaries.flatMap(boundary => boundary.paths.include);
  const data = {
    boundaries: ownership.boundaries.length,
    include_patterns: included.length,
    trust_resolved: Boolean(trust),
    errors,
    warnings,
  };
  const blocked = errors.length > 0 || Boolean(options.strict && warnings.length > 0);
  if (options.json) console.log(JSON.stringify(result('ownership.doctor', blocked ? 'blocked' : warnings.length ? 'warning' : 'success', data, warnings, errors), null, 2));
  else {
    console.log(chalk.bold('LCDD ownership health\n'));
    console.log(`Boundaries:       ${ownership.boundaries.length}`);
    console.log(`Include patterns: ${included.length}`);
    console.log(`Trust resolved:   ${trust ? 'yes' : 'no'}`);
    for (const warning of warnings) console.log(chalk.yellow(`WARN  ${warning}`));
    for (const error of errors) console.log(chalk.red(`ERROR ${error}`));
    if (!blocked && warnings.length === 0) console.log(chalk.green('\n✓ Ownership Registry is valid'));
  }
  if (blocked) process.exitCode = errors.length > 0 ? 2 : 1;
}

function activeEntities(trust?: TrustRegistry): Set<string> {
  if (!trust) return new Set();
  const principals = new Set(trust.principals.filter(value => value.status === 'active').map(value => value.id));
  const teams = trust.teams.filter(team => team.members.some(member => principals.has(member))).map(team => team.id);
  return new Set([...principals, ...teams]);
}

export async function impactCommand(options: ImpactOptions): Promise<void> {
  if (!options.staged && !options.changes && !options.base) throw new Error('Choose --staged, --changes, or --base <ref>');
  if (options.staged && (options.changes || options.base || options.head)) throw new Error('--staged cannot be combined with --changes, --base, or --head');
  if (options.head && !options.base) throw new Error('--head requires --base');
  const changeSet = new GitChangeDetector(process.cwd()).detect({ staged: options.staged, base: options.base, head: options.head });
  const trustedBase = changeSet.merge_base ?? 'HEAD';
  const ownership = trustedYaml<OwnershipRegistry>(trustedBase, '.lcdd/ownership.yaml');
  if (!ownership) throw new Error(`Trusted base ${trustedBase} has no .lcdd/ownership.yaml; merge the bootstrap policy before enforcing impact`);
  const trust = trustedYaml<TrustRegistry>(trustedBase, '.lcdd/trust.yaml');
  const validation = validateOwnershipRegistry(ownership, trust);
  if (!validation.valid) throw new Error(`Invalid trusted Ownership Registry: ${validation.errors.join('; ')}`);
  if (trust) {
    const trustValidation = validateTrustRegistry(trust);
    if (!trustValidation.valid) throw new Error(`Invalid trusted Trust Registry: ${trustValidation.errors.join('; ')}`);
  }
  const changedPaths = changeSet.files.map(file => file.path);
  const matches = new OwnershipResolver(ownership).resolve(changedPaths);
  const contexts = trustedContexts(trustedBase).filter(context =>
    changedPaths.some(path => matchesAnyPath(path, context.applies_to ?? ['**/*'])));
  const entities = activeEntities(trust);
  const required = [...new Set(matches.flatMap(match => match.boundary.required_reviewers ?? []))].sort();
  const unresolved = [...new Set(matches.flatMap(match => [
    ...match.boundary.code_owners,
    ...(match.boundary.required_reviewers ?? []),
    ...(match.boundary.affected_reviewers ?? []),
  ]).filter(entity => !entities.has(entity)))].sort();
  const notifications = new Map<string, { entity: string; action: string; reasons: string[] }>();
  const add = (entity: string, action: string, reason: string) => {
    const current = notifications.get(entity);
    const ranks: Record<string, number> = { summary: 0, mention: 1, 'request-review': 2, 'require-approval': 3 };
    if (!current || ranks[action] > ranks[current.action]) notifications.set(entity, { entity, action, reasons: [reason] });
    else current.reasons.push(reason);
  };
  for (const match of matches) {
    for (const entity of match.boundary.code_owners) add(entity, 'request-review', `Code owner for ${match.boundary.id}`);
    for (const entity of match.boundary.required_reviewers ?? []) add(entity, 'require-approval', `Required reviewer for ${match.boundary.id}`);
    for (const entity of match.boundary.affected_reviewers ?? []) add(entity, 'mention', `Affected reviewer for ${match.boundary.id}`);
    for (const entity of match.boundary.subscribers ?? []) add(entity, 'summary', `Subscriber for ${match.boundary.id}`);
  }
  const decision = unresolved.some(entity => required.includes(entity)) ? 'block' : unresolved.length ? 'warn' : 'pass';
  const data = {
    schema_version: '1',
    trusted_base: trustedBase,
    change_set: changeSet,
    boundaries: matches.map(match => ({ boundary_id: match.boundary.id, name: match.boundary.name, paths: match.paths })),
    applicable_context_ids: contexts.map(context => context.id).sort(),
    unresolved_entities: unresolved,
    notifications: [...notifications.values()].map(value => ({ ...value, reasons: [...new Set(value.reasons)].sort() })),
    decision,
  };
  if (options.json) console.log(JSON.stringify(result('impact', decision === 'block' ? 'blocked' : decision === 'warn' ? 'warning' : 'success', data), null, 2));
  else {
    console.log(chalk.bold(`LCDD change impact: ${decision.toUpperCase()}\n`));
    console.log(`Changed files:       ${changedPaths.length}`);
    console.log(`Affected boundaries: ${matches.length}`);
    console.log(`Applicable Contexts: ${contexts.length}`);
    for (const notification of data.notifications) console.log(`${notification.action.padEnd(16)} ${notification.entity}`);
    for (const entity of unresolved) console.log(chalk.yellow(`UNRESOLVED       ${entity}`));
  }
  if (decision === 'block') process.exitCode = 5;
}
