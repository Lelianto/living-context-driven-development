# Research v3: Roadmap Analysis vs Implementation (v0.5.0) & a Consolidated Roadmap

| Field | Value |
| --- | --- |
| Status | Research (tracking) |
| Version | 1.0.0 |
| Last Updated | 2026-08-08 |
| Language | en-US |
| Quadrant | explanation |
| Basis | The latest LCDD roadmap (16 phases + 10 release milestones) evaluated against the repository at **v0.5.0** (self-healing loop) |

---

## Abstract

This document maps the latest LCDD roadmap — 16 phases (Phase 0–16) and release milestones v0.1–v1.0 — against the
actual implementation in the repository (`@lcdd/core`, `@lcdd/cli`, `@lcdd/mcp` at version 0.5.0). Its goals are:
(1) separate what is **already implemented** (ignored, no rework needed), (2) identify what is **not** implemented and
therefore the real priority, and (3) produce a **consolidated new roadmap** together with additional aligned and
powerful ideas. Key finding: most of Phases 0–1, 4, 9, 11 are complete; the most strategic untouched phase is
**Drift Detection (Phase 6)** — also the missing link in the closed loop. The repository is also carrying
**Context Debt in its own roadmap documents** (CHANGELOG/ROADMAP/0016 do not yet reflect v0.5.0).

---

## 1. Executive Summary

| Phase | Status | Core |
| --- | --- | --- |
| Phase 0 — Foundation | ✅ Done | 17 specification documents, manifesto, schema, glossary |
| Phase 1 — Minimal CLI | ✅ Done | `lcd init`, `context add/list/show`, `validate`, `doctor` |
| Phase 2 — Context Discovery | 🟡 Partial | External sources (git/website) + extract exist; **local repo scanner & SaaS integrations missing** |
| Phase 3 — Context Retrieval | 🟡 Partial | CQL exists; **task-scoped Context Bundle missing** |
| Phase 4 — AI Agent Integration | ✅ Done | MCP server, 8 tools, model-agnostic |
| Phase 5 — Context Verification | 🟡 Partial | `lcd validate` exists; **`validate --changes` (git-aware) missing** |
| Phase 6 — Context Drift Detection | ❌ Not started | Only `AI_DRIFT` (actor-based); **code↔context drift missing** |
| Phase 7 — Context Observability | 🟡 Partial | `lcd doctor` 8 metrics + dashboard + 6 triggers; coverage/usage/drift-rate metrics missing |
| Phase 8 — Evidence & Provenance | 🟡 Partial | `evidence[]` exists; **`provenance` block & `verified_at` missing** |
| Phase 9 — Governance & Enforcement | ✅ Done | `enforcement.mode` block/warn/comment/silent + event log |
| Phase 10 — CI/CD Integration | 🟡 Partial | `validate --strict` + `improve check` workflow exists; **PR governance report missing** |
| Phase 11 — Context Change Proposals | ✅ Done | `lcd review` + `lcd improve` + MCP read-only recommendations |
| Phase 12 — Closed-Loop Context | 🟡 Almost | Loop complete except **Detect Drift** (Phase 6) |
| Phase 13 — Context Protocol | 🟡 Partial | Spec 0013 (JSON-RPC) exists; **`lcd serve`/conformance implementation missing** |
| Phase 14 — Ecosystem | ❌ Not started | VS Code, GitHub App, DB registry, Grafana, pack registry missing |
| Phase 15 — Enterprise Governance | 🟡 Partial | Authority model + 6 example packs exist; org→team→repo hierarchy & pack install missing |
| Phase 16 — Experimental Validation | ❌ Not started | No benchmark repository / experiment harness |

**Quick conclusion:** 5 phases are complete, 8 are partial (most need only one or two deliverables), 4 have not
started (6, 14, 16, plus parts of 2/3/13). The real remaining work is **not** re-doing existing phases, but closing
the gaps in **Drift → Retrieval → Protocol → Validation**.

---

## 2. Implementation Baseline (v0.5.0) — What Already Exists

### 2.1 Packages & versions

