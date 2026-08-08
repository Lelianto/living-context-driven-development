# LCDD Use Cases

**Status:** Documentation  
**Version:** 0.1.0  
**Last Updated:** 2026-08-08

---

This document walks through three complete scenarios, from the moment a rule exists only in
someone's head to the moment it is enforced and measured. Each scenario uses the real schema and
real `lcd` commands.

If you have not read [lcdd-concepts.md](lcdd-concepts.md) yet, start there — this document assumes
you know what `authority`, `lifecycle`, and `governance.classification` mean.

## Choosing the right use case

| Your situation | Scenario |
|---|---|
| A product decision keeps getting forgotten or relitigated | [1. Product Decision](#1-product-decision) |
| A regulator or auditor requires something provable | [2. Compliance Policy](#2-compliance-policy) |
| The team keeps arguing about style in code review | [3. Team Convention](#3-team-convention) |

---

## 1. Product Decision

### The problem

A startup decides that new features ship only within the approved quarterly roadmap. The decision
is made in a meeting, mentioned in Slack, and then quietly ignored two sprints later when someone
ships an unplanned feature. Nobody was acting in bad faith — the decision simply had nowhere to live.

### Why a Context helps

The decision has an `authority` (product management), a `source` (the roadmap document), and a real
consequence. Those are exactly the fields a Context carries. Writing it down as a Context means the
next person to ask "are we allowed to build this?" has an answer that is not folklore.

### The Context

```yaml
id: "ctx-feature-launch-window"
version: 1
title: "New features must launch according to the quarterly roadmap"
description: >
  All new user-facing features must map to a priority in the roadmap approved by product
  management for the current quarter. Unplanned work requires an explicit roadmap amendment
  before implementation starts.
source:
  type: "organization"
  uri: "https://wiki.example.com/roadmap-q3"
authority:
  level: 2
  source:
    type: "organization"
    id: "product-team"
    name: "Product Team"
category: "product"
severity: "medium"
lifecycle: "active"
effective_date: "2026-08-08T00:00:00Z"
governance:
  classification: "local-standard"
  approval_required: true
owner: "product-team"
enforcement:
  mode: "warn"
tags:
  - "product"
  - "roadmap"
```

### Why these values

- `authority.level: 2` — a product guideline, not a legal mandate. Product management can change it
  without executive sign-off.
- `local-standard` — the team may revise it with review, because roadmaps legitimately change
  every quarter. Marking this `hardened` would make the rule outlive its own usefulness.
- `enforcement.mode: warn` — the rule governs a human decision, not a code pattern. There is no
  regex that detects "this feature was not on the roadmap," so blocking would be theatre. A warning
  that surfaces during planning is honest about what the tooling can and cannot verify.
- No `enforcement.specification` — deliberately. This Context is a decision record enforced by
  people, and pretending otherwise would produce false confidence.

### The workflow

```bash
lcd context add                                  # answer the prompts
lcd review list                                  # the Context appears as pending
lcd review approve ctx-feature-launch-window     # product lead approves
lcd transition ctx-feature-launch-window active
lcd show ctx-feature-launch-window
```

### What changes in practice

Sprint planning gains a reference that can be cited. When the roadmap changes, the change is a
version bump on a Context with a review trail rather than a new Slack thread. And when someone asks
six months later why a feature was rejected, `lcd show` answers.

---

## 2. Compliance Policy

### The problem

Secrets keep landing in source code. Sometimes it is a test fixture, sometimes it is a real
production key. An auditor asks the team to demonstrate that this is controlled, and the honest
answer is "we mention it in onboarding."

### Why a Context helps

This rule is the opposite of the product decision: it is mechanically detectable, it must not be
casually changed, and its violation has real consequences. It should be `hardened` and it should
`block`.

### The Context

```yaml
id: "ctx-no-secrets"
version: 1
title: "Secrets must not appear in source code"
description: >
  API keys, tokens, and passwords must be supplied through environment variables or a secrets
  manager. Hardcoded credentials in tracked source files are prohibited.
source:
  type: "organization"
  uri: "https://wiki.example.com/security-policy"
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
effective_date: "2026-08-08T00:00:00Z"
governance:
  classification: "hardened-standard"
  approval_required: true
owner: "security-team"
enforcement:
  mode: "block"
  specification:
    type: "regex-pattern"
    config:
      patterns:
        - "(?i)(api[_-]?key|secret|password|token)\\s*[:=]\\s*['\"][^'\"]+['\"]"
      should_not_match: true
    violation_message_template: "Secret detected. Use an environment variable or a secrets manager."
tags:
  - "security"
  - "secrets"
```

### Why these values

- `authority.level: 3` and `hardened-standard` — an organizational standard. Changing it requires
  the owner plus cross-team approval, and no automated process may modify it. This is guardrail 1
  of the [self-healing model](lcdd-self-healing.md) doing real work: an AI agent may suggest a
  refinement but can never apply one.
- `severity: critical` with `mode: block` — the schema's semantic rules push level >= 3 active
  Contexts toward `block`, and that is correct here. A leaked production credential is not
  something to warn about.
- `applies_to` scoped to TypeScript and JavaScript — narrower scope means fewer false positives.
  Scope is the first thing to tighten when a rule gets noisy.

### The workflow

```bash
lcd context add
lcd review approve ctx-no-secrets      # requires the security owner
lcd transition ctx-no-secrets active
lcd validate                            # blocks on violation, exit code 1
```

In CI, `lcd validate --strict` fails the build. The audit answer is now `lcd show ctx-no-secrets`
plus the enforcement log, which records every check with a timestamp and an actor.

### A caution about false positives

A regex this broad will match test fixtures. When it does, the correct response is to narrow
`applies_to` — for example excluding `**/__tests__/**` — not to weaken the pattern or drop the mode
to `warn`. Loosening enforcement to silence noise is how a security control quietly becomes
decoration.

As of v0.5.0 the false-positive trigger has an event model and consumer, but no CLI or MCP producer
records dismissals yet, so it cannot measure this automatically. See
[lcdd-implementation-plan.md](lcdd-implementation-plan.md) section 4.1.

---

## 3. Team Convention

### The problem

Every code review contains a comment about variable naming. It is a low-stakes disagreement that
consumes real attention and slightly sours reviews.

### Why a Context helps

Not because naming matters much, but because writing the preference down ends the recurring
argument. This is the cheapest possible Context and a good first one to author.

### The Context

```yaml
id: "ctx-code-style-camelcase"
version: 1
title: "Use camelCase variable names in the frontend"
description: >
  Local variables and function parameters in frontend JavaScript and TypeScript use camelCase.
  This is a consistency preference, not a correctness requirement.
source:
  type: "organization"
  uri: "https://wiki.example.com/style-guide"
authority:
  level: 1
  source:
    type: "organization"
    id: "frontend-team"
    name: "Frontend Team"
category: "code-style"
severity: "low"
applies_to:
  - "src/**/*.ts"
  - "src/**/*.tsx"
lifecycle: "active"
effective_date: "2026-08-08T00:00:00Z"
governance:
  classification: "local-guideline"
  approval_required: false
owner: "frontend-team"
enforcement:
  mode: "comment"
tags:
  - "code-style"
  - "frontend"
```

### Why these values

- `authority.level: 1` and `local-guideline` — a team preference. `approval_required: false` means
  it auto-merges; the team can change its own style without ceremony.
- `mode: comment` — educational, never blocking. A style preference that blocks a merge is a
  preference that has been mistaken for a standard.
- `severity: low` — honest. Inflating severity to get attention devalues the field everywhere else.

### The workflow

```bash
lcd context add
lcd transition ctx-code-style-camelcase active   # no review gate for local-guideline
```

### When to retire it

If a linter enforces this automatically, the Context is redundant and should be deprecated. This is
exactly what the `STALE_NO_VIOLATION` trigger detects — a rule that has stopped being violated may
have stopped being necessary:

```bash
lcd doctor --triggers
lcd transition ctx-code-style-camelcase deprecated --reason "Enforced by eslint config"
```

---

## Comparing the three

| | Product Decision | Compliance Policy | Team Convention |
|---|---|---|---|
| Authority level | 2 | 3 | 1 |
| Classification | `local-standard` | `hardened-standard` | `local-guideline` |
| Enforcement | `warn` | `block` | `comment` |
| Mechanically verifiable | No | Yes | Partially |
| Approval to change | Product lead | Owner + cross-team | None |
| May an automated process change it | With review | Never | Yes |

The pattern worth internalizing: **enforcement mode should match what the tooling can actually
verify, and classification should match how often the rule legitimately changes.** Most adoption
failures come from getting one of those two backwards — either blocking on something unverifiable,
or hardening something that changes every quarter.

## Common mistakes across all three

- **Marking everything `hardened`.** This is the most frequent failure. It makes the team slow and
  trains people to route around governance.
- **Blocking on rules with no `enforcement.specification`.** If nothing can detect the violation,
  `block` is a promise the system cannot keep.
- **Omitting `owner`.** The health score penalizes this, and correctly so — a rule with no
  accountable owner cannot be maintained. Run `lcd doctor` to find them.
- **Writing the rule without the rationale.** A `description` that states what but not why cannot
  be evaluated later when circumstances change.

## Next steps

- [lcdd-templates.md](lcdd-templates.md) — copy-paste templates for each of these shapes.
- [lcdd-cheat-sheet.md](lcdd-cheat-sheet.md) — the one-page summary.
- [lcdd-for-product-and-management.md](lcdd-for-product-and-management.md) — the non-technical
  version of scenario 1, for stakeholder conversations.
- [examples/](../examples/) — five complete domain packs: startup, fintech, healthcare, ecommerce,
  education.
