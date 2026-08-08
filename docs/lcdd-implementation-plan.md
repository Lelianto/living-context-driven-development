# LCDD Implementation Plan — Self-Healing Phase A

**Status:** Planning  
**Version:** 0.1.0  
**Target Milestone:** v0.5.0  
**Last Updated:** 2026-08-08

---

## Abstract

This document is the engineering plan that turns Phase A of
[lcdd-self-healing.md](lcdd-self-healing.md) into code. It specifies the modules, type contracts,
guardrail enforcement points, CLI surface, and test matrix required to close the
Observe → Improve loop in `@lcdd/core`, `@lcdd/cli`, and `@lcdd/mcp`.

Phase A delivers **executable recommendations**: the system performs the diagnosis and prepares
the repair, but a human triggers it. No LLM-generated constraint variants and no A/B testing —
those belong to Phase B (v0.8.0).

This document is normative for the implementation, not for the specification. Where it disagrees
with `specification/`, the specification wins and this document must be corrected.

---

## Current State vs Target

| Capability | Current (v0.4.0) | Target (v0.5.0) |
|---|---|---|
| Trigger evaluation | 🟡 Implemented twice with divergent thresholds (`ContextDoctor`, `TriggerEvaluator`) | Single `TriggerEvaluator`; `ContextDoctor` delegates |
| False positive rate | 🔴 Mislabelled — measures violation rate; no dismissal events exist | `DismissalEvent` + true `dismissals / violations` |
| Recommendations | 🟡 Advisory strings with a `suggested_command` | Executable `HealPlan` with `confidence` and `proposed_change` |
| Apply a repair | 🔴 Does not exist | `lcd improve apply` with guardrail gates |
| Snapshots | 🔴 In-memory, active contexts only | Persisted to `.lcdd/snapshots/`, all contexts |
| Rollback | 🔴 Impossible | `lcd improve rollback <heal-id>` |
| Heal audit trail | 🔴 Does not exist; `ReviewManager` mutations are also unlogged | `heal` events in `.events.log` |
| Agent access | 🟡 6 read tools, no recommendations | `lcdd_get_recommendations` (read-only) |

---

## Architecture Overview

```text
  ┌─────────────────── Observe ───────────────────┐
  │ .enforcements.log  .dismissals.log  .changes.log │
  └───────────────────────┬───────────────────────┘
                          ▼
             ┌────────────────────────┐
             │   TriggerEvaluator     │  single source of thresholds
             │   (6 triggers)         │  TRIGGER_THRESHOLDS
             └───────────┬────────────┘
                         ▼
                  Recommendation[]
                         ▼
             ┌────────────────────────┐
             │     ImproveEngine      │
             │  plan → apply → verify │
             └───────────┬────────────┘
                         ▼
             ┌────────────────────────┐
             │    Guardrail gate      │
             │ hardened? confidence?  │
             └─────┬────────────┬─────┘
        hardened   │            │  local + confident
                   ▼            ▼
            ReviewManager    snapshot → mutate → verify
                                        │
                              health dropped? → rollback
```

### Design principles

1. **One source of truth per metric.** A threshold appears in exactly one place, exported as a
   const, and both the docs and tests reference it.
2. **Guardrails are code, not convention.** Each of the 9 guardrails in the self-healing document
   has an enforcement point and a named test. A guardrail without a test is not implemented.
3. **Fail closed.** When classification, confidence, or health data is missing or ambiguous, route
   to human review rather than applying.
4. **Everything reversible.** No mutation without a persisted snapshot written first.
5. **Follow existing conventions.** No new libraries, no new patterns. The CLI stays on
   `commander` + `chalk`, core stays on `vitest`, storage stays file-based YAML/JSONL.

---

## Module Design

### 4.1 Unify trigger evaluation

**Problem (resolved in v0.5.0).** The triggers originally existed in two implementations with
different thresholds:

| Trigger | `ContextDoctor` | `TriggerEvaluator` |
|---|---|---|
| AI drift | no minimum event count | requires >= 20 events, >= 5 per actor |
| False positive | no minimum | requires >= 10 events |

