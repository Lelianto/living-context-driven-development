# LCDD Developer Workflow Contracts

**Status:** Proposal — Implementation Contract

**Version:** 0.1.0

**Last Updated:** 2026-08-08

**Audience:** LCDD Core, CLI, MCP, and provider-adapter implementers

**Quadrant:** Reference

**Language:** English

---

## Purpose

This document turns the workflow in
[lcdd-developer-workflow-implementation-plan.md](lcdd-developer-workflow-implementation-plan.md)
into implementation contracts. It defines configuration files, commands, output envelopes,
identity evidence, signing, provider adapters, AI provenance, bootstrap behavior, compatibility,
and required tests.

Normative identity and ownership semantics are proposed in
[0018-identity-ownership-and-change-governance.md](../specification/0018-identity-ownership-and-change-governance.md).

---

## 1. Artifact Contracts

### 1.1 Project Configuration

Path:

```text
.lcdd/config.yaml
```

Schema:

[project-config-schema.json](../reference/schema/project-config-schema.json)

Required initial value:

```yaml
version: "1"

project:
  name: "payment-api"
  root: ".."
  languages:
    - typescript

registry:
  path: "./contexts"

validation:
  default_mode: warn
  include:
    - "../src/**/*.ts"
  exclude:
    - "../node_modules/**"
    - "../dist/**"
    - "../coverage/**"
    - "../.git/**"
  verifier_failure:
    local: warn
    ci: block

change_detection:
  enabled: true
  default_base: auto

integrations:
  package_manager: pnpm
  linters:
    - eslint
  test_runners:
    - vitest
  scm_provider: auto

governance:
  mode: individual
  minimum_assurance:
    local_change: unverified
    hardened_proposal: signed
    hardened_approval: provider-verified
    trust_change: provider-verified

notifications:
  primary_owner: request-review
  required_reviewer: require-approval
  affected_reviewer: mention
  subscriber: summary
  prefer_team_mentions: true
  deduplicate: true
  max_direct_mentions: 3

security:
  protect_hardened: true
  trusted_base_required_in_ci: true
  external_identity_sync_requires_confirmation: true

ai:
  code_changes: allow
  context_candidates: allow
  local_context_direct_changes: deny
  hardened_context_direct_changes: deny
  governance_approval: deny
  trust_changes: deny
  ownership_changes: deny
```

Path semantics:

- Paths in `.lcdd/config.yaml` are resolved relative to `.lcdd/` unless a field explicitly states
  project-relative behavior.
- Resolved paths MUST remain within the project root.
- Symlinks that resolve outside the project root MUST be rejected for policy and Registry files.
- Project detection MUST produce deterministic output from tracked configuration where possible.

### 1.2 Trust Registry

Path:

```text
.lcdd/trust.yaml
```

Schema:

[trust-schema.json](../reference/schema/trust-schema.json)

The file is created by `lcd identity setup`, not by bare `lcd init`. Private keys are never stored
in this file.

Semantic invariants are specified by RFC 0018 and cannot be expressed fully in JSON Schema.

### 1.3 Ownership Registry

Path:

```text
.lcdd/ownership.yaml
```

Schema:

[ownership-schema.json](../reference/schema/ownership-schema.json)

The file is created by `lcd ownership init`. Boundaries use project-relative globs. Matching uses
the shared LCDD path matcher, normalized to forward slashes.

### 1.4 Generated and Runtime State

| Path | Source | Git policy |
|---|---|---|
| `.lcdd/generated/agent-context.md` | Deterministic generation | MAY be ignored or tracked by project policy |
| `.lcdd/discovery/index.json` | Local scanner | SHOULD be tracked only when reproducibility is required |
| `.lcdd/discovery/report.json` | Scanner report | SHOULD NOT contain source bodies |
| `.lcdd/baselines/violations.json` | Approved baseline | SHOULD be tracked |
| `.lcdd/logs/events.jsonl` | Local audit projection | MAY be tracked; centralized append-only store preferred |
| `.lcdd/integrations/**` | Provider scaffolding | SHOULD be tracked |

Generated output MUST carry a header declaring its generator and schema version when the format
supports comments.

### 1.5 Verifier Stage Extension

The existing Context Schema permits verifier-specific `enforcement.specification.config`. The
reference implementation uses this namespaced extension until a first-class normative field is
adopted:

```yaml
enforcement:
  mode: block
  specification:
    type: custom-script
    config:
      command: "pnpm test:api"
      stages:
        - pre-push
        - ci
```

Allowed stages are `editor`, `pre-commit`, `pre-push`, `ci`, and `runtime`. When `stages` is absent,
the verifier runs in `ci`; fast built-in static verifiers MAY additionally run in `pre-commit`.
Unknown stages are configuration errors. `runtime` verifiers are never executed by `lcd check`.

---

## 2. Common CLI Contract

### 2.1 Global Options

Every new command supports:

```text
--json                 Emit one JSON result and no decorative output
--non-interactive      Never prompt; fail when required input is absent
--project <path>       Explicit project root; default is nearest ancestor containing .lcdd
--quiet                Suppress successful human-readable output
```

Commands that write files additionally support:

```text
--dry-run              Report planned writes without mutation
--yes                  Confirm safe, non-destructive prompts
```

`--yes` MUST NOT bypass identity verification, required approval, or destructive confirmation.

### 2.2 JSON Envelope

All new JSON output uses:

```json
{
  "schema_version": "1",
  "command": "identity.setup",
  "status": "success",
  "generated_at": "2026-08-08T10:00:00Z",
  "project_root": "/workspace/payment-api",
  "data": {},
  "warnings": [],
  "errors": []
}
```

`status` is one of `success`, `warning`, `blocked`, or `error`. Errors include stable machine codes.
Secrets, bearer tokens, invitation secrets, and private keys MUST NOT appear in JSON output unless a
dedicated secret-delivery flow explicitly requires a one-time value.

### 2.3 Exit Codes

| Code | Meaning |
|---:|---|
| `0` | Success; warnings or comments may exist |
| `1` | Blocking Context or ownership decision |
| `2` | Invalid arguments, configuration, or schema |
| `3` | Verifier, provider, or internal execution failure |
| `4` | Authentication or governance authorization failure |
| `5` | Required identity, approval, or trusted-base evidence is unresolved |

Existing commands returning `1` for generic CLI errors migrate gradually; new JSON output MUST
include the stable error code even before process exit codes are fully separated.

### 2.4 Idempotency

- Re-running `lcd init` with identical detected state MUST produce no changes.
- Setup commands MUST detect existing user-managed files and refuse overwrite without an explicit,
  reviewable merge path.
- Provider mutations MUST use idempotency keys derived from repository, command, and desired-state
  digest.
- Invitation acceptance is single-use.
- Replaying an approval for an unchanged exact revision is idempotent; replaying it for different
  content is rejected.

---

## 3. Command Contracts

### 3.1 `lcd init`

```text
lcd init
  [--language <name>...]
  [--minimal]
  [--force-detect]
  [global options]
```

Writes:

- `.lcdd/config.yaml`;
- `.lcdd/README.md`;
- empty Context classification directories;
- three complete templates.

It MUST NOT:

- create an Active Context;
- create a Principal;
- contact an identity provider;
- install Git hooks;
- mutate CI or package scripts;
- overwrite an existing `.lcdd/config.yaml`.

### 3.2 `lcd identity setup`

```text
lcd identity setup
  [--issuer <uri>]
  [--local-key]
  [--display-name <name>]
  [global write options]
```

Behavior:

1. Detect configured provider or IdP.
2. Authenticate or create a local signing identity.
3. Resolve immutable issuer subject.
4. Refuse duplicate binding to another active Principal.
5. Create `trust.yaml` with threshold one when no trust file exists.
6. Add a Principal through the current root-authorized path when trust already exists.

`--local-key` uses Ed25519 and stores private material in the OS credential store. If no secure
store is available, the command fails unless a separately specified insecure development mode is
explicitly enabled; that mode cannot satisfy Hardened assurance.

### 3.3 `lcd identity invite`

```text
lcd identity invite
  --name <display-name>
  [--team <team-id>]
  [--expires-in <duration>]
  [global write options]
```

Default expiry is 24 hours. The invitation stores a hash of the one-time secret, desired Team, root
policy revision, creator Principal, and expiration. The raw secret is displayed once.

### 3.4 `lcd identity accept`

```text
lcd identity accept <one-time-invitation>
  [--issuer <uri>]
  [global options]
```

