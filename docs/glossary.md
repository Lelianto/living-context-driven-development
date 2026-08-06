# LCDD Glossary

**Status:** Draft  
**Version:** 0.1.0  
**Last Updated:** 2026-08-06

---

## Purpose

This glossary defines the canonical vocabulary of Living Context Driven Development. All specification documents, tools, and community discussions SHOULD use these terms consistently. Terms marked **[NORMATIVE]** have precise definitions that implementations MUST respect.

---

## Core Concepts

### Context **[NORMATIVE]**

The atomic unit of governance in LCDD. A Context is a versioned, structured, machine-readable artifact that represents a rule, constraint, policy, standard, regulation, rubric, or architectural invariant governing software behavior. Every Context has an identifier, lifecycle stage, authority, source, and enforcement specification.

**Example:** A Context might encode "All API responses must set the `X-Request-ID` header" with source "Internal Security Standard v2.1" and authority "CISO Office."

### Context Registry **[NORMATIVE]**

A versioned store of Contexts that supports querying by lifecycle stage, authority, domain, source, and tags. The Registry is the source of truth for which contexts are currently Active and therefore enforced.

### Context Lifecycle **[NORMATIVE]**

The directed graph of stages through which a Context moves during its existence. The standard lifecycle is:

```
Draft → Candidate → Approved → Active → Deprecated → Archived
```

Each stage has defined entry criteria, exit criteria, enforcement behavior, and review requirements.

### Context Authority

A declaration of who (or what) asserts a Context and why it should be trusted. Authority is not binary but graduated: a PCI-DSS requirement carries different authority than a team member's personal preference. Authority includes: source identity, trust level, and delegation chain.

### Context Decay

The natural tendency of software knowledge to become obsolete over time. READMEs go unread. Architecture decisions become folklore. Regulations change without notice. Team conventions evolve without documentation. Context decay is not a bug — it is the default state. LCDD treats this decay as something to be actively measured and reversed, not passively accepted.

### Context Debt

The accumulated cost of outdated, missing, or incorrect project knowledge. Just as Technical Debt represents the cost of degraded code quality, Context Debt represents the cost of degraded context quality. High Context Debt leads to: wrong AI agent output, compliance violations, architectural drift, and engineering decisions based on obsolete assumptions. Context Debt can be quantified via a **Context Debt Score** or **Living Context Health** metric.

### Context Debt Score

A numerical metric (0–100) representing the health of a project's knowledge base. Computed from factors including: stale context count, contexts past review deadline, contexts with missing owners, conflicting active rules, deprecated but not archived contexts, and contexts with zero recent violations (possibly obsolete). A higher score indicates healthier, more reliable context. The inverse is Context Debt — a lower score means more accumulated decay.

### Context Health

The measurable state of a project's knowledge governance. Analogous to code health metrics (coverage, duplication, complexity), Context Health measures: freshness (how recently contexts were reviewed), coverage (what percentage of artifacts are governed), drift (how many active contexts have unresolved conflicts or challenges), and debt (accumulated stale/obsolete contexts). Reported via `lcd doctor`.

### `lcd doctor`

A CLI command that produces a Context Health report. Output includes a numerical Context Health Score (0–100), breakdowns of stale contexts, missing owners, conflicting rules, deprecated-but-not-archived contexts, and actionable recommendations. Modeled after `npm doctor` and `brew doctor`.

### Context Freshness

The percentage of Active contexts that have been reviewed within their defined review cycle. A context with a 6-month review cycle that was last reviewed 8 months ago is stale. Freshness below 80% triggers a health warning.

### Context Coverage

The percentage of project artifacts (files, services, endpoints) that have at least one Active context governing them. Low coverage means large portions of the codebase are ungoverned.

### Context Source **[was: Context Source]**

The origin of a Context before normalization — a government PDF, a team Markdown file, a Slack thread, an AI-generated suggestion, a production incident postmortem, etc. Every Context preserves a reference to its original source for provenance.

### Context Pack **[NORMATIVE]**