| Package | Version | Contents |
| --- | --- | --- |
| `@lcdd/core` | 0.5.0 | FileRegistry, LifecycleManager, schema validator, ContextVerifier, CQL parser, ContextDoctor, RuleEngine, TriggerEvaluator (6 triggers), ImproveEngine, ReviewManager, SourceConnector, DashboardService, ContextNormalizer, Extractor |
| `@lcdd/cli` | 0.5.0 | 14 top-level commands: `init`, `context add`, `list`, `show`, `validate`, `query`, `transition`, `doctor`, `improve` (check/apply/rollback), `review` (list/show/approve/reject/revision/auto-approve), `source` (add/list/check/remove/watch/schedule), `extract`, `normalize`, `dashboard` |
| `@lcdd/mcp` | 0.5.0 | 8 tools: `lcdd_list_contexts`, `lcdd_get_context`, `lcdd_query_contexts`, `lcdd_validate_artifact`, `lcdd_get_health`, `lcdd_get_dashboard`, `lcdd_list_reviews`, `lcdd_get_recommendations` (read-only) |

### 2.2 Key v0.5.0 features

- **9-stage pipeline:** 01 Observe (`source watch` + `.changes.log`) → 02 Extract (LLM; free Ollama by default)
  → 03 Normalize (schema mapping, Jaccard dedup → draft) → 04 Classify (deterministic RuleEngine)
  → 05 Review (`lcd review` + auto-approve) → 06 Enforce (verifier + `.enforcements.log`)
  → 07 Diagnose (`doctor` 8 metrics + 6 triggers, `TRIGGER_THRESHOLDS` as the single source of truth)
  → 08 Dashboard (terminal + web, port 9321) → 09 Improve (`ImproveEngine` Phase A).
- **Self-healing loop (Phase A):** `lcd improve check/apply/rollback`; 9 guardrails (hardened never modified
  automatically, confidence < 0.7 → human, warn→block staged rollout, snapshot before mutation, auto-rollback on
  health regression, audit trail, etc.); executable actions: `deprecate`, `refine-scope` (+ `register-source`,
  delegated to `lcd source add`).
- **CI:** `implementation/.github/workflows/validate.yml` — build, 121+ tests, `lcd validate --strict`,
  `lcd improve check --json` on every PR/push.
- **Examples:** 5 Context Packs (`examples/`: startup, fintech, healthcare, ecommerce, education).
- **Schema:** `enforcement.mode` [block, warn, comment, silent], `evidence[]`, `source`
  (type/uri/document_id/location/extraction_method/confidence), `authority` (level 0–4, delegation, trust_model,
  challenge_policy). **No `provenance` field yet.**

### 2.3 Version note (important for reconciliation)

