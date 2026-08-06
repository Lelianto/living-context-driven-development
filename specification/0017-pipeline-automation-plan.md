# Pipeline Automation Plan — Stages 01–05 & 09

**Status:** Planning  
**Version:** 0.3.0  
**Target Milestone:** v1.0.0  
**Last Updated:** 2026-08-06

---

## Abstract

This document outlines the technical design for automating the currently manual stages of the LCDD Context Engineering Pipeline: Discover (01), Extract (02), Normalize (03), Classify (04), Review (05), and Improve (09). These stages require LLM integration, scheduled jobs, and infrastructure that does not exist in the current v0.2.1 reference implementation.

---

## Current State vs Target

| Stage | Current (v0.2.1) | Target (v1.0.0) |
|---|---|---|
| 01 Discover | Manual — user monitors sources themselves | Automated cron job detects changes in registered sources |
| 02 Extract | Manual — user writes context YAML by hand | LLM parses source documents into candidate contexts |
| 03 Normalize | Manual — user follows schema guide | Programmatic mapping + validation + deduplication |
| 04 Classify | Manual — user assigns authority/tags | Heuristic + LLM classification with human override |
| 05 Review | Manual — user decides to activate | Automated routing + checklist + auto-approve for low-risk |
| 09 Improve | None — no feedback loop | Trigger-based recommendations from observability data |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     PIPELINE ORCHESTRATOR                     │
│  (Scheduled job — cron / GitHub Actions / dedicated worker)  │
└──────────────────────┬──────────────────────────────────────┘
                       │
     ┌─────────────────┼─────────────────┐
     ▼                 ▼                 ▼
┌─────────┐      ┌─────────┐      ┌─────────┐
│ Source   │      │  LLM    │      │Registry │
│ Connector│      │ Service │      │ Client  │
│          │      │         │      │         │
│ • Web    │      │ • GPT-4 │      │ • Read  │
│ • Git    │      │ • Claude│      │ • Write │
│ • Slack  │      │ • Local │      │ • Query │
│ • RSS    │      │  (Ollama)│     │         │
└─────────┘      └─────────┘      └─────────┘
```

### Design Principles

1. **Each stage is an independent, testable unit.** Input → transform → output. No shared state.
2. **Human-in-the-loop by default.** Automation proposes, humans approve for Hardened contexts.
3. **LLM is a tool, not the authority.** Every LLM output has a confidence score. Low-confidence outputs are queued for human review.
4. **All stages produce auditable events.** The Registry event log records every pipeline action.
5. **Graceful degradation.** If the LLM service is unavailable, the pipeline queues work and retries. The Registry and enforcement continue to function.

---

## Stage 01: Discover

### What It Does

Monitors registered sources for new or changed content that may contain constraints. Produces Candidate Source Items that enter the pipeline.

### Technical Design

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Source Registry │────▶│ Change        │────▶│ Relevance       │
│ (config file)   │     │ Detector      │     │ Filter          │
│                 │     │              │     │                 │
│ • URI           │     │ • HTTP GET    │     │ • Keyword match │
│ • Type          │     │ • Git diff    │     │ • LLM scoring   │
│ • Poll interval │     │ • RSS/Atom    │     │ • Domain filter │
│ • Owner         │     │ • Slack API   │     │                 │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
                                             ┌─────────────────┐
                                             │ Candidate Source │
                                             │ Items            │
                                             └────────┬────────┘
                                                      │
                                                      ▼
                                                Stage 02: Extract
```

### Source Connectors

| Connector | Mechanism | Complexity |
|---|---|---|
| **Website** | HTTP GET + checksum comparison (ETag / Last-Modified / SHA-256 of body) | Low |
| **Git Repository** | `git fetch` + `git diff --name-only` against last-seen commit | Low |
| **Slack/Discord** | API polling for new messages in monitored channels | Medium |
| **RSS/Atom** | Standard feed parsing + `pubDate` comparison | Low |
| **PDF Documents** | Download + checksum; passes raw PDF to Extract stage | Low |
| **GitHub Releases** | GitHub API for new release notes, changelogs | Low |
| **Custom Webhook** | User registers a webhook; Discover listens for push events | Medium |

### Configuration Format