The command authenticates the invitee, consumes the invitation atomically, and creates or links the
Principal. Expired, already used, policy-stale, or issuer-mismatched invitations fail with code `4`.

### 3.5 `lcd identity sync`

```text
lcd identity sync
  [--provider <name>]
  [--apply]
  [global options]
```

Default behavior is read-only preview. `--apply` writes only after confirmation and current-root
authorization. Removal from an external provider suspends rather than deletes a Principal unless
the configured policy states otherwise.

### 3.6 `lcd governance init`

```text
lcd governance init --mode <individual|team|organization>
  [global write options]
```

The command validates prerequisites and updates only governance-related config. Team mode requires
a Trust Registry. Organization mode additionally requires an IdP or explicitly documented offline
trust policy.

### 3.7 `lcd ownership init`

```text
lcd ownership init
  [--import <codeowners|provider|none>]
  [global write options]
```

Imports are proposals. They are previewed and validated before writing. The command does not infer
Authority ownership from commit history.

### 3.8 `lcd ownership doctor`

```text
lcd ownership doctor
  [--strict]
  [global options]
```

Reports:

- path coverage;
- unowned paths;
- overlapping boundaries;
- unresolved Principal or Team references;
- required reviewer human availability;
- provider binding availability;
- trusted-base difference.

`--strict` returns `1` for ambiguous required ownership and `5` for unresolved required identity.

### 3.9 `lcd task start`

```text
lcd task start <description>
  [--path <path>...]
  [--actor <principal-id>]
  [global options]
```

Produces an advisory pre-change impact report and an optional task record. It does not authorize a
later change. Unknown paths and unresolved actors are warnings unless policy makes them mandatory.

### 3.10 `lcd impact`

```text
lcd impact
  (--staged | --changes)
  [--base <ref>]
  [--head <ref>]
  [--trusted-base <ref>]
  [global options]
```

Default trusted base is the merge base with the configured default branch. In CI, absence of an
unambiguous trusted base is an error when `trusted_base_required_in_ci` is true.

Output includes file-to-boundary mapping, owner relationships, Context applicability, unresolved
identities, normalized notification actions, and merge decision.

### 3.11 `lcd check`

```text
lcd check
  [--staged | --changes]
  [--base <ref>]
  [--head <ref>]
  [--stage <editor|pre-commit|pre-push|ci>]
  [--strict]
  [global options]
```

`lcd check` is the beginner-facing aggregate command. It validates config and Registry, computes
impact, selects applicable Contexts, executes verifiers allowed at the selected stage, checks actor
permissions for governance files, and emits one decision.

It wraps existing `lcd validate --changes` behavior rather than creating a second verification
engine.

### 3.12 `lcd setup git`

```text
lcd setup git
  [--pre-commit]
  [--pre-push]
  [global write options]
```

If no flags are supplied, both hooks are proposed. Existing Husky, Lefthook, pre-commit, or native
hooks are detected. LCDD adds a managed block or generates instructions; it MUST NOT replace an
unknown existing hook. `lcd setup git --remove` removes only LCDD-managed content.

### 3.13 `lcd setup ci`

```text
lcd setup ci
  [--provider <auto|github|gitlab|bitbucket|azure-devops|generic>]
  [global write options]
```

Generates a pinned, least-privilege workflow that runs `lcd check --stage ci`. It does not activate
remote required checks by itself.

### 3.14 `lcd governance scaffold`

```text
lcd governance scaffold --provider <auto|github|gitlab|bitbucket|azure-devops|generic>
  [global write options]
```

Generates ownership and branch-protection guidance or provider configuration. Remote mutations,
when later supported, require explicit authentication, dry-run preview, and confirmation.

### 3.15 `lcd governance verify`

```text
lcd governance verify
  [--provider <name>]
  [global options]
```

Read-only verification reports default branch, direct-push restriction, force-push restriction,
required LCDD check, ownership review, governed-path protection, and provider capability gaps.

### 3.16 `lcd trust propose-threshold`

```text
lcd trust propose-threshold --threshold <n>
  [--principal <principal-id>...]
  [global write options]
```

Creates a proposal signed or approved under the existing root. The proposed root cannot authorize
itself. Lowering a threshold requires the current threshold and an explicit reason.

### 3.17 `lcd context propose`

```text
lcd context propose <context-id>
  --reason <text>
  [--rfc <uri>]
  [global write options]
```

