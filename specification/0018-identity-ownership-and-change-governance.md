# 0018 — Identity, Ownership, and Change Governance

**Status:** Draft

**Version:** 0.1.0

**Specification:** Living Context Driven Development

**Last Updated:** 2026-08-08

---

## Abstract

This document defines provider-neutral actor identity, team membership, repository ownership,
verifiable governance evidence, and trusted-base evaluation for LCDD. It enables implementations to
answer who made or approved a change, which teams are affected, and whether the actor is authorized
without coupling LCDD Core to GitHub, GitLab, Bitbucket, Azure DevOps, or another repository host.

---

## Motivation

The Authority and Governance models define who should be trusted and how Contexts change, but the
current reference implementation commonly represents an actor as a caller-provided string. Names,
emails, provider handles, and YAML fields are forgeable. They cannot satisfy protected governance.

Cross-team change review also requires a durable mapping from repository paths to accountable
teams. Provider-native ownership files help on one platform, but they do not provide a portable
identity model, Context ownership, Authority ownership, or a consistent impact report.

This specification closes those gaps while preserving the authentication-agnostic Context Protocol.

---

## Terminology

| Term | Definition |
|---|---|
| Principal | Stable LCDD identity representing a human, workload, or AI agent. |
| Identity Binding | Mapping from an external issuer and immutable subject to a Principal. |
| Team | Provider-neutral collection of Principals. |
| Assurance | Strength of the evidence authenticating an actor. |
| Attestation | Signed statement binding an actor and action to exact content. |
| Trust Root | Principals and threshold authorized to change the trust model. |
| Ownership Boundary | Named mapping from repository paths to owners and reviewers. |
| Trusted Base | Target revision whose policy authorizes a proposed change. |
| Provider Adapter | Translation layer between normalized LCDD evidence and an SCM provider. |

---

## Specification

### Principal Identifiers

A Principal ID MUST match:

```text
principal:<stable-id>
```

A Principal has one of these types:

- `human`;
- `workload`;
- `ai-agent`.

Display names, email addresses, and provider handles MUST NOT be used as canonical security
identifiers.

### Identity Bindings

An external identity binding consists of:

```yaml
issuer: "https://gitlab.example.com"
subject: "user-id:2841"
handle: "bambang"
```

Security decisions MUST use `issuer + subject`. The subject MUST be the most stable, immutable
identifier exposed by the issuer. `handle` is optional presentation metadata.

An implementation MUST NOT accept a caller-provided Principal ID as verified without evidence that
resolves to an active binding or signing key.

### Assurance Levels

LCDD defines these ordered assurance levels:

| Level | Meaning |
|---|---|
| `unverified` | Self-asserted actor metadata only. |
| `signed` | Action signature validates against a registered active key. |
| `provider-verified` | Repository provider authenticated the immutable subject. |
| `idp-verified` | Trusted organizational identity provider authenticated the subject. |

Policies MAY require a minimum assurance. Hardened approval and trust-root modification MUST NOT
accept `unverified` evidence.

### Teams

A Team ID MUST match:

```text
team:<stable-id>
```

Team membership references Principal IDs. Provider bindings MAY map the Team to a GitHub team,
GitLab group, Azure group, or equivalent provider object. LCDD Core MUST operate on the Team ID and
MUST NOT depend on the provider mention string.

### Trust Registry

File-backed implementations store identity, Team, role, permission, and trust-root data in:

```text
.lcdd/trust.yaml
```

The canonical schema is
[trust-schema.json](../reference/schema/trust-schema.json).

Semantic validation MUST additionally ensure:

1. Principal, Team, role, and key IDs are unique.
2. Every reference resolves to an active object of the expected type.
3. Root threshold is less than or equal to the number of active root Principals.
4. Duplicate `issuer + subject` bindings do not resolve to different active Principals.
5. Revoked or expired keys do not satisfy new attestations.
6. Deny permissions take precedence over allow permissions.
7. An AI Principal cannot receive `governance.approve`, `trust.change`, or direct Hardened mutation
   permission.