```yaml
# .lcdd/pipeline.yaml
sources:
  - uri: "https://www.legislation.gov.uk/eu/regulation"
    type: "website"
    poll_interval_hours: 24
    owner: "compliance-team"
    relevance:
      keywords: ["data protection", "privacy", "personal data"]
      category_hint: "gdpr-compliance"

  - uri: "https://github.com/org/architecture-decisions"
    type: "git"
    poll_interval_hours: 1
    paths: ["adr/**/*.md"]
    owner: "architecture-team"

  - uri: "slack://workspace/C012345"
    type: "slack"
    poll_interval_hours: 6
    relevance:
      keywords: ["rule", "must", "shall", "policy", "required"]
```

### Implementation Approach

1. **Phase A (v0.5.0):** CLI command `lcd source add` to register sources. `lcd source check` to manually trigger discovery. Single-connector support (Git, Website).
2. **Phase B (v0.8.0):** Scheduled mode via GitHub Actions cron or system cron. Multi-connector support.
3. **Phase C (v1.0.0):** LLM-based relevance scoring. Dedicated worker process.

---

## Stage 02: Extract

### What It Does

Takes a Candidate Source Item and its raw content, parses it using an LLM, and produces structured Candidate Contexts.

### Technical Design

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Source Content  │────▶│ LLM Prompt    │────▶│ Response        │
│ (PDF text,      │     │ Builder       │     │ Parser          │
│  Markdown,      │     │               │     │                 │
│  HTML,          │     │ • System      │     │ • JSON parse    │
│  plain text)    │     │   prompt      │     │ • Schema        │
│                 │     │ • Source      │     │   validation    │
│                 │     │   content     │     │ • Confidence    │
│                 │     │ • Output      │     │   extraction    │
│                 │     │   schema      │     │                 │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
                                             ┌─────────────────┐
                                             │ Candidate       │
                                             │ Contexts        │
                                             └────────┬────────┘
                                                      │
                                                      ▼
                                                Stage 03: Normalize
```

### LLM Prompt Design

The prompt MUST instruct the LLM to:

1. Identify all constraint-like statements (sentences containing "must", "shall", "required", "prohibited", etc.)
2. For each constraint, extract: title, description, category suggestion, severity suggestion
3. Preserve source location (page, paragraph, section number)
4. Output structured JSON matching the Context Schema subset
5. Assign a confidence score (0.0–1.0) for each extraction

```json
// Expected LLM output format:
{
  "candidates": [
    {
      "title": "Data controllers must maintain a record of processing activities",
      "description": "Each controller shall maintain a record of processing activities under its responsibility...",
      "category": "compliance",
      "severity": "critical",
      "source_location": "Article 30, Paragraph 1",
      "confidence": 0.87
    }
  ]
}
```

### Model Selection

| Model | Use Case | Trade-off |
|---|---|---|
| **GPT-4o / Claude 3.5** | Primary — high-quality extraction | Cost per token, latency |
| **GPT-4o-mini / Claude Haiku** | Bulk processing of low-priority sources | Lower accuracy |
| **Llama 3 / Mistral (local)** | Offline / air-gapped environments | No API cost, lower quality |

### Cost Estimation

| Scenario | Documents/Month | Tokens/Document | Cost/Month (GPT-4o) |
|---|---|---|---|
| Small team (10 sources, weekly) | 40 | ~5K | ~$1 |
| Mid-size (50 sources, daily) | 1,500 | ~5K | ~$38 |
| Enterprise (500 sources, hourly) | 360,000 | ~5K | ~$9,000 |

### Implementation Approach

1. **Phase A (v0.5.0):** CLI `lcd extract <source-id>` — single-document extraction. OpenAI + Anthropic API support. Dry-run mode (output candidates to stdout, no Registry write).
2. **Phase B (v0.8.0):** Batch extraction. Local model support via Ollama. Cost tracking.
3. **Phase C (v1.0.0):** Streaming extraction for large documents. Incremental re-extraction on source update.

---

## Stage 03: Normalize

### What It Does

Maps extracted candidates to the full LCDD Context Schema, generates IDs, applies defaults, validates, and deduplicates.

### Technical Design

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Candidate       │────▶│ Schema        │────▶│ Deduplication   │
│ Contexts        │     │ Mapper        │     │ Engine          │
│                 │     │               │     │                 │
│                 │     │ • Field       │     │ • Text          │
│                 │     │   mapping     │     │   similarity    │
│                 │     │ • ID gen      │     │   (cosine /     │
│                 │     │ • Defaults    │     │   embedding)    │
│                 │     │ • Validate    │     │ • Exact match   │
│                 │     │               │     │ • Near-duplicate│
│                 │     │               │     │   flagging       │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
                                             ┌─────────────────┐
                                             │ Normalized      │
                                             │ Contexts        │
                                             └────────┬────────┘
                                                      │
                                                      ▼
                                                Stage 04: Classify
```

