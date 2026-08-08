# LCDD Self-Healing — Toward Governance That Heals Itself

**Status:** Proposal (future plan)  
**Version:** 0.1.0  
**Last Updated:** 2026-08-08

---

> This document is a **future plan**, not part of the normative specification. Its purpose is to
> explain how LCDD's principles — already operating in v0.4.0 — form a natural foundation for a
> **self-healing governance** system, and to lay out a roadmap for getting there incrementally
> while keeping the guardrails intact.

## Summary

A **self-healing system** in the LCDD sense is a governance system able to:

1. **Observe** the condition of its own rules (observability),
2. **Diagnose** damage — context decay, stale rules, false positives, conflicts, AI drift,
3. **Heal** — revise, deprecate, archive, or create new Contexts (semi-)automatically,
4. **Verify** that the repair is safe and can be rolled back.

This is not fiction: the foundations exist. `lcd doctor` (health score plus 6 triggers),
`lcd dashboard`, the event log, `lcd extract`/`lcd normalize`, and auto-approval review for Local
Contexts are the same raw materials. As of v0.5.0 the loop that closes Observe → Improve runs via
`lcd improve` (check → apply → verify → rollback).

## Why Does Self-Healing Matter?

- **Context decay is the default state** (see [glossary.md](glossary.md)). READMEs go stale,
  architectural decisions become folklore, regulations change without notice. Waiting for humans
  to fix everything will never catch up.
- **AI speed versus human speed.** AI agents produce code faster than teams maintain rules.
  Without automatic healing, context debt accumulates faster than ever.
- **Manual maintenance cost is non-linear.** The more active Contexts there are, the more review,
  synchronization, and hunting for stale rules is required. A system that heals itself keeps this
  cost low.
- **Rule sources change without notice** — regulators publish new rules, libraries get deprecated,
  violation patterns shift. Self-healing lets governance respond in hours rather than weeks.

## The LCDD Principles That Form the Foundation

Self-healing is not a foreign addition — it is a logical consequence of principles already defined:

| Principle | Role in Self-Healing |
| --- | --- |
| Context as a structured artifact | Repairs can be automatic: a machine reads, changes, and validates rules |
| The 6-stage lifecycle | The forms of "healing" are clearly defined: revise, deprecate, archive, promote |
| Hardened versus Local | Local may heal automatically; Hardened requires human approval |
| Enforcement block/warn/comment/silent | Repairs can roll out safely: start at `warn`, escalate to `block` once verified |
| The 9-stage pipeline | Discover/Extract/Normalize make automatic rule creation possible |
| Observability (0009) | Metrics and alerts are the system's senses: false positives, dormancy, AI drift |
| Authority and provenance | Every healing action records who (or what) performed it |
| Event log | All healing is auditable and reversible |

## The Self-Healing Loop

```text
        ┌──────────────────────────────────────────────────────────┐
        │                                                          │
        ▼                                                          │
   [Observe] ──► [Diagnose] ──► [Decide] ──► [Heal] ──► [Verify] ─┘
   enforcement  doctor +      governance    revise /     check conflicts,
   events,      trigger       classification deprecate /  re-run doctor,
   source       evaluator     picks the auto archive /    roll back if
   changes,     (6 triggers)  versus human   create       health drops
   lifecycle                  review path    (extract →
   events                                    normalize)
```

| Stage | What happens | Current foundation |
| --- | --- | --- |
| **Observe** | Collect enforcement events, source changes, lifecycle transitions | `.enforcements.log`, `.changes.log`, `.events.log`, `lcd source watch` |
| **Diagnose** | Compute the health score and fire diagnoses (stale, violation rate, false positive, drift) | `lcd doctor`, `lcd doctor --triggers` (6 deterministic triggers) |
| **Decide** | Governance classification picks the path: Local → auto-apply, Hardened → human review | Rule Engine, `governance.classification`, auto-approval review |
| **Heal** | Apply the repair: refine scope/verifier, deprecate, archive, or create a new Context | `lcd transition`, `lcd extract --auto`, `lcd normalize`, `lcd review` |
| **Verify** | Validate the result, check for conflicts, measure impact; roll back if poor | `lcd validate`, schema validation, registry snapshot |

## Foundations That Already Exist (v0.4.0)

Most of the system's "senses" and "muscles" are already installed in v0.4.0:

- `lcd doctor` — a Context Health Score (0–100, grade A–F) from 8 metrics: stale contexts,
  missing owners, enforcement conflicts, deprecation backlog, draft stagnation, authority gaps,
  tag hygiene, review backlog.
