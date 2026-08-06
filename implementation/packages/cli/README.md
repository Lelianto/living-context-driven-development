<div align="center">
    <img src="https://raw.githubusercontent.com/Lelianto/living-context-driven-development/main/media/logo.png" alt="LCDD Logo" width="120" height="120"/>
    <h1>@lcdd/cli</h1>
    <p><strong>Command-line tool for Living Context Driven Development</strong></p>
    <p>Initialize projects, manage contexts, validate artifacts, query with CQL.</p>
</div>

<p align="center">
    <a href="https://www.npmjs.com/package/@lcdd/cli"><img src="https://img.shields.io/npm/v/@lcdd/cli?color=10b981" alt="npm version"/></a>
    <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/npm/l/@lcdd/cli" alt="License"/></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/@lcdd/cli" alt="Node.js"/></a>
</p>

---

## Install

```bash
npm install -g @lcdd/cli
```

Or try without installing:

```bash
npx @lcdd/cli init
```

---

## Commands

### `lcd init`

Initialize LCDD in your project. Creates `.lcdd/` directory with config and context folders.

```bash
lcd init
```

```
.lcdd/
├── config.yaml
├── README.md
└── contexts/
    ├── hardened/       # Protected — requires explicit approval to change
    ├── local/          # Team-managed — evolves freely
    └── experimental/   # AI-suggested — lowest authority
```

### `lcd context add`

Interactively create a new context with auto-suggestions from the Rule Engine.

```bash
lcd context add
```

```
Create a new Context

Title: No secrets in source code
Description: API keys and tokens must not be committed.
Category: security
Source type (individual/organization/standard-body/regulatory/community/ai-system) [individual]: organization

Auto-suggestions (based on deterministic rules):
  Authority:     level 3 (organization)
  Governance:    hardened-standard
  Severity:      medium
  Tags:          security
  └─ Source type "organization" → authority level 3
  └─ Authority level 3 → governance "hardened-standard"
  └─ Keyword analysis → severity "medium"
  └─ Generated 1 tag(s): security

Accept auto-suggestions? [Y/n]:
```

### `lcd list`

List contexts with optional filters.

```bash
lcd list                          # All contexts
lcd list --lifecycle active       # Only active
lcd list --category security      # Security only
lcd list --lifecycle draft --tags api  # Draft + tagged "api"
```

### `lcd show`

Display full details of a context.

```bash
lcd show ctx-a1b2c3d4
```

```
ctx-a1b2c3d4  v1

No secrets in source code

API keys, tokens, and passwords MUST NOT appear in source code...

  Lifecycle: active
  Authority: level 3 (Security Team)
  Governance: hardened-standard
  Enforcement: block
  Tags: security, critical
```

### `lcd doctor`

Run a context health check. Produces a score (0–100), letter grade (A–F), and actionable recommendations across 8 health metrics.

```bash
lcd doctor                        # Full health report
lcd doctor --json                 # Machine-readable JSON output
lcd doctor --triggers             # Show trigger evaluation details
```

```
  Overall Score: ████████████████░░░░ 78% (78/100)  Grade: B

  ✓ Stale Contexts        ████████████████████ 100% (15/15)
  ⚠ Missing Owners        █████████████░░░░░░░ 67% (10/15)
  ✗ Deprecation Backlog   ░░░░░░░░░░░░░░░░░░░░ 0% (0/10)
  ⚠ Tag Hygiene           ████████████░░░░░░░░ 60% (6/10)
```

Metrics checked: Stale Contexts, Missing Owners, Enforcement Conflicts, Deprecation Backlog, Draft Stagnation, Authority Gaps, Tag Hygiene, Review Backlog.

### `lcd validate`

Validate files against all active contexts. Detects violations and blocks on critical rules.

```bash
lcd validate                    # Validate entire project
lcd validate src/               # Validate specific directory
lcd validate src/auth.ts        # Validate single file
lcd validate --strict           # Treat warnings as errors
```

### `lcd query`

Query the Context Registry using CQL (Context Query Language).

```bash
lcd query "SELECT * FROM contexts WHERE lifecycle = 'active'"
lcd query "SELECT id, title FROM contexts WHERE category = 'security' AND authority.level >= 3"
lcd query "SELECT * FROM contexts WHERE lifecycle = 'active' AND tags CONTAINS 'api'"
```

