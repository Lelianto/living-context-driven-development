# LCDD Cheat Sheet

**Status:** Documentation  
**Version:** 0.2.0  
**Last Updated:** 2026-08-08

---

A one-page summary of the core LCDD concepts.

## Quick Terminology

| Term | What it means | When to use it |
|---|---|---|
| Context | A rule or decision stored in structured form | When you want to make a policy explicit |
| Lifecycle | A rule's status from draft to archived | To know whether a rule is in force |
| Authority | Who gives the rule its authority | To determine how hard it is to change |
| Hardened | A slow-changing rule that requires approval | For regulation or critical architecture |
| Local | A rule that can change quickly | For team style or product preferences |
| Enforcement | How the rule is applied | To choose block/warn/comment/silent |
| Context Pack | A collection of related rules | To adopt a set of rules together |
| Context Registry | Where all rules are stored (`.lcdd/contexts/`) | To find the rules currently in force |
| Pipeline | 9 stages: Discover → Extract → Normalize → Classify → Review → Version → Enforce → Observe → Improve | To automate rule creation and maintenance |
| Health Score | A 0–100 score plus an A–F grade for rule health | To find stale rules (`lcd doctor`) |

## Three Key Questions for Every Context

1. What is the purpose of this rule?
2. Who needs to follow or approve it?
3. Must this rule stay stable (hardened) or may it change quickly (local)?

## When Starting with LCDD

- Start with **one important rule**.
- Store it in a **separate file** with a clear structure.
- Add `source`, `authority`, `lifecycle`, and `enforcement`.
- Use `draft` until the rule is ready.
- Switch to `active` when it is ready to be enforced.

If you are already using the tooling (v0.4.0+), the CLI path:

```bash
npm install -g @lcdd/cli    # or: npx @lcdd/cli
lcd init                    # create .lcdd/contexts/ (hardened, local, experimental)
lcd context add             # create a Context with Rule Engine auto-suggestions
lcd transition <id> active  # activate after review
lcd validate                # run enforcement against active Contexts
lcd doctor                  # check rule health (health score)
```

## Rules of Thumb

- `Hardened` = use for major rules, compliance, or architecture.
- `Local` = use for team decisions, code style, or adjustable product choices.
- `block` = for rules that must be obeyed right now.
- `warn` = for rules you want to monitor without blocking immediately.
- `comment` = for preferences or educational guidance.
- `silent` = for internal experiments or baseline data collection.

## Quick Example: Choosing a Governance Class

The schema defines 6 classifications, not just 2:

- `Hardened-Mandate`: "All personal data processing must comply with GDPR" (legal/compliance).
- `Hardened-Standard`: "All internal services must use TLS 1.3."
- `Hardened-Local`: "Core module architecture changes require tech lead approval" (needs approval, but team-scoped).
- `Local-Standard`: "All release branches must be named `release/*`."
- `Local-Guideline`: "Use 2 spaces in frontend CSS."
- `Local-Experimental`: "Trial this new API format for 30 days."

## Short Context Template

```yaml
id: "ctx-example"
version: 1
title: "Short Context title"
description: "Explain what this rule is and why it matters."
source:
  type: "organization" # individual, organization, standard-body, ai-system, community, ...
  uri: "https://wiki.example.com/roadmap-q3"
authority:
  level: 2 # 0–4: 4 mandate, 3 standard, 2 guideline, 1 preference, 0 suggestion
  source:
    type: "organization"
    id: "product-team" # REQUIRED — the schema requires type, id, and name
    name: "Product Team"
lifecycle: "draft" # draft, candidate, approved, active, deprecated, archived
governance:
  classification: "local-standard"
  approval_required: true
enforcement:
  mode: "warn" # block, warn, comment, silent
```

## Fast Tips for Founders and Startups

- If you have an important product decision, starting from a `Context` beats writing it only in meeting notes.
- If a rule applies to a small team only, choose `local-guideline` and do not block people.
- If you want AI agents to respect a rule, use `active` plus a clear `enforcement`.
- Once one or two rules are working, repeat the process for other decisions.

## Common Mistakes

- Writing rules as free text without structure.
- Marking every rule as `hardened`, which slows the team down.
- Using the FAQ as the only documentation.
- Ignoring `source` and `authority`, which makes rules look unofficial.

## Quick: Which Files Should You Create?

**Manual (no tooling):**

- `contexts/` or `lcd-contexts/`
- `contexts/ctx-*.yaml`
- `docs/lcdd-quick-start.md`, `docs/lcdd-concepts.md`, `docs/lcdd-templates.md`

**With the CLI (`lcd init`):**

```text
.lcdd/
├── config.yaml
└── contexts/
    ├── hardened/       # requires explicit approval to change
    ├── local/          # changes quickly, team-managed
    └── experimental/   # AI suggestions, lowest authority
```

## CLI Command Summary (v0.4.0)

| Command | Purpose |
|---|---|
| `lcd init` | Initialize `.lcdd/` in a project |
| `lcd context add` | Create a Context interactively (with auto-suggestions) |
| `lcd list` / `lcd show <id>` | View all Contexts / Context detail |
| `lcd validate` | Enforcement: check artifacts against active Contexts |
| `lcd query "<CQL>"` | Query the registry using CQL |
| `lcd transition <id> <stage>` | Move the lifecycle forward (draft → active, etc.) |
| `lcd review list/approve/reject` | Context review workflow |
| `lcd doctor` | Health score plus recommendations (8 metrics, 6 triggers) |
| `lcd improve check/apply/rollback` | Review, apply, and roll back self-healing recommendations |
| `lcd source add/check/watch` | Monitor rule sources (Git/website) |
| `lcd extract <id>` / `lcd normalize` | Automated pipeline (LLM optional, Ollama by default) |
| `lcd dashboard` | Enforcement observability (terminal/web) |

Use this cheat sheet as a reference when creating new rules or discussing them with your team.