Worse, `highFalsePositiveTrigger` computed `violations / total`, which is the **violation rate**.
Specification 0009 defines false positive rate as `dismissals / violations`. No dismissal event
type existed in `types.ts`, so the headline refinement scenario in the self-healing document could
not be computed at all.

**Changes.**

Add to `core/src/types.ts`:

```ts
export interface DismissalEvent {
  event_id: string;
  timestamp: string;
  context_id: string;
  artifact_path: string;
  actor: { type: 'human' | 'ai-agent'; id: string };
  reason?: string;
}
```

Add `writeDismissalEvent` / `readDismissalEvents` to `FileRegistry`, writing `.dismissals.log`
alongside the existing JSONL logs.

Rename the existing violation-rate trigger to `highViolationRate` and add a genuine
`highFalsePositive` computing `dismissals / violations > 0.2`. Both are retained — a high violation
rate is a real signal, it was simply mislabelled.

Export thresholds as one const so documentation and tests cite a single origin:

```ts
export const TRIGGER_THRESHOLDS = {
  STALE_DAYS: 90,
  FALSE_POSITIVE_RATE: 0.2,
  HIGH_VIOLATION_RATE: 0.2,
  AI_DRIFT_RATIO: 2.0,
  MIN_EVENTS_FOR_RATE: 10,
  MIN_EVENTS_FOR_DRIFT: 20,
  MIN_EVENTS_PER_ACTOR: 5,
  SOURCE_RELEVANCE: 0.8,
} as const;
```

Delete the 5 `evaluate*` methods from `doctor.ts` and have `ContextDoctor.diagnose` delegate to
`TriggerEvaluator`. Extract the JSONL readers currently duplicated across `registry.ts`,
`doctor.ts`, `dashboard.ts`, and `source-connector.ts` into a single `readJsonl` helper.

**Breaking change.** The `HealthReport.triggers` element shape changes. Bump the `@lcdd/core` minor
version and update the `lcdd_get_health` projection in the MCP server.

### 4.2 ImproveEngine

New module `core/src/improve-engine.ts`.

Extend `Recommendation` to the shape specified in 0017:

```ts
export interface Recommendation {
  recommendation_id: string;
  trigger: string;
  priority: 'immediate' | 'short-term' | 'long-term';
  action: 'deprecate' | 'refine-scope' | 'review-clarity'
        | 'adjust-threshold' | 'register-source' | 'archive';
  context_id?: string;
  title: string;
  description: string;
  reason: string;
  confidence: number;          // 0..1
  auto_apply: boolean;
  proposed_change?: Partial<Context>;
  suggested_command?: string;
}

export interface HealPlan {
  recommendation: Recommendation;
  executable: boolean;
  blocked_reason?: string;      // why a human is required
  requires_approval: boolean;
}

export interface HealResult {
  heal_id: string;
  status: 'applied' | 'rolled-back' | 'blocked' | 'dry-run';
  snapshot_id?: string;
  health_before?: number;
  health_after?: number;
  message: string;
}

export class ImproveEngine {
  constructor(registry: FileRegistry, doctor: ContextDoctor, evaluator: TriggerEvaluator);
  plan(): HealPlan[];
  apply(recommendationId: string, opts?: { dryRun?: boolean; force?: boolean }): HealResult;
  rollback(healId: string): HealResult;
}
```

Phase A supports three actions only: `deprecate`, `refine-scope` (narrowing `applies_to`), and
`register-source`. The remaining actions produce a `HealPlan` with `executable: false` and a
`blocked_reason`, so they surface as advice without a false promise of automation.

`apply()` sequence:

1. Re-derive the plan. A recommendation id from a stale `check` run must not be applied against
   changed state.
2. Run the guardrail gate. On failure, return `status: 'blocked'`.
3. If `dryRun`, render the diff and return `status: 'dry-run'` without mutating.
4. Record `health_before` via `doctor.diagnose()`.
5. Write a snapshot.
6. Mutate through the existing `registry.save` / `registry.transition` paths so schema validation
   and versioning still apply.
7. Record `health_after`. If it decreased, restore the snapshot and return `status: 'rolled-back'`.
8. Append a `heal` event to `.events.log`.

