# LCDD Context Debt Assessment and Remediation Plan

**Status:** Active — Gates 0–1 implemented
**Version:** 0.1.0
**Repository baseline:** v0.5.0
**Assessment date:** 2026-08-08
**Owner:** LCDD maintainers

---

> **Execution note:** Gates 0 and 1 were implemented on 2026-08-08. Gate 0 reconciled the changelog,
> roadmaps, README, FAQ, website MCP count, Phase A status, and pipeline status, and added an
> automated documentation consistency check to CI. Gate 1 removed the shell-injection path,
> hardened the dashboard and extraction boundary, added verifier resource limits, introduced CLI
> and MCP tests, and added a release-verification command. Section 3.2 preserves the original audit
> findings as the baseline that motivated the remediation.

## 1. Purpose

This document converts the repository's unimplemented plans, research gaps, and contradictory
status claims into one governed execution plan. It is an implementation-planning document, not a
normative part of the LCDD specification. If it conflicts with `specification/`, the specification
wins.

The plan is based on direct inspection of the repository, including:

- `ROADMAP.md`, `CHANGELOG.md`, and `specification/0016-roadmap.md`;
- `docs/research.md`, `docs/research-v2.md`, and `docs/research-v3.md`;
- `docs/lcdd-self-healing.md` and `docs/lcdd-implementation-plan.md`;
- `docs/documentation-standards.md` and `docs/security-audit.md`;
- the v0.5.0 source, package manifests, CI workflow, and test suite.

At the assessment baseline, all 192 core tests pass and `@lcdd/core`, `@lcdd/cli`, and `@lcdd/mcp`
build successfully. The project has a working v0.5.0 reference implementation. The main debt is
not a broken baseline; it is the growing difference between documented intent, normative
requirements, delivered behavior, and available evidence.

## 2. Definition of Context Debt

For this repository, **Context Debt** is any material difference between:

1. what the specification or roadmap says is true;
2. what the implementation actually does;
3. what documentation tells adopters to expect; and
4. what tests or research can demonstrate.

Debt is classified as:

| Class | Meaning | Example in this repository |
| --- | --- | --- |
| Status debt | Delivered work is reported as planned, or planned work as delivered | `0016-roadmap.md` marks MCP as not started although it shipped |
| Normative debt | A normative requirement has no matching implementation or conformance evidence | Context Protocol has a specification but no server or conformance suite |
| Capability debt | A promised or strategically required feature is absent | Code-to-Context drift detection |
| Evidence debt | A value claim has no reproducible experiment or operational metric | No benchmark for Context Minimalism or drift reduction |
| Security debt | Implemented behavior does not yet meet the security specification or safe defaults | Shell interpolation in the Git source connector |
| Quality debt | Critical surfaces lack automated tests or release gates | CLI and MCP packages currently have no tests |
| Research debt | An open question has no decision record, experiment, or falsifiable result | No measured answer for optimal Context Bundle size |

## 3. Current Baseline

### 3.1 Confirmed implemented

- File-backed Context Registry, schema validation, lifecycle transitions, CQL, and static verification.
- Context health reporting, six deterministic triggers, review workflow, source monitoring,
  extraction, normalization, dashboard, and MCP integration.
- v0.5.0 self-healing Phase A: executable recommendations, persisted snapshots, rollback, and
  human-governed guardrails.
- Eight MCP tools, including read-only improvement recommendations.
- 192 passing tests in `@lcdd/core`; successful TypeScript builds for all three packages.

These capabilities MUST NOT be placed back into the backlog as unimplemented.

### 3.2 Confirmed debt

