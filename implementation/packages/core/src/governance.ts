import { matchesAnyPath, normalizeRepositoryPath } from './path-matcher.js';

export type Assurance = 'unverified' | 'signed' | 'provider-verified' | 'idp-verified';
export type PrincipalType = 'human' | 'workload' | 'ai-agent';
export type PrincipalStatus = 'invited' | 'active' | 'suspended' | 'revoked';

export interface IdentityBinding {
  issuer: string;
  subject: string;
  handle?: string;
  verified_at?: string;
  expires_at?: string | null;
}

export interface SigningKey {
  id: string;
  type: 'ed25519' | 'ssh-ed25519' | 'ecdsa-p256';
  public_key: string;
  fingerprint: string;
  status: 'active' | 'revoked' | 'expired';
  created_at?: string;
  revoked_at?: string | null;
  revocation_reason?: string;
}

export interface Principal {
  id: string;
  type: PrincipalType;
  display_name: string;
  status: PrincipalStatus;
  identities: IdentityBinding[];
  signing_keys: SigningKey[];
}

export interface Team {
  id: string;
  name: string;
  members: string[];
  provider_bindings: Array<{ issuer: string; type: 'team' | 'group'; subject: string; mention?: string }>;
}

export interface GovernanceRole { id: string; name: string; members: string[] }
export interface GovernancePermission {
  role: string;
  effect: 'allow' | 'deny';
  actions: string[];
  scope: { categories?: string[]; paths?: string[]; context_ids?: string[] };
  minimum_assurance?: Assurance;
}

export interface TrustRegistry {
  version: '1';
  root: { threshold: number; principals: string[] };
  principals: Principal[];
  teams: Team[];
  roles: GovernanceRole[];
  permissions: GovernancePermission[];
}

