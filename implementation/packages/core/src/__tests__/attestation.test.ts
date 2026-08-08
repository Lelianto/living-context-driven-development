import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  authorize, canonicalize, contentDigest, signAttestation, verifyAttestation,
  type GovernanceAttestation, type TrustRegistry,
} from '../index.js';

const pair = generateKeyPairSync('ed25519');
const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

function makeTrust(type: 'human' | 'ai-agent' = 'human'): TrustRegistry {
  return {
    version: '1', root: { threshold: 1, principals: ['principal:actor'] },
    principals: [{
      id: 'principal:actor', type, display_name: 'Actor', status: 'active',
      identities: [{ issuer: 'https://id.example.com', subject: 'user:1' }],
      signing_keys: [{ id: 'key:one', type: 'ed25519', public_key: publicKey, fingerprint: 'test', status: 'active' }],
    }],
    teams: [], roles: [{ id: 'role:developer', name: 'Developer', members: ['principal:actor'] }],
    permissions: [
      { role: 'role:developer', effect: 'allow', actions: ['code.change', 'governance.approve'], scope: {}, minimum_assurance: 'signed' },
    ],
  };
}

function unsigned(): Omit<GovernanceAttestation, 'signature'> {
  return {
    schema_version: '1', repository_id: 'repo:one', action: 'governance.approve', resource: 'context:test@1',
    actor: 'principal:actor', revision: 'git:abc', content_digest: contentDigest({ rule: 'one' }),
    policy_revision: 'git:base', issued_at: '2026-08-08T10:00:00Z',
    identity_evidence: {
      issuer: 'https://id.example.com', subject: 'user:1', assurance: 'signed', authentication_method: 'key',
      issued_at: '2026-08-08T10:00:00Z', evidence_id: 'evidence:one',
    },
  };
}

describe('canonical attestation', () => {
  it('canonicalizes object keys and computes stable semantic digests', () => {
    expect(canonicalize({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(contentDigest({ b: 2, a: 1 })).toBe(contentDigest({ a: 1, b: 2 }));
  });

  it('signs and verifies exact content with Ed25519', () => {
    const trust = makeTrust();
    const signed = signAttestation(unsigned(), 'key:one', privateKey);
    expect(verifyAttestation(signed, trust).valid).toBe(true);
    const tampered = { ...signed, revision: 'git:different' };
    expect(verifyAttestation(tampered, trust).errors).toContain('Signature verification failed');
  });

  it('rejects revoked keys and mismatched identity evidence', () => {
    const trust = makeTrust();
    trust.principals[0].signing_keys[0].status = 'revoked';
    const signed = signAttestation(unsigned(), 'key:one', privateKey);
    const result = verifyAttestation({ ...signed, identity_evidence: { ...signed.identity_evidence, subject: 'user:other' } }, trust);
    expect(result.errors).toContain('Signing key is revoked');
    expect(result.errors).toContain('Identity evidence does not resolve to the attestation actor');
  });
});

describe('authorization', () => {
  it('requires configured assurance and applies allows', () => {
    const trust = makeTrust();
    expect(authorize(trust, { principal_id: 'principal:actor', assurance: 'signed', action: 'code.change' }).allowed).toBe(true);
    expect(authorize(trust, { principal_id: 'principal:actor', assurance: 'unverified', action: 'code.change' }).allowed).toBe(false);
  });

  it('gives explicit deny precedence', () => {
    const trust = makeTrust();
    trust.permissions.push({ role: 'role:developer', effect: 'deny', actions: ['code.change'], scope: {} });
    expect(authorize(trust, { principal_id: 'principal:actor', assurance: 'signed', action: 'code.change' }).reason).toMatch(/Explicit deny/);
  });

  it('hard-denies AI governance approval despite a broad allow', () => {
    const trust = makeTrust('ai-agent');
    const decision = authorize(trust, { principal_id: 'principal:actor', assurance: 'idp-verified', action: 'governance.approve' });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/AI Principals cannot/);
  });
});
