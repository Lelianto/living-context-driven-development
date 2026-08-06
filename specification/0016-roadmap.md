# 0016 — Roadmap

**Status:** Active  
**Version:** 0.2.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

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

**Status:** 🟡 In Progress

### Deliverables

| # | Deliverable | Description |
|---|---|---|
| 2.1 | `@lcdd/core` | TypeScript SDK: Context model, schema validation, Registry client, CQL parser |
| 2.2 | `@lcdd/cli` | CLI tool: `lcd init`, `lcd context add`, `lcd context validate`, `lcd query` |
| 2.3 | File-based Registry | Git-backed Registry using YAML files in `.lcdd/contexts/` |
| 2.4 | Static Verifiers | Built-in verifiers: regex, file-exists, eslint-rule, import-boundary |
| 2.5 | CI Action | GitHub Action: `lcdd/validate@v0.2` for CI enforcement |
| 2.6 | v0.2 Schema | Updated Context Schema based on implementation learnings |

### Success Criteria

- [ ] A developer can run `npx @lcdd/cli init` and get a working LCDD project.
- [ ] Contexts in `.lcdd/contexts/` are validated by CI on PR.
- [ ] At least 3 built-in verifier types work correctly.
- [ ] CQL queries return correct results from the file-based Registry.

---

## Milestone 3: MCP Server v0.3.0

**Target:** AI coding assistants can query contexts and validate code through MCP.

**Status:** 🔴 Not Started

### Deliverables

| # | Deliverable | Description |
|---|---|---|
| 3.1 | `@lcdd/mcp` | MCP Server exposing LCDD tools to AI agents |
| 3.2 | Context Injection | Automatic context injection into agent prompts |
| 3.3 | Agent Verification | AI agents can validate their own output against contexts |
| 3.4 | Drift Detection | Detect when AI agents modify tests/specs to match broken code |

### Success Criteria

- [ ] Claude Desktop / Cursor can query LCDD contexts via MCP.
- [ ] AI-generated code is automatically validated against Active contexts.
- [ ] Specification drift detection flags suspect AI-generated PRs.

---

## Milestone 4: Ecosystem v0.5.0

**Target:** Plugins, packs, and integrations that make LCDD useful out of the box.

**Status:** 🔴 Not Started

### Deliverables

| # | Deliverable | Description |
|---|---|---|
| 4.1 | VS Code Extension | In-editor context awareness: violation highlighting, context hover info |
| 4.2 | GitHub App | PR comments with context violations, automated context review |
| 4.3 | Database-backed Registry | PostgreSQL Registry for team/enterprise deployments |
| 4.4 | Observability Dashboard | Grafana template for LCDD metrics |
| 4.5 | Context Pack Registry | Public registry for community Context Packs |
| 4.6 | Starter Packs | Packs for: startup best practices, OWASP Top 10, OJK fintech, GDPR basics |
| 4.7 | Documentation Website | livingcontext.dev with full docs, guides, and tutorials |

### Success Criteria

- [ ] Developer can install the VS Code extension and see real-time context violations.
- [ ] GitHub App posts context violation comments on PRs.
- [ ] At least 5 community-contributed Context Packs exist.
- [ ] Documentation website is live with search and navigation.

---

## Milestone 5: Methodology Adoption v1.0.0

**Target:** LCDD is recognized as a named methodology alongside TDD, DDD, BDD, and SDD.

**Status:** 🔴 Not Started

### Deliverables

| # | Deliverable | Description |
|---|---|---|
| 5.1 | v1.0 Specification | Stabilized specification with migration guide from v0.x |
| 5.2 | Academic Paper | Peer-reviewed paper describing LCDD and its novelty |
| 5.3 | Conference Talks | Presentations at software engineering conferences |
| 5.4 | Training Materials | Workshop curriculum, certification program |
| 5.5 | Case Studies | Published case studies from real-world adoption |
| 5.6 | Book | "Living Context Driven Development" — comprehensive methodology guide |

### Success Criteria

- [ ] Specification is stable (no breaking changes without major version bump).
- [ ] At least 3 published case studies from independent teams.
- [ ] Conference talk accepted at a major software engineering conference.
- [ ] LCDD is listed alongside other named methodologies in industry surveys.

---

## Milestone 6: Ubiquity v2.0.0+

**Target:** Context Registries are as common as `package.json`. AI agents query them by default.

**Status:** 🔴 Not Started (Vision)

### Vision Items

- Context Registries are a standard part of repository scaffolding (`npx create-next-app` includes `.lcdd/`).
- Major AI coding tools (Copilot, Cursor, Claude Code) have native LCDD integrations.
- Regulatory bodies publish official Context Packs in machine-readable format.
- Cross-organization Context sharing enables industry-wide governance standardization.
- LCDD is taught in university software engineering curricula.

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
