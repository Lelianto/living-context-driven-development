# LCDD Developer Workflow Implementation Plan

**Status:** Proposal — Implementation Ready; RFC 0018 Approval Required for Normative Adoption

**Version:** 0.3.0

**Last Updated:** 2026-08-08

**Audience:** LCDD maintainers and implementers

**Quadrant:** How-to and implementation planning

**Language:** English

---

## Overview

This document defines the proposed end-to-end LCDD developer experience, from installation and
generated configuration through local development, commit, push, CI, and protected merge.

The central product objective is:

> LCDD SHOULD be as easy to initialize as a conventional development dependency. Governance
> complexity appears only when a project needs authority, approval, and repository protection.

This is a target workflow and implementation contract. Not every command or behavior described
here is available in the current CLI.

This plan builds on [adoption-bootstrap-enhancement.md](adoption-bootstrap-enhancement.md). The
bootstrap proposal explains the adoption problem; this document defines the primary workflow that
the implementation SHOULD deliver.

Formal implementation contracts are defined in
[lcdd-workflow-contracts.md](lcdd-workflow-contracts.md). Identity and ownership changes to the
normative model are isolated in
[0018-identity-ownership-and-change-governance.md](../specification/0018-identity-ownership-and-change-governance.md).
The canonical project-level schemas are:

- [project-config-schema.json](../reference/schema/project-config-schema.json);
- [trust-schema.json](../reference/schema/trust-schema.json);
- [ownership-schema.json](../reference/schema/ownership-schema.json).

### Implementation Status (2026-08-08)

| Slice | Status | Implemented Surface |
|---|---|---|
| 1 — Initialization | ✅ Complete | Idempotent `lcd init`, detection, templates, config migration |
| 2 — Identity/Ownership Foundation | 🟡 Partial | Core Principal/Team types, trust validation, ownership resolver, Ed25519 attestations, authorization |
| 3 — Unified Local Check | 🟡 Partial | `lcd check` wraps the existing verifier; unified ownership result remains |
| 4 — Git Integration | 🔴 Not started | Hook installation and rollback |
| 5 — Change-Scoped CI/Impact | 🟡 Partial | `lcd impact`, actual Git diff, trusted-base trust/ownership/Context loading |
| 6 — Governance Protection | 🟡 Partial | Core deny precedence and AI hard-denies; proposal/provider approval flow remains |
| 7 — Existing-Project Ratchet | 🔴 Not started | Baseline commands and ratcheting |
| 8 — Agent/Drift Integration | 🟡 Partial | Existing Context Bundle and drift plan; contributor attestations remain |

Identity-provider login, secure local key storage, hosted Team synchronization, PR reviewer mutation,
and remote branch-protection mutation are intentionally not simulated. They require a real provider
adapter or the proposed Nodenet control-plane integration.

---

## 1. Design Principles

1. **Zero-question initialization.** `lcd init` creates a valid, usable structure without requiring
   the user to understand the complete LCDD methodology.
2. **Convention over configuration.** The CLI detects the project ecosystem and selects safe
   technical defaults.
3. **No invented governance.** Initialization MUST NOT create Active constraints or invent
   authority decisions.
4. **Language-agnostic governance.** Context Schema, Registry, lifecycle, Authority, and governance
   remain independent of programming language.
5. **Language-aware integration.** Project detection, file matching, discovery, and verifier
   adapters MAY depend on the language and toolchain.
6. **Change-scoped validation.** Daily checks evaluate only changed files and applicable Contexts.
7. **Progressive enforcement.** Fast local feedback precedes authoritative CI and protected merge.
8. **Human control.** Code changes MUST NOT silently weaken or rewrite authoritative Contexts.
9. **Provider-neutral identity.** Governance refers to stable LCDD Principals and Teams rather than
   GitHub, GitLab, or other provider-specific handles.
10. **Verified identity evidence.** A name, email, YAML field, or unsigned Git author MUST NOT be
    treated as proof of identity.
11. **Ownership before impact.** Team ownership boundaries SHOULD exist before cross-team impact
    reporting or required review is enabled.
12. **Trusted-base evaluation.** A change MUST NOT define the identity, ownership, or governance
    policy used to authorize itself.

---

## 2. Installation

### 2.1 Project Dependency

For a Node.js project:

```bash
npm install --save-dev @lcdd/cli
npx lcd init
```

Equivalent package-manager commands MAY be documented for pnpm, Yarn, and Bun.

### 2.2 One-Time Execution

An adopter MAY initialize without first adding a permanent dependency:

```bash
npx @lcdd/cli init
```

### 2.3 Automatic Detection

`lcd init` performs a read-only project inspection before writing LCDD files:

```text
Detected project:
  Name:             payment-api
  Languages:        TypeScript
  Package manager:  pnpm
  Linter:           ESLint
  Test runner:      Vitest
  Git repository:   yes
  CI provider:      GitHub Actions
  Existing project: yes
```

Detection MAY influence:

- file patterns;
- package-manager commands;
- linter and test integrations;
- CI templates;
- verifier adapter recommendations.

Detection MUST NOT determine:

- Authority;
- governance classification;
- lifecycle state;
- organizational policy;
- architecture or compliance requirements.

Language indicates how a constraint may be checked, not which constraints are authoritative.

---

## 3. Generated Project Structure

### 3.1 Default Tree

`lcd init` creates only the files required to begin:

