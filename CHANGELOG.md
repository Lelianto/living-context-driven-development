# Changelog

All notable changes to the Living Context Driven Development specification will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned for v0.6.0

- Security and integration-test baseline
- Change-scoped validation with `lcd validate --changes`
- Task-scoped Context Bundles
- Local repository discovery
- Code-to-Context drift detection

---

## [0.5.0] — 2026-08-08

### Self-Healing Phase A

- `lcd improve check` — structured, guardrail-gated recommendations
- `lcd improve apply <recommendation-id>` — dry-run and approved repair execution
- `lcd improve rollback <heal-id>` — persisted snapshot restoration
- `ImproveEngine` — plan, apply, health verification, and automatic rollback on regression
- Six centralized triggers, including separate violation-rate and true false-positive signals
- `DismissalEvent` storage in `.dismissals.log`
- Persisted registry snapshots covering all lifecycle states
- Heal and review decisions recorded in the lifecycle event log
- Nine tested guardrails preserving human control and Hardened Context protection
- `lcdd_get_recommendations` added as the eighth, read-only MCP tool

### Tests

- Expanded `@lcdd/core` to 192 passing tests across 11 suites
- Added coverage for ImproveEngine, review auditing, persisted snapshots, trigger unification,
  dismissal events, and rollback behavior

---

## [0.4.0] — 2026-08-07

### Pipeline Stages 01–03

#### Stage 01: Observe (Scheduled Monitoring)
- `lcd source watch`: long-running daemon polling sources at configurable intervals
- `lcd source schedule --cron`: generate cron schedule line
- `lcd source schedule --github`: generate GitHub Actions workflow YAML
- Source change events persisted to `.lcdd/sources/.changes.log` (NDJSON)

#### Stage 02: Extract (LLM Extraction)
- `lcd extract <source-id>`: extract constraint candidates from registered sources
- **OllamaProvider** (default, free, no API key) — uses Ollama HTTP API
- **OpenAIProvider** (requires `OPENAI_API_KEY`) — GPT-4o-mini
- **AnthropicProvider** (requires `ANTHROPIC_API_KEY`) — Claude Haiku
- `--dry-run`: output candidates to stdout without writing registry
- `--auto`: extract + normalize + write drafts in one step
- `--output <dir>`: write candidate YAML files
- Optional peer dependencies: `openai`, `@anthropic-ai/sdk`

#### Stage 03: Normalize (Schema Mapping + Dedup)
- `lcd normalize`: deterministic normalization of candidate contexts
- Schema mapping with UUID ID generation and RuleEngine defaults
- JSON Schema validation with error reporting
- SHA-256 exact-match deduplication
- Jaccard similarity for near-duplicate detection (threshold 0.8)
- Confidence filtering (skip candidates < 0.5)
- Auto-writes valid contexts as draft to registry

### Full Pipeline
- `lcd extract <id> --auto`: Extract → Normalize → Write drafts in one command
- Pipeline Status: 7 stages Done, 2 stages Phase A (02-03)

### Website
- `website/`: Astro + Vercel landing page updated to v0.4.0
- Pipeline stage cards reflect actual implementation status
- Added MCP card to ecosystem section

### Tests
- `normalizer.test.ts`: 22 tests (schema mapping, dedup, Jaccard, JSON parsing)
- `source-connector.test.ts`: 10 tests (change events, source management, schedule generation)
- Total: 121 tests (all passing)

---

## [0.3.0] — 2026-08-07

### Added
- `lcd doctor` — Context Health Score with 8 metrics: stale contexts, missing owners, conflicts, deprecation backlog, draft stagnation, authority gaps, tag hygiene, review backlog. Output letter grade (A–F) and actionable recommendations. Supports `--json` and `--triggers` flags. (~200 LOC)
- **Rule Engine** — Deterministic auto-classification for `lcd context add`: source type → authority level, keyword analysis → severity, domain detection → tags. User can override all suggestions. No LLM required. (~150 LOC)
- `lcd review` — Review workflow CLI: `lcd review list` (pending reviews), `lcd review show <id>` (side-by-side source vs context), `lcd review approve/reject/revision <id>`. Auto-approval for Local contexts with high confidence. (~200 LOC)
- **Trigger Evaluator** — Five deterministic triggers on top of doctor data: STALE_NO_VIOLATION, HIGH_FALSE_POSITIVE, INCREASING_VIOLATIONS, AI_DRIFT, NEW_SOURCE_DETECTED. (~150 LOC)
- **Source Connector** — `lcd source add/list/check/remove` — Git (clone+fetch+diff) + Website (HTTP GET+SHA-256). No API key required. (~200 LOC)
- `lcd dashboard` — Terminal + Web observability: violation trends (7d/30d/90d), actor breakdown (human vs AI), top violated contexts, enforcement mode distribution, lifecycle velocity. `--web` flag starts Chart.js dashboard at localhost:9321. (~350 LOC)
- `@lcdd/mcp` — MCP Server with 7 tools: list_contexts, get_context, query_contexts, validate_artifact, get_health, get_dashboard, list_reviews. stdio transport. Integrates with Claude Desktop, Cursor, Cline. (~150 LOC)
- Enforcement event persistence — events written to `.lcdd/contexts/.enforcements.log`

### Changed
- `lcd context add` now auto-suggests authority level, governance classification, severity, and tags based on deterministic rules
- Pipeline stages 04–09 (Classify through Improve) fully implemented as deterministic

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