| ID | Debt | Evidence | Severity |
| --- | --- | --- | --- |
| CD-01 | Release and roadmap state is contradictory | Packages and Git tag are v0.5.0; `CHANGELOG.md`, `ROADMAP.md`, and `0016-roadmap.md` stop at v0.4.0-era status | Critical |
| CD-02 | Public maturity and command claims are stale | `README.md` describes v0.1/v0.3 maturity, seven MCP tools, and v0.5 as future ecosystem work | High |
| CD-03 | Companion docs describe already-shipped CLI/MCP features as future | `docs/faq.md`, `docs/research-v2.md`, and several v0.4 status notes | High |
| CD-04 | Phase A implementation plan still says `Planning` after delivery | `docs/lcdd-implementation-plan.md` | Medium |
| CD-05 | Code-to-Context drift detection is absent | Existing `AI_DRIFT` measures actor violation ratios, not code/spec divergence | Critical |
| CD-06 | Local repository discovery is absent | Sources support Git repositories and websites, but no scanner for the current repository's own docs/config | High |
| CD-07 | Task-scoped Context Bundles are absent | CQL can filter contexts, but no task-oriented retrieval and authority-resolution artifact exists | High |
| CD-08 | Change-scoped validation and PR governance reports are absent | `lcd validate` has no git-diff mode; CI validates globally and prints only a generic summary | High |
| CD-09 | Provenance and freshness are incomplete | Schema has `source` and `evidence`, but no first-class approval/commit/verification provenance | High |
| CD-10 | Context Protocol is specification-only | `0013-context-protocol.md` has no `lcd serve` implementation or conformance tests | Medium |
| CD-11 | Packs are examples, not distributable artifacts | No pack manifest, version resolution, install command, or compatibility policy | Medium |
| CD-12 | No experimental validation harness exists | No benchmark repository, controlled experiments, or reproducible results | High |
| CD-13 | Observability has blind spots | No Context Coverage, drift rate, bundle usage, correction rate, or interactive dismissal producer | Medium |
| CD-14 | Security audit contains unresolved P0/P1 findings | Source command injection, dashboard exposure/XSS/SRI, and vulnerable dependency/process gaps | Critical |
| CD-15 | CLI and MCP lack automated tests | Both package test scripts pass with `--passWithNoTests` | High |
| CD-16 | Specification-to-implementation conformance is not automated | Two schema copies match now, but CI does not prove they remain synchronized | Medium |

## 4. Prioritization Rules

Work is ordered by the following rules:

1. **Truth before expansion.** Reconcile the project's own status before publishing new promises.
2. **Safety before feature breadth.** Resolve exploitable defaults before adding new input and network surfaces.
3. **Dependency order.** Build change detection and scoped retrieval before PR reports, protocol clients, or IDE integrations.
4. **Vertical slices.** Each capability includes Core, CLI, MCP where relevant, tests, documentation, and an example.
5. **Evidence starts early.** Instrument features when they are built; do not postpone all evaluation until v0.9.
6. **Human governance remains invariant.** Drift and discovery MAY propose Candidate Contexts; they MUST NOT silently modify Hardened Contexts.

## 5. Delivery Plan

### Gate 0 — Establish One Source of Project Truth

**Target:** immediate documentation-only release or the first v0.6.0 pull request.

| Work item | Deliverable | Acceptance criterion |
| --- | --- | --- |
| G0.1 | Add the v0.5.0 self-healing release to `CHANGELOG.md` | Release notes match tag `v0.5.0`, source, tests, and package versions |
| G0.2 | Replace the obsolete v0.5 ecosystem milestone in both roadmaps | `ROADMAP.md` is the concise view; `0016-roadmap.md` is the detailed authoritative plan; milestone identifiers are monotonic |
| G0.3 | Mark the MCP and self-healing deliverables accurately | Eight tools are recorded; unimplemented context injection and code drift remain open |
| G0.4 | Correct public maturity, counts, and availability claims | README, FAQ, website, package READMEs, and adoption docs agree on v0.5.0 |
| G0.5 | Close delivered planning documents | `lcdd-implementation-plan.md` becomes `Implemented`, with remaining items moved to a clearly labeled follow-up section |
| G0.6 | Classify historical research | Each research document states whether it is historical, current, superseded, or active; historical findings are preserved, not rewritten as present facts |
| G0.7 | Add a documentation consistency check | CI fails on selected stale markers, package/version mismatch, MCP tool-count mismatch, and schema-copy drift |

**Exit gate:** a reader can determine the current release, delivered capability, active roadmap, and open work without encountering a contradiction.

