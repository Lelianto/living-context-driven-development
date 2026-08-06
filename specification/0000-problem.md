# 0000 — Problem Statement

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines the problem space that Living Context Driven Development (LCDD) addresses. We argue that the dominant bottleneck in AI-assisted software development has shifted from *code generation speed* to *context governance* — the ability to discover, manage, and enforce the rules that should govern software behavior across diverse, evolving sources.

---

## Motivation

AI-assisted development — through tools like GitHub Copilot, Cursor, Claude Code, and agentic coding frameworks — has dramatically accelerated the rate at which code is produced. Teams that previously shipped features in weeks now ship in days or hours. However, this acceleration has surfaced a new class of failure modes that existing methodologies do not address:

1. **AI agents modify specifications to match code, not the reverse.** When faced with a failing test, an AI agent may rewrite the test assertion rather than fix the implementation — a phenomenon termed *Specification Drift* (Bunardzic, 2025).

2. **Constraints are scattered across heterogeneous sources.** A startup building a fintech product must comply with OJK regulations (external PDFs), internal coding standards (Markdown in a repository), competition rubrics (web pages), architectural decisions (Slack threads), and business invariants (embedded in code). No tool or methodology consolidates these into a unified constraint artifact.

3. **Constraint discovery is the bottleneck, not enforcement.** For small teams — startups, hackathon teams, early-stage products — the primary challenge is not *enforcing* constraints but *knowing what constraints exist*. Founders are unaware of applicable regulations, standards, and best practices until a problem occurs.

4. **Existing constraint-driven approaches (GrayBeam CDD, AI Harness) begin with known constraints.** They address enforcement and evolution but not discovery — the question of "what rules should we even follow?" remains unanswered.

5. **Constraint lifecycle is undefined.** There is no formal process for a constraint to move from discovery (a team member hears about a new regulation) to enforcement (CI blocks non-compliant code), to deprecation (the regulation is repealed). Constraints exist in an ad-hoc limbo between awareness and action.

6. **Authority and provenance are untracked.** When a constraint is violated, the question is not just "what was violated?" but "who says this is a rule, and why should we trust them?" Without provenance, constraints become dogma rather than evidence-based governance.

---

## Problem Statement

The central problem is:

> **Software teams — especially small teams without dedicated compliance or platform engineering functions — lack a systematic methodology for discovering, managing, and evolving the constraints that should govern AI-assisted software development across diverse, changing sources.**

This decomposes into seven sub-problems:

### P1: Discovery Deficit

Teams do not know what constraints they should follow. Regulatory changes, industry standards, competition rubrics, and architectural best practices are published in formats (PDFs, web pages, meeting transcripts) that are not machine-readable and not integrated into the development workflow.

### P2: Source Fragmentation

Constraints originate from fundamentally different sources — internal code, external regulation, human discussion, AI generation — with no unified ingestion mechanism.

### P3: No Unified Constraint Model

Constraints from different sources are represented in incompatible formats: a regulation is a paragraph of legalese, a coding standard is a Markdown bullet point, a business invariant is embedded in code. Without a unified schema, they cannot be compared, composed, or enforced uniformly.

### P4: Lifecycle Ambiguity

A constraint discovered in a Slack thread about a new regulation should not be enforced immediately. It must pass through stages: draft, review, approval, enforcement, deprecation. Without explicit lifecycle, constraints exist in an ambiguous state — is this a guideline, a rule, or an aspiration?

### P5: Governance Asymmetry

AI Harness proposes a binary classification (hardened vs. local) but provides no mechanism for transitioning constraints between categories as organizational context changes. A rule that is hardened today may become local tomorrow, and vice versa.

### P6: Specification Drift in AI-Assisted Workflows

AI coding agents optimize for a narrow metric (all tests pass, all lints pass) and may achieve it by modifying the constraints themselves — rewriting tests, relaxing schemas, or removing validation logic. Without explicit constraint governance that distinguishes *constraints* from *artifacts that embody constraints*, there is no reliable guardrail.

### P7: Observability Gap

Even when constraints are enforced, there is no systematic feedback loop. How often is a constraint violated? Which constraints are most frequently triggered? Are there emergent patterns of violation that suggest a constraint should be revised? Without observability, constraint management is blind.

---

## Non-Goals

LCDD explicitly does not aim to:

1. **Replace GrayBeam CDD or any validation engine.** LCDD defines *what* constraints are and *how* they are governed; enforcement engines are plugins.
2. **Replace policy-as-code tools (OPA, Sentinel).** LCDD is a methodology; policy-as-code tools are compatible enforcement mechanisms.
3. **Replace human judgment.** LCDD provides structure for constraint management; it does not automate away the need for human review of high-authority constraints.
4. **Solve the general problem of regulatory compliance.** LCDD provides the methodology for managing regulatory constraints within software development; it does not provide legal advice or guarantee compliance.
5. **Define a new programming language.** LCDD defines a constraint *schema*, not a new general-purpose language.

---

## Scope

This specification covers:

- The **Context** abstraction — what a constraint artifact looks like.
- The **Context Lifecycle** — how a context moves from discovery to archival.
- The **Context Registry** — how contexts are stored, versioned, and queried.
- The **Context Authority Model** — how provenance and trust are established.
- The **Governance Model** — who can change which contexts and at what rate.
- The **Context Engineering Pipeline** — how contexts are discovered, extracted, normalized, classified, reviewed, and enforced.
- The **Reference Architecture** — how the components fit together.
- The **Reference Schema** — a machine-readable schema for contexts.

This specification does *not* cover:

- The implementation details of specific enforcement plugins (those are separate projects).
- The internal workings of LLM-based extraction (that is implementation-specific).
- The specifics of any particular regulatory domain (those are instances, not methodology).

---

## Success Criteria

LCDD v0.1.0 is successful if:

1. A software team can read the specification and understand what a Context is and how it differs from a traditional "rule" or "policy."
2. A tool builder can implement a Context Registry that conforms to the reference schema.
3. The specification identifies clear gaps that prior art (GrayBeam, AI Harness, SDD, Policy-as-Code) does not address.
4. The novelty — the discovery pipeline and unified constraint model — is clearly articulated and distinguishable from existing approaches.
5. The specification is rigorous enough to serve as the foundation for future reference implementations (CLI, MCP Server, SDK).

---

## References

1. Bunardzic, Alex. *AI Harness: Governing Change by Rate of Evolution.* Substack (2025).
2. GrayBeam Technology. *Constraint-Driven Development: A Technical Whitepaper.* (2024–2025).
3. Evans, Eric. *Domain-Driven Design.* Addison-Wesley (2003).
4. Beck, Kent. *Test-Driven Development: By Example.* Addison-Wesley (2002).
5. Martraire, Cyrille. *Living Documentation.* Addison-Wesley (2019).
6. LCDD Literature Review (docs/research.md).