The packages are at `0.5.0`, and `git log` shows the release `v0.5.0: self-healing loop, unified triggers, English
docs`. However, `CHANGELOG.md` still stops at the `[0.4.0]` section, `ROADMAP.md` still reads "Version: 0.4.0" and
lists v0.5.0 as "Ecosystem" (VS Code, GitHub App, etc.), and `specification/0016-roadmap.md` still marks the MCP
milestone as "Not Started". Details in
[Section 10](#10-side-finding-context-debt-in-the-repository-itself).

---

## 3. Detailed Mapping: 16 Phases vs Implementation

### Phase 0 — Foundation ✅ Done

At this assessment baseline, philosophy, Context Debt definition, the 6-stage lifecycle, Authority model, and Context
Schema were represented by `specification/0000–0017`, `manifesto/`, `reference/schema/context-schema.json`, and
`docs/glossary.md`. The later draft RFC 0018 extends that baseline with identity and ownership governance.

### Phase 1 — Minimal Reference Implementation ✅ Done

All planned commands exist: `lcd init`, `lcd context add`, `lcd list`, `lcd show`, `lcd validate`, `lcd doctor`. The
only difference is naming: the roadmap writes `lcd context list/show`, the implementation uses `lcd list/show`. The
implementation's `lcd context add` is interactive (no path argument) and auto-fills `authority.source.id` — stricter
behavior than the roadmap. No remaining work.

### Phase 2 — Context Discovery 🟡 Partial (real gap)

| Roadmap item | Status |
| --- | --- |
| Discovery from external sources (Git, website) + scanner → candidate pipeline | 🟡 Partial: `lcd source add/check/watch` (git + website) + `lcd extract` (LLM) + `lcd normalize` |
| **Local repo scanner**: README, `docs/**`, ADR, `AGENTS.md`, `CLAUDE.md`, `.cursor/**`, `.github/**`, `package.json`, `tsconfig.json`, `eslint.config.*`, env config | ❌ Not implemented |
| Discovered contexts enter **Candidate** status | 🟡 Differs: extraction results enter **draft** (not candidate); `lcd review` can bring them to approved |
| SaaS integrations: Jira, Linear, GitHub Issues/PRs, Confluence, Notion, Slack, CI config | ❌ Not implemented |

**Note:** The principle "discovered context SHOULD NOT automatically become authoritative" is preserved (contexts
enter draft/candidate and require review). What is missing is the **LLM-free local source** — this repository itself
(README/AGENTS/spec) is the most relevant context source and cannot yet be scanned.

### Phase 3 — Context Retrieval 🟡 Partial

CQL (`lcd query`, MCP `lcdd_query_contexts`), lifecycle/category/tags filters, and scope matching (`applies_to` globs
in the verifier) exist. Missing: **task-scoped Context Bundle** — a task description as input, a bundle of relevant
contexts with authority resolution and deprecated filtering as output, as in the roadmap's
`{"task": ..., "contexts": [...]}` example. This is also the only unbuilt part of the v0.3 milestone's "scoped
retrieval".

### Phase 4 — AI Agent Integration ✅ Done (model-agnostic)

The MCP server shipped in v0.3.x (ahead of plan) and now has 8 tools. Mapping against the roadmap's proposed tool
list:

| Roadmap tool | Implementation counterpart |
| --- | --- |
| `get_project_context` | `lcdd_list_contexts` + `lcdd_get_health` |
| `get_context_for_scope` | `lcdd_query_contexts` (CQL) |
| `get_context_for_task` | ❌ Missing (tied to Phase 3 bundle) |
| `get_context_authority` | `lcdd_get_context` (returns full authority) |
| `validate_change` | `lcdd_validate_artifact` |
| `report_context_conflict` | ❌ Missing (needs interactive conflict/challenge detector) |
| `propose_context_update` | `lcdd_get_recommendations` (read-only) + `lcd review` flow |

### Phase 5 — Context Verification 🟡 Partial

`lcd validate <path>` + static verifiers (regex, file-exists) + `lcdd_validate_artifact` exist and produce violations
with severity. Missing: **`lcd validate --changes`** — git-diff-based verification that (a) computes changed files vs
`HEAD`/merge-base, (b) matches them to contexts via `applies_to`, (c) verifies only impacted contexts, (d) emits a
"7 files checked, 1 violation" style report. This is also the foundation for the PR governance report (Phase 10).

### Phase 6 — Context Drift Detection ❌ Not started (highest priority)

This is the biggest gap. What exists today is only `AI_DRIFT` (the ratio of AI-agent violations to human violations
from enforcement logs) and a drift warning in the dashboard — that is **agent behavioral drift**, not
**code↔context drift**. The roadmap's example (context "Authentication uses Firebase" vs code "Supabase Auth
detected") cannot be detected at all. Deliverable 3.4 in `0016-roadmap.md` ("Detect when AI agents modify tests/specs
to match broken code") is also still empty. Without this, the closed loop (Phase 12) never closes.

### Phase 7 — Context Observability 🟡 Partial

`lcd doctor` (8 metrics, grade A–F, `--json`, `--triggers`), the terminal/web dashboard, and 6 deterministic
triggers already exceed the roadmap's "LCDD PROJECT HEALTH" example. Not yet measured: **Context Coverage %** (what
share of project artifacts is governed), **Context Drift Rate**, **Agent Context Usage** (how much context agents
actually consume), and **Context Correction Rate**.

### Phase 8 — Evidence & Provenance 🟡 Partial

The schema already has `evidence[]` (type/uri/description) and `source` (with `document_id`, `location`,
`extraction_method`, `confidence`). Missing: a first-class **`provenance`** block like the roadmap example (author
github, approved_by, commit sha, `created_at`, `verified_at`), especially **`verified_at`** — there is no way to mark
"when was this context last verified". This matters once AI generates or modifies contexts.

### Phase 9 — Governance & Enforcement ✅ Done

`enforcement.mode` = [block, warn, comment, silent] — the direct counterpart of the roadmap's
informational/recommended/required/blocking levels (nuance: "silent" = recorded only). Enforcement events are
persisted to `.enforcements.log` and consumed by the dashboard and triggers. Hardened/local classification is
enforced in the RuleEngine and ImproveEngine guardrails. No remaining work except cosmetic naming.

