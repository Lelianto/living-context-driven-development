# Roadmap

**Version:** 0.2.0  
**Last Updated:** 2026-08-06

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

## 🟡 v0.2.0 — Reference Implementation (In Progress)

- [x] `@lcdd/core` TypeScript SDK — Context model, schema validation, Registry client, CQL parser, verifier
- [x] `@lcdd/cli` — `lcd init`, `lcd context add`, `lcd list`, `lcd show`, `lcd validate`, `lcd query`, `lcd transition`
- [x] File-based Context Registry (YAML in `.lcdd/contexts/`)
- [x] Built-in static verifiers (regex, file-exists, extensible)
- [x] GitHub Action for CI enforcement
- [ ] npm publication
- [ ] Unit tests
- [ ] Documentation for CLI usage

---

## 🔴 v0.3.0 — AI Agent Integration

- [ ] `@lcdd/mcp` — MCP Server
- [ ] Context injection into AI agent prompts
- [ ] Agent verification pipeline
- [ ] Specification drift detection

---

## 🔴 v0.5.0 — Ecosystem

- [ ] VS Code Extension
- [ ] GitHub App
- [ ] Database-backed Registry
- [ ] Observability Dashboard (Grafana)
- [ ] Community Context Pack Registry
- [ ] Starter Packs (OWASP, OJK Fintech, GDPR, Startup)

---

## 🔴 v1.0.0 — Methodology Adoption

- [ ] Stabilized specification
- [ ] Conference talks
- [ ] Published case studies
- [ ] Training materials

See [specification/0016-roadmap.md](specification/0016-roadmap.md) for the detailed roadmap.