### 4.3 Guardrail enforcement matrix

Each guardrail maps to an enforcement point and a test. This table is the acceptance criteria.

| # | Guardrail | Enforcement point | Test |
|---|---|---|---|
| 1 | Hardened never auto-modified | `plan()` sets `auto_apply=false` when `governance.classification` starts with `hardened-`; `apply()` returns `blocked` without `force` plus an approval reason | `hardened context cannot be auto-applied` |
| 2 | LLM is a tool, not authority | `confidence < CONFIDENCE_THRESHOLD` routes to `ReviewManager` | `low confidence routes to review` |
| 3 | Human-in-the-loop by default | CLI requires `--yes` or an interactive prompt | `apply without --yes prompts` |
| 4 | Safe rollout warn → block | `refine-scope` may only step enforcement toward `block` via `warn`; the observation window is stored in `metadata.heal_observation_until` | `enforcement cannot jump straight to block` |
| 5 | Every action audited | `apply()` and `rollback()` each append exactly one `heal` event | `apply and rollback each emit one event` |
| 6 | Reversible | Snapshot written before mutation; `rollback()` restores it | `rollback restores prior version` |
| 7 | Must never reduce health | `verify()` compares scores and auto-rolls-back | `health regression triggers auto rollback` |
| 8 | No automatic hardened classification | `plan()` rejects a `proposed_change` setting a `hardened-*` classification or `lifecycle: active` | `proposed change cannot set hardened or active` |
| 9 | Psychological safety | No per-actor identity in aggregate output; actor data stays aggregated to human/ai-agent | `output contains no individual actor ids` |

### 4.4 Snapshot persistence and the audit gap

`FileRegistry.snapshot()` currently returns an in-memory object covering active contexts only,
and nothing writes it to disk. Guardrails 6 and 7 cannot be honored until this changes.

- `snapshot()` writes `.lcdd/snapshots/<snapshot-id>.yaml` covering **all** contexts regardless of
  lifecycle, since a heal may modify a `draft` or `deprecated` Context.
- Add `restoreSnapshot(id)`.
- Emit lifecycle events from `ReviewManager.approve` / `reject` / `requestRevision`. These
  currently call `registry.save` directly and never append to `.events.log`, unlike
  `FileRegistry.transition` — an existing audit hole that breaks guardrail 5 independently of
  self-healing.
- `resolveClassificationDir` in `registry.ts` is dead code: `getFilePath` always writes flat, so
  the `hardened/local/experimental` split that `lcd init` creates and the documentation describes
  is not used for storage. Either wire it up or delete it and correct the docs. Storage behaviour
  must not contradict documented behaviour.

Heal events are audit bookkeeping, not context activity. The health metrics `Stale Contexts` and
`Draft Stagnation` derive "last activity" from `.events.log`; without an exclusion, a single heal
permanently masks a dormant context because its audit events carry fresh timestamps, and rollback
cannot restore the pre-heal score. Heal-generated events (`actor_role: 'improve-engine'`) are
therefore excluded from those two signals. The audit trail itself is unaffected — apply, rollback
and the underlying lifecycle transition are all still written to `.events.log`.

### 4.5 CLI surface

```text
lcd improve check   [--json] [--priority <immediate|short-term|long-term>]
lcd improve apply <recommendation-id> [--dry-run] [--yes]
lcd improve rollback <heal-id>
```

New `cli/src/commands/improve.ts`, registered in `cli/src/index.ts` following the `reviewCmd`
group pattern: lazy dynamic import inside `.action()`, `new FileRegistry(process.cwd())`,
`chalk` semantic colors with the `✓ ⚠ ✗` glyph set, `--json` short-circuiting before any chalk
output, and `process.exit(1)` inline at the failure site.

`apply` without `--yes` prompts via node's built-in `readline`, as `context.ts` already does.

Three commands now need `formatScore` / `gradeColor` / `statusIcon`, currently private to
`doctor.ts`. Extract them to `cli/src/format.ts`.

Exit codes: `0` success or no recommendations; `1` blocked by a guardrail, rolled back, or an
unknown id.