A named, versioned collection of related Contexts that can be shared, imported, and extended. Context Packs are the mechanism for community contribution and reuse. A fintech pack, for example, would bundle OJK-related Contexts.

### Context Builder

A component of the Context Engineering Pipeline responsible for constructing Context artifacts from raw sources. Builders may be human (manual authoring), AI-assisted (LLM extraction with human review), or automated (programmatic extraction from structured sources).

### Context Consumer

Any system, tool, or agent that reads Contexts from a Registry and acts on them. Enforcement plugins (CI, IDE, AI agent), observability dashboards, and governance tools are all Consumers.

### Context Provider

Any system that publishes Contexts or Context Packs. A government agency publishing machine-readable regulations, a community maintaining a domain-specific Context Pack, or an internal platform team publishing architectural standards are all Providers.

### Context Snapshot

An immutable capture of all Active Contexts at a specific point in time. Snapshots enable auditing (what rules were in effect when this deployment happened?) and reproducibility (replay a past validation).

### Context Evolution

The process by which Contexts change over time — through human review, AI suggestion, fitness-based optimization, or external source updates. Evolution is governed by the rate-of-change classification (Hardened vs. Local).

### Context Query Language (CQL) **[NORMATIVE]**

A declarative language for querying the Context Registry. CQL supports filtering by lifecycle stage, authority level, domain, source type, tags, and enforcement mode. It is the primary interface for Consumers to retrieve relevant Contexts.

---

## Lifecycle Stages

### Draft

A Context that has been discovered or proposed but not yet reviewed. Draft contexts have no enforcement effect. They exist to make potential constraints visible without prematurely binding teams to them.

### Candidate

A Context that has passed initial review and is awaiting final approval. Candidate contexts may generate warnings but never block. They represent "proposed rules" that are being socialized.

### Approved

A Context that has been formally approved by the appropriate authority but is not yet actively enforced. The delay between Approved and Active allows for migration periods, tooling updates, and team communication.

### Active **[NORMATIVE]**

A Context that is currently enforced. Active contexts participate in validation, CI checks, and AI agent governance. Violations of Active contexts produce enforcement actions (block, warn, comment) depending on enforcement mode.

### Deprecated

A Context that is no longer enforced but remains visible for historical reference. Deprecated contexts generate warnings with a "this rule has been deprecated" notice and a pointer to any replacement context.

### Archived

A Context that has been fully retired and is retained only for audit purposes. Archived contexts do not generate any enforcement actions but are preserved in the Registry for provenance and compliance records.

---

## Authority Levels

### Mandate

The highest authority level. Constraints that carry legal, regulatory, or contractual obligation. Violation carries external consequences (fines, certification loss, legal liability). **Example:** OJK regulations, PCI-DSS requirements, data residency laws.

### Standard

Organization-wide policies established by a central authority (CISO, CTO, architecture board). Violation is a policy breach with internal consequences. **Example:** Security coding standards, architectural patterns, approved technology lists.

### Guideline

Team-level or domain-level best practices. Violation should be justified but does not carry formal consequences. **Example:** Preferred library versions, code style conventions, test coverage targets.

### Preference

Individual or small-team conventions. Violation is informational. **Example:** Editor settings, naming preferences, documentation style.

---

## Enforcement Modes

### Block

Violations prevent the artifact from progressing (merge blocked, deployment halted, build failed). Used for Hardened contexts only.

### Warn

Violations generate a visible warning but do not block. Used for Candidate contexts, Deprecated contexts, and Local contexts that the team wants to be aware of but not strictly enforce.

### Comment

Violations generate an informational comment (PR comment, IDE annotation). Used for low-authority contexts and Draft contexts being socialized.

### Silent

The context is tracked but violations are not surfaced to the developer. Used for experimental contexts and observational-only constraints.

---

## Governance Classifications

### Hardened Context

A Context whose rate of change is slow and whose modification requires explicit human approval through a defined governance process. Hardened contexts typically carry Mandate or Standard authority.

### Local Context

A Context whose rate of change is faster and whose modification may be automated (AI suggestion, fitness-based optimization) or require only team-level approval. Local contexts typically carry Guideline or Preference authority.