```text
project/
├── .lcdd/
│   ├── config.yaml
│   ├── README.md
│   │
│   ├── contexts/
│   │   ├── hardened/
│   │   │   └── .gitkeep
│   │   ├── local/
│   │   │   └── .gitkeep
│   │   └── experimental/
│   │       └── .gitkeep
│   │
│   └── templates/
│       ├── hardened.context.yaml
│       ├── local.context.yaml
│       └── experimental.context.yaml
│
└── package.json
```

The implementation MUST keep templates outside the Context Registry. A template MUST NOT
participate in validation or be mistaken for an adopted rule.

### 3.2 Lazy Directories

Additional directories are created only when their corresponding feature is used:

```text
.lcdd/
├── trust.yaml        # Identity setup or team governance is enabled
├── ownership.yaml    # Ownership boundaries are configured
├── candidates/       # First Candidate is produced
├── discovery/        # First `lcd discover` run
├── baselines/        # First baseline is created
├── generated/        # Agent integration is enabled
└── logs/              # First governance event is recorded
```

This keeps first-run complexity low while allowing the Registry to grow with the project.

`trust.yaml` and `ownership.yaml` are governance artifacts, not ordinary project configuration.
Their creation and subsequent modification follow the identity and ownership rules defined below.

### 3.3 Default Configuration

An automatically detected TypeScript project may produce:

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
    - "../src/**/*.tsx"
  exclude:
    - "../node_modules/**"
    - "../dist/**"
    - "../coverage/**"
    - "../.git/**"

change_detection:
  enabled: true
  default_base: auto

integrations:
  package_manager: pnpm
  linters:
    - eslint
  test_runners:
    - vitest

governance:
  mode: individual

security:
  protect_hardened: true
```

The canonical configuration contract is
[project-config-schema.json](../reference/schema/project-config-schema.json). Implementations MUST
validate the generated file against that schema and apply the additional path-safety rules in
[lcdd-workflow-contracts.md](lcdd-workflow-contracts.md).

### 3.4 Empty Registry Guarantee

`lcd init` MUST NOT create an Active Context. A successful initialization reports:

```text
Active Contexts:   0
Blocking Contexts: 0
```

Starter examples belong in `.lcdd/templates/`, not `.lcdd/contexts/`.

---

## 4. Profiles and Governance Modes

### 4.1 Technology Profiles Are Automatic

Users SHOULD NOT have to select a Node.js, Python, Go, Java, or similar profile during normal
initialization. The CLI detects the ecosystem automatically.

An explicit override MAY be available:

```bash
lcd init --language typescript
```

Technology detection configures integrations only. It does not create governance policy.

### 4.2 Governance Modes Are Progressive

LCDD supports three progressively more structured modes:

```yaml
governance:
  mode: individual | team | organization
```

#### Individual

This is the default for solo developers and newly initialized projects:

```yaml
governance:
  mode: individual
```

Behavior:

- The user may become the default owner.
- Local Contexts may be self-approved where permitted.
- Hardened changes still require an explicit change path.
- No team configuration is required.

#### Team

Team repositories MAY define ownership and scope:

```yaml
governance:
  mode: team
  default_owner: engineering
  teams:
    engineering:
      members:
        - alice
        - bob
      scopes:
        - engineering
    security:
      members:
        - carol
      scopes:
        - security
```

This configuration helps the CLI recommend and validate approval paths. It is not a substitute for
Git provider authorization.

#### Organization

Organizations MAY define formal authority sources:

```yaml
governance:
  mode: organization
  default_owner: platform-team
  authority_sources:
    security:
      level: 3
      owner: security-team
    compliance:
      level: 4
      owner: compliance-team
```

This mode is intended for delegated authority and compliance workflows and SHOULD NOT be required
for basic adoption.

### 4.3 A Dedicated Governance Team Is Not Required

| Project Type | Required Governance Setup |
|---|---|
| Solo developer | No team; individual ownership is sufficient |
| Small startup | Context owner; dedicated governance team unnecessary |
| Multiple engineering teams | Owners or approvers recommended for Hardened Contexts |
| Regulated project | Explicit compliance or legal authority owner |
| Enterprise | Formal delegation and approval paths recommended |

LCDD requires an owner appropriate to the Authority of a constraint, not a dedicated governance
department for every adopter. See
[0003-authority-model.md](../specification/0003-authority-model.md).

---

## 5. Verifiable Identity and Trust Bootstrap

### 5.1 Identity, Authentication, Authorization, and Attestation

LCDD distinguishes four concepts:

| Concept | Question |
|---|---|
| Identity | Who is the actor? |
| Authentication | What evidence proves that identity? |
| Authorization | May the actor perform this action in this scope? |
| Attestation | What signed evidence proves that the action or approval occurred? |

Fields such as `created_by`, a provider handle, `git config user.name`, and
`git config user.email` are self-asserted metadata. They MUST NOT be accepted as sufficient evidence
for a protected governance action.

### 5.2 Provider-Neutral Principal

LCDD uses an immutable internal Principal ID as its canonical identity:

```yaml
principals:
  - id: "principal:8a7f6c12"
    type: human
    display_name: "Lelianto"

    identities:
      - issuer: "https://github.com"
        subject: "user-id:1234567"
        handle: "lelianto"

      - issuer: "https://gitlab.company.example"
        subject: "user-id:892"
        handle: "lelianto"

    signing_keys:
      - type: ssh-ed25519
        fingerprint: "SHA256:abc123..."