### Deduplication Strategy

1. **Exact match:** Compare normalized title + description hash against existing contexts.
2. **Near-duplicate:** Compute embedding of new context, compare cosine similarity against existing contexts. Flag if similarity > 0.85.
3. **User decision:** Show flagged duplicates to reviewer. Options: skip (duplicate), merge (combine), or create (sufficiently different).

### Implementation Approach

1. **Phase A (v0.5.0):** Schema mapping + validation + exact-match dedup. No embeddings yet.
2. **Phase B (v0.8.0):** Embedding-based dedup using a local embedding model. Configurable similarity threshold.
3. **Phase C (v1.0.0):** Cross-lingual dedup for multilingual regulatory sources.

---

## Stage 04: Classify

### What It Does

Assigns authority level, governance classification, domain tags, severity, and scope to each normalized context.

### Technical Design

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Normalized      │────▶│ Rule Engine   │     │ LLM Refinement  │
│ Contexts        │     │               │     │ (optional)      │
│                 │     │ • Source →    │     │                 │
│                 │     │   authority   │     │ • Complex       │
│                 │     │ • Keywords →  │     │   categories    │
│                 │     │   tags        │     │ • Scope         │
│                 │     │ • Severity →  │     │   inference     │
│                 │     │   from auth   │     │ • Ambiguous     │
│                 │     │   level       │     │   cases         │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
                                             ┌─────────────────┐
                                             │ Classified      │
                                             │ Contexts        │
                                             └────────┬────────┘
                                                      │
                                                      ▼
                                                Stage 05: Review
```

### Heuristic Classification Rules

```yaml
rules:
  - if: source.type == "standard-body"
    then:
      authority.level: 4
      governance.classification: "hardened-mandate"

  - if: source.type == "organization" AND source.document_id matches "policy|standard|requirement"
    then:
      authority.level: 3
      governance.classification: "hardened-standard"

  - if: extraction_method == "llm" AND confidence < 0.7
    then:
      authority.level: 0
      governance.classification: "local-experimental"

  - if: description contains "should|may|recommended|optional"
    then:
      severity: "low"

  - if: description contains "must|shall|required|mandatory|wajib|harus"
    then:
      severity: "high"
