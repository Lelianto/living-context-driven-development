import { describe, expect, it } from 'vitest';
import {
  OwnershipResolver, validateOwnershipRegistry, validateTrustRegistry,
  type OwnershipRegistry, type TrustRegistry,
} from '../index.js';

const trust: TrustRegistry = {
  version: '1',
  root: { threshold: 2, principals: ['principal:lelianto', 'principal:bambang', 'principal:ratna'] },
  principals: ['lelianto', 'bambang', 'ratna'].map(name => ({
    id: `principal:${name}`, type: 'human' as const, display_name: name, status: 'active' as const,
    identities: [{ issuer: 'https://example.com', subject: `user:${name}` }], signing_keys: [],
  })),
  teams: [{ id: 'team:payments', name: 'Payments', members: ['principal:bambang'], provider_bindings: [] }],
  roles: [], permissions: [],
};

const ownership: OwnershipRegistry = {
  version: '1',
  boundaries: [
    { id: 'boundary:shared', name: 'Shared', paths: { include: ['packages/**'] }, code_owners: ['principal:lelianto'], priority: 10 },
    { id: 'boundary:payments', name: 'Payments', paths: { include: ['packages/payments/**'], exclude: ['**/*.test.ts'] }, code_owners: ['team:payments'], priority: 20 },
  ],
};

describe('governance validation', () => {
  it('accepts resolved trust and ownership registries', () => {
    expect(validateTrustRegistry(trust)).toEqual({ valid: true, errors: [], warnings: [] });
    expect(validateOwnershipRegistry(ownership, trust).valid).toBe(true);
  });

  it('rejects duplicate external subjects and impossible thresholds', () => {
    const invalid = structuredClone(trust);
    invalid.root.threshold = 4;
    invalid.principals[1].identities = [{ issuer: 'https://example.com', subject: 'user:lelianto' }];
    const result = validateTrustRegistry(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toMatch(/multiple active Principals/);
    expect(result.errors.join('\n')).toMatch(/threshold exceeds/);
  });

  it('prevents AI roles from receiving protected approval', () => {
    const invalid = structuredClone(trust);
    invalid.principals.push({ id: 'principal:agent', type: 'ai-agent', display_name: 'Agent', status: 'active', identities: [], signing_keys: [] });
    invalid.roles.push({ id: 'role:agent', name: 'Agent', members: ['principal:agent'] });
    invalid.permissions.push({ role: 'role:agent', effect: 'allow', actions: ['governance.approve'], scope: {} });
    expect(validateTrustRegistry(invalid).errors.join('\n')).toMatch(/AI Principal cannot receive governance.approve/);
  });

  it('rejects unsafe ownership paths and unresolved entities', () => {
    const invalid = structuredClone(ownership);
    invalid.boundaries[0].paths.include = ['../secrets/**'];
    invalid.boundaries[0].code_owners = ['team:unknown'];
    const result = validateOwnershipRegistry(invalid, trust);
    expect(result.errors.join('\n')).toMatch(/unsafe path/);
    expect(result.errors.join('\n')).toMatch(/unknown entity/);
  });
});

describe('OwnershipResolver', () => {
  it('returns deterministic overlapping matches by priority and specificity', () => {
    const result = new OwnershipResolver(ownership).matchingBoundaries('packages/payments/refund.ts');
    expect(result.map(value => value.id)).toEqual(['boundary:payments', 'boundary:shared']);
  });

  it('honors excludes and deduplicates paths in aggregate output', () => {
    const resolver = new OwnershipResolver(ownership);
    expect(resolver.matchingBoundaries('packages/payments/refund.test.ts').map(value => value.id)).toEqual(['boundary:shared']);
    const result = resolver.resolve(['packages/payments/refund.ts', 'packages/payments/refund.ts']);
    expect(result[0].paths).toEqual(['packages/payments/refund.ts']);
  });
});