### Gate 1 — Security and Test Baseline ✅ Implemented

**Target:** v0.6.0-alpha.1. This gate blocks new discovery, protocol, and remote-integration surfaces.

| Work item | Deliverable | Acceptance criterion |
| --- | --- | --- |
| G1.1 | Remove shell-command interpolation from source operations | Use argument-based process execution; hostile URL/branch cases are covered by tests |
| G1.2 | Make dashboard local-safe by default | Bind to loopback, restrict CORS, escape interpolated content, and protect external scripts with SRI or vendoring |
| G1.3 | Resolve dependency advisory and policy mismatch | Upgrade `uuid`, run production dependency audit in CI, and align `SECURITY.md` with lockfile/range policy |
| G1.4 | Add verifier resource limits | Pattern/size guard and execution timeout have deterministic failure behavior and regression tests |
| G1.5 | Protect cloud extraction | CLI displays data-flow notice; confidential sources cannot use cloud providers without an explicit governed override |
| G1.6 | Add CLI integration tests | Tests cover argument parsing, exit codes, JSON output, destructive confirmations, and one end-to-end temporary registry flow |
| G1.7 | Add MCP contract tests | All eight tool schemas, success responses, invalid inputs, and path/error redaction are tested |
| G1.8 | Introduce a release verification command | One command runs build, unit/integration tests, schema parity, documentation checks, and dependency audit |

**Exit gate:** no unresolved P0 security finding; CLI/MCP no longer pass CI with zero tests; the release verification command is green.

### v0.6.0 — Drift, Discovery, and Scoped Retrieval

Implement these as four independently releasable vertical slices.

#### Slice 1 — `lcd validate --changes`

- Define merge-base, staged, working-tree, and explicit revision semantics.
- Match changed files against Active Context `applies_to` patterns.
- Reuse `ContextVerifier`; do not create a second verification engine.
- Produce human and stable JSON reports containing changed files, relevant contexts, violations,
  warnings, and merge status.
- Add CI summary output before implementing any GitHub App.

**Acceptance tests:** rename/delete/binary files, shallow clones, no merge base, monorepo paths,
no relevant Contexts, and block/warn/comment/silent behavior.

#### Slice 2 — Task-scoped Context Bundle

- Define a versioned `ContextBundle` contract in Core.
- Inputs: task text plus optional paths, tags, domains, and token/size budget.
- Resolve lifecycle, authority conflicts, supersession, and deprecated filtering deterministically.
- Preserve provenance and explain why every Context was included or excluded.
- Add `lcd context bundle` and `lcdd_get_context_for_task`.

**Acceptance tests:** deterministic ordering, conflict precedence, no deprecated Context leakage,
budget truncation without dropping higher-authority constraints, and stable JSON schema.

#### Slice 3 — Local repository discovery

- Add `lcd discover` for allowlisted repository sources such as `README.md`, `docs/**`, ADRs,
  agent instruction files, `.github/**`, and selected build/config manifests.
- Separate collection from extraction: deterministic scanner output first; optional Extractor pass second.
- Store source hashes and locations to support incremental rescans.
- Send discovered constraints to Candidate/review, never directly to Active.
- Dogfood the scanner against this repository and record false positives and omissions.

**Acceptance tests:** ignore rules, symlinks, files outside project root, large/binary files, duplicate
claims, changed-only scans, and confidential-file exclusion.

#### Slice 4 — Code-to-Context drift

- Define `DriftSignal` and `DriftReport` before choosing detectors.
- Start with deterministic probes: dependency replacement, import/provider change, removed required
files, environment/config divergence, and changed tests/specs paired with failing implementation.
- Keep optional semantic/LLM analysis as a separate provider with explicit confidence and data-flow controls.
- Add `lcd drift`, `lcdd_detect_drift`, a `DRIFT_DETECTED` trigger, and ImproveEngine recommendations.
- Drift MAY recommend review or a Context update. It MUST NOT auto-edit Hardened Contexts or treat code
as authoritative merely because it changed.