### Authorization

Authorization is evaluated from:

```text
verified evidence -> Principal -> Team/role membership -> permission -> scope -> decision
```

An authorization decision MUST record:

- resolved Principal;
- evidence issuer and subject or signing-key ID;
- assurance level;
- matched role and permission;
- requested action and scope;
- allow or deny result;
- policy revision used.

Explicit deny takes precedence. Absence of an applicable allow is deny for protected actions.

### Signed Governance Attestations

A protected governance action MUST bind the approval to exact content:

```json
{
  "schema_version": "1",
  "action": "context.approve",
  "resource": "context:ctx-no-secrets@3",
  "actor": "principal:ratna",
  "revision": "git:4f98ac7",
  "content_digest": "sha256:98db...",
  "issued_at": "2026-08-08T10:42:00Z",
  "evidence": {
    "assurance": "signed",
    "key_id": "key:ratna-2026"
  },
  "signature": "base64url..."
}
```

The signing payload is RFC 8785 JSON Canonicalization Scheme output with the `signature` member
omitted. The digest algorithm is SHA-256. The initial required signing algorithm is Ed25519. An
implementation MAY verify provider attestations without a user-managed key, but it MUST normalize
the result to the same actor, revision, digest, and assurance semantics.

Changing the revision or protected resource digest invalidates the attestation.

### Key Storage, Rotation, and Revocation

Private keys MUST NOT be written to the repository. Local private keys SHOULD use the operating
system credential store. CI workloads SHOULD use short-lived workload identity rather than static
private keys.

Key rotation adds a new active key and then revokes the old key through an authorized trust change.
Revocation does not erase historical evidence, but a revoked key cannot authorize a new event.

Emergency recovery MUST require the configured root threshold or an external organizational
recovery authority declared before the incident. A single bootstrap Principal MUST NOT silently
reset a multi-person trust root.

### Root Trust

The Trust Registry declares root Principals and an approval threshold. A one-person root is allowed
for individual mode and temporary team bootstrap. Team repositories SHOULD transition to a
multi-person threshold after required identities are verified.

The following operations require root authorization:

- adding or removing a root Principal;
- lowering or changing the threshold;
- replacing identity bindings for a root Principal;
- changing high-authority role membership;
- changing the rules that authorize trust changes.

### Ownership Registry

File-backed implementations store ownership boundaries in:

```text
.lcdd/ownership.yaml
```

The canonical schema is
[ownership-schema.json](../reference/schema/ownership-schema.json).

Semantic validation MUST additionally ensure:

1. Boundary IDs are unique.
2. Every owner and reviewer resolves to an active Principal or Team.
3. Include and exclude paths are project-relative and cannot escape the project root.
4. Overlaps are reported deterministically using priority, specificity, then boundary ID.
5. Ambiguous required ownership blocks activation until resolved.
6. Required reviewers have at least one resolvable verified human Principal unless an explicit
   organizational policy permits a different reviewer type.

### Ownership Relationships

LCDD distinguishes:

| Relationship | Default effect |
|---|---|
| Code owner | Request implementation review. |
| Context owner | Review Context changes. |
| Authority owner | Required governance approval in scope. |
| Required reviewer | Required pull-request approval. |
| Affected reviewer | Mention or request review. |
| Subscriber | Summary notification only. |

Code ownership does not grant permission to weaken governing Contexts.

### Change Impact

Pre-change impact MAY be estimated from a task and planned paths. Post-change impact MUST be
recomputed from the actual diff. CI MUST independently recompute changed paths and ownership impact.

Provider-neutral impact output MUST include:

- changed files;
- matched boundaries and matching reason;
- primary and affected owners;
- required reviewers;
- applicable Context IDs;
- unresolved identities;
- notification actions;
- merge decision and blocking reasons.

### Trusted-Base Evaluation

A proposed change MUST NOT authorize itself. CI evaluates changes using policy loaded from the
trusted target/base revision.

This rule applies to:

- `.lcdd/trust.yaml`;
- `.lcdd/ownership.yaml`;
- `.lcdd/config.yaml`;
- Hardened Contexts;
- LCDD CI workflow and provider policy.

An ownership transfer requires approval from both the old and proposed owners. A trust change is
authorized by the existing trust root, never the proposed root.

### Provider Adapters

Provider adapters authenticate external evidence and translate normalized decisions into provider
operations. An adapter MUST NOT change Core authorization semantics.

An adapter contract includes:

- repository identity and default branch;
- authenticated actor evidence;
- immutable user and Team/group subjects;
- revision and pull-request metadata;
- approvals bound to a revision;
- reviewer requests and comments;
- required-check status;
- branch-protection capability reporting.

Generic Git implementations MUST still produce a Markdown or JSON impact report even when remote
review automation is unavailable.

### AI Actors

AI-generated code follows the same artifact verification and ownership flow as human-generated
code. AI identity changes authorization, not validation semantics.

An AI Principal:

- MAY change code when permitted;
- MAY create a Candidate or governance proposal;
- MUST NOT approve its own or another change;
- MUST NOT satisfy a required human approval;
- MUST NOT directly modify a Hardened Context;
- MUST NOT modify trust or ownership policy directly;
- MUST NOT weaken enforcement to make its implementation pass.

Human-assisted changes record a human submitter and AI contributor where evidence exists.
Autonomous agents use a distinct workload or AI Principal. Self-reported AI attribution MUST be
reported as unverified rather than cryptographically proven.

### Bootstrap Ceremony

The first governance policy cannot already be authorized by itself. Team bootstrap therefore uses
an explicit ceremony:

1. Initialize an empty Registry with no Active Contexts.
2. Verify the bootstrap Principal.
3. Register or invite required Principals and Teams.
4. Define ownership and CI policy.
5. Validate all files and identity references.
6. Open a bootstrap pull request that clearly reports that remote enforcement is not yet active.
7. Obtain confirmation from proposed owners on the exact revision where practical.
8. Merge through existing repository authority.
9. Treat the merged default-branch policy as the first trusted base.
10. Enable and verify branch protection and required CI checks.
11. Replace a single-person root with the intended threshold.

An implementation MUST NOT claim enforcement is active before remote protection is verified.

### Audit Trail

Audit events MUST be append-only from the perspective of normal users and MUST include the policy
revision used for the decision. File-backed logs SHOULD be integrity-chained. Central Registry
implementations SHOULD use immutable or append-only storage appropriate to their threat model.

---

## Security Considerations

This model cannot distinguish an attacker from a legitimate actor after compromise of that actor's
private key, provider account, or identity provider. Threshold approval reduces but does not remove
that risk.

Implementations MUST defend against:

- duplicate external subjects mapped to multiple Principals;
- replayed attestations on a different revision or resource;
- approval reuse after content changes;
- policy changes authorizing themselves;
- provider handle rename or reuse;
- suspended or revoked membership still satisfying approval;
- AI agents presenting a human Principal ID;
- notification spam caused by overlapping boundaries;
- leakage of private source content through identity or AI integrations.

---

## Compatibility

Existing Context files remain valid. Identity and ownership are project-level governance artifacts,
not new required fields in every Context.

Existing string `actor` events are retained as `unverified` legacy evidence during migration. They
MUST NOT satisfy newly protected approvals unless separately reconciled and attested.

Authentication methods in [0013-context-protocol.md](0013-context-protocol.md) remain transport
options. This RFC defines the normalized actor evidence and authorization semantics above them.

---

## References

1. [0003-authority-model.md](0003-authority-model.md) — Authority and delegation.
2. [0004-governance.md](0004-governance.md) — Hardened and Local governance.
3. [0010-ai-agents.md](0010-ai-agents.md) — AI agent permissions and drift prevention.
4. [0013-context-protocol.md](0013-context-protocol.md) — Protocol authentication boundary.
5. [0014-security.md](0014-security.md) — Security and access control.
6. RFC 8785 — JSON Canonicalization Scheme.
