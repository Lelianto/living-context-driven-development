# 0016 — Roadmap

**Status:** Active  
**Version:** 0.7.0-alpha.1
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-08

---

## Abstract

This document defines the development roadmap for the LCDD specification, reference implementations, and ecosystem. The roadmap is organized by milestone with explicit deliverables, success criteria, and dependencies.

---

## Milestone 1: Foundation v0.1.0

**Target:** Define the methodology. No code, only specification.

**Status:** ✅ Complete (2026-08-06)

### Deliverables

| # | Deliverable | Status |
|---|---|---|
| 1.1 | Literature Review (docs/research.md) | ✅ Complete |
| 1.2 | Problem Statement (0000-problem.md) | ✅ Complete |
| 1.3 | Manifesto (manifesto/manifesto.md) | ✅ Complete |
| 1.4 | First Principles (manifesto/first-principles.md) | ✅ Complete |
| 1.5 | Vision (manifesto/vision.md) | ✅ Complete |
| 1.6 | Core Principles (0001-core-principles.md) | ✅ Complete |
| 1.7 | Context Lifecycle (0002-context-lifecycle.md) | ✅ Complete |
| 1.8 | Authority Model (0003-authority-model.md) | ✅ Complete |
| 1.9 | Governance Model (0004-governance.md) | ✅ Complete |
| 1.10 | Context Registry (0005-context-registry.md) | ✅ Complete |
| 1.11 | Context Builder/Pipeline (0006-context-builder.md) | ✅ Complete |
| 1.12 | Context Engineering (0007-context-engineering.md) | ✅ Complete |
| 1.13 | Verification (0008-verification.md) | ✅ Complete |
| 1.14 | Observability (0009-observability.md) | ✅ Complete |
| 1.15 | AI Agents (0010-ai-agents.md) | ✅ Complete |
| 1.16 | Context Query Language (0011-context-query-language.md) | ✅ Complete |
| 1.17 | Context Schema (0012-context-schema.md) | ✅ Complete |
| 1.18 | Context Protocol (0013-context-protocol.md) | ✅ Complete |
| 1.19 | Security (0014-security.md) | ✅ Complete |
| 1.20 | Reference Architecture (0015-reference-architecture.md) | ✅ Complete |
| 1.21 | Glossary (docs/glossary.md) | ✅ Complete |
| 1.22 | Companion documents (introduction, philosophy, comparison, adoption, FAQ) | ✅ Complete |
| 1.23 | README.md + Repository scaffolding | ✅ Complete |
| 1.24 | Example Context Packs (startup, fintech, healthcare, ecommerce, hackathon) | ✅ Complete |
| 1.25 | Reference schema files (JSON Schema, YAML example) | ✅ Complete |
| 1.26 | Methodology Guide (lcdd-methodology.md) | ✅ Complete |
| 1.27 | AGENTS.md + SUPPORT.md + Governance docs | ✅ Complete |
| 1.28 | Logo and visual identity (media/) | ✅ Complete |

### Success Criteria

- [x] Specification is internally consistent (no contradictory requirements).
- [x] All terms used in specs are defined in the glossary.
- [x] The novelty (discovery pipeline, unified constraint model, lifecycle) is clearly distinguishable from prior art.
- [x] Repository is public on GitHub with Apache 2.0 license.
- [ ] Website (livingcontext.dev) publishes the specification.

---

## Milestone 2: Reference Implementation v0.2.0

**Target:** A working CLI (`lcd`) that can initialize a project, manage contexts, and validate artifacts against them.

**Status:** ✅ Complete

### Deliverables

| # | Deliverable | Description |
|---|---|---|
| 2.1 | `@lcdd/core` | TypeScript SDK: Context model, schema validation, Registry client, CQL parser |
| 2.2 | `@lcdd/cli` | CLI tool: `lcd init`, `lcd context add`, `lcd list`, `lcd show`, `lcd validate`, `lcd query`, `lcd transition` |
| 2.3 | File-based Registry | Git-backed Registry using YAML files in `.lcdd/contexts/` |
| 2.4 | Static Verifiers | Built-in verifiers: regex, file-exists, extensible plugin system |
| 2.5 | CI Action | GitHub Action: `lcdd/validate` for CI enforcement |
| 2.6 | Unit Tests | 89 tests across 5 modules (lifecycle, schema, registry, CQL, verifier) |
| 2.7 | Lifecycle Event Log | NDJSON event log for lifecycle transitions (`.events.log`) |
| 2.8 | npm Publication | Both packages published to npm |

### Success Criteria

- [x] A developer can run `npx @lcdd/cli init` and get a working LCDD project.
- [x] Contexts in `.lcdd/contexts/` are validated by CI on PR.
- [x] At least 2 built-in verifier types work correctly (regex, file-exists).
- [x] CQL queries return correct results from the file-based Registry.