Creates a versioned proposal with before/after digest, impact analysis placeholders, migration plan,
rollback plan, required approvers, and current trusted policy revision. It does not mutate the
Active Context directly.

---

## 4. Identity Evidence and Signing Contract

### 4.1 Normalized Evidence

```typescript
type Assurance = 'unverified' | 'signed' | 'provider-verified' | 'idp-verified';

interface IdentityEvidence {
  issuer: string;
  subject: string;
  assurance: Assurance;
  authenticationMethod: string;
  issuedAt: string;
  expiresAt?: string;
  evidenceId: string;
}

interface SignatureEvidence {
  algorithm: 'Ed25519';
  keyId: string;
  signature: string;
}

interface GovernanceAttestation {
  schemaVersion: '1';
  action: string;
  resource: string;
  actor: string;
  revision: string;
  contentDigest: `sha256:${string}`;
  policyRevision: string;
  issuedAt: string;
  identityEvidence: IdentityEvidence;
  signature?: SignatureEvidence;
}
```

### 4.2 Canonicalization

For locally signed attestations:

1. Construct the attestation without `signature`.
2. Serialize using RFC 8785 JSON Canonicalization Scheme.
3. Compute SHA-256 for diagnostic identity.
4. Sign canonical bytes with Ed25519.
5. Encode signature using unpadded base64url.

Context and policy content digests are computed from their parsed data serialized with the same
canonicalization, not raw YAML bytes. Comments and formatting therefore do not invalidate content
approval, while semantic changes do.

### 4.3 Replay Defense

Verification checks actor, action, resource, content digest, revision, policy revision, expiry,
key status, and repository identity. Evidence for one repository or revision cannot authorize
another.

### 4.4 Provider Evidence

Provider approvals may not expose a user signature. The adapter verifies the provider API response,
immutable actor subject, repository, revision, decision, and timestamp, then emits normalized
provider-verified evidence. Raw provider payload hashes SHOULD be retained for audit without storing
access tokens.

---

## 5. Provider Adapter Contract

```typescript
interface RepositoryRef {
  provider: 'github' | 'gitlab' | 'bitbucket' | 'azure-devops' | 'generic';
  issuer: string;
  repositoryId: string;
  defaultBranch: string;
}

interface RevisionRef {
  repository: RepositoryRef;
  revision: string;
  baseRevision?: string;
  pullRequestId?: string;
}

interface ApprovalEvidence {
  actor: IdentityEvidence;
  decision: 'approved' | 'rejected' | 'changes-requested';
  revision: string;
  occurredAt: string;
}

interface ProtectionStatus {
  branchProtected: boolean | 'unknown';
  directPushRestricted: boolean | 'unknown';
  forcePushRestricted: boolean | 'unknown';
  requiredCheckConfigured: boolean | 'unknown';
  codeOwnerReviewConfigured: boolean | 'unknown';
  unsupportedCapabilities: string[];
}

interface ProviderAdapter {
  detect(root: string): Promise<RepositoryRef | null>;
  authenticate(): Promise<IdentityEvidence>;
  resolvePrincipalSubject(handleOrId: string): Promise<string>;
  resolveTeamSubject(handleOrId: string): Promise<string>;
  getRevision(ref: RevisionRef): Promise<RevisionRef>;
  listApprovals(ref: RevisionRef): Promise<ApprovalEvidence[]>;
  requestReviewers(ref: RevisionRef, subjects: string[]): Promise<void>;
  publishImpactReport(ref: RevisionRef, markdown: string, json: unknown): Promise<void>;
  setCheckResult(ref: RevisionRef, result: 'pass' | 'warn' | 'block', summary: string): Promise<void>;
  getProtectionStatus(repository: RepositoryRef): Promise<ProtectionStatus>;
}
```

Requirements:

- Read operations are separate from mutations.
- Every mutation supports dry-run and idempotency.
- Tokens are obtained from environment or credential storage and never persisted in `.lcdd/`.
- Provider unavailability is reported distinctly from a policy violation.
- `generic` supports local Git identity, revisions, and reports but returns `unknown` for unavailable
  remote capabilities.

---

## 6. Ownership and Impact Contract

### 6.1 Deterministic Matching

For every changed path:

1. Normalize separators and reject paths escaping root.
2. Match all boundary includes.
3. Remove matches excluded by the same boundary.
4. Sort by descending `priority`, descending literal-prefix specificity, then boundary ID.
5. Preserve all non-conflicting relationships.
6. Report ambiguous required ownership rather than choosing silently.

### 6.2 Impact Result

```typescript
interface BoundaryImpact {
  boundaryId: string;
  paths: string[];
  codeOwners: string[];
  contextOwners: string[];
  authorityOwners: string[];
  requiredReviewers: string[];
  affectedReviewers: string[];
  subscribers: string[];
}

interface ChangeImpactReport {
  schemaVersion: '1';
  trustedBase: string;
  head: string;
  changedFiles: string[];
  boundaries: BoundaryImpact[];
  applicableContextIds: string[];
  unresolvedEntities: string[];
  notifications: Array<{
    entity: string;
    action: 'summary' | 'mention' | 'request-review' | 'require-approval';
    reason: string;
  }>;
  decision: 'pass' | 'warn' | 'block' | 'waiting-for-approval';
}
```

### 6.3 Approval Freshness

An approval satisfies a requirement only when:

- the actor resolves to an active Principal;
- Team/role membership is valid at evaluation time;
- evidence meets minimum assurance;
- approval targets the current head revision;
- required paths or policy content have not changed since approval;
- the actor is not prohibited by separation-of-duty policy.

---

## 7. AI Provenance and Authorization Contract

### 7.1 Change Provenance

```typescript
interface ChangeProvenance {
  schemaVersion: '1';
  revision: string;
  submittedBy: string;
  contributors: Array<{
    principal: string;
    type: 'human' | 'ai-agent' | 'workload';
    evidenceId?: string;
    assurance: Assurance;
    sessionId?: string;
  }>;
}
```

For human-assisted AI, the human is `submittedBy` and the agent is a contributor. For an autonomous
agent, the agent or workload Principal may be `submittedBy`, but required human approval remains
unsatisfied until a human reviewer approves.

### 7.2 Default AI Permissions

| Action | Default |
|---|---|
| Change ordinary code | Allow when task scope permits |
| Create Context Candidate | Allow |
| Create Hardened change proposal | Allow |
| Modify Active Hardened Context | Deny |
| Approve governance change | Deny |
| Modify trust or ownership | Deny |
| Satisfy human reviewer requirement | Deny |

### 7.3 Unverifiable AI Attribution

When an agent runtime does not provide signed session evidence, LCDD records the contribution as
`unverified`. It MUST NOT claim line-level AI authorship from a Git commit alone.

---

## 8. Bootstrap Transaction

### 8.1 States

```text
uninitialized
  -> initialized
  -> identity-established
  -> team-policy-drafted
  -> bootstrap-pr-open
  -> trusted-base-established
  -> remote-protection-verified
  -> enforced
```

The current state is derived from artifacts and verified provider state; it is not a mutable flag
that can claim enforcement without evidence.

### 8.2 Bootstrap PR Rules

- Contains no automatically Active Context.
- Identifies bootstrap Principal and proposed owners.
- Reports unresolved identities and protection not yet active.
- Uses existing repository authority for merge.
- Records owner confirmations against the exact revision where available.
- Becomes the initial trusted base only after merge to the default branch.

### 8.3 Activation Rules

Team enforcement becomes active only when:

1. default-branch policy is schema-valid;
2. root threshold is satisfiable;
3. required owner identities resolve;
4. CI independently evaluates the trusted base;
5. required check and branch protection are verified or an explicit capability exception is
   approved;
6. no ambiguous blocking ownership exists.

---

## 9. Threat Model and Required Mitigations

| Threat | Required mitigation |
|---|---|
| Actor name forged in YAML | Ignore as authorization evidence; resolve verified Principal |
| Git author/email spoofed | Require signature or provider/IdP evidence for protected action |
| Provider handle renamed/reused | Bind immutable issuer subject |
| Approval reused after new commit | Bind approval to exact revision and digest |
| PR changes its own owner | Evaluate using base policy; require old and new owners |
| PR changes trust root | Existing root authorizes proposal |
| AI weakens Context | Deny direct protected governance mutation; verify diff in CI |
| Local hook bypassed | Repeat checks in authoritative CI |
| CI workflow weakened in same PR | Evaluate workflow change using base policy and required owners |
| Key stolen | Support revocation, short-lived workload identity, and threshold approval |
| Provider unavailable | Distinguish infrastructure error; fail closed for required approval |
| Notification flood | Team mention preference, deduplication, and limits |
| Symlink/path traversal | Resolve within project root; reject escaping policy paths |
| Secret leaked in output | Redaction and one-time secret delivery |

