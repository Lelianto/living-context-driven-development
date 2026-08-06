# 0002 — Context Lifecycle

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines the Context Lifecycle — the directed graph of stages through which every Context moves during its existence. The lifecycle determines enforcement behavior, review requirements, observability expectations, and governance rules at each stage.

---

## Motivation

Without an explicit lifecycle, a constraint discovered in a Slack thread and a constraint blocking production deployments are indistinguishable to the system. The lifecycle provides the vocabulary and rules for distinguishing "someone mentioned this might be a rule" from "this rule blocks all non-compliant changes." See [0000-problem.md] P4.

---

## The Lifecycle Model

### Stage Graph

```
                    ┌──────────────┐
                    │    Draft     │
                    └──────┬───────┘
                           │ review requested
                           ▼
                    ┌──────────────┐
                    │  Candidate   │
                    └──────┬───────┘
                           │ approved
                           ▼
                    ┌──────────────┐
              ┌─────│   Approved   │─────┐
              │     └──────┬───────┘     │
              │            │ activated   │ rejected
              │            ▼             │
              │     ┌──────────────┐     │
              │     │    Active    │     │
              │     └──────┬───────┘     │
              │            │ deprecated  │
              │            ▼             │
              │     ┌──────────────┐     │
              │     │  Deprecated  │     │
              │     └──────┬───────┘     │
              │            │ archived    │
              │            ▼             │
              │     ┌──────────────┐     │
              │     │   Archived   │     │
              │     └──────────────┘     │
              │                          │
              └──────────────────────────┘
                   (reactivation)
```

### Transition Rules

| From | To | Trigger | Requirements |
|---|---|---|---|
| — (creation) | Draft | Context discovered or proposed | None |
| Draft | Candidate | Review requested | Title, description, source, and authority MUST be populated |
| Draft | Archived | Proposal rejected | Reason for rejection MUST be recorded |
| Candidate | Approved | Review passed | All required fields MUST be populated; approver identity recorded |
| Candidate | Draft | Review returned for revision | Revision notes MUST be attached |
| Approved | Active | Activated | Enforcement mechanism MUST be configured; observability mechanism linked |
| Approved | Archived | Approval revoked | Reason for revocation MUST be recorded |
| Active | Deprecated | Context no longer applies | Deprecation reason recorded; replacement context linked if applicable |
| Active | Approved | Deactivated (temporary) | Reason for deactivation MUST be recorded |
| Deprecated | Active | Reactivated | Approval from original authority or successor |
| Deprecated | Archived | Fully retired | Retention period satisfied |
| Archived | Draft | Re-discovered/Re-proposed | New Context ID; references original as predecessor |

---

## Stage Specifications

### Draft

**Definition:** A Context that has been discovered or proposed but not yet formally reviewed.

**Entry Criteria:** None. Any source can produce a Draft context.

**Enforcement Behavior:** None. Draft contexts are NEVER enforced. They are visible in the Registry for discoverability but do not participate in validation.

**Review Requirements:** Optional. Teams may choose to periodically triage Draft contexts.

**Observability:** Track count of Draft contexts and age distribution. Contexts that remain in Draft for an extended period (> 90 days without activity) SHOULD trigger a review prompt or auto-archive suggestion.

**Visibility:** Visible to all consumers with `lifecycle=draft` filter.

**Example:** A Slack bot detects a message from a CTO saying "we should enforce 2FA on all production deployments" and creates a Draft context. No enforcement occurs, but the context is now visible and trackable.

---

### Candidate

**Definition:** A Context that has passed initial triage and is undergoing formal review.

**Entry Criteria:**
- Context MUST have a title, description, source, and authority.
- Context MUST be assigned to a reviewer or review team.
- A review request MUST be formally submitted.

**Enforcement Behavior:** Comment mode only. Candidate contexts MAY generate informational comments (e.g., "A candidate context 'Enforce 2FA' would apply here if approved") but MUST NOT block, warn, or alter behavior.

**Review Requirements:** Active human review is expected. Reviewers evaluate:
1. **Correctness:** Is the constraint factually correct?
2. **Scope:** Does it apply to the right artifacts?
3. **Conflict:** Does it conflict with existing Active contexts?
4. **Enforceability:** Can it be automatically enforced?
5. **Authority:** Is the claimed authority level appropriate?

**Observability:** Track review time (candidate-to-approved duration), rejection rate, and revision count.

**Visibility:** Visible to all consumers. Review status is public.

**Auto-Rejection:** A Candidate context with no activity for > 30 days SHOULD be automatically moved back to Draft with a comment.

---

### Approved

**Definition:** A Context that has been formally approved but is not yet actively enforced. The gap between Approved and Active allows for migration periods and team communication.

**Entry Criteria:**
- All required schema fields MUST be populated.
- An approver from the appropriate authority level MUST have signed off.
- The approval decision MUST be timestamped and recorded.
- If the context is Hardened, the approval MUST follow the hardened governance process (see [0004-governance.md]).

**Enforcement Behavior:** Warn mode by default. Approved contexts generate warnings to give teams visibility before the context becomes Active. The enforcement mode MAY be overridden to Comment for contexts with long migration periods.

**Review Requirements:** None (already reviewed). The Approved stage is a waiting period, not a review period.

**Observability:** Track time-to-activation. Contexts that remain Approved for > 30 days SHOULD trigger a prompt to either activate or explain the delay.

**Visibility:** Visible to all consumers.

**Migration Window:** The time between Approved and Active is the migration window. Teams SHOULD communicate this window explicitly and provide tooling to help developers pre-emptively comply.

---

### Active

**Definition:** A Context that is currently enforced. This is the "normal" state for a constraint that governs software behavior.