```

Security decisions use:

```text
issuer + immutable subject -> LCDD Principal -> role -> permission
```

The provider handle is presentation metadata for mentions and MAY change. It MUST NOT be the
canonical identity because handles can be renamed and, on some providers, reused.

### 5.3 Human, Workload, and AI Principals

The same model represents non-human actors:

```yaml
principals:
  - id: "principal:ci-production"
    type: workload
    identities:
      - issuer: "https://token.actions.githubusercontent.com"
        subject: "repo:acme/payment-api:environment:production"

  - id: "principal:codex-agent"
    type: ai-agent
```

Workload and AI Principals receive narrowly scoped permissions. An AI Principal MAY create a
Candidate or recommendation but MUST NOT directly modify a Hardened Context or activate a Context.

### 5.4 Individual Bootstrap

After `lcd init`, an individual user establishes the first verified identity:

```bash
lcd identity setup
```

Where possible, the CLI authenticates through the detected repository provider or organizational
identity provider. For local-only use, LCDD MAY create a signing key whose private material is kept
in an operating-system credential store and whose public fingerprint is recorded in `trust.yaml`.

Initial trust may contain one root Principal:

```yaml
version: "1"

root:
  threshold: 1
  principals:
    - principal:lelianto
```

This is a bootstrap state, not the preferred permanent configuration for a team repository.

### 5.5 Team Invitation and Identity Claim

A bootstrap administrator MAY invite a colleague:

```bash
lcd identity invite --name "Bambang" --team payments
lcd identity invite --name "Ratna" --team security
```

An invitation is short-lived and does not create a verified identity by itself. The invited person
claims it and authenticates independently:

```bash
lcd identity accept lcdd_inv_xxxxx
```

The accepted identity records the provider or IdP issuer and immutable subject. Until claim and
verification complete, the Principal remains unresolved and MUST NOT satisfy a required approval.

For repositories whose teams already exist in an SCM provider or IdP, the implementation MAY offer:

```bash
lcd identity sync
```

Synchronization MUST show a preview and require confirmation before modifying the trust registry.

### 5.6 Signed Governance Evidence

Protected actions are recorded as evidence tied to exact content:

```json
{
  "action": "context.approve",
  "context_id": "ctx-no-secrets",
  "context_version": 3,
  "actor": "principal:ratna",
  "revision": "git:4f98ac7",
  "content_digest": "sha256:98db...",
  "timestamp": "2026-08-08T10:42:00Z",
  "signature": "..."
}
```

An approval is invalidated when the approved revision or content digest changes. The implementation
MUST distinguish author, committer, proposer, approver, verifier workload, and merger where the
available evidence exposes those actors.

### 5.7 Root Trust and Threshold Approval

After team identities are verified, a team SHOULD replace the single-person bootstrap root with a
threshold policy:

```yaml
root:
  threshold: 2
  principals:
    - principal:lelianto
    - principal:bambang
    - principal:ratna
```

Changes to the following require root-policy authorization:

- root Principals and threshold;
- Principal identity bindings;
- high-authority role membership;
- trust-signing keys;
- rules that determine who can approve trust changes.

No system can prevent abuse after compromise of every configured trust root, identity provider, or
private signing key. The security objective is that impersonation requires compromise of an
explicit trust boundary rather than editing a name in YAML.

### 5.8 Identity Assurance

Every governance event SHOULD report its assurance level:

```text
unverified -> signed -> provider-verified -> idp-verified
```

Higher-authority actions MAY require a minimum assurance level. An unsigned local actor string MUST
NOT satisfy a Hardened approval.

---

## 6. Teams, Ownership, and Cross-Team Impact

### 6.1 Provider-Neutral Teams

Teams are stable LCDD entities whose provider bindings are replaceable:

```yaml
teams:
  - id: team:payments
    name: Payments
    members:
      - principal:bambang

    provider_bindings:
      - issuer: "https://github.com"
        type: team
        subject: "organization-team-id:48291"
        mention: "@acme/payments"

      - issuer: "https://gitlab.company.example"
        type: group
        subject: "group-id:921"
        mention: "@acme/payments"
```

Core governance refers to `team:payments`. An SCM adapter resolves that Team into provider-specific
review requests and mentions.

### 6.2 Ownership Registry

Team repositories define ownership boundaries in `.lcdd/ownership.yaml`:

```yaml
version: "1"

boundaries:
  - id: boundary:payments-api
    name: Payments API
    paths:
      include:
        - "services/payments/**"
        - "packages/payment-contracts/**"

    code_owners:
      - team:payments

    affected_reviewers:
      - team:platform

  - id: boundary:shared-auth
    name: Shared Authentication
    paths:
      include:
        - "packages/auth/**"

    code_owners:
      - team:platform

    required_reviewers:
      - team:security
```

### 6.3 Ownership Roles Are Distinct

| Relationship | Responsibility | Default PR Behavior |
|---|---|---|
| Code owner | Maintains an implementation area | Request review |
| Context owner | Maintains constraint quality and freshness | Request review for Context changes |
| Authority owner | May approve governed decisions in scope | Required approval |
| Affected reviewer | Owns a boundary affected indirectly | Mention or request review |
| Subscriber | Needs awareness but not approval | Summary notification |

Owning code does not automatically grant permission to weaken its governing Contexts. Context and
Authority ownership are evaluated independently.

### 6.4 Pre-Change Impact Preview

Before implementation, a developer or agent MAY declare a task and expected paths:

```bash
lcd task start "add authenticated refund endpoint" \
  --paths services/payments/refund.ts \
  --paths packages/auth/service-token.ts
```

LCDD responds with an advisory preview:

```text
Impact preview

Payments Service
  Owner: team:payments

Authentication and Security
  Owner: team:security
  Review: required

