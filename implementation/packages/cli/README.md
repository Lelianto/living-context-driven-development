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

### `lcd improve`

Review and apply self-healing recommendations. This is the Improve loop: the doctor's triggers produce recommendations, and `lcd improve` carries out the safe ones under the 9 guardrails (hardened contexts never auto-modified, every action snapshotted and audited, rollback on health regression).

```bash
lcd improve check                       # List current recommendations
lcd improve check --json                # Machine-readable output
lcd improve check --priority immediate  # Filter by priority
lcd improve apply <rec-id> --dry-run    # Preview the change, write nothing
lcd improve apply <rec-id> --yes        # Apply (prompts otherwise)
lcd improve apply <rec-id> --yes --reason "..."   # Record an approval reason
lcd improve rollback <heal-id>          # Restore the pre-heal snapshot
```

Phase A executes three actions automatically: `deprecate` (dormant contexts), `refine-scope` (narrowing `applies_to` for high violation/false-positive rates), and `register-source` (via `lcd source add`). Hardened contexts always require an explicit approval reason, and a heal that drops health rolls itself back. Every apply and rollback appends a `heal` event to the audit trail.

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
lcd source add <url> --type website --confidential # Local extraction only
lcd source list                          # List registered sources
lcd source check [id]                    # Check for changes (all or specific source)
lcd source remove <id>                   # Remove a registered source
```

### `lcd source watch`

Continuously monitor registered sources for changes at configurable intervals.

```bash
lcd source watch                       # Poll every 60 minutes
lcd source watch --interval 30         # Poll every 30 minutes
lcd source watch --once                # Single check and exit (for cron)
```

### `lcd source schedule`

Generate cron or GitHub Actions configuration for automated source monitoring.

```bash
lcd source schedule --cron             # Output cron schedule line
lcd source schedule --github           # Output GitHub Actions workflow YAML
lcd source schedule --interval 30       # Custom interval
```

### `lcd extract`

Extract constraint candidates from a registered source using LLM (Ollama, OpenAI, or Anthropic).

```bash
lcd extract <source-id>                # Extract with default provider (Ollama)
lcd extract <source-id> --backend openai   # Use OpenAI (OPENAI_API_KEY required)
lcd extract <source-id> --backend anthropic # Use Anthropic (ANTHROPIC_API_KEY)
lcd extract <source-id> --dry-run      # Output candidates, don't write registry
lcd extract <source-id> --auto         # Extract + normalize + write drafts
lcd extract <source-id> --model gpt-4o # Override default model
```

Ollama is the default and requires no API key:
```bash
ollama pull llama3.2                   # One-time model download
lcd extract <source-id>                # Free local extraction
```

OpenAI and Anthropic send source content to their cloud services. The CLI prints a data-flow
notice whenever either backend is selected. Sources registered with `--confidential` cannot use
cloud extraction and must use local Ollama.

### `lcd normalize`

Normalize extracted candidates into validated, deduplicated draft contexts.

```bash
lcd normalize                         # Normalize all candidates in .lcdd/sources/candidates/
lcd normalize --auto-merge            # Auto-skip exact duplicates
lcd normalize --threshold 0.85        # Custom Jaccard similarity threshold
```

Pipeline in one command:
```bash
lcd extract <source-id> --auto        # Extract + normalize + write drafts to registry
```

### `lcd dashboard`

View enforcement metrics and lifecycle observability.

```bash
lcd dashboard                        # Terminal report
lcd dashboard --web                  # Loopback-only web dashboard at 127.0.0.1:9321
lcd dashboard --web --port 3000      # Custom port
```

Terminal view shows: violation trends (7d/30d/90d), actor breakdown (human vs AI), top violated contexts, enforcement mode distribution, and lifecycle velocity. Web mode adds interactive Chart.js visualizations and is a local development aid, not a production service.

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