**Acceptance tests:** the documented Firebase-to-Supabase scenario, intentional migration with an
approved Context, ambiguous evidence, false-positive suppression, and proposal-only guardrails.

**v0.6.0 exit gate:** all four slices have Core + CLI + tests + documentation; Bundle and Drift have MCP contracts; this repository can discover its own Context Debt and produce a change-scoped governance report.

### v0.7.0 — Provenance, Feedback, and Governance Reporting

| Work item | Deliverable | Acceptance criterion |
| --- | --- | --- |
| G7.1 | Specify provenance semantics | Normative RFC change defines creator, approver, source revision, created/verified timestamps, AI involvement, and privacy rules |
| G7.2 | Migrate schemas and examples | Reference and runtime schemas stay identical; migration supports existing v0.5 Contexts |
| G7.3 | Add `lcd context verify` | Verification records actor, evidence, timestamp, and source revision; stale verification becomes observable |
| G7.4 | Produce governance reports | `lcd validate --changes --ci` reports file-to-Context mapping, provenance, violations, and merge decision |
| G7.5 | Activate false-positive feedback | A dismissal command/API records a required reason and drives `HIGH_FALSE_POSITIVE` without exposing individual identities in aggregate output |
| G7.6 | Add bounded telemetry | Local-first, opt-in, documented, aggregated Context usage and correction metrics; no source content or actor identity leaves the project |
| G7.7 | Strengthen audit logs | Decide and document the trust model; if tamper evidence is required, add a verifiable hash chain and tests |

**Exit gate:** every governed result can answer which Context applied, why it applied, who approved it, what evidence supported it, and when it was last verified.

### v0.8.0 — Protocol and Pack Distribution

1. Reconcile `specification/0013-context-protocol.md` with the proven Core/MCP contracts.
2. Implement `lcd serve` with a minimal local-only transport first.
3. Publish a protocol conformance suite covering registry reads, CQL, Bundles, validation, errors,
   version negotiation, authorization hooks, and rate/resource limits.
4. Define a Context Pack manifest, semantic versioning, checksums, provenance, dependency constraints,
   install/update/remove operations, and offline/local installation.
5. Convert examples into validated versioned packs before creating a public marketplace.
6. Add external connectors only through the protocol/connector interfaces and threat model each one.

**Exit gate:** an independent client can pass the conformance suite, and a pack can be installed,
verified, updated, and removed reproducibly without a hosted service.

### v0.9.0 — Experimental Validation

Build evidence throughout v0.6-v0.8, then consolidate it here:

- Create a benchmark repository containing seeded stale instructions, authority conflicts,
  architecture drift, noisy rules, and oversized context.
- Publish an experiment manifest defining task, model/tool version, Context set, randomization,
  repetitions, environment, and expected outcomes.
- Compare baseline and LCDD-assisted runs using task success, missed constraints, false positives,
  correction loops, time, and token usage.
- Run at least these experiments: drift detection, conflicting instructions, Context Bundle size,
  change-scoped validation, and long-lived Context decay.
- Publish raw anonymized results and analysis scripts. Negative or inconclusive results MUST be retained.

**Exit gate:** at least two independently reproducible experiments support or falsify a named LCDD
claim. `docs/research-v4.md` distinguishes observations, inferences, and proposals.

### v1.0.0 — Stabilization Before Ecosystem Scale

v1.0 means a stable contract, not completion of every ecosystem idea.

- Freeze terminology, lifecycle, authority, governance, schema, protocol, Bundle, and report contracts.
- Publish migration and compatibility policies for all v0.x artifacts.
- Complete at least one external-project case study.
- Require security, conformance, documentation, and experiment gates for release.
- Build the VS Code extension, GitHub App, hosted registry, Grafana integration, and enterprise
  hierarchy only on top of stable protocol and pack contracts.

## 6. Research Program

Research runs alongside implementation and has explicit decision outputs.