---

## 10. Compatibility and Migration

### 10.1 Existing `.lcdd/config.yaml`

The current v0.2-style file remains readable during one compatibility window:

```yaml
version: "0.2.0"
pipeline:
  enabled: false
enforcement:
  default_mode: warn
  ci_mode: block
```

Migration command:

```bash
lcd migrate config --to 1
```

It creates a backup, detects project settings, writes a proposed v1 config, and shows a semantic
diff. Non-interactive migration requires an explicit output path or `--yes` after a clean dry-run.

### 10.2 Legacy Actor Strings

Legacy event `actor` strings are imported as:

```text
assurance: unverified
legacy_actor: <original-value>
```

They remain auditable but do not satisfy protected approvals.

### 10.3 Existing Contexts

Context Schema remains unchanged by the project-level identity and ownership files. Existing
Contexts remain valid. Existing `governance.approvers` strings are resolved to Principal, Team, or
role IDs when possible and otherwise reported for migration.

---

## 11. Required Test Matrix

### Unit Tests

- All three JSON Schemas accept canonical examples and reject unknown or malformed fields.
- Semantic trust validation covers duplicates, threshold, dangling references, and deny precedence.
- Ownership matching covers include, exclude, overlap, priority, normalization, and traversal.
- Canonicalization and Ed25519 signatures have deterministic vectors.
- Approval invalidates on revision or digest change.
- AI permission invariants cannot be overridden by a broad allow.

### CLI Integration Tests

- `lcd init` is idempotent and never creates an Active Context.
- Existing files are preserved.
- JSON envelope and exit codes are stable.
- Invitation expiry, replay, and duplicate subject are rejected.
- Ownership doctor reports unresolved and ambiguous boundaries.
- `lcd check` delegates to the existing verification engine.
- Hook setup preserves existing hook managers and rollback removes only managed content.

### Git End-to-End Tests

- Working-tree, staged, and base/head diffs produce the expected impact.
- Trusted-base policy defeats same-PR ownership and trust manipulation.
- Existing baseline violation does not block; new violation does.
- New commit invalidates stale required approval.
- Direct Hardened modification is rejected.

### Provider Contract Tests

Each adapter runs against recorded fixtures or an isolated test project for:

- immutable subject resolution;
- Team resolution;
- approval listing bound to revision;
- reviewer request idempotency;
- check publication;
- branch-protection capability detection;
- rate limit, permission denial, and unavailable-provider behavior.

### Security Tests

- Forged actor, email, and handle never satisfy approval.
- Revoked and expired keys fail.
- Cross-repository and cross-revision replay fail.
- Token and invitation secrets are redacted.
- Symlink escape and malicious globs are rejected.
- AI Principal cannot approve or mutate protected policy.
- Lowering root threshold cannot use the proposed lower threshold.

### AI Tests

- Human-assisted change records submitter and AI contributor.
- Autonomous agent change remains waiting for human approval.
- Missing session evidence is reported as unverified.
- Agent modification of Hardened, trust, or ownership files blocks.
- Agent code fix passes without changing governance.

---

## 12. Definition of Implementation-Ready

The workflow contract is implementation-ready when:

- project, trust, and ownership schemas are versioned and parseable;
- command names, flags, mutation boundaries, JSON envelope, and exit codes are defined;
- signing algorithm, canonicalization, digest, key lifecycle, and replay binding are defined;
- provider adapter types and capability behavior are defined;
- ownership precedence and trusted-base evaluation are deterministic;
- bootstrap activation and recovery boundaries are explicit;
- AI attribution and permission invariants are explicit;
- migration behavior is defined;
- the test matrix covers correctness, provider behavior, and adversarial cases;
- normative changes are isolated in RFC 0018 rather than hidden in CLI implementation.

Implementation can now proceed by the dependency order in the primary plan. Acceptance of RFC 0018
is required before identity and ownership behavior is presented as normative LCDD rather than an
experimental reference implementation.
