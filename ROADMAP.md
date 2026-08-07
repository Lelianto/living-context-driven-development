# Roadmap

**Version:** 0.4.0  
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
- [x] Trigger Evaluator — 5 deterministic triggers with structured recommendations
- [x] Source Connector — `lcd source add/list/check/remove` (Git + Website)
- [x] `lcd source watch` — Scheduled daemon polling at configurable intervals
- [x] `lcd source schedule` — Cron + GitHub Actions schedule generation
- [x] `lcd extract` — LLM extraction: Ollama (free, default), OpenAI, Anthropic backends
- [x] `lcd normalize` — Schema mapping, Jaccard dedup, validation, draft creation
- [x] `lcd dashboard` — Terminal + Web dashboard (violation trends, actor breakdown, velocity)
- [x] `@lcdd/mcp` — MCP Server with 7 tools for AI agents (Claude, Cursor, Cline)
- [x] Enforcement event persistence (`.enforcements.log`)
- [x] Source change event persistence (`.changes.log`)
- [x] Website updated to v0.4.0 (Astro + Vercel)
- [x] 121 tests (7 test suites, all passing)
- [x] Pipeline Stages 01 & 04–09 Done, 02–03 Phase A

---

## 🔴 v0.5.0 — Ecosystem

- [ ] VS Code Extension
- [ ] GitHub App
- [ ] Database-backed Registry
- [ ] Observability Dashboard (Grafana)
- [ ] Community Context Pack Registry
- [ ] Starter Packs (OWASP, GDPR, Startup)
- [ ] LLM refinement for ambiguous classifications
- [ ] Embedding-based dedup (cosine similarity)
- [ ] Multi-connector support (RSS, Slack, PDF)

---

## 🔴 v1.0.0 — Methodology Adoption

- [ ] Stabilized specification
- [ ] Conference talks
- [ ] Published case studies
- [ ] Training materials

See [specification/0016-roadmap.md](specification/0016-roadmap.md) for the detailed roadmap.