Applicable Contexts:
  ctx-payment-idempotency     block
  ctx-service-authentication  block
```

This preview informs planning and agent Context injection but is not authoritative because actual
files may differ from planned files.

### 6.5 Post-Change Impact

After files are changed, LCDD recalculates impact from the actual diff:

```bash
lcd impact --staged
lcd impact --changes --base origin/main --head HEAD
```

CI MUST independently recompute this result. The PR report is based on actual changed files, not
only the task declaration.

### 6.6 PR Notification Policy

Notification policy SHOULD distinguish awareness from authorization:

```yaml
notifications:
  primary_owner: request-review
  required_reviewer: require-approval
  affected_reviewer: mention
  subscriber: summary
  prefer_team_mentions: true
  deduplicate: true
  max_direct_mentions: 3
```

The implementation SHOULD:

- prefer a provider team mention over enumerating every member;
- mention each Team only once even when multiple files match;
- avoid mentioning unrelated teams;
- distinguish a comment from a required review;
- avoid notification storms through deduplication and limits.

### 6.7 Provider Adapters

LCDD Core emits a provider-neutral impact result:

```json
{
  "affected_boundaries": [
    {
      "id": "boundary:shared-auth",
      "owners": ["team:security"],
      "relationship": "required-review"
    }
  ]
}
```

Adapters translate the result:

| Provider | Possible Translation |
|---|---|
| GitHub | Team mention, requested reviewer, check run |
| GitLab | Group mention, reviewer, approval rule, merge-request note |
| Bitbucket | Default reviewer or pull-request comment |
| Azure DevOps | Required reviewer or pull-request thread |
| Generic Git | Markdown impact report |

Provider-specific handles remain presentation bindings rather than Core identity.

### 6.8 Ownership Validation

Teams SHOULD validate coverage before making cross-team reviews blocking:

```bash
lcd ownership doctor
```

Example:

```text
Ownership coverage: 87%

Unowned:
  packages/legacy/**
  scripts/migrations/**

Overlapping:
  packages/events/**
    team:platform
    team:payments
```

An overlap is not inherently invalid, but ambiguous sole ownership must be resolved before the
boundary can require approval.

### 6.9 Trusted-Base Policy Evaluation

A pull request MUST NOT authorize itself using identity, ownership, Context, or CI policy introduced
by that same pull request.

CI evaluates code impact using the trusted policy from the target/base revision. Changes to policy
are evaluated separately:

```text
Trusted base policy ----> authorize code and policy changes
Proposed policy --------> validate as a requested governance change
```

If ownership changes from Security to Payments:

```text
Ownership policy changed:

Old owner: team:security
New owner: team:payments

Required approvals:
  team:security
  team:payments
```

The same trusted-base rule applies to:

- `.lcdd/trust.yaml`;
- `.lcdd/ownership.yaml`;
- `.lcdd/config.yaml`;
- Hardened Contexts;
- LCDD CI workflows;
- provider integration policy.

### 6.10 Team Setup Sequence

A team repository follows this path:

```bash
lcd init
lcd identity setup
lcd governance init --mode team
lcd identity invite --name "Bambang" --team payments
lcd identity invite --name "Ratna" --team security
lcd ownership init
lcd ownership doctor
lcd setup ci
lcd governance scaffold --provider auto
lcd trust propose-threshold --threshold 2
```

Cross-team required reviews SHOULD remain non-blocking until required Principals are verified,
ownership ambiguities are resolved, CI is authoritative, and remote branch protection is active.

---

## 7. Boundaries and File Protection

### 7.1 Scope Boundary

The scope boundary determines which artifacts a Context governs:

```yaml
applies_to:
  paths:
    - "src/api/**/*.ts"
  exclude:
    - "src/api/**/*.test.ts"