---

## Milestone 3: Pipeline Automation and MCP v0.3.0–v0.4.0

**Target:** Automate pipeline stages 01–03, 04–05, and 08–09 with deterministic rules. MCP server for AI agents. No API key required for default usage.

**Status:** ✅ Complete

### Deliverables

| # | Deliverable | Description |
|---|---|---|
| 3.1 | `lcd doctor` | Context Health Score: 8 metrics, letter grade A–F, `--json` and `--triggers` flags |
| 3.2 | Rule Engine | Deterministic auto-classification: source→authority, keyword→severity, domain→tags |
| 3.3 | `lcd review` | Review workflow: `list`, `show`, `approve`, `reject`, `revision`, `auto-approve` |
| 3.4 | Trigger Evaluator | Deterministic governance triggers with structured recommendations |
| 3.5 | Source Connector | `lcd source add/list/check/remove` + `watch` + `schedule` — Git + Website |
| 3.6 | Enforcement Log | Enforcement events persisted to `.lcdd/contexts/.enforcements.log` |
| 3.7 | `lcd dashboard` | Terminal + Web dashboard: trends, actor breakdown, top violated, mode distribution, velocity |
| 3.8 | `@lcdd/mcp` | MCP Server: stdio transport and AI-agent integration |
| 3.9 | `lcd extract` | Ollama, OpenAI, and Anthropic extraction with `--dry-run` and `--auto` modes |
| 3.10 | `lcd normalize` | Schema mapping, Jaccard and SHA-256 deduplication, validation, and draft creation |

### Success Criteria

- [x] `lcd doctor` produces a health score and actionable recommendations without external dependencies.
- [x] `lcd context add` auto-suggests classification based on deterministic rules; user can override.
- [x] `lcd review approve` transitions context through review workflow and lifecycle.
- [x] `lcd source check` detects changes in Git repos and websites.
- [x] `lcd source watch` polls sources autonomously at configured intervals.
- [x] `lcd extract` with Ollama extracts constraints with zero API cost.
- [x] `lcd normalize` deduplicates and validates candidates before registry write.
- [x] `lcd dashboard --web` serves interactive enforcement metrics.
- [x] MCP server exposes LCDD query, validation, health, dashboard, and review tools via stdio.
- [x] 6 of 9 pipeline stages fully done, 2 in Phase A, 1 remaining (02 full LLM).

---

## Milestone 4: Self-Healing Phase A v0.5.0

**Target:** Turn deterministic diagnoses into reversible, human-governed repair actions.

**Status:** ✅ Complete (2026-08-08)

### Deliverables

| # | Deliverable | Description |
|---|---|---|
| 4.1 | Unified triggers | Six triggers with centralized thresholds and true dismissal-based false-positive measurement |
| 4.2 | ImproveEngine | Plan, apply, verify, and automatically roll back supported recommendations |
| 4.3 | Persisted snapshots | Reversible snapshots cover all Context lifecycle states |
| 4.4 | Heal audit trail | Apply, rollback, and review decisions are recorded as lifecycle events |
| 4.5 | `lcd improve` | `check`, `apply`, and `rollback` CLI workflow |
| 4.6 | Human-control guardrails | Hardened protection, approval gates, reversibility, health veto, and psychological safety |
| 4.7 | MCP recommendations | Eighth MCP tool exposes read-only recommendations; mutation remains a human action |

### Success Criteria

- [x] Local recommendations can be inspected, dry-run, applied with approval, and rolled back.
- [x] Hardened Contexts are never automatically modified.
- [x] Health regression automatically restores the pre-change snapshot.
- [x] Core self-healing behavior is covered by named guardrail tests.

---

## Milestone 5: Drift and Retrieval v0.6.0

**Target:** Close the code-to-Context feedback loop and deliver only relevant Context for a task or change.

**Status:** 🟡 In Progress (security, test, and self-governance baseline complete)

### Deliverables

| # | Deliverable | Description |
|---|---|---|
| 5.0 | Self-governance baseline | Dogfood a tracked Registry and Context Pack with lifecycle and CI evidence |
| 5.1 | Security and test baseline | Resolve P0/P1 audit findings; add CLI and MCP integration/contract tests |
| 5.2 | Change-scoped validation | `lcd validate --changes` with stable JSON and PR governance summary |
| 5.3 | Context Bundle | Task-scoped retrieval with authority resolution, lifecycle filtering, and size budgets |
| 5.4 | Local discovery | `lcd discover` scans repository documentation and configuration into review candidates |
| 5.5 | Code-to-Context drift | `lcd drift` produces evidence-backed, proposal-only Drift Reports |
| 5.6 | Agent retrieval | MCP tools expose Context Bundles and drift reports without automatic mutation |

