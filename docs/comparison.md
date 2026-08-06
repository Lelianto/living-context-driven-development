# Comparison with Related Methodologies

**Status:** Draft  
**Version:** 0.1.0

---

## Methodology Landscape

| | TDD | DDD | BDD | SDD | CDD Tools | GrayBeam CDD | AI Harness | Policy-as-Code | **LCDD** |
|---|---|---|---|---|---|---|---|---|---|---|
| **Year** | 2002 | 2003 | 2006 | 2019 | 2024+ | 2024 | 2025 | 2016 | 2026 |
| **Governs** | Code behavior | Domain model | User behavior | API contracts | AI workflow | Business rules | Arch. integrity | Infra policies | **All sources** |
| **Discovery** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (code only) | ❌ | ❌ | ✅ Pipeline |
| **Lifecycle** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Binary | ❌ | ✅ Full |
| **AI-Aware** | ❌ | ❌ | ❌ | ❌ | ✅ Core | ⚠️ Planned | ✅ | ❌ | ✅ Built-in |
| **Source-Agnostic** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Observability** | Test results | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Violations | ✅ Full |
| **Community Sharing** | Test suites | ❌ | ❌ | OpenAPI specs | ❌ | ❌ | ❌ | Rego libs | ✅ Packs |
| **Focus** | Testing | Modeling | Behavior | API | **Workflow** | Validation | Governance | Policy | **Discovery** |

---

## Test-Driven Development (TDD)

**What it does well:** TDD ensures that code satisfies a well-defined specification. Red-Green-Refactor is one of the most successful software engineering practices.

**What it doesn't do:** TDD assumes the specification is correct and complete. It doesn't help you discover specifications you're missing, manage specifications from diverse sources, or prevent AI agents from rewriting specifications to match code.

**How LCDD complements:** LCDD provides the governance layer around TDD. Contexts define what specifications should exist; TDD verifies that code satisfies those specifications. A CI pipeline running LCDD verification + TDD tests ensures both "we defined the right rules" and "we followed the rules we defined."

---

## Domain-Driven Design (DDD)

**What it does well:** DDD models complex business domains as bounded contexts with explicit boundaries, entities, value objects, and aggregates.

**What it doesn't do:** DDD focuses on domain *modeling*, not domain *governance*. It doesn't address how constraints from external regulators, cross-cutting architectural standards, or AI agent behavior should be managed.

**How LCDD complements:** A DDD bounded context defines what a service *is*. An LCDD context defines what the service *must do* and *must not do*. A service's LCDD contexts define the governance boundaries that its DDD model operates within.

---

## Behavior-Driven Development (BDD)

**What it does well:** BDD bridges the gap between business stakeholders and developers through executable specifications in natural language (Gherkin).

**What it doesn't do:** BDD specifications are manually authored and limited to behavioral scenarios. They don't cover regulatory constraints, architectural invariants, or AI agent governance.

**How LCDD complements:** BDD scenarios are one source of contexts. A BDD "Given-When-Then" can be mapped to a context's enforcement specification. LCDD provides lifecycle management for those scenarios alongside contexts from other sources.

---

## Spec-Driven Development (SDD)

**What it does well:** SDD generates server stubs, client SDKs, and documentation from API specifications (OpenAPI, GraphQL). The specification is the single source of truth.

**What it doesn't do:** SDD limits itself to API surface contracts. It doesn't address business rules, regulatory requirements, code style, security policies, or architectural constraints.

**How LCDD complements:** An OpenAPI spec is one kind of context. LCDD governs when and how that spec can change, who can approve changes, and how compliance with the spec is observed in production.

---

## GrayBeam Constraint-Driven Development (CDD)

**What it does well:** GrayBeam extracts business constraints from existing codebases, validates them with sub-50ms latency, and evolves them through fitness-based AI optimization.

**What it doesn't do:** GrayBeam only extracts constraints from code — it doesn't discover constraints from external regulations, meeting transcripts, or documentation. It has no explicit lifecycle model. Its self-improving constraint evolution lacks governance guardrails (any constraint can be auto-modified by AI).

**How LCDD relates:** GrayBeam's validation engine could be an enforcement plugin for LCDD. LCDD provides the discovery pipeline (sources GrayBeam doesn't cover), the lifecycle model (stages GrayBeam doesn't define), and the governance model (guardrails GrayBeam doesn't impose on self-improvement).

**Key difference:** GrayBeam starts from known constraints and optimizes enforcement. LCDD starts from unknown constraints and optimizes discovery.