- **Trigger Evaluator** — 6 deterministic diagnoses, all thresholds centralized in
  `TRIGGER_THRESHOLDS`:
  - `STALE_NO_VIOLATION` — a rule not violated for > 90 days → consider deprecation.
  - `HIGH_VIOLATION_RATE` — violations / evaluations > 20% → consider refining scope.
  - `HIGH_FALSE_POSITIVE` — dismissals / violations > 20% → consider refinement (dormant until
    dismissal events exist).
  - `INCREASING_VIOLATIONS` — violations rising → consider reviewing the rule.
  - `AI_DRIFT` — AI violation ratio > 2× human → review prompt injection / rule clarity.
  - `NEW_SOURCE_DETECTED` — a new source detected → queue for extraction.
- `lcd dashboard` — 7d/30d/90d violation trends, actor breakdown (human versus AI),
  top violated contexts, enforcement mode distribution.
- `lcd extract` + `lcd normalize` — creating new Contexts from sources (free Ollama,
  OpenAI/Anthropic optional) with dedup (SHA-256 + Jaccard) and schema validation.
- `lcd review auto-approve` — high-confidence Local Contexts can pass review automatically.
- **Snapshots and event logs** — the basis for an audit trail and rollback.

The last wire — connecting diagnosis to healing action with verification and rollback — landed in
v0.5.0 as `lcd improve` (see [lcdd-implementation-plan.md](lcdd-implementation-plan.md)).

> **Implementation note.** A code review conducted while writing the implementation plan found
> that this foundation is thinner than it appeared. The triggers were implemented **twice** with
> differing thresholds (`ContextDoctor` and `TriggerEvaluator`), the `HIGH_FALSE_POSITIVE` trigger
> measured violation rate rather than false positive rate because no dismissal event type existed,
> and `FileRegistry.snapshot()` held state in memory only — so rollback was not possible. Those gaps
> were closed in v0.5.0: trigger evaluation is unified in `TriggerEvaluator` with a single
> `TRIGGER_THRESHOLDS` constant, `DismissalEvent` exists, and snapshots persist to disk so heals can
> be rolled back. See [lcdd-implementation-plan.md](lcdd-implementation-plan.md).

## Phase Plan

### Phase A (v0.5.0) — Executable Recommendations

Implemented:

- `lcd improve check` — print structured recommendations from the trigger evaluator, runnable as a
  real command rather than plain text.
- `lcd improve apply <id>` — apply a recommendation with confirmation:
  - refine-scope → narrow `applies_to` directly (Local, with guardrail gates).
  - deprecate → `lcd transition <id> deprecated`.
  - register-source → `lcd source add`.
- `lcd improve rollback <heal-id>` — restore the pre-heal snapshot.
- **Target:** humans still decide, but the system does all the homework — the system
  "heals with approval."

Still aspirational: auto-PR for recommendations with cross-team impact.

### Phase B (v0.8.0) — Limited Auto-Heal for Local

- **Fitness-based optimization** (inspired by GrayBeam CDD, already sketched in
  [0004-governance.md](../specification/0004-governance.md) Option C and
  [0017-pipeline-automation-plan.md](../specification/0017-pipeline-automation-plan.md)
  Stage 09 Phase C): a fitness function measures constraint effectiveness (false positive rate,
  violation trend, developer satisfaction signals via dismissal rate).
- A/B testing of constraint variants for `local-guideline` and `local-experimental` —
  two scope/verifier variants tested in `warn` mode, the better variant promoted to `block`.
- Auto-refine scope (`applies_to`) based on actual violation data.
- Embedding-based dedup (cosine similarity) to prevent duplicate rules.
- **Guardrail:** Local Contexts only; Hardened still requires a human; every auto-heal produces an
  audit event and can be rolled back with a single command.

### Phase C (v1.0.0+) — Self-Healing with Full Guardrails

- **Event-sourced registry** — every healing action is an event that can be replayed and fully
  audited.
- **ML-based trend analysis** — predict which Contexts will become stale before the threshold
  metrics are reached.
- **Heal confidence scoring** — the system only auto-applies when confidence is high;
  low scores queue for a human (per the principle "an LLM is a tool, not an authority").
- **Automatic AI drift remediation** — when `AI_DRIFT` fires, the system rewrites the Context
  wording and the prompt injection given to agents, then verifies the ratio drops.
- **Multi-model fallback** — if the primary LLM fails, deterministic mode still runs
  (graceful degradation).

## Guardrails — What Must Never Heal Itself

The following principles are **absolute** and must not be weakened by any automation:

1. **Hardened Contexts are never changed automatically.** Immutability plus an RFC plus explicit
   human approval. AI may only *suggest*.
2. **An LLM is a tool, not an authority.** Every proposal carries a `confidence` score; below the
   threshold it queues for human review.
3. **Human-in-the-loop by default.** Automation proposes; a human (or an explicit rule)
   decides for Hardened.
4. **Safe rollout: warn → block.** An enforcement change never goes straight to `block`
   without a `warn` period and verification.
5. **Every action produces an audit event.** No healing is invisible.
6. **Reversible.** A versioned registry plus snapshots; rollback with a single command.
7. **Must never reduce health.** Verify is mandatory; if the health score drops after a heal,
   the system withdraws the change.
8. **Never create a hardened classification automatically.** Extraction results always enter as
   `draft`/`local-experimental`, never directly as `hardened-standard` or `active`.
9. **Psychological safety** (0009): violation data is never used to evaluate individual
   performance.

## End-to-End Scenarios

### 1. A Context full of false positives (refinement)

1. **Observe:** the `ctx-no-secrets` regex verifier blocks test fixture files — 40% dismissal.
2. **Diagnose:** the `HIGH_FALSE_POSITIVE` trigger fires.
3. **Decide:** classification is `local-guideline` → the auto path.
4. **Heal:** the system composes a scope variant `applies_to: ["src/**", "!**/__tests__/**"]`
   and drops it to `warn` mode for 7 days.
5. **Verify:** false positives fall below 5%; the variant is promoted to `block`.
   The health score rises; an event is recorded.

### 2. A rule no longer being violated (deprecation)

- Dormancy > 90 days → the `STALE_NO_VIOLATION` trigger fires.
- `local-standard` → an automatic deprecation proposal with a notification to the owner.
- `hardened-standard` → an RFC proposal is opened for human review.
- Once approved → `deprecated` → (30 days) → `archived`.

### 3. A new regulation detected (creation)

- `lcd source watch` detects a change in a regulatory source → the `NEW_SOURCE_DETECTED` trigger fires.
- `lcd extract <id> --auto` → normalize → a new **draft** Context, routed to a compliance reviewer.
- Never activated automatically — and certainly never as `hardened`.

### 4. AI drift

- AI violation ratio > 2× human for 7 days → the `AI_DRIFT` trigger fires.
- The system rewrites the Context wording for clarity and repairs the prompt injection,
  then verifies the ratio drops below 2× within 14 days. If it does not, it escalates to human review.

## Success Metrics

| Metric | Target | Meaning |
| --- | --- | --- |
| Context Debt Score stable or falling with no manual effort | Does not rise for 3 months | Healing prevents decay |
| Mean Time to Heal | Diagnosis to heal < 1 day (Local) | The loop runs quickly |
| Aggregate False Positive Rate | Falls below 10% | Repairs are effective |
| Approval rate of auto-heal proposals | > 80% accepted by humans | The system guesses correctly |
| Rollback rate | < 5% | Repairs are rarely wrong |
| Hardened auto-modified | 0 occurrences | The guardrail works |

## Related Documents

- [lcdd-implementation-plan.md](lcdd-implementation-plan.md) — the engineering plan that turns
  Phase A of this proposal into code.
- [glossary.md](glossary.md) — Context Debt, Context Health, Context Evolution.
- [research-v2.md](research-v2.md) — implementation status tracking; self-healing complements
  Phase 4 (enforcement ecosystem) and feeds Phase 5 (registry/marketplace).
- [0009-observability.md](../specification/0009-observability.md) — the metrics and alerts that
  become self-healing's "senses".
- [0006-context-builder.md](../specification/0006-context-builder.md) — the 9-stage pipeline,
  especially Stage 08 Observe and Stage 09 Improve.
- [0004-governance.md](../specification/0004-governance.md) — Option C: fitness-based
  evolution for Local Contexts.
- [0017-pipeline-automation-plan.md](../specification/0017-pipeline-automation-plan.md) —
  Stage 09 Phase C: fitness-based optimization plus A/B testing.
- [ROADMAP.md](../ROADMAP.md) — v0.5.0 self-healing and the path to v1.0.0.

## Closing

Self-healing is not about removing humans from governance — it is about ensuring humans only
handle the decisions that genuinely require judgment. LCDD's principles already provide every
element: machine-readable structure, a safe lifecycle, a classification that distinguishes what
may change quickly, and observability that makes decay measurable. What remains is closing the
loop — incrementally, with guardrails, and always with an audit trail.

> *"The best way to predict the future is to specify it."*