### Success Criteria

- [x] Repository development is governed by a tracked Context Pack and validated lifecycle history.
- [ ] Change-scoped validation reports only affected Contexts and artifacts.
- [ ] A task bundle is materially smaller than the full Registry without dropping higher-authority constraints.
- [ ] This repository can discover candidate constraints from its own documentation.
- [ ] A documented provider migration is detected as drift but never silently rewrites a Hardened Context.

Implementation planning: [../docs/v0.6-implementation-plan.md](../docs/v0.6-implementation-plan.md).

---

## Milestone 6: Provenance and Governance Reporting v0.7.0

**Target:** Make every governed result explainable and auditable.

**Status:** 🟡 Phase A

### Deliverables

| # | Deliverable | Description |
|---|---|---|
| 6.1 | Provenance model | Creator, approver, source revision, verification time, and AI involvement |
| 6.2 | Verification workflow | `lcd context verify` records evidence and freshness |
| 6.3 | Governance report | File-to-Context mapping, provenance, violations, and merge decision |
| 6.4 | Feedback producer | Explicit dismissals activate false-positive measurement |
| 6.5 | Bounded telemetry | Local-first, opt-in, aggregated usage and correction metrics |
| 6.6 | Verifiable Principal model | Provider-neutral identities, issuer/subject bindings, assurance, and signed evidence |
| 6.7 | Ownership and impact model | Repository boundaries, affected Teams, required reviewers, and trusted-base evaluation |
| 6.8 | Provider adapter contract | Portable identity, approval, review-request, report, and branch-protection capabilities |

Phase A (`0.7.0-alpha.1`) implements the provider-neutral Principal, Team, trust, ownership,
attestation, and trusted-base foundations plus a GitHub CI workflow generator. Provider-side
identity verification, reviewer requests, PR reporting, and branch-protection mutation remain
future work.

### Success Criteria

- [ ] Every governed result can identify the applicable Context, authority, approver, evidence, and verification time.
- [ ] Existing v0.5.0 Contexts have a documented migration path.
- [ ] Aggregate feedback contains no individual actor identity or source content.
- [ ] Protected actions reject self-asserted actor names and stale revision approvals.
- [ ] Pull requests identify affected Teams without coupling Core identity to one repository provider.
- [ ] Trust and ownership policy changes are evaluated against the trusted base revision.

Identity and ownership design:
[0018-identity-ownership-and-change-governance.md](0018-identity-ownership-and-change-governance.md).
Implementation contracts:
[../docs/lcdd-workflow-contracts.md](../docs/lcdd-workflow-contracts.md).

---

## Milestone 7: Protocol and Pack Distribution v0.8.0

**Target:** Provide a stable interoperability surface and reproducible Context Pack distribution.

**Status:** 🔴 Not Started

### Deliverables

- `lcd serve` implements the minimum Context Protocol surface with conformance tests.
- Versioned pack manifests support validation, checksums, provenance, install, update, and removal.
- Example packs become validated installable artifacts before a hosted marketplace is attempted.

---

## Milestone 8: Experimental Validation v0.9.0

**Target:** Replace methodology claims with reproducible evidence.

**Status:** 🔴 Not Started

### Deliverables

- Benchmark repository with seeded Context Debt and authority conflicts.
- Reproducible experiments for drift, conflicting instructions, scoped Context, and long-lived decay.
- Raw anonymized results, analysis scripts, limitations, and retained negative results.

---

## Milestone 9: Stable Framework v1.0.0

**Target:** Stabilize LCDD contracts after implementation, conformance, security, and external evidence.

**Status:** 🔴 Not Started

### Deliverables

- Stable terminology, schema, lifecycle, authority, governance, protocol, Bundle, and report contracts.
- Migration and compatibility policy for v0.x artifacts.
- At least one external-project case study.
- Ecosystem integrations built on stable protocol and pack contracts.

### Success Criteria

- [ ] No breaking change without a major version bump.
- [ ] Security, conformance, documentation, and experiment release gates pass.
- [ ] At least one real project outside this repository uses LCDD.

---

## How to Contribute

The roadmap is not a fixed plan — it is a living document governed by LCDD principles. To propose changes:

1. Open an issue in the repository with tag `roadmap`.
2. Propose: new milestone, reprioritization, or timeline adjustment.
3. Discuss with the community.
4. If consensus is reached, the roadmap is updated through the standard PR process.

---

## References

1. LCDD Vision (manifesto/vision.md)
2. LCDD 0004 — Governance Model (how the roadmap itself is governed)
3. ROADMAP.md (repository root — high-level summary of this document)