---

## Pipeline Stages

### Discover

The stage where potential context sources are identified — crawling government websites, scanning repository documentation, processing meeting transcripts, ingesting AI suggestions.

### Extract

The stage where raw sources are processed to extract candidate contexts. LLMs, regex patterns, structured parsers, and manual annotation are all valid extraction mechanisms.

### Normalize

The stage where extracted candidates are mapped to the LCDD Context Schema, resolving format differences while preserving provenance.

### Classify

The stage where normalized contexts are assigned lifecycle stage, authority level, governance classification, domain tags, and enforcement mode.

### Review

The stage where classified contexts undergo human and/or automated review according to their governance classification. Hardened contexts require explicit human approval; Local contexts may be auto-approved.

### Version

The stage where approved contexts are committed to the Registry with an immutable version number. Versioning uses semantic versioning for Context Packs and monotonic counters for individual Contexts.

### Enforce

The stage where Active contexts are consumed by enforcement plugins and violations are reported.

### Observe

The stage where enforcement outcomes are collected, aggregated, and analyzed to close the feedback loop — are contexts effective? are they outdated? do violation patterns suggest revision?

### Improve

The stage where observation data drives context evolution — refinement, deprecation, or creation of new contexts.

---

## Context Schema Properties

### id

Unique, immutable identifier for the Context. UUID v4 by default; MAY be a human-readable slug for well-known contexts.

### version

Monotonic version number. Incremented on every modification. Uses semantic versioning for Context Packs.

### title

Human-readable title. Short, descriptive, unambiguous.

### description

Extended description of the constraint, including rationale, examples, and counter-examples.

### source

Reference to the original source (URI, document ID, commit hash, conversation ID).

### authority

Object containing `source` (who asserts this), `level` (Mandate, Standard, Guideline, Preference), and `delegation` (chain of trust).

### category

Domain classification tag (e.g., `security`, `performance`, `accessibility`, `fintech-regulation`).

### severity

Impact classification (e.g., `critical`, `high`, `medium`, `low`, `info`).

### appliesTo

Scoping expression that declares which artifacts this context applies to (e.g., `**/*.ts`, `api/**`, `infrastructure/terraform/**`).

### lifecycle

Current lifecycle stage (Draft, Candidate, Approved, Active, Deprecated, Archived).

### governance

Object containing `classification` (Hardened, Local) and `approvalRequired` (boolean).

### effectiveDate

ISO 8601 timestamp of when this context became Active. MAY be null for non-Active contexts.

### deprecatedDate

ISO 8601 timestamp of when this context was deprecated. MUST be null for non-Deprecated/Archived contexts.

### owner

Person or team responsible for this context.

### reviewStatus

Current review state (e.g., `pending`, `approved`, `rejected`, `needs-revision`).

### enforcement

Object containing `mode` (Block, Warn, Comment, Silent) and `specification` (mechanism-agnostic enforcement rules).

### evidence

Array of evidence links — test results, audit logs, violation reports, observation data — that support or challenge this context.

### tags

Array of free-form tags for search and categorization.

### supersedes

Array of Context IDs that this context replaces.

### supersededBy

Array of Context IDs that replace this context.

---

## Artifact Types

### Context Record

The serialized representation of a single Context as defined by the Context Schema. Stored in JSON, YAML, or a database.

### Context Pack Manifest

A document declaring the contents of a Context Pack: name, version, description, author, dependencies, and list of included Context IDs.

### Context Snapshot File

An immutable export of all Active Contexts at a point in time, suitable for audit, reproducibility, and offline validation.

### Enforcement Report

The output of an enforcement plugin's validation run: which contexts were evaluated, which artifacts violated which contexts, and the enforcement action taken.

### Context Diff

A machine-readable representation of changes between two versions of a Context or between two Context Snapshots. Used for review, governance, and notification.

---

*This glossary is normative. All LCDD tools, specifications, and Community Context Packs SHOULD use these terms consistently. If a conflicting definition is needed in a specific domain, it MUST be documented as a domain-specific extension.*
