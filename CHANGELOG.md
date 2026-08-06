# Changelog

All notable changes to the Living Context Driven Development specification will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] — Unreleased

### Added
- `lcd doctor` — Context Health Score with 8 metrics: stale contexts, missing owners, conflicts, deprecation backlog, draft stagnation, authority gaps, tag hygiene, review backlog. Output letter grade (A–F) and actionable recommendations. Supports `--json` and `--triggers` flags. (~200 LOC)
- **Rule Engine** — Deterministic auto-classification for `lcd context add`: source type → authority level, keyword analysis → severity, domain detection → tags. User can override all suggestions. No LLM required. (~150 LOC)
- `lcd review` — Review workflow CLI: `lcd review list` (pending reviews), `lcd review show <id>` (side-by-side source vs context), `lcd review approve/reject/revision <id>`. Auto-approval for Local contexts with high confidence. (~200 LOC)
- **Trigger Evaluator** — Five deterministic triggers on top of doctor data: STALE_NO_VIOLATION, HIGH_FALSE_POSITIVE, INCREASING_VIOLATIONS, AI_DRIFT, NEW_SOURCE_DETECTED. Output structured recommendations with severity and suggested CLI commands. (~150 LOC)
- **Source Connector** — `lcd source add <url>`, `lcd source list`, `lcd source check [id]`, `lcd source remove <id>`. Git connector (clone + fetch + diff) and Website connector (HTTP GET + SHA-256 checksum). No API key required. (~200 LOC)
- Enforcement event persistence — events written to `.lcdd/contexts/.enforcements.log`

### Changed
- `lcd context add` now auto-suggests authority level, governance classification, severity, and tags based on deterministic rules
- Pipeline stages 01 (Discover), 04 (Classify), 05 (Review), 09 (Improve) now have deterministic Phase A implementations

---

## [0.2.1] — 2026-08-06

### Added
- Unit tests for `@lcdd/core` — 89 tests across 5 modules (lifecycle, schema, registry, CQL, verifier)
- `.npmignore` — exclude test files from published package

### Fixed
- AJV format warnings (`date-time`, `date`, `uri`) — added inline format validators
- Glob matching: `**/*` now correctly matches root-level files
- Inline regex flags (`(?i)`) support in pattern verifier
- Context lookup by ID in subdirectories (hardened/local/experimental)
- Lifecycle transition auto-sets `review_status` on candidate/approved

### Changed
- Updated `@lcdd/core` to v0.2.1, `@lcdd/cli` to v0.2.1

## [0.2.0] — 2026-08-06

### Added
- `@lcdd/core` — TypeScript SDK: Context model, schema validation, Registry client, CQL parser, verifier
- `@lcdd/cli` — CLI tool: `lcd init`, `lcd context add`, `lcd list`, `lcd show`, `lcd validate`, `lcd query`, `lcd transition`
- File-based Context Registry (YAML storage in `.lcdd/`)
- Built-in static verifiers (regex, file-exists, extensible plugin system)
- GitHub Action for CI enforcement
- npm publication of both packages
- README files for both npm packages

### Added

#### Manifesto
- `manifesto/manifesto.md` — The Four Values and Twelve Principles of LCDD.
- `manifesto/first-principles.md` — The five axioms that form the foundation of LCDD.
- `manifesto/vision.md` — Long-term vision and five-phase roadmap.

#### Specification (17 documents)
- `0000-problem.md` — Problem Statement: the seven sub-problems LCDD addresses.
- `0001-core-principles.md` — Ten core principles with normative requirements.
- `0002-context-lifecycle.md` — Six-stage lifecycle model with transition rules.
- `0003-authority-model.md` — Authority spectrum, delegation, challenge, and trust model.
- `0004-governance.md` — Hardened/Local governance, change processes, AI agent governance.
- `0005-context-registry.md` — Registry data model, API specification, performance targets.
- `0006-context-builder.md` — Nine-stage Context Engineering Pipeline (Discover → Improve).
- `0007-context-engineering.md` — Patterns, anti-patterns, and engineering principles.
- `0008-verification.md` — Verification types, model, verifier specifications.
- `0009-observability.md` — Metrics, dashboards, alerts, data retention.
- `0010-ai-agents.md` — Agent types, context injection, specification drift prevention.
- `0011-context-query-language.md` — CQL syntax, operators, and API integration.
- `0012-context-schema.md` — JSON Schema for Context artifacts.
- `0013-context-protocol.md` — JSON-RPC protocol for LCDD component communication.
- `0014-security.md` — Threat model, access control, data protection.
- `0015-reference-architecture.md` — System design with three deployment topologies.
- `0016-roadmap.md` — Six-milestone development roadmap.

#### Documentation
- `docs/research.md` — Literature review: GrayBeam CDD, AI Harness, and related work.
- `docs/glossary.md` — Canonical vocabulary for all LCDD terms.
- `docs/introduction.md` — Gentle introduction to LCDD.
- `docs/philosophy.md` — Philosophical foundations and commitments.
- `docs/comparison.md` — Comparison with TDD, DDD, BDD, SDD, GrayBeam CDD, AI Harness, Policy-as-Code.
- `docs/adoption.md` — Six-level adoption guide with per-organization guidance.
- `docs/faq.md` — Frequently asked questions.

#### Reference
- `reference/schema/context-schema.json` — Machine-readable JSON Schema.
- `reference/yaml/example-context.yaml` — Complete example Context.
- `reference/json/example-context.json` — Complete example Context in JSON.
- `reference/architecture/diagrams.md` — System context, lifecycle, enforcement, and data model diagrams.

#### Examples
- `examples/startup/` — Startup best practices Context Pack (5 contexts).
- `examples/fintech/` — OJK fintech compliance Context Pack (5 contexts).
- `examples/healthcare/` — HIPAA compliance Context Pack (4 contexts).
- `examples/ecommerce/` — E-commerce best practices Context Pack (5 contexts).
- `examples/education/` — Hackathon competition rubric Context Pack (5 contexts).

#### Repository
- `README.md` — Project overview, quick start, status, comparison table.
- `LICENSE` — Apache License 2.0.
- `GOVERNANCE.md` — Project governance and RFC process.
- `ROADMAP.md` — High-level roadmap summary.
- `CONTRIBUTING.md` — Contribution guide and RFC template.
- `CODE_OF_CONDUCT.md` — Contributor Covenant.
- `SECURITY.md` — Security policy and vulnerability reporting.
- `CHANGELOG.md` — This file.

---

## [Unreleased]

### Planned for v0.3.0
- MCP Server for AI agent integration
- Context injection into AI agent prompts
- Specification drift detection

### Planned for v0.5.0
- LLM-based extraction (Stage 02) — requires API key
- LLM refinement for ambiguous classifications
- Scheduled source monitoring
- Database-backed Registry
- Observability Dashboard