### Phase 10 — CI/CD Integration 🟡 Partial

The GitHub Actions workflow (`implementation/.github/workflows/validate.yml`) already runs `lcd validate --strict` +
`lcd improve check --json` on PR/push — satisfying the core of "npx lcd validate --ci". Missing: the PR-format
governance report ("Changed Files / Relevant Context / Merge Status: BLOCKED") and PR comment posting — that is
**GitHub App** territory (phase 14).

### Phase 11 — Context Change Proposals ✅ Done

The full flow exists and is more mature than the roadmap: `lcd review` (list/show/approve/reject/revision/
auto-approve), `lcd improve` (executable recommendations with guardrails), MCP `lcdd_get_recommendations`
(read-only; healing remains a human action). Commands named `lcd context propose` and a `propose_context_update` tool
do not exist verbatim, but their function is covered (candidate → review → approved). No remaining work.

### Phase 12 — Closed-Loop Context 🟡 Almost complete

Loop Observe → Understand → Retrieve → Implement → Verify → **Detect Drift (❌)** → Propose → Review → Update →
Observe: every link exists in v0.5.0 except **Detect Drift**. Self-healing v0.5.0 closes the Observe→Improve side;
the only way to close the full loop is to implement Phase 6.

### Phase 13 — Context Protocol 🟡 Partial

`specification/0013-context-protocol.md` (JSON-RPC) exists as a normative document. Missing: the protocol
implementation (e.g. an `lcd serve` server exposing registry + CQL + validate over HTTP/JSON-RPC), conformance
tests, and third-party consumer SDKs. Without an implementation, Phase 14 (ecosystem) has no standard integration
surface beyond MCP.

### Phase 14 — Ecosystem ❌ Not started

VS Code extension, GitHub App, database-backed registry (PostgreSQL), Grafana dashboard, Context Pack Registry,
starter packs, multi-connector (RSS/Slack/PDF), embedding-based dedup, and LLM refinement — all listed as plans in
the old ROADMAP v0.5.0 and none implemented. This is the largest work cluster and the least urgent for the core
methodology.

### Phase 15 — Enterprise Governance 🟡 Partial

Foundations exist: authority model (levels 0–4 + delegation), governance classification, and 5 domain example Context
Packs (startup/fintech/healthcare/ecommerce/education). Missing: organization hierarchy (Organization → Team →
Repository → Feature) with policy propagation, **packs as versioned installable artifacts**
(`lcd pack install <name>`), and auditability reports ("which context governed this AI change, who approved it").

### Phase 16 — Experimental Validation ❌ Not started

No benchmark repository, no experiment harness (A–E), no measured metrics. This contrasts with the repository's own
principle (**Evidence Over Claims**) and the roadmap's "Success Metrics" section, which honestly states "numbers are
examples only". This phase should run **in parallel** from now on, not wait for v0.9.

---

## 4. Release Milestone Mapping (v0.1–v1.0) vs Implementation

| Roadmap milestone | Focus | Repo status | Notes |
| --- | --- | --- | --- |
| v0.1 — Specification | Philosophy, model, lifecycle, authority, schema | ✅ Done (v0.1.0) | 17 normative documents |
| v0.2 — Local Context | `lcd init`, registry, schema, local validation | ✅ Done (v0.2.0) | core + cli + 89 tests |
| v0.3 — Agent Context | Scoped retrieval, bundles, MCP | 🟡 Partial | MCP ✅ (shipped early); **scoped retrieval/bundle ❌** |
| v0.4 — Context Health | `lcd doctor`, conflicts, staleness, metrics | ✅ Done (v0.4.0) | 8 metrics, grade, dashboard |
| v0.5 — Drift | Drift detection, code/context comparison | ❌ **Not done** | The repo used "v0.5.0" for **self-healing**, not drift |
| v0.6 — Governance | Enforcement levels, CI, governance reports | 🟡 Partial | Enforcement + CI ✅; **PR report ❌** |
| v0.7 — Living Context | Change proposals, evidence, provenance, feedback | 🟡 Partial | Proposals/review/improve ✅; **provenance & verified_at ❌** |
| v0.8 — Protocol | LCDD Context Protocol, interoperability | ❌ Not done | Spec 0013 exists, no implementation |
| v0.9 — Validation | Benchmark, reproducible experiments | ❌ Not done | — |
| v1.0 — Stable Framework | Stable terminology/schema/lifecycle | ❌ Not done | Requires ≥ v0.9 + real adoption |