```

It answers: **Which files are governed by this Context?**

### 7.2 Governance Boundary

The governance boundary determines who may change governance artifacts:

```text
.lcdd/contexts/hardened/**
.lcdd/contexts/local/**
.lcdd/config.yaml
```

It answers: **Who may modify this rule or configuration?**

### 7.3 Filesystem Permissions Are Not a Security Boundary

The implementation MUST NOT depend on local read-only flags or filesystem permissions as the main
protection for Hardened Contexts. Developers can often change or bypass local permissions.

Protection has three layers:

1. LCDD CLI governance guard;
2. repository ownership rules;
3. branch protection and required CI checks.

### 7.4 CLI Governance Guard

An unauthorized direct change to a Hardened Context is rejected:

```text
BLOCKED: Hardened Context modified directly

Context: ctx-no-secrets
Required:
  - change proposal
  - authority owner approval
  - version increment
```

The Hardened change process follows
[0004-governance.md](../specification/0004-governance.md).

### 7.5 CODEOWNERS

For a GitHub-hosted repository, LCDD MAY generate a snippet such as:

```text
# Hardened governance
/.lcdd/contexts/hardened/ @organization/security-team
/.lcdd/config.yaml @organization/platform-team

# Local governance
/.lcdd/contexts/local/ @organization/engineering-team
```

Generate provider-specific assets with:

```bash
lcd governance scaffold --provider github
```

Suggested output:

```text
.lcdd/integrations/github/
├── CODEOWNERS.snippet
└── branch-protection.md
```

LCDD MUST NOT report Hardened files as protected until the relevant remote rules have actually been
configured and, where possible, verified.

### 7.6 Branch Protection

The main branch SHOULD require:

- pull requests;
- a passing LCDD CI check;
- CODEOWNERS approval for governed files;
- restricted direct pushes;
- disabled force pushes.

Remote repository protection, not a local Git hook, is the authoritative enforcement boundary.

---

## 8. Optional Developer Integrations

After initialization, users MAY enable integrations independently:

```bash
npx lcd setup git
npx lcd setup ci
npx lcd setup agents
```

### 8.1 Git Integration

`lcd setup git` installs local hooks:

```text
pre-commit -> lcd check --staged --stage pre-commit
pre-push   -> lcd check --changes --stage pre-push
```

Git hooks are opt-in because they modify the developer's local workflow. They provide early
feedback but MUST NOT be treated as a security guarantee.

### 8.2 CI Integration

`lcd setup ci` MAY generate:

```text
.github/
└── workflows/
    └── lcdd.yml
```

The workflow invokes change-scoped validation:

```bash
npx lcd check --ci --base "$BASE_SHA" --head "$HEAD_SHA"
```

### 8.3 Agent Integration

`lcd setup agents` MAY generate:

```text
.lcdd/generated/
└── agent-context.md
```

The generated file contains only Active Contexts applicable to the agent's task. Agent governance
must follow [0010-ai-agents.md](../specification/0010-ai-agents.md).

---

## 9. End-to-End Change Flow

```text
Developer selects task
        |
        v
LCDD retrieves applicable Active Contexts
        |
        v
Developer or AI changes file A
        |
        v
git add file-A
        |
        v
Pre-commit: lcd check --staged
        |
        +-- blocking violation --> reject commit --> fix code --> stage again
        |
        v
Commit succeeds
        |
        v
git push
        |
        v
Pre-push: change-scoped checks
        |
        +-- failure --> cancel local push --> fix code
        |
        v
Branch reaches remote
        |
        v
CI runs full change-scoped verification
        |
        +-- block --> required check fails --> merge prohibited
        +-- warn/comment --> report result --> merge remains eligible
        +-- pass --> merge remains eligible
        |
        v
CODEOWNERS review and branch-protected merge
```

### 9.1 Verification Stages

| Stage | Intended Work |
|---|---|
| Editor or agent | Context retrieval and early guidance |
| Pre-commit | Fast deterministic staged checks |
| Pre-push | Medium-cost change-scoped checks |
| CI | Complete authoritative verification |
| Runtime | Runtime-only constraints and observability |

Expensive integration tests SHOULD NOT run on every commit. Until a first-class Context Schema field
is standardized, verifier stage selection uses the implementation-level
`enforcement.specification.config.stages` contract defined in
[lcdd-workflow-contracts.md](lcdd-workflow-contracts.md). Unknown stages are configuration errors.

### 9.2 AI-Generated Change Flow

AI-generated code uses the same change-scoped verification and ownership flow. Actor identity
changes authorization and provenance, not artifact compliance semantics.

```text
Human or orchestrator creates task
        |
        v
Resolve applicable Contexts and ownership
        |
        v
Inject scoped Context bundle into AI agent
        |
        v
AI changes code
        |
        v
Record human submitter and/or AI contributor evidence
        |
        v
Recalculate actual diff and impact
        |
        v
Reject protected governance mutation or route it to proposal
        |
        v
Commit and push
        |
        v
CI verifies code, actor permissions, ownership, and trusted base
        |
        v
Required human review and merge
```

#### Human-Assisted AI

When Lelianto uses an AI agent in a local worktree, Lelianto is the submitter and the agent is a
contributor where session evidence exists:

```json
{
  "schema_version": "1",
  "revision": "git:8ea21f7",
  "submitted_by": "principal:lelianto",
  "contributors": [
    {
      "principal": "principal:codex-agent",
      "type": "ai-agent",
      "assurance": "signed",
      "session_id": "agent-session:sess-4821"
    }
  ]
}
```

A Git commit alone cannot prove which lines were AI-generated. Missing session attestation MUST be
reported as unverified rather than inferred.

#### Autonomous AI

An autonomous agent MAY create a branch, commit, push, and open a pull request when its Principal
has those permissions. It remains unable to satisfy a required human approval. Its pull request
stays `waiting-for-approval` until the affected human or Team reviewers approve the current
revision.

#### AI Invariants

An AI Principal:

- MAY change ordinary code in permitted task scope;
- MAY create Context Candidates and change proposals;
- MUST NOT directly modify Active Hardened Contexts;
- MUST NOT modify trust or ownership policy;
- MUST NOT approve governance changes;
- MUST NOT count as a required human reviewer;
- MUST NOT weaken enforcement to make its own implementation pass.

These invariants are enforced from the trusted base in CI, not only through agent prompting.

---

## 10. Enforcement Semantics

Only applicable Contexts participate in a change-scoped decision.

| Enforcement Mode | Behavior |
|---|---|
| `silent` | Record for observability; do not display or block |
| `comment` | Display informational guidance; do not block |
| `warn` | Display a warning; do not block |
| `block` | Fail the relevant check |

Lifecycle further constrains enforcement:

| Lifecycle | Change-Check Behavior |
|---|---|
| Draft | Never enforced |
| Candidate | Informational comment only |
| Approved | Warning by default during migration |
| Active | Apply declared enforcement mode |
| Deprecated | Migration guidance; no blocking |
| Archived | Audit only |

These rules follow [0002-context-lifecycle.md](../specification/0002-context-lifecycle.md).

Hardened/Local classification and enforcement mode are related but distinct:

- Governance classification determines how a Context may change.
- Enforcement mode determines what happens when an artifact violates it.

---

## 11. Positive Case

Assume a developer changes:

```text
src/api/users.ts
```

An applicable Context is Active:

```yaml
id: ctx-api-input-validation
title: API endpoints must validate input
lifecycle: active

applies_to:
  paths:
    - "src/api/**/*.ts"

