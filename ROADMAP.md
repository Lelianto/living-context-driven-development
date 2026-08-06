# Roadmap

**Version:** 0.3.0  
**Last Updated:** 2026-08-07

---

## ✅ v0.1.0 — Specification Phase (Complete)

- [x] Literature Review
- [x] Problem Statement
- [x] Manifesto & First Principles
- [x] Core Specification (17 documents)
- [x] Glossary
- [x] Companion Documentation (7 docs)
- [x] Example Context Packs (5 domains)
- [x] Reference Schema (JSON Schema, YAML/JSON examples)
- [x] Methodology Guide (lcdd-methodology.md)
- [x] Repository Scaffolding (README, LICENSE, GOVERNANCE, CONTRIBUTING, etc.)
- [x] Logo and Visual Identity
- [ ] Website (livingcontext.dev)

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

## 🟡 v0.3.0 — Pipeline Automation (In Progress)

**Target:** Deterministic pipeline stages — no API key, no LLM, no new infrastructure.

### Done
- [x] `lcd doctor` — Context Health Score (8 metrics, letter grade A–F, JSON output)
- [x] Rule Engine — Deterministic auto-classification for `lcd context add`
- [x] `lcd review` — Review workflow CLI (`list/show/approve/reject/revision/auto-approve`)
- [x] Trigger Evaluator — 5 deterministic triggers with structured recommendations
- [x] Source Connector — `lcd source add/list/check/remove` (Git + Website)
- [x] Enforcement event persistence (`.enforcements.log`)
- [x] `lcd dashboard` — Terminal + Web dashboard (violation trends, actor breakdown, velocity)
- [x] Stages 04–09 (Classify through Improve) fully implemented as deterministic

### Planned
- [ ] MCP Server (`@lcdd/mcp`)
- [ ] Context injection into AI agent prompts
- [ ] Specification drift detection

---

## 🔴 v0.5.0 — Ecosystem

- [ ] VS Code Extension
- [ ] GitHub App
- [ ] Database-backed Registry
- [ ] Observability Dashboard (Grafana)
- [ ] Community Context Pack Registry
- [ ] Starter Packs (OWASP, GDPR, Startup)
- [ ] LLM-based extraction (Stage 02) — requires API key

---

## 🔴 v1.0.0 — Methodology Adoption

- [ ] Stabilized specification
- [ ] Conference talks
- [ ] Published case studies
- [ ] Training materials

See [specification/0016-roadmap.md](specification/0016-roadmap.md) for the detailed roadmap.