### `lcd transition`

Move a context through its lifecycle stages.

```bash
lcd transition ctx-a1b2c3d4 candidate --reason "Ready for review"
lcd transition ctx-a1b2c3d4 approved --reason "Reviewed by security team"
lcd transition ctx-a1b2c3d4 active --reason "Deploying enforcement"
lcd transition ctx-a1b2c3d4 deprecated --reason "Replaced by ctx-new-policy"
```

### `lcd review`

Manage the review workflow for contexts.

```bash
lcd review list                          # List pending reviews
lcd review show <id>                     # Side-by-side source vs context details
lcd review approve <id> --reason "..."   # Approve and auto-transition lifecycle
lcd review reject <id> --reason "..."    # Reject with reason
lcd review revision <id> --reason "..."  # Request revision
lcd review auto-approve                  # Auto-approve Local contexts with high confidence
```

### `lcd source`

Manage external sources for change detection (no API key required).

```bash
lcd source add <url> --type git --label "Express.js"
lcd source add <url> --type website --label "OWASP Top 10"
lcd source list                          # List registered sources
lcd source check [id]                    # Check for changes (all or specific source)
lcd source remove <id>                   # Remove a registered source
```

### `lcd dashboard`

View enforcement metrics and lifecycle observability.

```bash
lcd dashboard                        # Terminal report
lcd dashboard --web                  # Web dashboard with charts at localhost:9321
lcd dashboard --web --port 3000      # Custom port
```

Terminal view shows: violation trends (7d/30d/90d), actor breakdown (human vs AI), top violated contexts, enforcement mode distribution, and lifecycle velocity. Web mode adds interactive Chart.js visualizations.

---

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: LCDD Validate
  run: npx @lcdd/cli validate --strict
```

Or use the dedicated action (see [repository](https://github.com/Lelianto/living-context-driven-development/tree/main/implementation/.github/workflows)).

---

## Context Lifecycle

```
Draft ──→ Candidate ──→ Approved ──→ Active ──→ Deprecated ──→ Archived
  │           │             │            │            │              │
  No         Comment        Warn         Block        Warn          No
  enforce    only           mode         / Warn        + notice      enforce
```

---

## Example Workflow

```bash
# 1. Initialize LCDD in your project
lcd init

# 2. Create a security context
lcd context add
# Fill in: title="No secrets in code", authority level=3, severity=critical

# 3. Promote to active
lcd transition ctx-... candidate
lcd transition ctx-... approved
lcd transition ctx-... active

# 4. Validate your codebase
lcd validate

# 5. Add to CI
echo "lcd validate --strict" >> .github/workflows/ci.yml
```

---

## Context YAML Format

Contexts are stored as YAML files. Example:

```yaml
id: "ctx-no-secrets"
version: 1
title: "Secrets must not be in source code"
description: "API keys, tokens, passwords must use env vars or secrets manager."
source:
  type: "organization"
  uri: "https://wiki.example.com/security"
authority:
  source:
    type: "organization"
    id: "security-team"
    name: "Security Team"
  level: 3
category: "security"
severity: "critical"
applies_to:
  - "**/*.ts"
  - "**/*.js"
  - "**/*.yaml"
lifecycle: "active"
governance:
  classification: "hardened-standard"
  approval_required: true
effective_date: "2026-08-01T00:00:00Z"
owner: "security-team"
enforcement:
  mode: "block"
  specification:
    type: "regex-pattern"
    config:
      patterns:
        - "(?i)(api[_-]?key|secret|password|token)\\s*[:=]\\s*['\"][^'\"]+['\"]"
      should_not_match: true
    violation_message_template: >
      Secret detected. Use environment variables or a secrets manager.
      See: https://wiki.example.com/security
evidence:
  - type: "security-incident"
    uri: "https://incidents.example.com/INC-2025-042"
    description: "AWS key leaked via public repo"
tags:
  - "security"
  - "secrets"
  - "critical"
```

---

## Related

- [@lcdd/core](https://www.npmjs.com/package/@lcdd/core) — Core SDK for programmatic usage
- [Living Context Driven Development](https://github.com/Lelianto/living-context-driven-development) — Full specification
- [LCDD Methodology Guide](https://github.com/Lelianto/living-context-driven-development/blob/main/lcdd-methodology.md)

## License

Apache 2.0
