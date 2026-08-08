# Frequently Asked Questions

**Status:** Active
**Version:** 0.6.0
**Last Updated:** 2026-08-08

---

## General

### What is Living Context Driven Development?

LCDD is a methodology for discovering, managing, and enforcing the rules, constraints, and knowledge that govern software development — especially in the age of AI-assisted coding.

### Why "Context" instead of "Constraint" or "Rule"?

"Constraint" and "rule" imply only prescriptive governance (what you must do). "Context" encompasses both prescriptive (rules, constraints, policies) and descriptive (facts, knowledge, standards) governance. A context can be "all API responses must include a request ID" (prescriptive) or "our production database runs PostgreSQL 16" (descriptive). Both are useful for governing software.

Also, GrayBeam CDD has established "Constraint-Driven Development" as a term, so LCDD deliberately differentiates to avoid confusion.

### Is LCDD a replacement for TDD/DDD/BDD?

No. LCDD is additive. You can practice TDD, DDD, and LCDD simultaneously. LCDD handles governance — the rules and knowledge that constrain development — while TDD/DDD/BDD handle testing, modeling, and requirements gathering respectively.

### Is this only for AI-assisted development?

No. LCDD is valuable even without AI agents. But AI-assisted development makes LCDD more urgent because AI agents can generate code faster than human governance can keep up, and they can strategically subvert constraints through specification drift.

### Do I need to use Elixir or any specific tech stack?

No. LCDD is technology-agnostic. The working reference implementation is written in TypeScript for broad accessibility, but enforcement plugins can be written in any language.

---

## Implementation

### Is the reference CLI available?

Yes. `@lcdd/cli` is available as part of the v0.5.0 reference implementation. It supports registry management, validation, CQL, health checks, review, source monitoring, extraction, normalization, dashboards, and guardrail-gated improvement. See [ROADMAP.md](../ROADMAP.md).

### Can I use LCDD today without any tooling?

Yes. Start with Level 1 adoption: write your key constraints as Context YAML files in `.lcdd/contexts/`. Review PRs manually against them. Include them in your AI tool's system prompt.

### How does LCDD integrate with my existing CI pipeline?

Use `lcd validate --strict` as the unified verification step in CI, alongside existing linters, security scanners, and tests. Change-scoped PR reporting is planned for v0.6.0; current validation evaluates the configured target against Active Contexts.

### How do I handle constraints from PDFs and websites?

The source connector can monitor Git repositories and websites, and `lcd extract` can convert registered source content into candidates through local Ollama or optional cloud providers. PDF ingestion and local-repository discovery are not implemented yet.

### Can LCDD work with GitHub Copilot / Cursor / Claude Code?

Yes. `@lcdd/mcp` exposes eight read/validation tools for MCP-compatible agents, including Context queries, artifact validation, health, dashboards, reviews, and improvement recommendations. Automatic task-scoped Context Bundles remain planned for v0.6.0.

---

## Governance

### What's the difference between Hardened and Local contexts?

Hardened contexts change slowly and require explicit human approval. They're for things like regulatory requirements, architectural invariants, and security standards. Local contexts can change faster and may be auto-approved. They're for things like code style preferences and team conventions.

### Can I change a Hardened context to Local?

Yes. Promotion and demotion are supported lifecycle operations. Demoting a Hardened context to Local requires going through the Hardened change process (you use the higher bar to lower the bar).

### What happens when two contexts conflict?

The conflict is surfaced as an event. It is not silently resolved through opaque priority numbers. If the contexts have different authority levels, the higher-authority context takes precedence temporarily, but the conflict remains visible. Equal-authority conflicts require human resolution.

### Can AI agents modify contexts?

Contexts with authority level 0 (Suggestion): yes.  
Contexts with authority level 1 (Preference): yes, with post-hoc review.  
Contexts with authority level 2+ (Guideline and above): no, AI agents cannot modify them directly. They can propose changes via standard PR.

### Who decides the authority level of a context?

The context author proposes an authority level. Reviewers validate it against the source. A regulation from OJK gets level 4 (Mandate); a team preference gets level 1 (Preference). Classification can be challenged.

---

## Comparison

### How is this different from writing a README with rules?

A README is static, unstructured, and unenforceable. A context is versioned, structured, queryable, and has an enforcement specification. READMEs are for humans; contexts are for humans AND machines.

### How is this different from OPA/Rego?

OPA is an enforcement engine. LCDD is a methodology that encompasses discovery, lifecycle, governance, and observability — with OPA as a potential enforcement plugin. LCDD answers "what rules should we have?" OPA answers "is this request compliant with the rules we defined?"

### How is this different from GrayBeam CDD?

GrayBeam extracts constraints from code and enforces them with sub-50ms latency. LCDD discovers constraints from any source (code, documents, regulations, meetings), manages their lifecycle, and governs their evolution. GrayBeam focuses on enforcement; LCDD focuses on discovery and governance.

### Is this just "policy-as-code with AI"?

No. Policy-as-code provides a language for expressing policies. LCDD provides the methodology for discovering, normalizing, classifying, versioning, enforcing, observing, and improving those policies throughout their lifecycle. AI is a tool within the methodology, not the methodology itself.

---

## Community

### How can I contribute?

See [CONTRIBUTING.md](../CONTRIBUTING.md). You can contribute critiques, RFCs, Context Packs, documentation improvements, and (eventually) code.

### Is there a community?

The community is forming. Join the GitHub repository to participate.

### Can I use LCDD in my company?

Yes. The specification is Apache 2.0 licensed. You can adopt the methodology, build internal tooling, and contribute back if you choose.

### Will there be a certification?

Not in the near term. The focus is on methodology adoption and tooling. Certification may be considered post-v1.0.0.

### Can I write a book / give a talk / create content about LCDD?

Yes, with attribution. LCDD is an open specification. We encourage community content that spreads the methodology.

---

## Technical

### What's the performance impact of context verification in CI?

The reference CI integration will support caching and incremental verification. Only changed artifacts are verified. Target: < 30 seconds for a typical PR with static verifiers.

### How does LCDD handle large monorepos?

Contexts are scoped with `appliesTo` glob patterns. Enforcement plugins only verify artifacts that match applicable contexts. The Registry supports sharding by domain.

### Is the Context Registry a separate service?

In the minimal topology (Level 1–3), the Registry is file-based (YAML in the repository). In advanced topologies (Level 5+), it can be a separate database-backed service.

### What happens if the Registry is unavailable?

Enforcement plugins cache the last known snapshot of Active contexts and fall back to the cache. Context modifications are blocked until the Registry is available.

### How is the Context Schema versioned?

The schema follows semantic versioning, independent of the LCDD specification version. Schema changes go through the LCDD RFC process.