governance:
  classification: hardened-standard
  approval_required: true

enforcement:
  mode: block
  specification:
    type: custom-script
    command: "pnpm lint:api"
```

The developer implements the endpoint correctly:

```bash
git add src/api/users.ts
git commit -m "add create-user endpoint"
```

Pre-commit result:

```text
LCDD staged check

Changed files:
  src/api/users.ts

Applicable Contexts:
  PASS ctx-api-input-validation
  PASS ctx-no-secrets

Result: passed
Commit allowed.
```

The developer pushes:

```bash
git push origin feature/create-user
```

Pre-push result:

```text
LCDD pre-push check

Changed files:       3
Applicable Contexts: 4
Passed:              4
Warnings:            0
Blocking violations: 0

Push allowed.
```

CI result:

```text
LCDD Change Report

PASS ctx-api-input-validation
PASS ctx-no-secrets
PASS ctx-api-response-contract
PASS ctx-module-boundaries

Decision: PASS
```

The pull request remains eligible for normal review and merge.

---

## 12. Negative Cases

### 12.1 Code Violates an Active Context

The developer adds an endpoint without schema validation:

```text
[BLOCK] ctx-api-input-validation
File: src/api/users.ts
Line: 42

Request payload is used before schema validation.

Suggested action:
  Validate the payload before accessing its fields.

Commit blocked.
```

The normal resolution is to fix the code. The Context is not changed merely to make the check pass.

### 12.2 Hardened Context Is Modified Directly

A developer or AI changes:

```text
.lcdd/contexts/hardened/ctx-api-input-validation.yaml
```

For example:

```diff
-enforcement:
-  mode: block
+enforcement:
+  mode: warn
```

LCDD rejects the ordinary change path:

```text
[BLOCK] Unauthorized Hardened Context modification

Context:
  ctx-api-input-validation

Detected:
  enforcement.mode changed from block to warn

Required:
  - version increment
  - change proposal
  - rationale
  - migration and rollback plan
  - authority owner approval
```

The developer starts the governed change path:

```bash
lcd context propose ctx-api-input-validation
```

### 12.3 Developer Bypasses a Local Hook

A developer may bypass a hook:

```bash
git commit --no-verify
```

The commit can be created, but CI repeats verification:

```text
LCDD CI check failed

Blocking violations: 1
Required status check: failed
Merge prohibited by branch protection.
```

Therefore:

- local hooks provide fast feedback;
- CI provides authoritative verification;
- branch protection provides the remote merge boundary.

### 12.4 Direct Push to the Main Branch

If remote branch protection is configured:

```bash
git push origin main
```

The provider rejects the push:

```text
remote: Direct pushes to main are not permitted.
remote: Changes must be submitted through a pull request.
```

If protection is absent, LCDD MAY warn but cannot truthfully claim the remote branch is protected:

```text
WARNING: Remote governance could not be verified.
Hardened Context protection is incomplete.
```

### 12.5 No Applicable Context

If a developer changes only:

```text
docs/changelog.md
```

and no Context applies:

```text
LCDD staged check

Changed files:       1
Applicable Contexts: 0

Result: passed
```

No applicable Context is a valid result. LCDD SHOULD NOT manufacture warnings.

### 12.6 Verifier Cannot Run

If a configured command is unavailable:

```text
ERROR ctx-api-input-validation

Verifier command not found:
  pnpm lint:api
```

Verifier failure and artifact violation MUST be reported as different conditions.

A recommended reliability policy is:

```yaml
validation:
  verifier_failure:
    local: warn
    ci: block
```

Recommended behavior:

- Local verification warns and explains the setup failure.
- CI fails closed when a blocking Context cannot be verified.
- CI warns when a non-blocking Local Context cannot be verified.

### 12.7 Empty Registry

Immediately after initialization:

```bash
lcd check --staged
```

returns:

```text
LCDD check passed

Active Contexts:     0
Applicable Contexts: 0

No governance rules are active yet.
Create one with:
  lcd context add
```

An empty Registry is not an error and returns a successful exit code.

### 12.8 Specification Drift

Suppose the developer replaces Firebase with Supabase while an Active Context still requires
Firebase:

```text
POSSIBLE SPECIFICATION DRIFT

Context:
  ctx-database-provider
  Required provider: Firebase

Observed:
  Firebase dependency removed
  Supabase dependency added

Decision:
  Code change blocked by Active Context.

Options:
  1. Restore compliance with the Active Context.
  2. Submit a Context change proposal with a migration plan.
```

LCDD MUST NOT rewrite the Active Context to match the new implementation. A `warn` Context permits
the pull request to proceed with a warning; a `block` Context prevents merge until the code or
Context is changed through its legitimate process.

### 12.9 Existing-Project Baseline

When a file contains a violation that predates LCDD adoption, change-scoped validation SHOULD
distinguish existing debt from new debt:

```text
Existing baseline violation:
  line 15 — recorded; does not block this change

New violation:
  line 48 — introduced by this change; blocks
```

The baseline follows a ratcheting policy:

- Existing violations do not immediately stop delivery.
- New violations may not increase the baseline.
- Fixed baseline violations are removed.
- Reintroduced violations are treated as new violations.
- Every baseline exception has an owner and review date.

---

### 12.10 Cross-Team Change

Assume Lelianto changes both Payments and Authentication files:

```text
services/payments/refund.ts
packages/auth/service-token.ts
```

Impact resolution reports:

```text
Actual impact

