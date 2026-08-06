# 0001 — Core Principles

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines the core principles of Living Context Driven Development. These principles are the normative foundation from which all other specification documents derive. Every specification decision must be consistent with these principles or explicitly justify a deviation.

---

## Principle 1: The Context Primitive

### Statement

The Context is the atomic unit of governance in LCDD. Every rule, constraint, policy, standard, regulation, rubric, or architectural invariant that governs software behavior is represented as a Context.

### Rationale

Existing methodologies treat constraints as prose (Confluence pages), code (linter configs), or implicit knowledge (tribal wisdom). By making Context a first-class primitive with a defined schema, we enable uniform querying, enforcement, evolution, and sharing. A Context is not a comment. It is not a ticket. It is a structured artifact.

### Normative Requirements

1. Every Context MUST have a unique, immutable identifier.
2. Every Context MUST have a version number.
3. Every Context MUST declare its lifecycle stage.
4. Every Context MUST declare its source and authority.
5. Every Context MUST have a human-readable title and description.
6. Every Context SHOULD have a machine-readable enforcement specification.
7. Every Context in the Active stage MUST link to at least one observability mechanism.

---

## Principle 2: Heterogeneous Sources, Unified Schema

### Statement

Contexts may originate from any source — government PDFs, team Markdown, Slack threads, AI suggestions, code analysis, production incidents, meeting transcripts — but all are normalized into a common schema that preserves provenance while enabling uniform processing.

### Rationale

The world does not publish its constraints in JSON Schema. A fintech product's constraints come from OJK (PDF), internal policy (Markdown), codebase invariants (implicit), and competition rubrics (web pages). A methodology that only handles constraints authored in a specific format is incomplete. The schema is the universal adapter.

### Normative Requirements