### 4.6 MCP exposure

Add `lcdd_get_recommendations` to the `TOOLS` array and a matching `switch` branch.

**Read-only by design.** The tool exposes `plan()` and never `apply()`. An AI agent proposing its
own governance repairs and then executing them unattended violates guardrails 1 and 3. Healing is
initiated by a human through the CLI.

Also fix two version-drift defects found during review: the hardcoded `version: "0.3.1"` in the
MCP `Server` constructor, and the monorepo root `package.json` pinned at `0.3.0` while every
package is at `0.4.0`.

---

## Test Matrix

`@lcdd/core` has no tests for `doctor.ts`, `trigger-evaluator.ts`, `rule-engine.ts`,
`review-manager.ts`, or `dashboard.ts`. The self-healing loop mutates the registry autonomously,
so shipping it on top of an untested diagnosis layer is not acceptable.

| Suite | Covers | Priority |
|---|---|---|
| `improve-engine.test.ts` | All 9 guardrails, the 3 executable actions, dry-run, rollback | Required |
| `trigger-evaluator.test.ts` | 6 triggers at threshold boundaries, dismissal-based false positive rate | Required |
| `doctor.test.ts` | 8 metrics, grade boundaries, delegation parity with the evaluator | Required |
| `registry.test.ts` (extend) | Snapshot persistence and restore round-trip | Required |
| `review-manager.test.ts` | Lifecycle events emitted on approve/reject/revision | Recommended |

Follow the existing fixture convention: `mkdtempSync(join(tmpdir(), 'lcdd-test-'))` in
`beforeEach`, `rmSync(..., { recursive: true, force: true })` in `afterEach`, relative imports with
a `.js` extension.

Add a `test` script to `cli` and `mcp` so `npm run test --workspaces` is meaningful, and add
`npm test` to `.github/workflows/validate.yml`, which currently only builds and dogfoods the CLI.

---

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Auto-heal corrupts the registry | High | Snapshot before every mutation; auto-rollback on health regression; mutations go through `registry.save` so schema validation applies |
| Health score is a poor proxy for correctness | Medium | Phase A restricts actions to 3 conservative ones; health is a veto signal, never the sole justification |
| Trigger unification changes existing behaviour | Medium | Parity test asserting doctor and evaluator agree on shared fixtures; minor version bump |
| Dismissal events never get recorded, so false positive stays uncomputable | Medium | Trigger degrades gracefully to advisory when the dismissal log is empty; never fabricate a rate from violation data |
| Guardrails drift as automation expands | High | Each guardrail has a named test; adding an action requires extending the matrix |
| Users grant `--force` habitually and defeat guardrail 1 | Medium | `--force` alone is insufficient for hardened; an explicit approval reason is required and recorded in the audit event |

---

## Dependencies

| Work item | Depends on |
|---|---|
| ImproveEngine | Unified triggers (4.1), snapshot persistence (4.4) |
| `lcd improve apply` | ImproveEngine (4.2), guardrail matrix (4.3) |
| `lcd improve rollback` | Snapshot persistence (4.4) |
| True false positive trigger | `DismissalEvent` and a producer that records dismissals |
| Phase B fitness optimization | Phase A audit trail and rollback proven in practice |

Note that a dismissal **producer** does not exist yet — nothing in the CLI or MCP records that a
developer dismissed a violation. Phase A adds the event type, the storage, and the consumer; the
producer needs an interactive surface (IDE extension or GitHub App) and therefore lands with the
rest of the v0.5.0 ecosystem work. Until then the false positive trigger stays dormant rather than
reporting a fabricated rate.

---

## References

1. [lcdd-self-healing.md](lcdd-self-healing.md) — the proposal and the 9 guardrails.
2. LCDD 0017 — Pipeline Automation Plan, Stage 09 Improve.
3. LCDD 0009 — Observability, metric and alert definitions.
4. LCDD 0004 — Governance, Option C fitness-based evolution.
5. LCDD 0002 — Context Lifecycle, valid transitions.
6. [research-v2.md](research-v2.md) — phase status tracking.