**Entry Criteria:**
- Context MUST be in Approved stage.
- Enforcement mechanism MUST be configured and tested.
- Observability mechanism MUST be linked.
- For Hardened contexts: a communication plan MUST confirm that affected teams are aware.

**Enforcement Behavior:** As specified by the context's `enforcement.mode` field. Typically Block for Hardened, Warn for Local, but MAY be configured per context.

**Review Requirements:** Periodic review. Active contexts SHOULD be reviewed at an interval defined by their authority level:
- Mandate authority: maximum 6-month review cycle
- Standard authority: maximum 12-month review cycle
- Guideline authority: maximum 18-month review cycle
- Preference authority: no required review cycle

**Observability:** Full observability is required. Every enforcement action MUST be logged. Aggregate statistics (violation rate, trend, AI vs. human violator ratio) MUST be queryable. Anomalous patterns MUST trigger alerts.

**Visibility:** Visible to all consumers. Enforcement results are queryable.

**Auto-Review Trigger:** If a context's violation rate drops to zero and stays at zero for 90 days, a prompt SHOULD ask: "Is this context still needed, or has it been fully absorbed into team practice?"

---

### Deprecated

**Definition:** A Context that is no longer enforced but remains visible for historical reference and migration guidance.

**Entry Criteria:**
- A deprecation reason MUST be recorded.
- If replaced by another Context, the `supersededBy` field MUST link to the replacement.
- For Hardened contexts: deprecation MUST follow the hardened governance process.
- A deprecation notice period MUST be specified (minimum 14 days for Hardened, 7 days for Local).

**Enforcement Behavior:** Warn mode. Violations generate warnings with the deprecation notice attached: "This constraint has been deprecated. Reason: [reason]. Replacement: [link]. It will be archived on [date]."

**Review Requirements:** None.

**Observability:** Track how often deprecated contexts are still referenced. A Deprecated context with zero references for 90 days SHOULD auto-archive.

**Visibility:** Visible to consumers with a deprecation indicator. Hidden by default in most queries; explicit filter required to see deprecated contexts.

**Grace Period:** The deprecation date to archival date is the grace period. During this period, teams SHOULD migrate to any replacement context and update their processes.

---

### Archived

**Definition:** A Context that has been fully retired and is retained only for audit, compliance, and provenance purposes.

**Entry Criteria:**
- Grace period MUST have elapsed (from deprecation date).
- If the context is part of any compliance evidence, the retention period for that compliance framework MUST be satisfied.

**Enforcement Behavior:** None. Archived contexts are NEVER enforced and NEVER generate notifications.

**Review Requirements:** None. Archived contexts are immutable.

**Observability:** Track archive rate and archive age distribution for capacity planning.

**Visibility:** Hidden by default. Requires explicit filter (`lifecycle=archived`) to retrieve. Archived contexts are excluded from all enforcement, observability, and query operations unless explicitly included.

**Retention:** Archived contexts SHOULD be retained indefinitely within the Registry. They serve as the audit trail for the governance system. Deletion of Archived contexts SHOULD require a legal or compliance justification.

---

## Lifecycle Events

Every lifecycle transition is an auditable event. The Registry MUST record:

```yaml
lifecycle_event:
  context_id: "ctx-abc123"
  from_stage: "candidate"
  to_stage: "approved"
  timestamp: "2026-08-06T10:30:00Z"
  actor: "user:jane-doe"
  actor_role: "security-reviewer"
  reason: "Constraint verified against PCI-DSS v4.0 Section 6.5"
  metadata:
    review_duration_seconds: 1209600  # 14 days
    approver_chain: ["user:cto", "user:ciso"]
```

---

## Lifecycle Query Patterns

Consumers query the Registry with lifecycle filters:

| Query Intent | Filter |
|---|---|
| "What rules currently govern me?" | `lifecycle=active` |
| "What proposed rules might affect me?" | `lifecycle=candidate` |
| "What rules were active during last deployment?" | Snapshot at deployment timestamp |
| "What rules recently changed?" | `lifecycle IN (active, deprecated)` with `effectiveDate` or `deprecatedDate` in range |
| "What rules are being considered?" | `lifecycle=draft` |
| "Historical audit: what rules existed in Q1 2025?" | Snapshot at 2025-03-31T23:59:59Z |

---

## Non-Normative Guidance

### How Long Should Each Stage Last?

| Stage | Recommended Maximum | Rationale |
|---|---|---|
| Draft | 90 days without activity | Prevent accumulation of abandoned ideas |
| Candidate | 30 days for review | Respect reviewer time; escalate if stalled |
| Approved | 30 days to activation | Avoid "permanently approved but never active" |
| Active | Authority-dependent review cycle | See Active stage specification |
| Deprecated | 14-90 day grace period | Allow migration without indefinite limbo |
| Archived | Indefinite | Audit trail must be preserved |

### What If We Need to Skip a Stage?

The lifecycle model is a *normative baseline*, not a straightjacket. Valid shortcuts include:

- **Emergency context:** Draft → Approved → Active, with post-hoc review within 72 hours. For security incidents or critical production issues.
- **Auto-approved local context:** Draft → Candidate → Active, with automated review for low-authority, low-risk constraints.
- **Immediate deprecation:** Active → Deprecated, for contexts that were found to be incorrect or harmful.

All shortcuts MUST be recorded with justification in the lifecycle event log.

---

## References

1. LCDD Glossary (docs/glossary.md) — Context Lifecycle definition
2. LCDD 0001 — Core Principles, Principle 3: Explicit Lifecycle
3. LCDD 0004 — Governance Model (determines approval requirements per lifecycle transition)
4. LCDD 0000 — Problem Statement, P4: Lifecycle Ambiguity
