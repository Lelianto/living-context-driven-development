<div align="center">
    <img src="media/logo.png" alt="LCDD Logo" width="180" height="180"/>
    <h1>Living Context Driven Development</h1>
    <h3><em>Code evolves. Knowledge decays. AI never notices. Until now.</em></h3>
</div>

<p align="center">
    <strong>Documentation dies. Specifications drift. Knowledge changes. Yet AI keeps coding as if nothing happened.<br>LCDD treats context as a living artifact — versioned, governed, enforced, and evolved.</strong>
</p>

<p align="center">
    <a href="https://github.com/Lelianto/living-context-driven-development/releases"><img src="https://img.shields.io/github/v/tag/Lelianto/living-context-driven-development?label=Spec%20v0.2.1&color=10b981" alt="Spec Version"/></a>
    <a href="https://github.com/Lelianto/living-context-driven-development/stargazers"><img src="https://img.shields.io/github/stars/Lelianto/living-context-driven-development?style=social" alt="GitHub stars"/></a>
    <a href="https://www.npmjs.com/package/@lcdd/cli"><img src="https://img.shields.io/npm/v/@lcdd/cli?color=10b981" alt="npm"/></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/Lelianto/living-context-driven-development?color=10b981" alt="Apache 2.0"/></a>
    <a href="https://www.npmjs.com/package/@lcdd/cli"><img src="https://img.shields.io/npm/dm/@lcdd/cli?color=10b981" alt="npm downloads"/></a>
</p>

---

## Table of Contents