| Track | Question | Method | Decision/output |
| --- | --- | --- | --- |
| R1 Drift | Which deterministic signals detect real drift with acceptable false positives? | Seeded benchmark plus real-repository dogfooding | Detector set, confidence thresholds, unsupported cases |
| R2 Retrieval | How should Contexts be ranked within a size/token budget? | Compare full registry, CQL-only, authority-first, and task-scored bundles | Versioned Bundle ranking policy |
| R3 Authority | How should implementation evidence interact with human-approved Contexts during conflict? | Scenario analysis against specs 0003/0004 plus adversarial tests | Normative rule: code is evidence, not automatic authority |
| R4 Provenance | What minimum provenance is useful without collecting sensitive identity data? | Threat modeling and adopter interviews | Schema fields, retention, redaction, and consent policy |
| R5 Feedback | Which dismissal and correction signals predict bad Contexts? | Instrumented trials and threshold sensitivity analysis | Trigger definitions and minimum sample sizes |
| R6 Economics | Does scoped Context reduce tokens/time without reducing compliance? | Controlled Context Bundle experiments | Supported cost/minimalism claims |
| R7 Protocol | What is the smallest interoperable surface third parties actually need? | Build two independent prototype clients | Protocol MVP and deferred methods |
| R8 Adoption | Which progressive-adoption level produces measurable value first? | External pilot observation | Case study and revised adoption guide |

Every research result MUST include its repository revision, dataset or fixture, procedure, limitations,
and whether the result is observation, inference, or proposal. External literature claims MUST be
verified before citation.

## 7. Work Breakdown and Dependency Order

```text
Truth reconciliation (G0)
        |
Security + test baseline (G1)
        |
validate --changes -----------+
        |                      |
Context Bundle                +--> governance report
        |                      |
local discovery --> drift ----+--> provenance/feedback metrics
                                      |
                               protocol + packs
                                      |
                              stable external ecosystem

Experiments and dogfooding run across every row, not only at the end.
```

Parallel work is safe only where contracts do not overlap:

- Documentation reconciliation can run alongside security fixes.
- Bundle research can run alongside `validate --changes` after shared path-matching semantics are fixed.
- Benchmark design can begin immediately, but outcome claims wait for stable feature contracts.
- Hosted registry, IDE, and GitHub App work should wait for protocol and governance-report stability.

## 8. Definition of Done

A roadmap item is complete only when all applicable conditions are met:

- the contract or normative change is documented and reviewed;
- Core behavior is implemented without duplicating an existing engine;
- CLI and MCP/API surfaces use stable structured output;
- unit, integration, adversarial, and migration tests pass;
- security and privacy implications are documented and tested;
- examples and user documentation match the released behavior;
- release notes and both roadmaps are updated in the same change;
- observability exists for the new behavior;
- any supporting claim cites reproducible evidence or is labeled as a hypothesis.

Checkbox completion without these artifacts is not completion.

## 9. Governance and Debt Prevention

Add a quarterly or pre-release Context Debt review with these checks:

1. Compare package versions, Git tags, changelog, roadmap, website, and README.
2. Compare all normative MUST/SHOULD statements with implementation or an explicit deferral record.
3. Compare CLI commands and MCP tools with documentation-generated inventories.
4. Verify reference and runtime schemas are byte-equivalent or generated from one source.
5. Run the full release verification command and archive its result.
6. Review research hypotheses older than one milestone; close, test, or explicitly defer them.
7. Record every deferral with owner, reason, dependency, target milestone, and review date.

The recommended long-term control is a small machine-readable roadmap/debt registry from which the
human-facing status tables are generated. Until that exists, `specification/0016-roadmap.md` is the
detailed roadmap source of truth and `ROADMAP.md` is its synchronized summary.

## 10. Immediate Next Actions

1. Merge Gate 0 as a focused Context Debt cleanup.
2. Triage and implement the P0/P1 security findings before expanding source ingestion.
3. Add CLI/MCP contract tests and a single release-verification command.
4. Write the v0.6 contracts for change-scoped validation and Context Bundles.
5. Implement deterministic local discovery, then use its output to shape drift detection.
6. Create the benchmark fixtures at the same time as drift and Bundle features.

This ordering turns the repository itself into the first LCDD case study: identify stale Context,
govern the correction, measure the result, and prevent recurrence.