```

### Scope Inference (Experimental)

For contexts without explicit `applies_to`, attempt to infer scope:

- "API endpoints" → `api/**`
- "Frontend components" → `src/components/**`
- "Database schemas" → `**/*.sql, **/migrations/**`
- "Terraform configurations" → `**/*.tf`
- Otherwise → `**/*` (universal, flagged for human review)

### Implementation Approach

1. **Phase A (v0.5.0):** Rule engine with 5–10 deterministic rules. No LLM refinement.
2. **Phase B (v0.8.0):** LLM refinement for ambiguous cases. Scope inference.
3. **Phase C (v1.0.0):** Community-contributed rule packs (e.g., "EU Regulatory Classification Rules").

---

## Stage 05: Review

### What It Does

Routes classified contexts to appropriate reviewers, presents a structured review interface, and processes decisions.

### Technical Design

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Classified      │────▶│ Review        │────▶│ Decision        │
│ Contexts        │     │ Router        │     │ Processor       │
│                 │     │               │     │                 │
│                 │     │ • By domain   │     │ • Approve →     │
│                 │     │   tag         │     │   Candidate     │
│                 │     │ • By authority│     │ • Reject →      │
│                 │     │   owner       │     │   Archived      │
│                 │     │ • By source   │     │ • Revise →      │
│                 │     │   owner       │     │   Draft          │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
                                             ┌─────────────────┐
                                             │ Stage 06:       │
                                             │ Version         │
```

### Review Interface

The review interface SHOULD present:

1. Side-by-side: extracted context vs. original source text (with location highlighting)
2. Classification summary: proposed authority, tags, severity — with one-click overrides
3. Conflict check: does this context conflict with any existing Active context?
4. Enforceability check: can an automated system detect violations?
5. Decision buttons: Approve, Reject, Request Revision

### Review Channels

| Channel | Use Case |
|---|---|
| **GitHub PR Comment** | Context proposal opens a PR with the new context. Reviewers comment + approve. Merge = approve. |
| **CLI** | `lcd review list` shows pending reviews. `lcd review approve <id>` / `lcd review reject <id>`. |
| **Web Dashboard** | (v1.0.0) Full review queue with side-by-side source comparison. |
| **Slack Bot** | Notification: "3 contexts awaiting review." Approve/reject via slash command. |

### Auto-Approval Rules

Contexts meeting ALL of the following criteria are auto-approved (skip human review):

1. Authority level ≤ 2 (Guideline or below)
2. Governance classification contains "local" (not hardened)
3. Extraction confidence > 0.9
4. Source type is "ai-system" or "automated"
5. No conflicts with existing Active contexts

Auto-approved contexts still enter the Registry as Candidate → Approved → Active, but the Candidate→Approved transition is automatic. The context owner is notified.

### Implementation Approach

1. **Phase A (v0.5.0):** CLI-based review (`lcd review list/approve/reject`). GitHub PR-based review workflow. Auto-approval for low-risk contexts.
2. **Phase B (v0.8.0):** Web dashboard review queue. Slack notifications.
3. **Phase C (v1.0.0):** Collaborative review (multiple reviewers). Review analytics (time-to-approve, rejection rate).

---

## Stage 09: Improve

### What It Does

Uses observability data from Stage 08 to generate actionable recommendations: refine, deprecate, or create contexts. Also powers the **Context Debt Score** — a numerical metric of project knowledge health.

### Context Debt Score

```
Living Context Health: 92%
├── Stale Contexts:        14  (past review deadline)
├── Missing Owners:         3  (no accountable owner)
├── Conflicting Rules:      2  (equal-authority conflicts)
├── Deprecated (not archived): 18
├── Review Needed:          6  (Candidate stage > 30 days)
└── Orphaned:               5  (owner left org, no reassignment)
```

The score is computed as:

```
Score = 100 - (stale_weight * stale_count + missing_weight * missing_count + ...) / total_contexts
```

A score below 70 triggers a review recommendation. A score below 50 triggers an alert.

### `lcd audit` Command (v0.5.0)

```bash
$ lcd audit

Living Context Health: 82%
  89 contexts total

  Stale (past review deadline):    14
  Missing owner:                     3
  Conflicting rules:                 2
  Deprecated, not yet archived:     18
  Draft > 90 days:                   6
  Orphaned contexts:                 5

  Recommendations:
  • ctx-payment-rule: review overdue by 180 days
  • ctx-old-api: deprecated in 2024, archive now
  • ctx-v1-auth conflicts with ctx-v2-auth (equal authority)
  • ctx-temp-experiment: in Draft for 120 days, archive or promote
```

### Technical Design

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Observability   │────▶│ Trigger       │────▶│ Recommendation  │
│ Data (Stage 08) │     │ Evaluator     │     │ Generator       │
│                 │     │               │     │                 │
│ • Violation     │     │ • Zero viol.  │     │ • Refine        │
│   counts        │     │   > 90 days   │     │   context       │
│ • False positive│     │ • High FP     │     │ • Deprecate     │
│   rate          │     │   rate        │     │ • Create new    │
│ • Time-to-fix   │     │ • Increasing  │     │ • Reclassify    │
│ • AI vs human   │     │   violations  │     │                 │
│   ratio         │     │ • New source  │     │                 │
│                 │     │   detected    │     │                 │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
                                             ┌─────────────────┐
                                             │ Change Proposal │
                                             │ (PR / Issue /   │
                                             │  CLI output)    │
                                             └─────────────────┘
```

### Trigger Rules

```yaml
triggers:
  - name: "stale-context"
    condition: lifecycle == "active" AND days_since_last_violation > 90
    action: "prompt-deprecation"
    message: "This context has not been violated in 90 days. Is it still needed?"

  - name: "high-false-positive"
    condition: false_positive_rate > 0.2 AND observation_period_days > 30
    action: "prompt-refinement"
    message: "This context has a {rate}% false positive rate. Consider refining scope or verifier."

  - name: "increasing-violations"
    condition: violation_trend == "increasing" AND violation_count > 10
    action: "prompt-review"
    message: "Violations are increasing. Is enforcement unclear? Is the context correct?"

  - name: "ai-drift"
    condition: ai_violation_ratio > 2.0 AND observation_period_days > 7
    action: "prompt-agent-review"
    message: "AI agents violate this context at {ratio}x the human rate. Review prompt injection or context clarity."

  - name: "new-source-detected"
    condition: source_change_type == "new" AND relevance_score > 0.8
    action: "create-context"
    message: "New regulation detected: {source_summary}. Context extraction queued."
```

### Recommendation Output

Each recommendation is a structured proposal that can be:
- **Auto-applied** (Local contexts, low risk)
- **Opened as a PR** (Standard process)
- **Sent as a notification** (Informational)

```json
{
  "recommendation_id": "rec-20260806-001",
  "trigger": "stale-context",
  "context_id": "ctx-old-rule",
  "action": "deprecate",
  "reason": "Zero violations in 120 days.",
  "confidence": 0.95,
  "auto_apply": false,
  "proposed_change": {
    "lifecycle": "deprecated",
    "deprecated_date": "2026-08-06T00:00:00Z",
    "superseded_by": null
  }
}
```

### Implementation Approach

1. **Phase A (v0.5.0):** Basic trigger evaluation using observability data from event log. CLI: `lcd improve check` — prints recommendations to stdout.
2. **Phase B (v0.8.0):** Automated PR creation for recommendations. LLM-assisted refinement suggestions.
3. **Phase C (v1.0.0):** Fitness-function-based context optimization (inspired by GrayBeam CDD) for Local contexts only. A/B testing of variant constraints.

---

## Infrastructure Requirements

### v0.5.0 (Minimal)

- **Runtime:** Single Node.js process invoked by cron / GitHub Actions
- **LLM:** OpenAI or Anthropic API key (user-provided)
- **Storage:** File-based Registry (existing `.lcdd/` + event log)
- **Dependencies:** No new infrastructure

### v0.8.0 (Team Scale)

- **Runtime:** Dedicated worker process (Docker container)
- **LLM:** Configurable provider (OpenAI / Anthropic / Ollama)
- **Storage:** Database-backed Registry (PostgreSQL)
- **Dependencies:** PostgreSQL, optional Redis for job queue

### v1.0.0 (Enterprise Scale)

- **Runtime:** Distributed workers (Kubernetes / Nomad)
- **LLM:** Multi-model with fallback (primary + secondary + local)
- **Storage:** Event-sourced Registry with snapshots
- **Dependencies:** Kafka/Pulsar for event streaming, ClickHouse for observability

---

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| **LLM hallucination** | Incorrect constraints enforced | Confidence threshold + mandatory human review for Hardened contexts |
| **LLM cost overrun** | Unexpected API bills | Token budgeting, local model fallback, cost tracking dashboard |
| **Pipeline failure** | Missed regulatory updates | Graceful degradation: queue + retry, alert on failure |
| **Source change flood** | Noise from frequent minor updates | Relevance filtering, change batching, dedup at Normalize stage |
| **Review bottleneck** | Draft contexts accumulate unreviewed | Auto-approval for low-risk, SLA alerts, review load dashboard |
| **False improvement** | AI suggests wrong changes | Hardened contexts never auto-modified. All changes versioned + reversible. |

---

## Dependencies on Other Milestones

| Pipeline Stage | Depends On |
|---|---|
| 01 Discover + 02 Extract | LLM API integration (new) |
| 03 Normalize + 04 Classify | Context Schema v1.0 stabilization |
| 05 Review | GitHub integration (v0.5.0) or Dashboard (v0.5.0) |
| 09 Improve | Stage 08 Observability (v0.5.0) |

---

## References

1. GrayBeam Technology. *Constraint-Driven Development: A Technical Whitepaper.* (2024–2025). — Fitness-based constraint evolution (inspiration for Stage 09 Phase C)
2. LCDD 0006 — Context Builder (pipeline specification)
3. LCDD 0009 — Observability (metrics that feed Stage 09)
4. LCDD 0015 — Reference Architecture (deployment topologies)
