# LCDD Quick Start

**Status:** Documentation  
**Version:** 0.2.0  
**Last Updated:** 2026-08-08

---

## Who is this for?

This document is written for:

- solo founders who want contextual governance without heavy bureaucracy,
- small teams that need a fast way to make rules living artifacts,
- new startups without a formal process that still want decisions to stay consistent.

## Why does LCDD matter?

LCDD turns rules, decisions, and policies into living artifacts rather than ordinary documentation.
It helps if you want to:

- stop product decisions from living only in one person's head,
- keep technical rules from going stale during fast iteration,
- give AI coding agents context they can actually trust.

## What you need first

1. A Git repository with configuration and documentation files.
2. One rule or decision you want to make explicit.
3. The ability to store YAML/Markdown files in the repository.

LCDD can be adopted without complex tooling. Starting with a single `CONTEXT.yaml` is enough.
If you later want full automation (validation, review, pipeline), install the CLI:

```bash
npm install -g @lcdd/cli
```

## Five Minutes to Get Started

### 1. Define one Context

Create a simple file like this:

```yaml
id: "ctx-api-validation"
version: 1
title: "All API endpoints must validate input"
description: "Every endpoint must check its payload against a schema before processing data."
source:
  type: "organization"
  uri: "https://wiki.example.com/internal-roadmap"
authority:
  level: 2
  source:
    type: "organization"
    id: "engineering"
    name: "Engineering"
lifecycle: "draft"
governance:
  classification: "local-standard"
  approval_required: true
enforcement:
  mode: "warn"
```

### 2. Store it in the repository

Put the file in a clearly named folder, for example:

- `/contexts/ctx-api-validation.yaml`
- or `/lcd-contexts/ctx-api-validation.yaml`

### 3. Run a simple review

If you are a small team, ask one colleague to read and approve the Context.
If you are a solo founder, read it once more yourself and commit the change.

### 4. Mark it active when ready

Change `lifecycle` from `draft` to `active` once the rule is legitimate and ready to be followed.

### 5. Use it as a reference

- For product discussions: show this Context to the team.
- For developers: treat this Context as working material.
- For AI: use it as a structured constraint input.

### Alternative: Five Minutes with the CLI (v0.4.0)

Exactly the same flow, but automated and schema-compliant:

```bash
npm install -g @lcdd/cli        # once
lcd init                         # create .lcdd/contexts/{hardened,local,experimental}
lcd context add                  # enter title and description — classification is suggested automatically
lcd transition <id> active       # activate once the rule is ready
lcd validate                     # run enforcement
lcd doctor                       # see the health score for your rules
```

`lcd context add` produces YAML that already satisfies the schema (including the required
`authority.source.id`), so it is safe to use directly.

## Minimal Adoption Path

For startups without a formal process, use this path:

1. `Define` — pick one decision or rule that is frequently forgotten.
2. `Document` — write it as a structured Context (`lcd context add`).
3. `Review` — read it together with the team or stakeholders (`lcd review list` / `lcd review approve <id>`).
4. `Activate` — set the status to `active` when ready (`lcd transition <id> active`).
5. `Inspect` — re-check every 2–4 weeks (`lcd doctor` gives a health score plus automatic recommendations).

## Practical Examples

### Example 1: Product

This Context suits a business decision:

```yaml
id: "ctx-feature-launch-window"
version: 1
title: "New features must launch according to the quarterly roadmap"
description: "All new features must align with the quarterly priorities approved by product management."
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

### Example 2: Small team

Use `local-guideline` for team preferences:

```yaml
id: "ctx-code-style"
version: 1
title: "Use camelCase variable names in the frontend"
description: "All JavaScript/TypeScript files must use camelCase for local variables."
source:
  type: "organization"
  uri: "https://wiki.example.com/style-guide"
authority:
  level: 1
  source:
    type: "organization"
    id: "frontend-team"
    name: "Frontend Team"
lifecycle: "active"
effective_date: "2026-08-08T00:00:00Z"
governance:
  classification: "local-guideline"
  approval_required: false
enforcement:
  mode: "comment"
```

## Tips for Solo Founders and Early Startups

- Start with one or two important Contexts.
- Do not write dozens of rules immediately; focus on the ones causing real problems.
- Use plain language and specific examples.
- Record who created the rule and why.
- Separate rules that "need to be stable" from those that "may change quickly."

## Next Steps

After the first five minutes, continue with these documents:

- [lcdd-concepts.md](lcdd-concepts.md) to learn the core terminology.
- [lcdd-use-cases.md](lcdd-use-cases.md) for end-to-end scenarios.
- [lcdd-templates.md](lcdd-templates.md) for file templates.
- [lcdd-cheat-sheet.md](lcdd-cheat-sheet.md) for a quick summary.
- [CLI README](../implementation/packages/cli/README.md) for the full list of `lcd` commands.
- [research-v2.md](research-v2.md) for the status of the LCDD expansion plan versus the implementation.