---

## Context-Driven Development Tools (Conductor, PAW, Draft)

**What they do well:** These tools structure how AI coding agents work through phases — Spec → Plan → Implement. They maintain project context as persistent artifacts (product docs, tech stack, style guides) and integrate with PR workflows. Conductor (3,700+ GitHub stars) is the most mature, supporting Antigravity and Claude Code. PAW adds research phases and extensible skills architecture.

**What they don't do:** These are *workflow management* tools, not *governance* tools. They use informal Markdown for context (not structured schemas), have no constraint lifecycle, no authority/provenance tracking, no discovery pipeline for external sources (regulations, standards), no specification drift prevention, and no enforcement beyond agent prompt adherence. An AI agent using Conductor could theoretically modify `product.md` to match the code it generated — there is no guardrail preventing this.

**How LCDD relates:** LCDD and CDD tools are complementary layers. CDD tools manage *how* AI agents work (the process). LCDD manages *what rules* AI agents must obey (the governance). A team could use Conductor for workflow *and* LCDD for constraint governance simultaneously — Conductor handles the Spec → Plan → Implement flow; LCDD ensures every step respects active constraints.

**Key difference:** CDD tools manage the AI agent's workflow. LCDD manages the AI agent's boundaries. Process vs. governance.

---

## AI Harness (Alex Bunardzic)

**What it does well:** AI Harness identifies the specification drift problem and proposes a governance model where hardened rules change slowly and local rules change quickly.

**What it doesn't do:** AI Harness assumes constraints are manually defined. It has no discovery mechanism, no lifecycle beyond the binary hardened/local distinction, no observability model, and no published reference implementation.

**How LCDD relates:** LCDD directly builds on AI Harness's "governing change by rate of evolution" concept (LCDD Principle 5) and extends it with: discovery (finding constraints before governing them), lifecycle (stages beyond binary classification), and implementation (schema, protocol, API).

**Key difference:** AI Harness answers "how fast should constraints change?" LCDD answers "how do we discover, manage, and enforce constraints throughout their entire lifecycle?"

---

## Policy-as-Code (OPA, HashiCorp Sentinel)

**What it does well:** Policy-as-code provides mature, production-proven languages and engines for encoding and enforcing organizational policies.

**What it doesn't do:** Policy-as-code is a *tool*, not a *methodology*. It assumes policies are already known and manually authored. It provides no discovery mechanism, no lifecycle model, no governance model for policy evolution, and no integration with AI coding agents.

**How LCDD relates:** OPA/Sentinel are potential enforcement plugins for LCDD. LCDD provides the methodology layer above — discovering policies, managing their lifecycle, governing their evolution — while OPA/Sentinel handle the runtime enforcement.

**Key difference:** Policy-as-code is an implementation technique. LCDD is a methodology that can use policy-as-code as one of its enforcement mechanisms.

---

## Living Documentation (Cyrille Martraire)

**What it does well:** Living Documentation makes documentation executable, testable, and continuously updated alongside the code.

**What it doesn't do:** Living Documentation focuses on documentation artifacts (diagrams, decision records, knowledge bases), not on governance artifacts (enforceable constraints that can block merges). It doesn't address AI agent governance.

**How LCDD relates:** LCDD contexts are a specialized form of living documentation — living governance artifacts that are both documents (for humans) and enforcement specifications (for machines). Living Documentation principles (automated freshness checks, executable examples) apply to LCDD contexts.

---

## Summary

LCDD is not a competitor to these methodologies and tools. It is a complementary layer that addresses a gap none of them were designed to fill: **continuous, source-agnostic governance of software constraints throughout their lifecycle, in the age of AI-assisted development.**

- **TDD, DDD, BDD** define *how* to test, model, and specify behavior. LCDD defines *what rules* govern that behavior.
- **SDD** defines *what* the API contract looks like. LCDD governs *when and how* that contract can change.
- **GrayBeam CDD** extracts and enforces constraints from code. LCDD discovers constraints from *any* source.
- **CDD Tools (Conductor, PAW, Draft)** manage AI agent workflow. LCDD manages AI agent governance.
- **AI Harness** proposes governance by rate of evolution. LCDD formalizes it with lifecycle, schema, and implementation.
- **Policy-as-Code** provides enforcement engines. LCDD provides the methodology for discovering what to enforce.
- **Living Documentation** keeps docs fresh. LCDD extends that principle to governance artifacts.