Request review:
  team:payments -> principal:bambang

Required approval:
  team:security -> principal:ratna
```

The provider adapter requests or mentions the corresponding verified provider identities. If Ratna
has not claimed a verified identity, the required approval cannot be satisfied. During governance
bootstrap this condition MAY warn; after enforcement activation it MUST block merge.

### 12.11 Ownership Policy Manipulation

A developer changes `ownership.yaml` to remove another Team before changing that Team's code.
LCDD evaluates the diff using the base revision and reports:

```text
[BLOCK] Ownership boundary changed in the same change set

Old owner: team:security
New owner: team:payments

Required approval:
  team:security
  team:payments
```

The proposed ownership policy cannot authorize the code changes bundled with it.

### 12.12 Forged Actor Metadata

A Context contains:

```yaml
created_by: principal:ratna
```

but no verified signature, provider evidence, or signed lifecycle event exists. LCDD treats the
claim as unverified metadata:

```text
[BLOCK] Required approval has no verifiable identity evidence

Claimed actor: principal:ratna
Assurance: unverified
Required assurance: provider-verified
```

Editing an actor name never grants authorization.

---

## 13. Commit, Push, and Merge Boundaries

The implementation and documentation MUST distinguish these stages:

| Stage | May Be Stopped By | Guarantee |
|---|---|---|
| Save file | Editor or agent integration | Guidance only |
| Commit | Pre-commit hook | Bypassable |
| Push | Pre-push hook | Bypassable or absent |
| Remote branch update | Git provider rules | Provider-dependent |
| Pull-request merge | Required CI check and branch protection | Primary enforcement |
| Deploy | Deployment gate | Production enforcement |

LCDD cannot guarantee governance through Git hooks alone. Trustworthy enforcement occurs through
CI, ownership rules, and branch protection.

---

## 14. Exit-Code Contract

The CLI SHOULD expose stable machine-readable exit semantics:

| Exit Code | Meaning |
|---:|---|
| `0` | Passed; warnings or comments may exist |
| `1` | Blocking Context violation |
| `2` | Invalid LCDD configuration or Context Schema |
| `3` | Verifier or internal execution failure |
| `4` | Governance authorization violation |

Stable JSON output SHOULD accompany these exit codes for CI and agent integrations.

---

## 15. Golden Paths

### 15.1 Individual Developer

```bash
npm install --save-dev @lcdd/cli
npx lcd init
npx lcd identity setup
npx lcd context add
npx lcd setup git
```

No team profile or CODEOWNERS configuration is required.

### 15.2 Team Repository

```bash
npm install --save-dev @lcdd/cli
npx lcd init
npx lcd identity setup
npx lcd governance init --mode team
npx lcd identity sync
npx lcd ownership init
npx lcd ownership doctor
npx lcd setup git
npx lcd setup ci
npx lcd governance scaffold --provider github
```

A maintainer then configures:

- CODEOWNERS;
- the required LCDD CI check;
- branch protection;
- appropriate Context owners and approvers.
- verified Principal and Team bindings;
- ownership boundaries;
- a multi-person root threshold where appropriate.

### 15.3 Daily Development

```bash
git checkout -b feature/example
# Edit files.
git add .
git commit -m "implement example"
git push origin feature/example
```

LCDD participates progressively:

```text
Agent guidance
    |
    v
Fast staged validation
    |
    v
Optional pre-push validation
    |
    v
Authoritative CI validation
    |
    v
