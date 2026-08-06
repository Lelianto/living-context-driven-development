# The Living Context Manifesto

**Status:** Draft  
**Version:** 0.1.0  
**Last Updated:** 2026-08-06

---

## Preamble

Software development has entered the age of AI-assisted engineering. Code generation is no longer the bottleneck — *knowing what to build and what not to build* is. We are uncovering better ways of governing software behavior by treating the rules, constraints, policies, and knowledge that shape our systems as first-class, living artifacts.

Through this work we have come to value:

---

## The Four Values

**Context Discovery over Constraint Enforcement**

We value the ability to *find and surface* what rules should govern our software — from regulations, standards, decisions, and emergent patterns — over merely enforcing rules we already know. A perfectly enforced empty rulebook is worse than an imperfectly enforced complete one.

**Living Evolution over Static Specification**

We value contexts that evolve with the systems they govern — adapting to new regulations, changing business environments, and lessons learned in production — over specifications written once and frozen in time. A living context is tested daily; a static specification is tested only when someone remembers to read it.

**Explicit Governance over Implicit Trust**

We value making the authority, provenance, and change process of every context transparent and auditable — who says this is a rule, why, and who can change it — over relying on undocumented assumptions and tribal knowledge. An untrusted context is a liability; an explicit one is an asset.

**Machine-Readable Context over Human-Only Documentation**

We value encoding contexts in structured, queryable formats that both humans and AI agents can consume, enforce, and observe — over prose documents that sit unread in wikis. A context that a machine cannot act on is a context that will be ignored at scale.

---

## The Twelve Principles

### 1. Context is a first-class artifact.

A Context is not a comment, not a ticket, not a Slack message. It is a versioned, structured, machine-readable artifact with a defined lifecycle, authority, and enforcement mode. Treat it with the same rigor as you treat your code.

### 2. Contexts are discovered, not assumed.

Before you enforce, you must discover. The set of constraints that should govern your software is not known a priori — it must be surfaced from regulations, standards, codebases, discussions, incidents, and AI suggestions. Discovery is a continuous process, not a one-time activity.

### 3. Every context has provenance.

Every context must answer: Who says this is a rule? When was it established? What is its authority level? Without provenance, a context is indistinguishable from an opinion. With provenance, it becomes evidence.

### 4. Contexts have a lifecycle.

A context is not binary (active/inactive). It moves through stages: **Draft → Candidate → Approved → Active → Deprecated → Archived**. Each stage has different enforcement behavior, review requirements, and observability expectations. Treat a draft differently from an active rule.

### 5. Governance matches rate of change.

Contexts that change slowly (regulations, architectural invariants) require explicit human approval to modify. Contexts that change quickly (coding style preferences, local optimizations) can evolve more freely. The governance cost should be proportional to the blast radius of a change.

### 6. Sources are heterogeneous — the model is unified.

A regulation from OJK (PDF), a coding standard from a team lead (Markdown), a design decision from a Slack thread (unstructured text), and a business invariant from the codebase (implicit logic) are all valid sources. LCDD provides a unified schema that normalizes them without losing their distinct provenance.

### 7. AI agents consume and respect contexts.

AI coding assistants operate within a bounded context window. LCDD ensures that the constraints governing a task are explicitly provided to the agent — not as vague prompts, but as structured constraints that the agent can reference, validate against, and report violations of.

### 8. Enforcement is pluggable.

Where a context is enforced — CI pipeline, IDE, code review, AI agent prompt, API gateway, runtime — is an implementation detail. LCDD defines the *what* and *why* of enforcement; the *where* and *how* are plugins.

### 9. Observability closes the feedback loop.

Contexts are not "set and forget." You must observe: How often is this context violated? Which contexts are most frequently triggered? Do violation patterns suggest the context itself is wrong? Observability turns context management from a compliance exercise into an engineering practice.

### 10. Conflicting contexts must be resolved, not hidden.

When two contexts with different authorities conflict — an OJK regulation requiring data retention vs. a GDPR-inspired internal policy requiring deletion — the conflict must be surfaced explicitly. Hiding it behind a "priority" number is insufficient. Conflict resolution is a governance act.

### 11. Contexts are composable.

A startup's fintech product should be able to compose: (a) a base pack of startup best practices, (b) a domain-specific pack of fintech regulations, (c) a team-specific pack of architectural decisions. Context Packs enable reuse, sharing, and community contribution.

### 12. The methodology applies to itself.

LCDD itself is developed using LCDD principles. The contexts that govern this specification — its versioning rules, its RFC process, its authority model — are themselves managed as Contexts in a Context Registry. We eat our own dog food.

---

## What This Manifesto Is Not

This manifesto is **not**:

- **A replacement for Agile, DDD, TDD, or any existing methodology.** LCDD is additive — it addresses the governance gap that these methodologies were not designed for.
- **A tool.** LCDD is a methodology and specification. Tools are reference implementations.
- **A promise of AI safety.** LCDD provides structure for governing AI-assisted development; it does not solve the alignment problem.
- **A compliance framework.** LCDD helps manage regulatory constraints within software development; it is not a substitute for legal counsel or formal compliance programs.
- **Prescriptive about technology.** LCDD does not mandate Elixir, Node.js, or any specific stack. The reference implementation is in TypeScript for accessibility, but the methodology is technology-agnostic.

---

## Signatories

The Living Context Manifesto is authored by the LCDD Specification Team.

*Version 0.1.0 — Draft. This manifesto will evolve through the LCDD RFC process.*