1. The Context Schema MUST be source-agnostic — any source can produce a valid Context.
2. Every Context MUST preserve a reference to its original source (URI, commit hash, document ID).
3. The normalization process MUST be lossless with respect to provenance — you must be able to trace back to the original source.
4. The schema MUST NOT require information that is unavailable at extraction time (e.g., you cannot require "effective date" for a constraint extracted from a Slack thread that didn't specify one).

---

## Principle 3: Explicit Lifecycle

### Statement

Every Context has a defined lifecycle with distinct stages: **Draft → Candidate → Approved → Active → Deprecated → Archived**. The lifecycle determines enforcement behavior, review requirements, and observability expectations.

### Rationale

A constraint discovered in a Slack thread about a new regulation should not be enforced immediately. It must pass through stages of review, approval, and activation. Without explicit lifecycle, the boundary between "someone mentioned this might be a rule" and "this rule blocks production deployments" is dangerously blurred.

### Normative Requirements

1. Every Context MUST declare its current lifecycle stage.
2. The lifecycle stage MUST be mutable according to defined transition rules.
3. Transition from one stage to another MUST be an auditable event.
4. Enforcement mechanisms MUST respect lifecycle stage (Draft contexts are never enforced; Deprecated contexts are enforced with warnings).
5. The lifecycle model MUST be a directed graph, not a linear pipeline — a Deprecated context may be reactivated if conditions change.

---

## Principle 4: Authority and Provenance

### Statement

Every Context carries an Authority — a declaration of who (or what) asserts this constraint and why it should be trusted. Authority is not binary (trusted/untrusted) but graduated, with explicit mechanisms for establishing, challenging, and revoking trust.

### Rationale

"All contexts are equal, but some contexts are more equal than others." A PCI-DSS requirement and a team member's personal preference for tabs over spaces are both constraints, but they demand fundamentally different governance. Without explicit authority, constraints become dogma — enforced by habit rather than by justified trust.

### Normative Requirements

1. Every Context MUST declare its authority source (person, organization, standard body, AI system, community).
2. Every Context MUST declare its authority level on a defined spectrum.
3. The authority model MUST support delegation (an organization delegates to a team; a team delegates to an individual).
4. Authority MUST be challengeable — there must be a process for questioning whether a constraint is valid, current, or correctly scoped.
5. Provenance MUST be preserved through all lifecycle transitions — you must be able to trace who approved a constraint and when.

---

## Principle 5: Governance by Rate of Change

### Statement

Constraints are governed according to how frequently they are expected to change. Hardened contexts (slow-changing: regulations, architectural invariants) require explicit approval and broad review. Local contexts (fast-changing: stylistic preferences, experimental rules) can evolve more freely. The governance cost scales with blast radius.

### Rationale

Directly derived from AI Harness's "Governing Change by Rate of Evolution" and validated by decades of software engineering practice: the more impact a change has, the more scrutiny it deserves. A constitutional amendment should not require the same process as a typo fix.

### Normative Requirements

1. Every Context MUST declare its rate-of-change classification.
2. Hardened contexts MUST require explicit human approval for any modification.
3. Local contexts MAY be modified through automated processes (fitness-based evolution, AI suggestion).
4. A context MAY transition between hardened and local status, subject to governance rules.
5. CI/CD enforcement MUST distinguish between hardened and local violations (hardened = block; local = warn/comment).

---

## Principle 6: Pluggable Enforcement

### Statement

LCDD defines *what* should be enforced and *why*, but not *where* or *how*. Enforcement is pluggable — CI pipelines, IDE extensions, AI agent system prompts, API gateways, pre-commit hooks, and runtime monitors are all valid enforcement mechanisms that consume the same Context artifacts.

### Rationale

A constraint like "all API responses must include a request ID header" should be enforceable at the API gateway (runtime), in the OpenAPI spec (design time), and in the AI agent's context window (generation time). Coupling the constraint definition to a specific enforcement mechanism limits its applicability.

### Normative Requirements

1. Contexts MUST be separable from enforcement mechanisms.
2. The schema MUST include an `enforcement` block that declares *what* to enforce in a mechanism-agnostic way.
3. Enforcement plugins MUST be able to consume any Context and determine (a) whether it applies to the current artifact, and (b) whether the artifact violates it.
4. Enforcement outcomes (violation, compliance, not applicable) MUST be reportable in a standard format.

---

## Principle 7: Continuous Observability

### Statement

Contexts in the Active stage must be continuously observed. Observability answers: How often is this context violated? By which agents (human or AI)? Are violations increasing or decreasing? Does the pattern of violations suggest the context itself should be revised?

### Rationale

A context that is enforced but never observed is a blind rule — you cannot know if it's effective, if it's being bypassed, or if it has become obsolete. Observability closes the feedback loop, turning context management from a compliance exercise into an engineering practice.

### Normative Requirements

1. Every Active context MUST link to at least one observability mechanism.
2. Observability data MUST include: violation count, violation trend, violator identity (human vs. AI agent), and context age.
3. Observability data MUST be queryable and aggregatable across contexts.
4. Anomalous violation patterns MUST trigger a review recommendation (not automatic change — that's governance's job).

---

## Principle 8: Conflict is Surfaced, Not Hidden

### Statement

When two contexts with different authorities conflict, the conflict must be surfaced explicitly. It must not be resolved through opaque priority numbers or hidden through deterministic ordering. Conflict resolution is a governance act that requires human judgment for hardened contexts.

### Rationale

Real-world constraints conflict. GDPR says "delete user data on request"; financial regulations say "retain transaction records for 7 years." Both are valid, both are high-authority, and both cannot be satisfied simultaneously for all data. Pretending one "wins" because of a priority number is deceptive. The conflict itself is information that must be visible.

### Normative Requirements

1. The Registry MUST detect when two Active contexts impose contradictory requirements on the same artifact.
2. Conflicts MUST be surfaced as first-class events, not hidden in logs.
3. Conflict resolution MUST produce an auditable decision record.
4. Unresolved conflicts MUST NOT be silently ignored — they must be visible in enforcement reports.

---

## Principle 9: Composability and Reuse

### Statement

Contexts are composable into Context Packs — named, versioned collections of related contexts that can be shared, imported, and extended. A team should be able to compose contexts from a base pack (general software engineering), domain packs (fintech, healthtech), and team-specific packs into a unified governance set.

### Rationale

No team should start from zero. A fintech startup should inherit a peer-reviewed pack of OJK-related contexts, a security-conscious team should inherit OWASP-related contexts, and a hackathon team should inherit the official competition rubric as a context pack. Composability enables the community to build on each other's work.

### Normative Requirements

1. Context Packs MUST be named and versioned.
2. Context Packs MUST declare their dependencies on other packs.
3. Importing a pack MUST NOT silently override local contexts — conflicts must be surfaced.
4. Packs MUST be publishable to and installable from a Context Registry.
5. Pack provenance MUST be preserved (who published this pack? what is its authority?).

---

## Principle 10: The Methodology Applies to Itself

### Statement

LCDD itself is developed using LCDD principles. The contexts that govern this specification — versioning rules, RFC process, authority model, review requirements — are themselves represented as Contexts in a LCDD Context Registry. The specification evolves through the same lifecycle it defines.

### Rationale

A methodology that cannot govern its own evolution is not a methodology — it is a set of suggestions. By applying LCDD to LCDD, we (a) demonstrate that the principles are operational, not just aspirational, and (b) eat our own dog food, discovering flaws through direct experience.

### Normative Requirements

1. The LCDD specification repository MUST contain a `context.yaml` or equivalent registry.
2. Changes to the specification MUST follow the Context Lifecycle defined herein.
3. Specification RFCs MUST be represented as Contexts in the Draft/Candidate stage.
4. Observability on specification usage (citations, implementations, community feedback) MUST be tracked.

---

## Principle Summary Matrix

| # | Principle | Core Question Answered |
|---|---|---|
| 1 | Context Primitive | What is the unit of governance? |
| 2 | Heterogeneous Sources, Unified Schema | Where do contexts come from? |
| 3 | Explicit Lifecycle | What stage is this context in? |
| 4 | Authority and Provenance | Who says this is a rule, and why trust them? |
| 5 | Governance by Rate of Change | How hard is it to change this? |
| 6 | Pluggable Enforcement | Where is this enforced? |
| 7 | Continuous Observability | Is this working? |
| 8 | Conflict is Surfaced | What happens when rules disagree? |
| 9 | Composability and Reuse | Can I share and combine contexts? |
| 10 | Applies to Itself | Does this methodology actually work? |

---

## References

1. LCDD Manifesto (manifesto/manifesto.md)
2. LCDD First Principles (manifesto/first-principles.md)
3. Bunardzic, Alex. *AI Harness: Governing Change by Rate of Evolution.* (2025)
4. GrayBeam Technology. *Constraint-Driven Development: A Technical Whitepaper.* (2024–2025)
