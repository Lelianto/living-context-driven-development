# LCDD Concepts

**Status:** Documentation  
**Version:** 0.2.0  
**Last Updated:** 2026-08-08

---

This document explains the core LCDD terminology in plain language.

## What is a Context?

A `Context` is the smallest unit of LCDD. It is a rule or decision made explicit and written in a structured format.

Simple examples:

- "All API endpoints must validate input"
- "New features must be approved by product before entering a sprint"
- "The official database is PostgreSQL 16"

## What distinguishes a Context from ordinary documentation?

- Structured: readable by both humans and machines.
- Attributed: carries `source`, `authority`, and `enforcement`.
- Living: has a `lifecycle` and can change under control.

## Key terminology

### Source

Where the Context originated.

- Valid values (per the schema): `individual`, `organization`, `standard-body`, `ai-system`, `community`, `automated`, `regulatory`, `documentation`, `meeting`, `incident`.
- Examples: a financial regulator's rule becomes `regulatory`; a product team decision becomes `organization`; a suggestion from an AI agent becomes `ai-system`.
- Meaning: where this rule came from and who reported it.
- Supporting fields: `uri`, `document_id`, `location`, `extraction_method` (`manual`/`llm`/`regex`/`api`), and `confidence`.

### Authority

Who gives the Context its authority.

- `level: 0` through `4`.
- A higher level means harder to change.
- `authority.source` **must** have `type`, `id`, and `name` (enforced by the schema).

Examples:

- `level 4`: legal or compliance rules.
- `level 2`: team or product standards.
- `level 1`: developer preferences.
- `level 0`: automated experiments.

### Lifecycle

The stages a Context moves through:

- `draft` — initial and not yet approved.
- `candidate` — under review.
- `approved` — accepted but not yet in force.
- `active` — in force and must be respected.
- `deprecated` — no longer recommended.
- `archived` — retained for audit, no longer enforced.

### Governance classification

This describes how a rule is allowed to change:

- `hardened` — slow-changing rules requiring formal approval.
- `local` — faster-changing rules that teams can adjust.

The full classification set (6 values):

- `hardened-mandate` — legal/compliance; requires legal plus executive approval; must never be changed automatically.
- `hardened-standard` — organizational standard; requires owner plus cross-team approval; blocks on violation.
- `hardened-local` — requires approval, but scoped to a single team.
- `local-standard` — team agreement; may change with review.
- `local-guideline` — team preference; auto-merge.
- `local-experimental` — experiment; the primary destination for AI suggestions.

### Enforcement

This describes how a rule is applied.

Common modes:

- `block` — a violation can halt a merge or deploy.
- `warn` — warning only.
- `comment` — a comment or review note.
- `silent` — recorded without interrupting anyone.

Beyond `mode`, a Context may carry an `enforcement.specification` — a mechanical definition of
how violations are detected (a regex pattern that must not appear, a file that must exist, or a
custom script). A complete example is in [lcdd-templates.md](lcdd-templates.md).

### Context Pack

A `Context Pack` is a collection of related Contexts.

- Examples: packs for `security`, `product`, or `team style`.
- Makes it easy for a startup to adopt a ready-made set of rules.
- Real examples live in the [examples/](../examples/) folder (startup, fintech, healthcare, ecommerce, education).

### Context Registry

All Contexts live in the `Context Registry` — the source of truth for the rules currently in force.

- Default location when using the CLI: `.lcdd/contexts/`, with `hardened/`, `local/`, and `experimental/` subfolders.
- Each Context is a single YAML file that can be committed to Git (a file-based registry).
- The registry supports querying with **CQL** (Context Query Language), for example:

  ```cql
  SELECT * FROM contexts WHERE lifecycle = 'active' AND authority.level >= 3
  ```

### Context Engineering Pipeline

LCDD defines 9 stages for creating and maintaining Contexts:

```text
Discover → Extract → Normalize → Classify → Review → Version → Enforce → Observe → Improve
```

As of v0.4.0, nearly every stage has a CLI implementation:

| Stage | Command |
|---|---|
| Discover | `lcd source add/check/watch/schedule` |
| Extract | `lcd extract <source-id>` (Ollama by default, OpenAI/Anthropic optional) |
| Normalize | `lcd normalize` (schema mapping, dedup) |
| Classify | `lcd context add` (Rule Engine auto-suggestion) |
| Review | `lcd review list/approve/reject/revision` |
| Enforce | `lcd validate` |
| Observe + Improve | `lcd doctor`, `lcd dashboard` |

## Why this helps startups

Startups change quickly, so rigid rules go stale fast.
LCDD helps by:

- separating rules that must stay stable from those that can change quickly,
- giving product decisions a structure,
- keeping the governance philosophy simple but traceable.

## A simple example

```yaml
id: "ctx-release-approval"
version: 1
title: "All product releases must be approved by product management"
description: "Every product release must obtain product management approval before shipping."
source:
  type: "organization"
  uri: "https://wiki.example.com/roadmap-q3"
authority:
  level: 2
  source:
    type: "organization"
    id: "product-team"
    name: "Product Team"
lifecycle: "active"
effective_date: "2026-08-08T00:00:00Z"
governance:
  classification: "local-standard"
  approval_required: true
enforcement:
  mode: "warn"
```

## How to read a Context

1. `id`: the unique key for the rule.
2. `title`: the rule in brief.
3. `description`: what and why.
4. `source`: where the rule came from.
5. `authority`: who makes it legitimate.
6. `lifecycle`: whether the rule is in force yet.
7. `governance`: how easily it can change.
8. `enforcement`: how the rule is applied.

## A simple map

- `draft` → `candidate` → `approved` → `active`
- `active` → `deprecated` → `archived`

Use this map when talking to your team:

- Draft for ideas.
- Active for rules that can be followed.
- Deprecated when a rule is being retired.

## Who is this document for?

This document suits anyone who needs to understand LCDD concepts without technical jargon:

- solo founders,
- product managers,
- developers,
- small startup teams.