- [■ What is Living Context Driven Development?](#-what-is-living-context-driven-development)
- [▶ The Problem](#-the-problem)
- [◈ The LCDD Way](#-the-lcdd-way)
- [◆ The Context — First-Class Governance Artifact](#-the-context--first-class-governance-artifact)
- [↻ The Context Lifecycle](#-the-context-lifecycle)
- [→ The Discovery Pipeline](#-the-discovery-pipeline)
- [◉ Governance by Rate of Change](#-governance-by-rate-of-change)
- [☰ Quick Start — Reading the Specification](#-quick-start--reading-the-specification)
- [⊞ Repository Map](#-repository-map)
- [⇔ Comparison with Related Approaches](#-comparison-with-related-approaches)
- [※ Core Philosophy](#-core-philosophy)
- [☗ Roadmap](#-roadmap)
- [✎ Contributing](#-contributing)
- [▤ Learn More](#-learn-more)
- [✉ Support](#-support)
- [♥ Acknowledgements](#-acknowledgements)
- [⚖ License](#-license)

---

## ■ What is Living Context Driven Development?

**The problem is not that AI needs context. The problem is that context decays.**

Your README says PostgreSQL 14. You migrated to 16 last year. Your AI agent just generated a migration script for 14. Your architecture decisions are in a Slack thread from March. Your compliance requirements changed in June. Nobody updated anything.

This is **Context Debt** — the accumulated cost of outdated knowledge. Just as Technical Debt degrades code quality, Context Debt degrades decision quality. Every line of code generated against stale context is a liability.

**Context is a first-class artifact.** LCDD treats every rule, constraint, policy, and piece of governance knowledge as a living artifact with structure, versioning, lifecycle, enforcement, and observability. Not static documentation. Not tribal knowledge. Not "someone mentioned this once."

| Question | LCDD's Answer |
|---|---|
| **What happens when context decays?** | Context Debt. Stale rules. Wrong AI output. LCDD measures it with a **Context Health Score**. |
| **How do you prevent it?** | The **Context Lifecycle** — six stages from Draft to Archived, each with defined enforcement, review cycles, and observability. |
| **Can AI agents bypass it?** | No. Hardened contexts are immutable to AI. Specification Drift is detected and blocked. |

---

## ▶ The Problem

**Context decays.** Every README, every architecture decision, every compliance document, every coding standard — all of it becomes outdated the moment it's written. But your AI agents keep operating on it as if nothing changed.

This decay has two consequences:

### 1. Context Debt

Your codebase has Technical Debt. Your knowledge base has Context Debt. The Postgres version you document is not the one you run. The regulation you cite was amended last month. The architectural pattern you enforce is the one you decided to replace two sprints ago. **Nobody measures this debt. Nobody pays it down.** Over time, every decision made against stale context becomes a liability.

### 2. Specification Drift

AI agents optimize for "all tests pass." When context is absent or outdated, they fill the gap — rewriting tests, relaxing schemas, removing validation. The specification silently drifts to match the code, not the other way around.

```
        Context Debt                    Specification Drift
        ────────────                    ───────────────────
  "We migrated to Postgres 16     "The AI changed the test to match
   last year. Our README still     the broken code because nobody
   says 14. And so does our AI."   told it the constraint exists."

                  └────────┬───────┘
                           │
                  ┌────────▼───────┐
                  │  LCDD treats   │
                  │  context as a  │
                  │  living artifact│
                  └────────────────┘
```

---

## ◈ The LCDD Way

### The Four Values

| Value | What It Means |
|---|---|
| **Living Evolution** over Static Specification | Contexts decay. They must be continuously observed and deliberately evolved. Tested daily, not written once and forgotten. |
| **Explicit Governance** over Implicit Trust | Every context answers: who says this is a rule, why, and who can change it? |
| **Context Discovery** over Constraint Enforcement | Finding what rules to follow matters more than perfectly enforcing rules you already know. |
| **Machine-Readable Context** over Human-Only Documentation | If an AI agent cannot consume it, it will be ignored at scale. |

### The Twelve Principles

1. **Context is a first-class artifact** — versioned, structured, machine-readable.
2. **Contexts are discovered, not assumed** — continuous discovery from any source.
3. **Every context has provenance** — who says this is a rule, and why trust them?
4. **Contexts have a lifecycle** — Draft → Candidate → Approved → Active → Deprecated → Archived.
5. **Governance matches rate of change** — Hardened for regulations, Local for preferences.
6. **Sources are heterogeneous — the model is unified** — one schema for all constraint origins.
7. **AI agents consume and respect contexts** — injected as structured constraints, not vague prompts.
8. **Enforcement is pluggable** — CI, IDE, API gateway, pre-commit; the *what* is LCDD, the *where* is plugins.
9. **Observability closes the feedback loop** — violations tracked, trends analyzed, contexts improved.
10. **Conflicting contexts must be resolved, not hidden** — surfaced explicitly for human judgment.
11. **Contexts are composable** — Context Packs enable sharing across teams and community.
12. **The methodology applies to itself** — LCDD is governed using LCDD principles.

> Read the full [Manifesto](manifesto/manifesto.md) and [First Principles](manifesto/first-principles.md).

---

## ◆ The Context — First-Class Governance Artifact

The **Context** is the atomic unit of governance in LCDD. It is not a comment, not a ticket, not a Slack message. It is a **structured, versioned, machine-readable artifact** with:

```yaml
id: "ctx-api-input-validation"
version: 1
title: "All API endpoints MUST validate input against an OpenAPI schema"
description: >
  Every API endpoint must have a corresponding OpenAPI 3.x schema.
  Request validation MUST be performed at the API gateway layer.

source:                           # Where did this come from?
  type: "organization"
  uri: "https://wiki.example.com/security/api-standards"

authority:                        # Who says this is a rule, and why trust them?
  source: { type: "organization", id: "ciso-office", name: "CISO Office" }
  level: 3                        # 0=Suggestion … 4=Mandate

lifecycle: "active"               # Draft → Candidate → Approved → Active → Deprecated → Archived

governance:                       # How hard is it to change this?
  classification: "hardened-standard"   # AI agents CANNOT modify hardened contexts
  approval_required: true

enforcement:                      # How is this enforced?
  mode: "block"                   # Block merge, warn, comment, or silent
  specification:
    type: "openapi-validation"    # Pluggable enforcement mechanism

evidence:                         # Why does this rule exist?
  - type: "security-incident"
    uri: "https://incidents.example.com/INC-2025-087"
    description: "SQL injection via unvalidated API input"
```

Each Context is a **self-contained governance unit** — it knows its source, its authority, its lifecycle stage, and how it should be enforced. See the full [Context Schema](specification/0012-context-schema.md).

---

## ↻ The Context Lifecycle

Constraints don't jump from "someone mentioned this" to "this blocks production." They move through six explicit stages:

```
Draft ──→ Candidate ──→ Approved ──→ Active ──→ Deprecated ──→ Archived
  │           │             │            │            │              │
  │  "Someone │  "Under     │  "Approved │  "This     │  "No longer │  "Retained
  │   mention-│   review"   │   but not  │   blocks   │   applies"  │   for audit"
  │   ed this"│             │   yet      │   merges"  │             │
  │           │             │   active"  │            │             │
  │  No       │  Comment    │  Warn      │  Block /   │  Warn with  │  No
  │  enforce- │  only       │  mode      │  Warn      │  deprecation│  enforcement
  │  ment     │             │            │            │  notice     │
```

Each transition is an auditable event. Contexts can be reactivated if conditions change. Emergency shortcuts exist but require post-hoc review. See the full [Context Lifecycle](specification/0002-context-lifecycle.md).

---

## → The Discovery Pipeline

The LCDD Context Engineering Pipeline is what makes LCDD different from every other approach — it starts from **unknown constraints**, not known ones:

```
           01 ⚡ Phase A    02 Planned      03 Planned      04 ⚡ Phase A    05 ⚡ Phase A    06 ✅ Done       07 ⚡ WIP        08 ⚡ Phase A
           ──────────     ──────────     ──────────     ──────────     ──────────     ──────────     ──────────     ──────────
           Observe  ──→  Understand ──→  Govern   ──→  Distribute──→  Enforce  ──→  Verify   ──→  Learn    ──→  Improve
              │               │               │              │              │              │              │              │
              │ Source        │ Extract +     │ Review +     │ Version +    │ Validate     │ Metrics,     │ Trigger
              │ monitoring    │ Normalize     │ Classify     │ publish      │ artifacts    │ dashboards,  │ evaluator
              │ (deterministic)│ (needs LLM)  │ (deterministic)│            │              │ alerts       │ + doctor
```

> **Implementation status:** Stages 01 (Discover), 04 (Classify), 05 (Review), and 09 (Improve) have deterministic Phase A implementations in v0.3.0 — `lcd source add/check`, rule-based auto-classification, `lcd review` workflow, and `lcd doctor` with trigger evaluator. No LLM or API key required. Stage 02 (Extract) requires LLM integration and remains planned. See [ROADMAP.md](ROADMAP.md).

**Example:** A new regulation is published (ex. GDPR update, PCI-DSS revision) → Discover detects it → Extract parses it with an LLM → Normalize maps it to the Context Schema → Classify assigns it level 4 (Mandate) → Review routes it to the compliance team → Version commits it as Draft → Approve → Active → Block enforcement in CI. See the full [Context Builder](specification/0006-context-builder.md).

---

## ◉ Governance by Rate of Change

Directly inspired by AI Harness (Bunardzic, 2025), LCDD classifies every Context by how fast it should change:

| Classification | Authority | Change Speed | AI Can Modify? | Default Enforcement | Example |
|---|---|---|---|---|---|
| **Hardened-Mandate** | 4 (Mandate) | Very slow | ❌ Never | Block | Regulatory requirement (ex. GDPR, PCI-DSS, HIPAA) |
| **Hardened-Standard** | 3 (Standard) | Slow | ❌ Never | Block | CISO security policy |
| **Hardened-Local** | 2 (Guideline) | Moderate | ❌ (can suggest) | Warn | Team architecture decision |
| **Local-Standard** | 2 (Guideline) | Moderate | ✅ With review | Warn | Recommended libraries |
| **Local-Guideline** | 1 (Preference) | Fast | ✅ Auto-merge | Comment | Code style conventions |
| **Local-Experimental** | 0 (Suggestion) | Very fast | ✅ Primary source | Silent | AI-generated suggestions |

Hardened contexts require formal RFC + explicit human approval. Local contexts can evolve through AI suggestion and fitness-based optimization. See the full [Governance Model](specification/0004-governance.md).

---

## ◈ Context Health

Context Debt should be as visible as Technical Debt. `lcd doctor` gives you a health check:

```bash
$ lcd doctor

LCDD Context Health Report
Timestamp: 2026-08-06T22:57:29.547Z
Contexts: 3

  Overall Score: ████████████████░░░░ 78% (78/100)  Grade: B

Health Metrics
────────────────────────────────────────────────────────────
  ✓ Stale Contexts
    ████████████████████ 100% (15/15)

  ⚠ Missing Owners
    █████████████░░░░░░░ 67% (10/15)
  └─ 1 context(s) without owner: ctx-d71b89ca

  ✗ Deprecation Backlog
    ░░░░░░░░░░░░░░░░░░░░ 0% (0/10)
  └─ 1 deprecated context(s), 1 stale >180 days: ctx-7cef85e2

  ⚠ Tag Hygiene
    ████████████░░░░░░░░ 60% (6/10)
  └─ 2 context(s) without tags: ctx-7cef85e2, ctx-d71b89ca

Recommendations
────────────────────────────────────────────────────────────
  1. 1 context(s) without owner: ctx-d71b89ca
  2. 1 deprecated context(s), 1 stale >180 days: ctx-7cef85e2
  3. 2 context(s) without tags: ctx-7cef85e2, ctx-d71b89ca

  Run lcd doctor --triggers for detailed trigger analysis.
```

Add `--triggers` for five deterministic triggers (stale contexts, high false positives, increasing violations, AI drift, new source detected) with specific remediation commands.

| Metric | What It Measures |
|---|---|
| **Stale Contexts** | Active contexts with no events in 90+ days |
| **Missing Owners** | Non-archived contexts without an assigned owner |
| **Enforcement Conflicts** | Overlapping enforcement patterns with conflicting block modes |
| **Deprecation Backlog** | Deprecated contexts not yet archived (especially >180 days) |
| **Draft Stagnation** | Drafts stuck for >30 days |
| **Authority Gaps** | Active contexts with weak authority levels (0–1) |
| **Tag Hygiene** | Contexts missing tags for discoverability |
| **Review Backlog** | Contexts awaiting review (pending, in-review, needs-revision) |

> Context Health is available now in v0.3.0 via `lcd doctor`. No API key required. See `lcd doctor --help` for options.

---

## ☰ Quick Start

LCDD is in **Specification Phase (v0.1.0)** with a working **Reference Implementation (v0.2.0)** published to npm.

### Install the CLI (30 seconds)

```bash
npm install -g @lcdd/cli
lcd init
lcd context add
lcd validate
```

### Read the Specification (30 minutes)

1. [Manifesto](manifesto/manifesto.md) — the four values and twelve principles.
2. [Problem Statement](specification/0000-problem.md) — the seven sub-problems LCDD solves.
3. [Core Principles](specification/0001-core-principles.md) — ten normative principles.
4. [Glossary](docs/glossary.md) — canonical vocabulary.
5. [Introduction](docs/introduction.md) — gentle conceptual overview.

### For Implementers (2–3 hours)

1. [Context Lifecycle](specification/0002-context-lifecycle.md)
2. [Context Schema](specification/0012-context-schema.md)
3. [Context Registry](specification/0005-context-registry.md)
4. [Context Protocol](specification/0013-context-protocol.md)
5. [Reference Architecture](specification/0015-reference-architecture.md)

### For Teams Adopting LCDD

1. [Adoption Guide](docs/adoption.md) — six-level adoption path, from awareness to full platform.
2. [Comparison](docs/comparison.md) — how LCDD relates to TDD, DDD, SDD, CDD tools, and more.
3. [FAQ](docs/faq.md) — common questions with concrete answers.
4. [Examples](examples/) — five domain Context Packs (Startup, Fintech/OJK, Healthcare/HIPAA, E-commerce, Hackathon).

---

## ⊞ Repository Map

```
living-context-driven-development/
│
├── 📜 README.md                         # You are here
├── 📜 LICENSE                           # Apache 2.0
├── 📜 GOVERNANCE.md                     # How this project is governed
├── 📜 ROADMAP.md                        # Six-milestone roadmap
├── 📜 CHANGELOG.md                      # Version history
├── 📜 CONTRIBUTING.md                   # How to contribute
├── 📜 CODE_OF_CONDUCT.md                # Contributor Covenant
├── 📜 SECURITY.md                       # Security policy
├── 📜 SUPPORT.md                        # Support guidelines
├── 📜 AGENTS.md                         # Instructions for AI agents
├── 📜 lcdd-methodology.md               # Comprehensive methodology guide
│
├── 📂 manifesto/                        # The LCDD Manifesto
│   ├── manifesto.md                     # Four Values + Twelve Principles
│   ├── first-principles.md              # Five Axioms of LCDD
│   └── vision.md                        # Long-term vision (5 phases)
│
├── 📂 specification/                    # Core Specification (RFC-style)
│   ├── 0000-problem.md                  # Problem Statement
│   ├── 0001-core-principles.md          # Core Principles
│   ├── 0002-context-lifecycle.md        # Context Lifecycle
│   ├── 0003-authority-model.md          # Authority Model
│   ├── 0004-governance.md               # Governance Model
│   ├── 0005-context-registry.md         # Context Registry
│   ├── 0006-context-builder.md          # Context Engineering Pipeline
│   ├── 0007-context-engineering.md      # Context Engineering Patterns
│   ├── 0008-verification.md             # Verification
│   ├── 0009-observability.md            # Observability
│   ├── 0010-ai-agents.md                # AI Agent Governance
│   ├── 0011-context-query-language.md   # CQL Specification
│   ├── 0012-context-schema.md           # Context Schema
│   ├── 0013-context-protocol.md         # Context Protocol
│   ├── 0014-security.md                 # Security Model
│   ├── 0015-reference-architecture.md   # Reference Architecture
│   └── 0016-roadmap.md                  # Detailed Roadmap
│
├── 📂 docs/                             # Companion Documentation
│   ├── research.md                      # Literature Review (v0.2.0)
│   ├── glossary.md                      # Canonical Vocabulary
│   ├── introduction.md                  # Gentle Introduction
│   ├── philosophy.md                    # Philosophical Foundations
│   ├── comparison.md                    # Comparison with Other Approaches
│   ├── adoption.md                      # Adoption Guide (6 levels)
│   └── faq.md                           # Frequently Asked Questions
│
├── 📂 reference/                        # Reference Artifacts
│   ├── schema/context-schema.json       # JSON Schema for Context
│   ├── yaml/example-context.yaml        # Example Context (YAML)
│   ├── json/example-context.json        # Example Context (JSON)
│   └── architecture/diagrams.md         # Architecture Diagrams
│
├── 📂 examples/                         # Example Context Packs
│   ├── startup/                         # Startup Best Practices
│   ├── fintech/                         # OJK Fintech Compliance
│   ├── healthcare/                      # HIPAA Compliance
│   ├── ecommerce/                       # E-commerce Best Practices
│   └── education/                       # Hackathon Competition Rubric
│
├── 📂 media/                            # Visual Identity
│   └── logo.png                         # LCDD Logo
│
└── 📂 implementation/                   # Reference Implementation (v0.3.0)
    ├── packages/core/                   # @lcdd/core — TypeScript SDK
    ├── packages/cli/                    # @lcdd/cli — Command-line tool
    └── .github/workflows/               # CI/CD enforcement
```

---

## ⇔ Comparison with Related Approaches

| | TDD | DDD | AGENTS.md | CDD Tools | AI Harness | **LCDD** |
|---|---|---|---|---|---|---|---|
| **Governs** | Code behavior | Domain model | Agent prompts | AI workflow | Arch. integrity | **All sources** |
| **Context as artifact** | ❌ | ❌ | ❌ (unstructured) | ❌ (informal) | ❌ | ✅ Structured schema |
| **Lifecycle** | ❌ | ❌ | ❌ | ❌ | Binary | ✅ Full (6-stage) |
| **Context Debt** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Measurable |
| **AI-Aware** | ❌ | ❌ | ✅ (one-way) | ✅ (workflow) | ✅ | ✅ Built-in + enforced |
| **Observability** | Test results | ❌ | ❌ | ❌ | ❌ | ✅ Full |
| **Spec Drift Prevention** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Community Sharing** | Test suites | ❌ | ❌ | ❌ | ❌ | ✅ Context Packs |

**AGENTS.md vs LCDD:** AGENTS.md files give AI agents instructions — but they're unstructured, unversioned, ungoverned, and unenforced. Nothing prevents the agent from ignoring them. Nothing measures whether they're being followed. LCDD takes the same idea and makes it structured, versioned, governed, and enforced. Context is a first-class artifact, not a text file.

**CDD Tools (Conductor, PAW):** Manage AI agent *workflow* (Spec → Plan → Implement). LCDD manages AI agent *governance* (what rules must be obeyed). Complementary — use both.

See the full [Comparison](docs/comparison.md) and [Literature Review](docs/research.md).

---

## ※ Core Philosophy

Living Context Driven Development is built on five axioms:

1. **All software is governed by constraints, whether acknowledged or not.** Making them visible is always better than leaving them implicit.
2. **In the age of AI-assisted development, constraint governance is the bottleneck, not code production.**
3. **Constraints exist on a spectrum of authority**, from individual preference to legal mandate. A unified methodology must accommodate the full spectrum.
4. **The sources of constraints are heterogeneous and evolving.** A methodology that cannot ingest from arbitrary sources is incomplete.
5. **Observability without enforcement is documentation; enforcement without observability is dogma.** The feedback loop makes a constraint *living*.

> Read the full [First Principles](manifesto/first-principles.md) and [Philosophy](docs/philosophy.md).

---

## ☗ Roadmap

| Milestone | Version | Status | Focus |
|---|---|---|---|
| **Foundation** | v0.1.0 | ✅ Complete | Specification — 17 docs, manifesto, examples, reference schema |
| **Reference Implementation** | v0.2.1 | ✅ Complete | `@lcdd/core` SDK + `@lcdd/cli` CLI — published to npm |
| **Pipeline Automation** | v0.3.0 | 🟡 In Progress | Deterministic pipeline: `lcd doctor`, rule engine, `lcd review`, source connector, trigger evaluator |
| **MCP Server** | v0.3.0 | 🔴 Planned | AI agent integration, context injection, drift detection |
| **Ecosystem** | v0.5.0 | 🔴 Planned | VS Code, GitHub App, Community Packs, Observability Dashboard, LLM extraction |
| **Adoption** | v1.0.0 | 🔴 Planned | Stabilized spec, conference talks, case studies |

### Pipeline Stage Status

| Stage | Status | Available In |
|---|---|---|
| 01 Observe | 🟡 Partial | v0.3.0 — Deterministic source monitoring: `lcd source add/check`, Git diff, website checksum |
| 02 Extract | 🔴 Planned | v1.0+ — LLM extraction from source documents (requires API key) |
| 03 Normalize | 🔴 Planned | v1.0+ — Schema mapping, deduplication |
| 04 Classify | 🟡 Partial | v0.3.0 — Deterministic rule engine: source type → authority, keyword → severity, domain → tags |
| 05 Review | 🟡 Partial | v0.3.0 — `lcd review list/show/approve/reject/revision`, auto-approval for Local contexts |
| 06 Enforce | ✅ Done | v0.2.1 — `lcd validate`, `ContextVerifier`, CI integration |
| 07 Verify | ✅ Done | v0.2.1 — Schema validation, semantic rules, lifecycle checks |
| 08 Learn | 🟡 Partial | v0.2.1 — Event log; v0.3.0 — Enforcement event persistence |
| 09 Improve | 🟡 Partial | v0.3.0 — `lcd doctor`, Context Health Score, 5-trigger evaluator, structured recommendations |

### Install

```bash
npm install -g @lcdd/cli
lcd init
lcd context add
lcd validate
```

See the full [Roadmap](specification/0016-roadmap.md) and [Vision](manifesto/vision.md).

---

## ✎ Contributing

LCDD is an open specification. Contributions of all kinds are welcome:

- **Critique** — open an issue challenging a principle or specification.
- **RFC** — propose a significant change following the RFC process.
- **Context Packs** — contribute domain-specific packs for your industry.
- **Documentation** — improve clarity, fix typos, add examples.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full process.

---

---

## ✉ Support

For questions, bug reports, or feature requests, please open a [GitHub issue](https://github.com/Lelianto/living-context-driven-development/issues/new). See [SUPPORT.md](SUPPORT.md) for support guidelines.

---

## ♥ Acknowledgements

LCDD builds on the foundational work of:

- **GrayBeam Technology** — Constraint-Driven Development
- **Alex Bunardzic** — AI Harness: Governing Change by Rate of Evolution
- **Google / Gemini CLI Extensions** — Conductor
- **Rob Emanuele** — Phased Agent Workflow (PAW)
- **Microsoft** — Agentic SDLC Starter
- **Eric Evans** — Domain-Driven Design
- **Kent Beck** — Test-Driven Development
- **Cyrille Martraire** — Living Documentation
- **Open Policy Agent** — Policy-as-Code

LCDD does not replace these works; it stands on their shoulders and addresses gaps they were not designed to fill.

---

## ⚖ License

Living Context Driven Development Specification is licensed under the Apache License 2.0. See [LICENSE](LICENSE).

---

<p align="center">
    <em>"We don't just use AI-assisted development. We practice Living Context Driven Development."</em>
</p>
