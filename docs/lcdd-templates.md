# LCDD Templates

**Status:** Documentation  
**Version:** 0.2.0  
**Last Updated:** 2026-08-08

---

Use these templates to speed up LCDD adoption and maintain consistency.

> **Tip:** if you are using the CLI, run `lcd context add` — the command creates a
> schema-compliant Context and suggests its classification (authority, governance, severity,
> tags) automatically. The templates below are for writing Contexts by hand.

## 1. Context Template

Copy this template when writing your first rule. The fields below **match the official schema**
(see `reference/schema/context-schema.json`).

```yaml
id: "ctx-your-rule-id"
version: 1
title: "Short rule title"
description: "Briefly explain what must be done and why."
source:
  type: "organization" # individual, organization, standard-body, ai-system, community, automated, regulatory, documentation, meeting, incident
  uri: "https://example.com/your-source"
authority:
  level: 2 # 0–4: 4 mandate, 3 standard, 2 guideline, 1 preference, 0 suggestion
  source:
    type: "organization" # individual, organization, standard-body, ai-system, community, automated
    id: "your-team-id"   # REQUIRED: the schema requires type, id, and name
    name: "Source or team name"
category: "security"    # optional, free-form: security, devops, product, compliance, ...
severity: "medium"       # optional: critical, high, medium, low, info
applies_to:              # optional; defaults to ["**/*"]
  - "**/*.ts"
lifecycle: "draft" # draft, candidate, approved, active, deprecated, archived
governance:
  classification: "local-standard" # hardened-mandate, hardened-standard, hardened-local, local-standard, local-guideline, local-experimental
  approval_required: true
owner: "engineering-team" # optional
enforcement:
  mode: "warn" # block, warn, comment, silent
```

### Field reference

- `id`: unique per Context (only `[a-zA-Z0-9_-]`).
- `version`: integer >= 1, incremented every time the rule changes.
- `title`: the rule in brief.
- `description`: the rationale and scope.
- `source`: where the rule came from (`type` + `uri`).
- `authority`: who makes it legitimate — requires `type`, `id`, `name`, and a `level` of 0–4.
- `category` / `severity`: domain and impact classification.
- `applies_to`: path patterns for the governed artifacts (globs, e.g. `**/*.ts`, `api/**`).
- `lifecycle`: the rule's status.
- `governance`: how tightly the rule is controlled (`classification` + `approval_required`).
- `owner`: the accountable party (used by health score metrics).
- `enforcement`: how the rule reaches the team (`mode` plus an optional `specification`).

## 2. Context Pack Template

Use a pack to group related rules.

```yaml
pack_id: "pack-security-basic"
name: "Security Starter Pack"
description: "A baseline set of security rules for internal application teams."
version: 1
maintainer: "LCDD Community"
contexts:
  - id: "ctx-api-validation"
  - id: "ctx-tls-required"
  - id: "ctx-secret-rotation"
```

Real packs (complete with enforcement specifications) are available in the [examples/](../examples/)
folder: startup, fintech, healthcare, ecommerce, and education.

## 3. Change Proposal Template

Use this when proposing a rule change, especially for `hardened` classifications.

```markdown
# Context Change Proposal

## Context Being Changed
- id: `ctx-your-rule-id`
- current version: 1

## Proposed Change
- summary of the change
- fields being modified

## Rationale
- why this change is needed
- the impact of not making it

## Affected Teams
- engineering
- product
- compliance

## Migration Plan
- steps to upgrade the rule
- rollback if needed

## Approval
- [ ] Product Team
- [ ] Engineering Lead
- [ ] Compliance or task owner
```

## 4. Complete Template (with Enforcement Specification)

Use this template for rules that are genuinely enforced automatically (using the verifiers built
into `@lcdd/core`).

```yaml
id: "ctx-no-secrets"
version: 1
title: "Secrets must not appear in source code"
description: "API keys, tokens, and passwords must use environment variables or a secrets manager."
source:
  type: "organization"
  uri: "https://wiki.example.com/security"
authority:
  level: 3
  source:
    type: "organization"
    id: "security-team"
    name: "Security Team"
category: "security"
severity: "critical"
applies_to:
  - "**/*.ts"
  - "**/*.js"
lifecycle: "active"
governance:
  classification: "hardened-standard"
  approval_required: true
effective_date: "2026-08-08T00:00:00Z"
owner: "security-team"
enforcement:
  mode: "block"
  specification:
    type: "regex-pattern" # regex-pattern, file-exists, custom-script
    config:
      patterns:
        - "(?i)(api[_-]?key|secret|password|token)\\s*[:=]\\s*['\"][^'\"]+['\"]"
      should_not_match: true
    violation_message_template: "Secret detected. Use an environment variable or a secrets manager."
tags:
  - "security"
  - "secrets"
```

## 5. Recommended File Structure

For small startups, a simple structure is better:

```text
/contexts/
  ctx-api-validation.yaml
  ctx-feature-launch-window.yaml
  ctx-code-style.yaml
/docs/
  lcdd-quick-start.md
  lcdd-concepts.md
  lcdd-cheat-sheet.md
  lcdd-templates.md
```

If you are starting with a single Context, keep it in the root or in `/contexts` for now.

If you are using the CLI, run `lcd init` — the `.lcdd/contexts/{hardened,local,experimental}/`
structure is created automatically and recognized by every `lcd` command (`validate`, `list`,
`query`, and so on).

## 6. Presentation Template for Non-Technical Audiences

Create a single short page for business or management stakeholders:

- Problem: product decisions change quickly.
- Solution: LCDD makes those rules visible and reviewable.
- Example: "Feature X only launches after product approval."
- First step: write the Context in the repository, review it, activate it.

Use this as the basis for an internal meeting with your product or management team. For a fuller
treatment, see [lcdd-for-product-and-management.md](lcdd-for-product-and-management.md).