export interface OwnershipBoundary {
  id: string;
  name: string;
  description?: string;
  paths: { include: string[]; exclude?: string[] };
  code_owners: string[];
  context_owners?: string[];
  authority_owners?: string[];
  required_reviewers?: string[];
  affected_reviewers?: string[];
  subscribers?: string[];
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface OwnershipRegistry { version: '1'; boundaries: OwnershipBoundary[] }

export interface GovernanceValidation { valid: boolean; errors: string[]; warnings: string[] }

const PRINCIPAL = /^principal:[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const TEAM = /^team:[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const ROLE = /^role:[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const BOUNDARY = /^boundary:[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  return [...new Set(values.filter(value => seen.has(value) || !seen.add(value)))];
}

export function validateTrustRegistry(trust: TrustRegistry): GovernanceValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (trust.version !== '1') errors.push('Trust Registry version must be "1"');
  const principalIds = trust.principals.map(value => value.id);
  const teamIds = trust.teams.map(value => value.id);
  const roleIds = trust.roles.map(value => value.id);
  for (const id of principalIds) if (!PRINCIPAL.test(id)) errors.push(`Invalid Principal ID: ${id}`);
  for (const id of teamIds) if (!TEAM.test(id)) errors.push(`Invalid Team ID: ${id}`);
  for (const id of roleIds) if (!ROLE.test(id)) errors.push(`Invalid role ID: ${id}`);
  for (const id of duplicates(principalIds)) errors.push(`Duplicate Principal ID: ${id}`);
  for (const id of duplicates(teamIds)) errors.push(`Duplicate Team ID: ${id}`);
  for (const id of duplicates(roleIds)) errors.push(`Duplicate role ID: ${id}`);

  const principals = new Map(trust.principals.map(value => [value.id, value]));
  const entities = new Set([...principalIds, ...teamIds]);
  const roles = new Set(roleIds);
  const bindings = new Map<string, string>();
  for (const principal of trust.principals) {
    for (const binding of principal.identities ?? []) {
      const key = `${binding.issuer}\u0000${binding.subject}`;
      const existing = bindings.get(key);
      if (existing && existing !== principal.id && principal.status === 'active') {
        errors.push(`Identity binding ${binding.issuer} + ${binding.subject} belongs to multiple active Principals`);
      }
      if (principal.status === 'active') bindings.set(key, principal.id);
    }
  }

  const activeRoots = trust.root.principals.filter(id => principals.get(id)?.status === 'active');
  for (const id of trust.root.principals) if (!principals.has(id)) errors.push(`Unknown root Principal: ${id}`);
  if (!Number.isInteger(trust.root.threshold) || trust.root.threshold < 1) errors.push('Root threshold must be a positive integer');
  if (trust.root.threshold > activeRoots.length) errors.push('Root threshold exceeds active root Principal count');

  for (const team of trust.teams) {
    for (const member of team.members) if (!principals.has(member)) errors.push(`Team ${team.id} has unknown member ${member}`);
  }
  for (const role of trust.roles) {
    for (const member of role.members) if (!entities.has(member)) errors.push(`Role ${role.id} has unknown member ${member}`);
  }
  for (const permission of trust.permissions) {
    if (!roles.has(permission.role)) errors.push(`Permission has unknown role ${permission.role}`);
    const role = trust.roles.find(value => value.id === permission.role);
    const aiMembers = role?.members.flatMap(member => {
      if (member.startsWith('principal:')) return principals.get(member)?.type === 'ai-agent' ? [member] : [];
      const team = trust.teams.find(value => value.id === member);
      return team?.members.filter(id => principals.get(id)?.type === 'ai-agent') ?? [];
    }) ?? [];
    if (permission.effect === 'allow' && aiMembers.length > 0) {
      for (const action of permission.actions) {
        if (['context.hardened.approve', 'governance.approve', 'trust.change', 'ownership.change'].includes(action)) {
          errors.push(`AI Principal cannot receive ${action} through ${permission.role}`);
        }
      }
    }
  }
  if (trust.root.threshold === 1 && trust.root.principals.length > 1) warnings.push('Multi-person root uses threshold 1');
  return { valid: errors.length === 0, errors, warnings };
}

function safePattern(pattern: string): boolean {
  const normalized = normalizeRepositoryPath(pattern);
  return normalized.length > 0 && !normalized.startsWith('/') && normalized !== '..' && !normalized.startsWith('../');
}

export function validateOwnershipRegistry(ownership: OwnershipRegistry, trust?: TrustRegistry): GovernanceValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (ownership.version !== '1') errors.push('Ownership Registry version must be "1"');
  const ids = ownership.boundaries.map(value => value.id);
  for (const id of ids) if (!BOUNDARY.test(id)) errors.push(`Invalid boundary ID: ${id}`);
  for (const id of duplicates(ids)) errors.push(`Duplicate boundary ID: ${id}`);
  const entities = new Set([...(trust?.principals.map(value => value.id) ?? []), ...(trust?.teams.map(value => value.id) ?? [])]);
  for (const boundary of ownership.boundaries) {
    if (!boundary.paths.include?.length) errors.push(`Boundary ${boundary.id} has no include paths`);
    for (const pattern of [...(boundary.paths.include ?? []), ...(boundary.paths.exclude ?? [])]) {
      if (!safePattern(pattern)) errors.push(`Boundary ${boundary.id} has unsafe path pattern: ${pattern}`);
    }
    const relationships = [
      ...(boundary.code_owners ?? []), ...(boundary.context_owners ?? []), ...(boundary.authority_owners ?? []),
      ...(boundary.required_reviewers ?? []), ...(boundary.affected_reviewers ?? []), ...(boundary.subscribers ?? []),
    ];
    for (const entity of relationships) {
      if (!PRINCIPAL.test(entity) && !TEAM.test(entity)) errors.push(`Boundary ${boundary.id} has invalid entity ${entity}`);
      else if (trust && !entities.has(entity)) errors.push(`Boundary ${boundary.id} references unknown entity ${entity}`);
    }
    if (boundary.code_owners.length === 0) warnings.push(`Boundary ${boundary.id} has no code owner`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

function specificity(boundary: OwnershipBoundary): number {
  return Math.max(...boundary.paths.include.map(pattern => pattern.split(/[*?]/, 1)[0].length));
}

export interface BoundaryMatch { boundary: OwnershipBoundary; paths: string[] }

export class OwnershipResolver {
  constructor(private readonly ownership: OwnershipRegistry) {}

  matchingBoundaries(path: string): OwnershipBoundary[] {
    const normalized = normalizeRepositoryPath(path);
    return this.ownership.boundaries.filter(boundary =>
      matchesAnyPath(normalized, boundary.paths.include) && !matchesAnyPath(normalized, boundary.paths.exclude ?? []))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || specificity(b) - specificity(a) || a.id.localeCompare(b.id));
  }

  resolve(paths: string[]): BoundaryMatch[] {
    const matches = new Map<string, BoundaryMatch>();
    for (const path of paths) {
      for (const boundary of this.matchingBoundaries(path)) {
        const entry = matches.get(boundary.id) ?? { boundary, paths: [] };
        entry.paths.push(normalizeRepositoryPath(path));
        matches.set(boundary.id, entry);
      }
    }
    return [...matches.values()].map(value => ({ ...value, paths: [...new Set(value.paths)].sort() }));
  }
}