### 4.1 Version-number reconciliation (important)

The new roadmap uses a **goal-based** numbering (v0.5=drift, v0.6=governance, v0.7=living). The repo has already
**consumed** the v0.5.0 number for self-healing (which is actually part of "Living Context"/v0.7 in the roadmap's
scheme). Proposal: continue numbering from the repo's current position and **shift the contents** — drift becomes
**v0.6.0**, the governance report becomes part of v0.7.0, and so on (see Section 6). Version numbers are not a
promise; what matters is the order of work and its dependencies.

---

## 5. Priority Gaps (Not Yet Implemented, Ranked)

| # | Gap | Phase | Impact if not done |
| --- | --- | --- | --- |
| 1 | **Code↔context drift detection** | 6 | Closed loop (12) never closes; context keeps decaying without alarms |
| 2 | **Local repo scanner** (`lcd discover`) | 2 | The most relevant context sources (README/AGENTS/ADR) stay manual |
| 3 | **Task-scoped Context Bundle** | 3 | Context Minimalism unfulfilled; agents still get raw context |
| 4 | **`lcd validate --changes`** (git-aware) | 5, 10 | Verification is not change-focused; PR report impossible |
| 5 | **Provenance & `verified_at`** | 8 | Cannot answer "when was this last verified" |
| 6 | **Protocol implementation (`lcd serve`)** | 13 | Third-party ecosystem (14) has no standard surface |
| 7 | **Experiment harness/benchmark** | 16 | No reproducible evidence (violates Evidence Over Claims) |
| 8 | **Usage telemetry (anonymous, aggregated)** | 7 | Do not know which contexts agents actually consume |
| 9 | **`DismissalEvent` producer** | 7 | `HIGH_FALSE_POSITIVE` trigger stays dormant (the #1 rule-quality signal is uncounted) |
| 10 | **Pack install & enterprise hierarchy** | 15 | Packs are static examples; no versioned distribution |
| 11 | **Ecosystem** (VS Code, GitHub App, DB, Grafana, multi-connector) | 14 | Mass adoption slows, but core methodology is not blocked |

---

## 6. New Roadmap (Consolidated)

This order merges the new roadmap structure with the repo's actual position. Each version has measurable success
criteria.

### v0.6.0 — Drift & Retrieval (next step)

**Goal:** close the closed loop and fulfill Context Minimalism.

- `lcd drift` — code↔context drift engine: deterministic probes (dependencies, imports, env) + optional LLM semantic
  scoring; `DriftReport` output with confidence; new `DRIFT_DETECTED` trigger feeding ImproveEngine; MCP tool
  `lcdd_detect_drift`. **Mandatory guardrail:** drift only proposes changes, never writes context automatically.
- `lcd discover` — local repo scanner (README, `docs/**`, ADR, `AGENTS.md`, `CLAUDE.md`, `.cursor/**`, `.github/**`,
  `package.json`, `tsconfig.json`, `eslint.config.*`) → Candidate (not draft) with RuleEngine classification,
  entering the `lcd review` flow.
- `lcd context bundle "<task>"` — task-scoped context bundle (JSON: `{task, contexts[]}`) with authority resolution +
  deprecated filtering; MCP `lcdd_get_context_for_task`.
- `lcd validate --changes` — git-diff-based verification + impacted-change report.

**Success criteria:** Firebase→Supabase drift detected; `lcd discover` scans this repository itself and produces
candidates; bundle is 5× smaller than the full registry; `validate --changes` reports only impacted contexts.

### v0.7.0 — Governance Reports & Provenance

**Goal:** prove governance (Phase 10) and context origins (Phase 8).

- First-class `provenance` field in the schema (author, approved_by, commit, created_at, verified_at) +
  `lcd context verify` to stamp `verified_at`.
- PR governance report (summary "Changed Files / Relevant Context / BLOCKED") via `--ci` in the CLI — foundation for
  the GitHub App.
- Anonymous aggregated usage telemetry → `Agent Context Usage` metric in `doctor`/dashboard (psychological-safety
  guardrail).
- Interactive `DismissalEvent` producer (e.g. `lcd validate --dismiss` with a required reason) → activates the
  `HIGH_FALSE_POSITIVE` trigger.

**Success criteria:** every context can answer "when verified, by whom"; the PR report blocks merges on `block`
violations; the usage metric appears in the dashboard.

### v0.8.0 — Protocol & Distribution

**Goal:** interoperability (Phase 13) and packs as artifacts (Phase 15).

- `lcd serve` — implementation of spec 0013 (JSON-RPC over HTTP) + conformance tests; registry/CQL/validate reachable
  by third-party tools.
- `lcd pack install <name>[@version]` — versioned packs with schema validation + provenance stamp; `examples/`
  versioned.
- Further connectors: RSS, Slack, PDF (from the old v0.5.0 ecosystem list).

**Success criteria:** a simple third-party tool (a 50-line script) can read the registry over the protocol;
`lcd pack install fintech` works offline.

### v0.9.0 — Validation (Experiments)

**Goal:** reproducible evidence (Phase 16) — aligned with the Evidence Over Claims principle.

- Benchmark repository with injected Context Debt (stale docs, conflicts, deprecated architecture).
- Experiment harness A–E (stale docs, conflicting instructions, deprecated architecture, large context, long-lived
  project) comparing agents with/without LCDD: task success, violations, corrections, tokens.
- Results published in `docs/research-v4.md` — only claims supported by experiments.

**Success criteria:** at least 2 experiments complete with measured metrics and documented reproduction steps.

### v1.0.0 — Stabilization & Ecosystem

**Goal:** v1.0 = stability, not feature completeness (exactly the roadmap's definition).

- Stabilize terminology, schema, lifecycle, authority, governance; migration guide from v0.x.
- Ecosystem: VS Code extension, GitHub App, database-backed registry, Grafana template, Community Pack Registry
  (building on `lcd pack`).
- Enterprise: Organization → Team → Repository → Feature hierarchy with policy propagation + auditability reports.
- Publication: real case study (the "Specification → Implementation → Real Project → Experiment → Evidence →
  Feedback" loop).

**Success criteria:** no breaking change without a major bump; ≥ 1 real project (outside this repo) using LCDD;
reproducible experiments available.

### Immediate priority (now)

Follow the roadmap's own loop: **Specification → Reference Implementation → Real Project → Experiment → Evidence →
Feedback**. The first work item is **v0.6.0 Drift & Retrieval**, starting with `lcd drift` — the missing link and the
biggest value driver.

---

## 7. Additional Aligned & Powerful Ideas

The ideas below are not in the original roadmap but align with LCDD principles and multiply the value of existing
phases:

1. **Drift as a self-healing trigger.** Wire `lcd drift` into ImproveEngine: detected drift automatically becomes a
   "update context" recommendation with confidence — this makes the v0.5.0 self-healing genuinely "Observe" code
   reality, not just enforcement logs. One feature, two phases done (6 + 12).
2. **Zero-LLM `lcd discover`.** A purely deterministic local scanner (no API key) — consistent with the
   "stages 01–05 can be deterministic" direction and immediately makes this repository (README/AGENTS/spec) a living
   context source.
3. **Bundles that measure token savings.** Context Bundle + experiment D (large context) form quantitative evidence
   for "more context is not better context" — the most persuasive adoption argument for teams worried about AI token
   cost.
4. **`validate --changes` as a PR gate.** Without waiting for a GitHub App, the CI report can already show a
   "satisfied/violation/needs-update" table per changed file — immediate impact on the development flow.
5. **Provenance that answers audits.** The `provenance` block + `verified_at` answers the enterprise question "who
   approved this AI-generated change?" — without it, phase 15 auditability has no data.
6. **Dismissal producer first, ecosystem later.** The `HIGH_FALSE_POSITIVE` trigger is written but dormant because
   nothing records dismissals. Adding `lcd validate --dismiss` (with a required reason) activates the best rule
   quality signal the project already owns — small investment, large payoff.
7. **`lcd serve` before the GitHub App.** A protocol implementation opens integration to anyone (IDEs, other CI,
   internal tools) without LCDD becoming a monolithic platform — aligned with the non-goals and Phase 14.
8. **The benchmark repo as "dogfooding".** This repository is the perfect experiment subject: its stale
   documentation (see Section 10) is real Context Debt that can be measured before/after.

---

## 8. Non-Goals & Principles to Preserve

This new roadmap is **fully aligned** with the non-goals and principles already in the repository — nothing needs
changing:

| Principle | Repo status |
| --- | --- |
| Model Agnostic | ✅ MCP + CQL provider-free; free Ollama default |
| Local First | ✅ File-based registry, `lcd doctor` without an API key |
| Human Governed | ✅ ImproveEngine guardrails 1–3: hardened never automatic, low confidence → human |
| Context Minimalism | 🟡 Not yet full — which is why Context Bundle (v0.6.0) is a priority |
| Evidence Over Claims | ❌ Not yet — which is why v0.9.0 (experiments) is on the roadmap |
| Interoperability | 🟡 MCP exists; protocol (v0.8.0) to follow |
| Progressive Adoption | ✅ 5-minute `lcd init`, per-domain packs, 6-level adoption guide |

Non-goals (not an AI model, not a coding agent, not an IDE, not a Git/ADR replacement, not a vector DB/RAG/
orchestrator) remain intact — every idea in Section 7 **integrates with** those systems, not replaces them.

---

## 9. Ideas Ignored (Already Implemented)

Per the instruction "if already implemented, ignore it", the following need no rework: Phase 0, Phase 1, Phase 4
(MCP), Phase 9 (enforcement), Phase 11 (change proposals), milestones v0.1/v0.2/v0.4, and most of Phase 7
(doctor/dashboard/triggers) and Phase 10 (CI workflow). The `lcd extract`/`normalize`/`source`/`review`/`improve`
commands are also already implemented and stable.

---

## 10. Side Finding: Context Debt in the Repository Itself

This repository — whose entire purpose is preventing Context Debt — currently carries Context Debt in its own
roadmap documents:

| Document | Problem |
| --- | --- |
| `CHANGELOG.md` | Top section is still `[0.4.0]`; no section for the `v0.5.0` release (self-healing, 6 triggers, ImproveEngine) |
| `ROADMAP.md` | Still "Version: 0.4.0"; lists v0.5.0 as "Ecosystem" (VS Code, GitHub App, DB, Grafana) although what shipped was self-healing |
| `specification/0016-roadmap.md` | "Version: 0.4.0"; **Milestone 3 (MCP) is still "🔴 Not Started"** although MCP shipped in v0.3.x; no milestone for self-healing; the "Milestone 2.5" numbering is inconsistent with release order |
| `docs/research-v2.md` | Status header still "as of v0.4.0" (section 8 already mentions `lcd improve`, so it is partially updated) |

Recommendation: update all three as a dogfooding PR — simultaneously a **living example** of the problem LCDD solves
and the first candidate test bed for `lcd discover` + `lcd drift`.

---

## 11. Conclusion

The evaluated roadmap **remains relevant and aligned** with the implementation. Five phases are done and eight are
nearly done — the real work is not repeating what exists but closing the mapped gaps. The highest and most strategic
priority is **v0.6.0 Drift & Retrieval** (`lcd drift`, `lcd discover`, context bundle, `validate --changes`),
because it: (a) closes the missing closed-loop link, (b) unlocks the full potential of the v0.5.0 self-healing, and
(c) builds quantitative adoption evidence. After that, in order: provenance & governance reports (v0.7.0), protocol &
pack distribution (v0.8.0), reproducible experiments (v0.9.0), then v1.0.0 stabilization. And as the fastest
first-impact step: **clean up the Context Debt in this repository's own roadmap documents.**

---

## References

1. The LCDD roadmap under evaluation (16 phases + v0.1–v1.0 milestones) — appendix of this research request.
2. `specification/0016-roadmap.md` — the repo's official roadmap (needs updating, see Section 10).
3. `ROADMAP.md` — the repo's roadmap summary (needs updating).
4. `CHANGELOG.md` — release history (needs a v0.5.0 section).
5. `docs/research-v2.md` — status tracking of previous phases (v0.4.0).
6. `docs/lcdd-self-healing.md` — the self-healing proposal and its 9 guardrails.
7. `docs/lcdd-implementation-plan.md` — the Phase A engineering plan (delivered in v0.5.0).
8. `implementation/packages/core/src/` — actual modules (TriggerEvaluator, ImproveEngine, SourceConnector, etc.).
9. `implementation/packages/cli/src/index.ts` — the actual CLI surface.
10. `implementation/packages/mcp/src/index.ts` — the 8 actual MCP tools.
11. `reference/schema/context-schema.json` — the actual schema.
12. `implementation/.github/workflows/validate.yml` — the actual CI workflow.
