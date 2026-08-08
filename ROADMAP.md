# Roadmap

**Version:** 0.5.0
**Last Updated:** 2026-08-08

---

## ✅ v0.1.0 — Specification Phase (Complete)

- [x] Literature Review
- [x] Problem Statement
- [x] Manifesto & First Principles
- [x] Core Specification (18 RFC-style documents)
- [x] Glossary
- [x] Companion Documentation (7 docs)
- [x] Example Context Packs (5 domains)
- [x] Reference Schema (JSON Schema, YAML/JSON examples)
- [x] Methodology Guide (lcdd-methodology.md)
- [x] Repository Scaffolding (README, LICENSE, GOVERNANCE, CONTRIBUTING, etc.)
- [x] Logo and Visual Identity
- [x] Website (livingcontext.dev — Astro + Vercel)

---

## ✅ v0.2.0 — Reference Implementation (Complete)

- [x] `@lcdd/core` TypeScript SDK — Context model, schema validation, Registry client, CQL parser, verifier
- [x] `@lcdd/cli` — `lcd init`, `lcd context add`, `lcd list`, `lcd show`, `lcd validate`, `lcd query`, `lcd transition`
- [x] File-based Context Registry (YAML in `.lcdd/contexts/`)
- [x] Built-in static verifiers (regex, file-exists, extensible)
- [x] GitHub Action for CI enforcement
- [x] Unit tests (89 tests across 5 modules)
- [x] npm publication of both packages
- [x] Lifecycle event logging (`.events.log`)
- [x] Documentation for CLI and Core SDK

---

## ✅ v0.4.0 — Pipeline Automation (Complete)

**Target:** Deterministic pipeline stages + MCP server. No API key required for default usage.

### Done
- [x] `lcd doctor` — Context Health Score (8 metrics, letter grade A–F, JSON output)
- [x] Rule Engine — Deterministic auto-classification for `lcd context add`
- [x] `lcd review` — Review workflow CLI (`list/show/approve/reject/revision/auto-approve`)
- [x] Trigger Evaluator — deterministic trigger evaluation with structured recommendations
- [x] Source Connector — `lcd source add/list/check/remove` (Git + Website)
- [x] `lcd source watch` — Scheduled daemon polling at configurable intervals
- [x] `lcd source schedule` — Cron + GitHub Actions schedule generation
- [x] `lcd extract` — LLM extraction: Ollama (free, default), OpenAI, Anthropic backends
- [x] `lcd normalize` — Schema mapping, Jaccard dedup, validation, draft creation
- [x] `lcd dashboard` — Terminal + Web dashboard (violation trends, actor breakdown, velocity)
- [x] `@lcdd/mcp` — MCP Server for AI agents (Claude, Cursor, Cline)
- [x] Enforcement event persistence (`.enforcements.log`)
- [x] Source change event persistence (`.changes.log`)
- [x] Website updated to v0.4.0 (Astro + Vercel)
- [x] 121 tests (7 test suites, all passing)
- [x] Pipeline Stages 01 & 04–09 Done, 02–03 Phase A

---

## ✅ v0.5.0 — Self-Healing Phase A (Complete)

- [x] `lcd improve check/apply/rollback`
- [x] ImproveEngine with persisted snapshots and automatic health-regression rollback
- [x] Six centralized deterministic triggers
- [x] True dismissal event model and storage
- [x] Review and heal audit events
- [x] Nine tested self-healing guardrails
- [x] Eighth MCP tool: read-only recommendations
- [x] 192 passing core tests across 11 suites

---

## 🔴 v0.6.0 — Drift & Retrieval

- [x] Resolve the P0/P1 security baseline and add CLI/MCP integration tests
- [ ] `lcd validate --changes` with a PR governance report
- [ ] Task-scoped Context Bundles and `lcdd_get_context_for_task`
- [ ] `lcd discover` for local repository sources
- [ ] `lcd drift` and `lcdd_detect_drift` for code-to-Context drift

---

## 🔴 v0.7.0–v0.9.0 — Provenance, Protocol, and Evidence

- [ ] v0.7.0: provenance, verification freshness, dismissal producer, governance reports
- [ ] v0.8.0: Context Protocol implementation and versioned pack distribution
- [ ] v0.9.0: benchmark repository and reproducible experiments

---

## 🔴 v1.0.0 — Methodology Adoption

- [ ] Stabilized specification
- [ ] Migration and compatibility policy
- [ ] At least one external-project case study
- [ ] Security, conformance, documentation, and experiment release gates
- [ ] Ecosystem integrations built on stable protocol and pack contracts

See [specification/0016-roadmap.md](specification/0016-roadmap.md) for the detailed roadmap.