Branch-protected merge
```

---

## 16. Implementation Sequence

Implementation SHOULD proceed in independently testable slices.

### Dependency Gates

| Gate | Required before |
|---|---|
| Project config schema and migration contract | Slice 1 merge |
| Trust/ownership schemas and RFC 0018 draft | Slice 2 implementation |
| Canonical signing and evidence test vectors | Protected identity actions |
| Shared path matcher and trusted-base resolver | Ownership enforcement and CI impact |
| Provider-neutral adapter contract | First hosted-provider adapter |
| Stable JSON envelope and error codes | CI and MCP consumers |
| Threat-model tests | Team enforcement marked production-ready |

Experimental implementation MAY begin while RFC 0018 is Draft, but documentation and CLI output
MUST label the identity and ownership behavior experimental until normative approval.

### Slice 1 — Initialization Contract

- Generate the minimal `.lcdd/` tree.
- Add valid empty templates outside the Registry.
- Detect project language and tooling.
- Produce a safe default configuration.
- Guarantee zero automatically Active Contexts.
- Preserve current `lcd init` compatibility or provide an explicit migration path.
- Implement `lcd migrate config --to 1` for the current v0.2-style config.

### Slice 2 — Identity and Ownership Foundation

- Define provider-neutral Principal, Team, identity-evidence, and assurance types.
- Add `lcd identity setup`, invitation/claim, and sync-preview workflows.
- Store provider bindings using issuer and immutable subject.
- Add signing-key and signed-governance-event support.
- Add root threshold policy and protect trust changes.
- Add `ownership.yaml`, ownership initialization, and coverage diagnostics.
- Resolve path boundaries to primary, affected, required-review, and subscriber relationships.
- Evaluate governance policy from the trusted base revision.
- Implement RFC 8785 canonicalization and Ed25519 test vectors before accepting signed approvals.
- Preserve legacy actor strings as unverified migration evidence.

### Slice 3 — Unified Local Check

- Add `lcd check` as the beginner-facing command.
- Support `--staged`.
- Select applicable Contexts using shared path-matching semantics.
- Produce concise text and stable JSON output.
- Implement the exit-code contract.

### Slice 4 — Git Integration

- Add `lcd setup git`.
- Install opt-in pre-commit and pre-push hooks safely.
- Detect and preserve existing hook managers such as Husky or Lefthook.
- Provide uninstall and rollback operations.

### Slice 5 — Change-Scoped CI and Impact Reporting

- Implement or complete `lcd validate --changes`.
- Add base/head resolution.
- Generate a provider-neutral change report.
- Add `lcd setup ci` templates.
- Support required-check behavior for blocking violations.
- Recompute ownership impact from the actual diff.
- Emit provider-neutral reviewer, mention, and required-approval decisions.
- Deduplicate and limit notifications.
- Add explicit `waiting-for-approval` distinct from code or verifier failure.

### Slice 6 — Governance Protection

- Detect direct Hardened Context changes.
- Validate version and proposal metadata.
- Add `lcd context propose`.
- Generate CODEOWNERS and branch-protection guidance.
- Verify remote protection where a provider API is explicitly configured.
- Require verified actor evidence for protected actions.
- Bind approvals to exact revision and content digest.
- Require old and new owner approval for ownership transfers.

### Slice 7 — Existing-Project Ratchet

- Add baseline creation and storage.
- Distinguish existing and newly introduced violations.
- Remove resolved entries.
- Require owner and review date for exceptions.

### Slice 8 — Agent and Drift Integration

- Generate task-relevant Active Context bundles.
- Prevent agents from modifying Hardened Contexts directly.
- Report suspected specification drift.
- Route Context changes through the applicable governance process.
- Record human submitter separately from AI contributors.
- Accept signed agent-session evidence without inferring line-level authorship.
- Require human approval for autonomous AI pull requests where ownership policy requires it.

---

## 17. Acceptance Criteria

The primary workflow is complete when:

1. A developer can install and initialize LCDD without answering governance questions.
2. Initialization produces a valid configuration, empty Registry, and usable templates.
3. No example or discovered rule becomes Active automatically.
4. A developer can create one Context and run a staged check within ten minutes.
5. Only Contexts applicable to changed files are evaluated.
6. Local hooks provide fast feedback but CI independently repeats validation.
7. Blocking violations prevent a branch-protected merge.
8. Warnings and comments do not fail the merge check.
9. Direct Hardened modifications require the governed change path.
10. An empty Registry and a change with no applicable Context both pass cleanly.
11. Verifier failures are distinguished from artifact violations.
12. Existing violations can be baselined without allowing new debt.
13. Solo developers are not required to configure teams.
14. Team repositories can map governance ownership to provider-native protection.
15. AI or ordinary code changes cannot silently rewrite authoritative Contexts.
16. A provider handle is never used as the canonical security identity.
17. Required reviewers must resolve to verified Principals or Teams.
18. Approvals are bound to the exact revision and content digest being approved.
19. Team impact is recalculated from the actual diff in CI.
20. PR notification distinguishes mention, requested review, and required approval.
21. Ownership and trust changes are authorized using policy from the trusted base revision.
22. An ownership transfer requires approval from both the previous and proposed owner.
23. A team can move between supported SCM providers without changing Core Principal or Team IDs.
24. A team repository can replace its single-person bootstrap root with threshold approval.
25. Human-assisted AI records submitter and contributor separately.
26. Autonomous AI cannot satisfy required human approval.
27. Missing AI session evidence is reported as unverified.
28. Current v0.2-style project configuration has a documented, tested migration to schema v1.
29. JSON output and stable exit codes cover every new command.
30. Canonical signing, replay resistance, key rotation, and revocation pass adversarial tests.

---

## 18. Normative Alignment

This proposal is intended to implement, not replace, the existing normative model:

- [0001-core-principles.md](../specification/0001-core-principles.md) — mechanism-independent
  enforcement and Hardened/Local distinction.
- [0002-context-lifecycle.md](../specification/0002-context-lifecycle.md) — lifecycle-specific
  enforcement behavior.
- [0003-authority-model.md](../specification/0003-authority-model.md) — authority and delegation.
- [0004-governance.md](../specification/0004-governance.md) — Hardened change process and repository
  protection.
- [0008-verification.md](../specification/0008-verification.md) — verification and enforcement.
- [0010-ai-agents.md](../specification/0010-ai-agents.md) — agent Context injection and drift
  prevention.
- [0014-security.md](../specification/0014-security.md) — access control and secure defaults.
- [0015-reference-architecture.md](../specification/0015-reference-architecture.md) — pre-commit and
  CI enforcement adapters.
- [0018-identity-ownership-and-change-governance.md](../specification/0018-identity-ownership-and-change-governance.md)
  — provider-neutral Principal, ownership, attestations, trusted-base evaluation, and AI actor
  restrictions.

Any schema or normative behavior change discovered during implementation MUST be proposed through
the repository's RFC process rather than introduced only in CLI code.

---

## Conclusion

The intended LCDD experience is ordinary Git development with progressively stronger feedback:

```text
Install -> initialize -> define one real Context -> edit -> commit -> push -> verified merge
```

Developers do not need to configure technology profiles manually. Solo developers do not need a
governance team. Team and organizational controls appear only when ownership and Authority require
them.

The authoritative boundary is not a local file lock or Git hook. It is the combination of Context
governance, independent CI verification, repository ownership, and branch protection.
