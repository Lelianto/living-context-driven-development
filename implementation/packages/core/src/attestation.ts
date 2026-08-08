import { createHash, sign as cryptoSign, verify as cryptoVerify } from 'node:crypto';
import type { Assurance, TrustRegistry } from './governance.js';
import { matchesAnyPath } from './path-matcher.js';

export interface NormalizedIdentityEvidence {
  issuer: string;
  subject: string;
  assurance: Assurance;
  authentication_method: string;
  issued_at: string;
  expires_at?: string;
  evidence_id: string;
}

export interface SignatureEvidence {
  algorithm: 'Ed25519';
  key_id: string;
  signature: string;
}

export interface GovernanceAttestation {
  schema_version: '1';
  repository_id: string;
  action: string;
  resource: string;
  actor: string;
  revision: string;
  content_digest: `sha256:${string}`;
  policy_revision: string;
  issued_at: string;
  identity_evidence: NormalizedIdentityEvidence;
  signature?: SignatureEvidence;
}

function canonicalValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Canonical JSON rejects non-finite numbers');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalValue(item)}`).join(',')}}`;
  }
  throw new Error(`Canonical JSON rejects ${typeof value}`);
}

/** RFC 8785-compatible canonical JSON for the LCDD data subset. */
export function canonicalize(value: unknown): string { return canonicalValue(value); }

export function contentDigest(value: unknown): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(canonicalize(value)).digest('hex')}`;
}

function unsigned(attestation: GovernanceAttestation): Omit<GovernanceAttestation, 'signature'> {
  const { signature: _signature, ...payload } = attestation;
  return payload;
}

export function signAttestation(attestation: Omit<GovernanceAttestation, 'signature'>, keyId: string, privateKeyPem: string): GovernanceAttestation {
  const bytes = Buffer.from(canonicalize(attestation));
  const signature = cryptoSign(null, bytes, privateKeyPem).toString('base64url');
  return { ...attestation, signature: { algorithm: 'Ed25519', key_id: keyId, signature } };
}

export function verifyAttestation(attestation: GovernanceAttestation, trust: TrustRegistry, now = new Date()): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!attestation.signature) return { valid: false, errors: ['Attestation is unsigned'] };
  if (attestation.signature.algorithm !== 'Ed25519') errors.push(`Unsupported signature algorithm: ${attestation.signature.algorithm}`);
  const principal = trust.principals.find(value => value.id === attestation.actor && value.status === 'active');
  if (!principal) errors.push(`Unknown or inactive actor: ${attestation.actor}`);
  const key = principal?.signing_keys.find(value => value.id === attestation.signature?.key_id);
  if (!key) errors.push(`Unknown signing key: ${attestation.signature.key_id}`);
  else {
    if (key.status !== 'active') errors.push(`Signing key is ${key.status}`);
    try {
      const valid = cryptoVerify(null, Buffer.from(canonicalize(unsigned(attestation))), key.public_key, Buffer.from(attestation.signature.signature, 'base64url'));
      if (!valid) errors.push('Signature verification failed');
    } catch { errors.push('Signature verification failed'); }
  }
  if (attestation.identity_evidence.expires_at && new Date(attestation.identity_evidence.expires_at) <= now) errors.push('Identity evidence is expired');
  if (attestation.identity_evidence.issuer && attestation.identity_evidence.subject) {
    const bound = principal?.identities.some(binding => binding.issuer === attestation.identity_evidence.issuer && binding.subject === attestation.identity_evidence.subject);
    if (!bound) errors.push('Identity evidence does not resolve to the attestation actor');
  }
  return { valid: errors.length === 0, errors };
}

const ASSURANCE: Record<Assurance, number> = { unverified: 0, signed: 1, 'provider-verified': 2, 'idp-verified': 3 };
const AI_DENY = new Set(['context.hardened.approve', 'governance.approve', 'trust.change', 'ownership.change']);

export interface AuthorizationRequest {
  principal_id: string;
  assurance: Assurance;
  action: string;
  category?: string;
  path?: string;
  context_id?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason: string;
  matched_permissions: Array<{ role: string; effect: 'allow' | 'deny' }>;
}

function scopeMatches(scope: { categories?: string[]; paths?: string[]; context_ids?: string[] }, request: AuthorizationRequest): boolean {
  if (scope.categories?.length && (!request.category || !scope.categories.includes(request.category))) return false;
  if (scope.paths?.length && (!request.path || !matchesAnyPath(request.path, scope.paths))) return false;
  if (scope.context_ids?.length && (!request.context_id || !scope.context_ids.includes(request.context_id))) return false;
  return true;
}

export function authorize(trust: TrustRegistry, request: AuthorizationRequest): AuthorizationDecision {
  const principal = trust.principals.find(value => value.id === request.principal_id && value.status === 'active');
  if (!principal) return { allowed: false, reason: 'Unknown or inactive Principal', matched_permissions: [] };
  if (principal.type === 'ai-agent' && AI_DENY.has(request.action)) {
    return { allowed: false, reason: `AI Principals cannot perform ${request.action}`, matched_permissions: [] };
  }
  const teamIds = trust.teams.filter(team => team.members.includes(principal.id)).map(team => team.id);
  const memberships = new Set([principal.id, ...teamIds]);
  const roles = trust.roles.filter(role => role.members.some(member => memberships.has(member)));
  const roleIds = new Set(roles.map(role => role.id));
  const applicable = trust.permissions.filter(permission =>
    roleIds.has(permission.role)
    && permission.actions.includes(request.action)
    && scopeMatches(permission.scope, request)
    && ASSURANCE[request.assurance] >= ASSURANCE[permission.minimum_assurance ?? 'unverified']);
  const matched = applicable.map(permission => ({ role: permission.role, effect: permission.effect }));
  if (applicable.some(permission => permission.effect === 'deny')) return { allowed: false, reason: 'Explicit deny permission matched', matched_permissions: matched };
  if (applicable.some(permission => permission.effect === 'allow')) return { allowed: true, reason: 'Allow permission matched', matched_permissions: matched };
  return { allowed: false, reason: 'No applicable allow permission', matched_permissions: matched };
}
