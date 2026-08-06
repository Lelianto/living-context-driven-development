# 0009 — Observability

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines the Observability model for Living Context Driven Development. Observability closes the feedback loop between context enforcement and context improvement, answering: "Is this context working? Is it still relevant? Is it causing more harm than good?"

---

## Motivation

A context that is enforced but never observed is a blind rule. Without observability, teams cannot answer basic governance questions: Which contexts are violated most frequently? Are AI agents violating contexts more than humans? Has a context become obsolete? Observability transforms context management from a compliance checkbox into an engineering practice. See [0000-problem.md] P7.

---

## Observability Data Model

### Enforcement Event

Every enforcement action produces an event:

```yaml
enforcement_event:
  event_id: "evt-x9y8z7"
  timestamp: "2026-08-06T14:22:00Z"
  context_id: "ctx-a1b2c3d4"
  context_version: 3
  artifact_path: "api/src/handlers/users.ts"
  artifact_hash: "sha256:abc123..."
  status: "violation"
  violations:
    - location: { line: 42, column: 5 }
      rule_id: "no-plaintext-secrets"
  enforcement_action: "block"
  actor:
    type: "human" | "ai-agent"
    id: "user:jane-doe" | "ai-agent:claude-code-v2"
  repository: "org/backend-api"
  branch: "feature/add-user-endpoint"
  commit_sha: "abc123def456"
  pull_request_id: "PR-1234"
  verifier:
    type: "static-analyzer"
    version: "2.1.0"
    duration_ms: 12
```

### Lifecycle Event

Every lifecycle transition produces an event (see [0002-context-lifecycle.md] for the full schema).

### Dismissal Event

When a human dismisses a violation as a false positive:

```yaml
dismissal_event:
  event_id: "dismiss-001"
  enforcement_event_id: "evt-x9y8z7"
  timestamp: "2026-08-06T15:00:00Z"
  actor: "user:jane-doe"
  reason: "False positive — the detected string is a test fixture, not a production secret"
  context_id: "ctx-a1b2c3d4"
```

### Challenge Event

When a context's authority or correctness is challenged:

```yaml
challenge_event:
  event_id: "challenge-001"
  context_id: "ctx-a1b2c3d4"
  timestamp: "2026-08-06T16:00:00Z"
  challenger: "user:tech-lead"
  reason: "This context requires bcrypt cost >= 12, but our auth service uses Argon2 which is cryptographically stronger"
  evidence_links: ["https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html"]
  status: "open" | "resolved" | "rejected"
```

---

## Metrics

### Context-Level Metrics

| Metric | Definition | Use Case |
|---|---|---|
| **Violation Rate** | violations / total evaluations (per time period) | Is this context being followed? |
| **Violation Trend** | Violation rate slope over time | Is compliance improving or degrading? |
| **False Positive Rate** | dismissals / violations | Is the context or verifier flawed? |
| **AI Violation Ratio** | ai-agent violations / total violations | Are AI agents following rules? |
| **Time to Compliance** | Duration from first violation to fix (per artifact) | Are violations being addressed? |
| **Context Age** | Days since context became Active | Is this context due for review? |
| **Dormancy Score** | Days since last violation of this context | Has this context been fully absorbed? |
| **Challenge Rate** | challenges / (active days × artifact count) | Is this context controversial? |

### Registry-Level Metrics

| Metric | Definition | Use Case |
|---|---|---|
| **Active Context Count** | Number of contexts in Active stage | Is the rulebook growing unbounded? |
| **Context Age Distribution** | Histogram of Active context ages | Are we accumulating stale contexts? |
| **Draft Accumulation** | Number of contexts in Draft > 90 days | Are we discovering but never acting? |
| **Approval Latency** | Duration from Candidate to Approved | Is our governance process efficient? |
| **Hardened Ratio** | Hardened contexts / total Active contexts | Are we over-hardening? |
| **Context Density** | Active contexts / artifact count | Are we over-specifying? |
| **Cross-Team Context Count** | Contexts that apply to >1 team's artifacts | Are we coordinating or overreaching? |

---

## Dashboards

### Governance Dashboard

For CTOs, CISOs, and governance stakeholders:
- Active context count and trend.
- Hardened vs. Local ratio.
- Recent lifecycle transitions (what changed this week?).
- Pending approvals (what's stuck in Candidate?).
- Aging Draft contexts (what are we ignoring?).
- Top violated contexts (what rules are hardest to follow?).
- Top challenging contexts (what rules are most controversial?).

### Team Dashboard

For engineering teams:
- Contexts applicable to this team's artifacts.
- Team violation rate and trend.
- AI vs. human violation breakdown.
- Time-to-compliance metrics.
- Upcoming context changes (Approved → Active soon).

### Agent Dashboard

For AI agent observability:
- Agent violation rate vs. human violation rate.
- Agent violation trend.
- Agent dismissed violations (was the AI right?).
- Per-agent context compliance profile.

---

## Alerts

### Alert Rules

| Condition | Severity | Action |
|---|---|---|
| Hardened context violation rate spikes > 50% week-over-week | High | Notify authority owner; investigate cause |
| AI agent violation rate > 2× human violation rate for 7 days | Medium | Review AI agent prompt and context injection; possible specification drift |
| Context false positive rate > 20% for 30 days | Medium | Flag context for refinement review |
| Draft context age > 90 days with no activity | Low | Prompt owner: "Still relevant? Archive or promote?" |
| Context zero violations for 90 consecutive days | Low | Prompt owner: "Still needed? Consider deprecation." |
| Hardened context modified without RFC link | Critical | Security event; block the change |
| New regulatory source detected with relevance > 0.8 | Medium | Notify compliance team; queue for extraction |

---

## Data Retention

| Data Type | Retention Period | Rationale |
|---|---|---|
| Enforcement events | 12 months (active), 7 years (archived) | Debugging, trend analysis, compliance audits |
| Lifecycle events | Indefinite | Audit trail of all governance decisions |
| Dismissal events | Same as parent enforcement event | False positive tracking |
| Challenge events | Indefinite | Governance audit trail |
| Aggregated metrics | Indefinite | Long-term trend analysis |
| Raw artifact content | 30 days | Privacy; store hashes for longer periods |

---

## Integration with External Observability

LCDD observability data SHOULD be exportable to existing observability platforms:

- **Metrics:** Prometheus/OpenTelemetry metrics format.
- **Logs:** Structured JSON log events.
- **Traces:** OpenTelemetry trace spans linking context retrieval → verification → enforcement action.
- **Dashboards:** Grafana dashboard templates for governance and team views.
- **Alerts:** Prometheus AlertManager or PagerDuty integration for alert rules.

---

## Privacy and Anonymization

Observability data contains information about individual developers and AI agents. Implementations SHOULD:

1. Anonymize individual developer identities in aggregate reports (team-level attribution only).
2. Retain developer identity in raw events for debugging and audit.
3. Provide a mechanism for developers to view their own violation history.
4. NEVER use violation data for individual performance evaluation — this destroys the psychological safety needed for honest adoption of LCDD.

---

## References

1. LCDD 0001 — Core Principles, Principle 7: Continuous Observability
2. LCDD 0002 — Context Lifecycle (review triggers based on observability data)
3. LCDD 0006 — Context Builder, Stage 8: Observe, Stage 9: Improve
4. LCDD 0008 — Verification (enforcement events)
