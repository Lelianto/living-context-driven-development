# Research Update: LCDD Adoption, Expansion, and Scope

**Status:** Historical research (superseded for current status by `research-v3.md`)
**Version:** 0.2.0  
**Last Updated:** 2026-08-08

---

## Abstract

This document summarizes an analysis of comparable repositories and approaches, along with adoption recommendations for Living Context Driven Development (LCDD). It focuses on: which features can be adopted without weakening LCDD's principles, how to expand LCDD's scope, whether LCDD remains effective without ingesting data from websites or external rules, how to handle changes originating from product or management teams, and whether LCDD can support repositories other than GitHub.

> **Note on version 0.2.0:** This document now also serves as **status tracking** — each planned phase is mapped against the actual implementation (as of v0.4.0) in [Implementation Status vs Plan](#implementation-status-vs-plan-as-of-v040).

> **Historical-status note:** The status tables below intentionally preserve the v0.4.0 baseline.
> They are not the current roadmap. See [research-v3.md](research-v3.md),
> [context-debt-remediation-plan.md](context-debt-remediation-plan.md), and
> [../specification/0016-roadmap.md](../specification/0016-roadmap.md) for current planning.

---

## Implementation Status vs Plan (as of v0.4.0)

The repository has reached **v0.4.0 — Pipeline Automation** (extract, normalize, review, doctor, dashboard, MCP server). Here is the status of each planned phase against the actual implementation:

| Phase | Plan | Status | Notes |
|---|---|---|---|
| **Phase 1** — Consolidate principles and documentation | Clarify principles, add examples, strengthen observability | 🟡 Mostly complete | 4 practical documents shipped: quick-start, concepts, templates, cheat-sheet; `lcd doctor` + health score exist. Two documents from section 7.5 remain outstanding (Use Cases, For Product & Management) |
| **Phase 2** — Platform-agnostic repository connector | Abstract source control; GitHub/GitLab/Bitbucket/Azure DevOps adapters | 🟡 Partial | `lcd source add/check/watch/schedule` (Git + Website) exists and is platform-agnostic by design (clone+fetch+diff works against any Git host); explicit GitLab/Bitbucket/Azure DevOps adapters do not exist yet |
| **Phase 3** — Product and domain-specific packs | Security, architecture, product, privacy packs; pack template | 🟡 Partial | 5 example packs in `examples/` (startup, fintech, healthcare, ecommerce, education) exist; a canonical pack template plus provenance/impact-analysis metadata do not |
| **Phase 4** — Enforcement plug-in ecosystem | CI/CD, policy engine, IDE/editor extension | 🟡 Partial | `lcd validate` + regex/file-exists/custom-script verifiers + a GitHub Action exist; IDE extension and policy engine adapters are on the v0.5.0 roadmap |
| **Phase 5** — Registry, marketplace, services | Hosted registry, approval workflow, compliance reporting | ❌ Not started | A v0.5.0 priority (Community Context Pack Registry, database-backed registry) |
| **Bonus** — MCP server for AI agents | — (not in the original plan) | ✅ Delivered early | `@lcdd/mcp` shipped in v0.3.0: 7 tools for Claude/Cursor/Cline — evidence the plan can be exceeded |

**Conclusion:** this 5-phase plan **remains relevant and aligned** with the roadmap
(`ROADMAP.md`, `specification/0016-roadmap.md`). Phase 1 is nearly complete; Phases 2–4 are
progressing on correct foundations (platform-agnostic, stable schema, hardened/local
classification enforced); Phase 5 is the next step. One course correction: **an LLM is no longer
required** — the v0.4.0 pipeline runs on free local Ollama without an API key, and stages 01–05
can be deterministic.

---

## 1. Comparable Repositories and Key Lessons

### 1.1 `kyverno`

- Focus: policy-as-code for Kubernetes.
- Lessons worth adopting:
  - declarative and verifiable as a policy-as-code approach.
  - a rule-based enforcement engine executed automatically.
  - a policy distribution model that can be pushed down to runtime.
- Limits for LCDD:
  - do not make LCDD Kubernetes-specific.
  - preserve the generality of Contexts across domains.

### 1.2 `pacbot`

- Focus: continuous compliance scanning and policy automation.
- Lessons worth adopting:
  - observability of Context violations and a compliance dashboard.
  - alert/audit-trail integration for active rules.
- Limits for LCDD:
  - LCDD must keep emphasizing contextual lifecycle, not just rule scanning.

### 1.3 `enterprise-azure-policy-as-code` / `azure-policy-as-code`

- Focus: cloud infrastructure governance via policy-as-code.
- Lessons worth adopting:
  - adapters for target enforcement engines or cloud providers.
  - curated Context Packs that are easy to deploy.
- Limits for LCDD:
  - do not make the schema dependent on a specific provider.

### 1.4 `registry` (Model Context Protocol)

- Focus: versioning and distribution of context for MCP servers.
- Lessons worth adopting:
  - a versioned registry as the context distribution architecture.
  - a Context Pack marketplace for sharing rules.
- Limits for LCDD:
  - keep Context as a first-class artifact, not merely registry metadata.

### 1.5 `PRD-driven-context-engineering`

- Focus: connecting product requirements to engineering work context.
- Lessons worth adopting:
  - treat product decisions as an official Context source.
  - apply formal controls to business changes that carry technical impact.
- Limits for LCDD:
  - every Context must still use governance classification and lifecycle.

---

## 2. What Can Be Adopted Without Weakening LCDD's Principles

### 2.1 Aligned Adoptions

- Policy-as-code enforcement model: use the block/warn/comment/silent mechanism.
- Violation observability: dashboards, audit trails, violation trends.
- Context registry and distribution: Context versioning, packs, cross-repository synchronization.
- Source-agnostic connectors: build adapters for a range of enforcement targets.
- Product decision context: treat product and management decisions as valid Context sources.

### 2.2 Additional Value Worth Having

- Enforcement engine adapters comparable to Kyverno/OPA, but kept abstract.
- Multi-repository and multi-platform support, not GitHub-only.
- `Context Packs` as a shareable unit of governance.
- Explicit authority and provenance for every Context.
- Clear lifecycle states for every Context change.

### 2.3 What Does Not Fit LCDD's Principles

- Reducing LCDD to domain-limited tooling (for example, Kubernetes-only or cloud-only).
- Forcing all rules to be written manually with no discovery pipeline.
- Removing the separation between hardened and local governance.
- Reducing a Context to a Markdown document with no structural schema.
- Relying on AI to modify hardened Contexts directly without review.

---

## 3. LCDD Service Expansion Plan

### Phase 1: Consolidate Principles and Documentation

- Restate the core LCDD principles:
  - `Context` as a first-class artifact.
  - `Lifecycle` with six stages.
  - `Hardened` versus `Local` governance.
- Add concrete examples to the documentation:
  - product-driven context.
  - compliance context.
  - team-style context.
- Strengthen the definitions of observability and health score.

### Phase 2: Platform-Agnostic Repository Connector

- Build a `source control / PR/MR interface` abstraction.
- Implement adapters for:
  - GitHub
  - GitLab
  - Bitbucket
  - Azure DevOps
  - generic Git / file-system flows.
- Ensure the integration can:
  - read PR/MR/commit events.
  - write comments and annotations.
  - run checks across platforms.

### Phase 3: Product and Domain-Specific Context Packs

- Develop `Context Packs` for these use cases:
  - security/compliance.
  - architecture governance.
  - product requirement enforcement.
  - data privacy.
- Provide pack templates:
  - `product-decision-context`
  - `team-standard-context`
  - `regulatory-context`
- Define provenance, authority, and impact analysis metadata.

### Phase 4: Enforcement Plug-in Ecosystem

- Develop plugins and runtime connectors for:
  - CI/CD (GitHub Actions, GitLab CI, Azure Pipelines).
  - policy engines (Kyverno-like, OPA-like, custom linters).
  - IDE/editor extensions.
- Support the standard enforcement modes: block/warn/comment/silent.
- Implement Context immutability protection for hardened rules.

### Phase 5: Registry, Marketplace, and Services

- Build a registry/Context marketplace for:
  - publishing Context Packs.
  - distributing versions.
  - Context discovery.
- Offer services:
  - hosted registry.
  - shared governance packs.
  - approval workflow.
  - compliance reporting.
- Grow a community for:
  - sharing packs.
  - cross-team collaboration.
  - governance best practices.

---

## 4. LCDD Effectiveness Without Website Data or External Rules

LCDD remains effective as long as:

- there are rules, decisions, or conditions that need to be made explicit.
- those rules can be converted into structured Contexts.
- a review process and lifecycle manage their change.

### Alternative Context sources

- product decision memos.
- PRDs and roadmaps.
- internal policy.
- standardized meeting notes.
- management or leadership teams.
- internal audit documents.

### Why it still works

The key to LCDD is not its data source; the key is:

- `turning knowledge into Context`
- `giving provenance` to every rule
- `mapping authority`
- `managing the lifecycle`

If you do not need to ingest data from websites or external rules, LCDD remains just as relevant for internal context and business decisions. This is a form of governance that becomes essential when a team needs to align engineering with product strategy.

---

## 5. Changes from Product or Management Teams

LCDD can handle product and management changes as follows:

- treat the product decision as the Context's `source` and `authority`.
- set metadata such as `owners`, `rationale`, `impact analysis`, and `approval_required`.
- use the same lifecycle for every Context.
- classify the Context according to its impact, for example:
  - `Local-Standard` for product team policy that may change relatively quickly.
  - `Hardened-Standard` for product decisions with organizational or cross-team impact.

### Principles to preserve

- product changes must be recorded formally.
- changes must never modify hardened Contexts automatically without approval.
- if a change has broad impact, use cross-stakeholder review.
- if a change is local, use a faster mechanism but retain observability.

---

## 6. Support for Repositories Other Than GitHub

LCDD should be built platform-agnostic from the start.

### Multi-repository support strategy

- Create a `repository connector` abstraction that separates the governance model from the platform implementation.
- Use an adaptable interface for:
  - event ingest (push, PR/MR, commit)
  - review/comment metadata
  - status checks
  - file diffs and scope matching
- Support the popular platforms:
  - GitHub
  - GitLab
  - Bitbucket
  - Azure DevOps
  - generic Git / self-hosted repos

### Benefits

- LCDD is not locked to a single vendor.
- Easier adoption by organizations already using GitLab, Bitbucket, or Azure Repos.
- Simpler integration with enterprise environments that do not want a GitHub dependency.

---

## 7. Documentation That Is Easy to Understand

LCDD is a new concept, so documentation that is clear, concise, and practical is the key to adoption by solo founders, small teams, and early-stage startups.

### 7.1 Principles of practical documentation

- Focus on the problem being solved: explain quickly why LCDD is needed (context debt, specification drift, living governance).
- Start from real examples: use one or two easily understood scenarios, such as a changing product decision or a simple compliance rule.
- Provide a high-level summary for non-technical readers, then technical detail for implementers.
- Use plain language and link new terms to a short glossary.
- Build layered documentation: Overview → Use Cases → Quick Start → Concepts → Reference.
- Do not use an FAQ as a substitute for structured documentation; use the FAQ only as a supplement.

### 7.2 Content for different target users

- Solo founders:
  - a simple 5-minute `Getting Started`.
  - default example packs for `product rule`, `team standard`, and `compliance`.
  - a lightweight adoption checklist that does not require building full infrastructure.
- Small engineering teams:
  - guides for `how to add a new Context` and `how to move from Draft to Active`.
  - example PR workflows for `Local` versus `Hardened` Contexts.
  - Context templates and proposal/RFC templates.
- Non-expert startups:
  - visualizations of lifecycle and governance classification.
  - a minimal roadmap: define Contexts, use simple enforcement, measure health.
  - a `one-page cheat sheet` for product, management, and developer audiences.

### 7.3 Recommended documentation tactics

- `Start with README`: the README must answer "what is this", "why does it matter", and "how do I start".
- `Small examples first`: show a Context as short YAML and explain each part.
- `Docs as Code`: write documentation in the repository so it can be maintained alongside code and Contexts.
- `Visual aids`: use lifecycle diagrams, classification tables, and example change flows.
- `Template-based onboarding`: provide file templates for `Context`, `Context Pack`, and `change proposal`.
- `Use cases > theory`: help users understand through everyday problems, not jargon.
- `Review docs with non-experts`: make sure explanations are understandable to non-technical readers.

### 7.4 Supporting documentation research

- Write the Docs — software documentation guidance emphasizes: explain the problem, show small examples, and start from the README.
- TradingView Documentation Guidelines — a source of simple style guidance supporting structure, clear language, and accessibility.
- Docs as Code — the recommendation to write documentation in plain text so it is easy to version-control and collaborate on.

### 7.5 Specific documents that need to exist

Status as of version 0.2.0 of this document (against the v0.4.0 repository):

- ✅ `LCDD Quick Start` — [lcdd-quick-start.md](lcdd-quick-start.md) exists.
- ✅ `LCDD Concepts` — [lcdd-concepts.md](lcdd-concepts.md) exists.
- ✅ `LCDD Use Cases` — [lcdd-use-cases.md](lcdd-use-cases.md) exists (product decision, compliance policy, team conventions).
- ✅ `LCDD Templates` — [lcdd-templates.md](lcdd-templates.md) exists.
- ✅ `LCDD Cheat Sheet` — [lcdd-cheat-sheet.md](lcdd-cheat-sheet.md) exists.
- ✅ `LCDD For Product & Management` — [lcdd-for-product-and-management.md](lcdd-for-product-and-management.md) exists (non-technical document for management).

---

## 8. Priority Recommendations

Status as of v0.4.0:

1. ✅ **Complete** — practical documentation and domain example packs exist (see section 7.5).
2. 🟡 **In progress** — a file-based registry and 5 example packs exist; a database-backed registry and marketplace are v0.5.0.
3. 🟡 **In progress** — `lcd source` is already platform-agnostic (Git + Website); GitLab/Azure CI adapters do not exist yet.
4. 🟡 **In progress** — `lcd dashboard`, `lcd doctor` with 6 triggers, and `lcd improve` exist; Grafana and agent-specific metrics are v0.5.0+.
5. 🟡 **Holding** — hardened/local classification is enforced in the Rule Engine and auto-approval review; a marketplace should only follow once this is stable.

---

## 9. Summary

LCDD has a significant opportunity to become a contextual governance framework broader than policy-as-code. The best ideas from comparable repositories are their enforcement mechanisms, observability, and context distribution. What matters for LCDD is preserving generality, lifecycle, authority, and discovery. Multi-platform support and product/internal context strengthen LCDD's position without diluting its core principles.

**The v0.4.0 status confirms the plan's direction:** the automated pipeline (extract → normalize →
review → doctor) runs without an API key by default (Ollama), the MCP server shipped ahead of
schedule, and the next priority is the v0.5.0 ecosystem (VS Code extension, GitHub App,
database-backed registry, marketplace packs, multi-connector RSS/Slack/PDF).

For the concrete engineering plan that turns the self-healing proposal into code, see
[lcdd-implementation-plan.md](lcdd-implementation-plan.md).
