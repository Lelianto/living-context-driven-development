# 0006 — Context Builder (Context Engineering Pipeline)

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines the Context Engineering Pipeline — the end-to-end process by which raw, heterogeneous sources are transformed into governed, enforceable Contexts. The pipeline is the operationalization of LCDD's core novelty: **Context Discovery before Context Enforcement.**

---

## Motivation

GrayBeam CDD enforces constraints extracted from code. AI Harness governs constraints manually defined by humans. Neither provides a pipeline for turning an OJK PDF or a Slack thread or a hackathon rubric into a machine-readable, governed, enforceable Context. The Context Engineering Pipeline fills this gap, making LCDD truly source-agnostic. See [0000-problem.md] P1, P2, P3.

---

## Pipeline Overview

```
Discover → Extract → Normalize → Classify → Review → Version → Enforce → Observe → Improve
   ↑                                                                                      │
   └──────────────────────────────────────────────────────────────────────────────────────┘
                                    (feedback loop)
```

Each stage is described below as a normative specification. Implementations MAY combine stages or add intermediate stages, but MUST preserve the logical flow and satisfy the entry/exit criteria of each stage.

---

## Stage 1: Discover

### Purpose

Identify potential sources of Contexts that are not yet represented in the Registry.

### Inputs

- URLs of regulatory websites (OJK, Kemenkop, Permendag, etc.)
- Paths to internal documentation repositories
- Links to competition rubrics, hackathon guidelines
- Integration with communication tools (Slack, Discord, email)
- Meeting transcripts, design documents, RFCs
- Customer feedback channels
- AI-generated suggestions from codebase analysis

### Process

1. **Source Registration:** Each source is registered with a URI, type, polling frequency, and ownership.
2. **Change Detection:** The Discover stage monitors registered sources for changes — new documents, updated pages, new regulations.
3. **Relevance Filtering:** Not every change to an external source is relevant. A change to OJK's agricultural lending regulations is irrelevant to a fintech payments product. Filtering uses heuristics, keyword matching, and (optionally) LLM-based relevance scoring.
4. **Candidate Generation:** Relevant changes produce Candidate Source Items — pointers to raw material that MAY contain new or changed contexts.

### Output

Candidate Source Items:
```yaml
source_item:
  id: "src-20260806-001"
  source_uri: "https://ojk.go.id/regulasi/pojk-2026-045"
  source_type: "regulatory-pdf"
  detected_at: "2026-08-06T08:00:00Z"
  change_type: "new" | "updated" | "deleted"
  relevance_score: 0.87
  summary: "POJK No. 45/POJK.05/2026 — New regulation on digital lending platforms"
  suggested_category: "fintech-regulation"
```

### Exit Criteria

- Source item is linked to a registered source.
- Relevance score is above configurable threshold.
- Source item is queued for Extraction.

---

## Stage 2: Extract

### Purpose

Transform raw source material into structured candidate Contexts.

### Inputs

- Candidate Source Items from the Discover stage.
- Access to the raw source content (PDF, HTML, Markdown, transcript, etc.).

### Process

1. **Format-Specific Parsing:** PDFs are OCR'd or text-extracted. HTML is rendered to text. Markdown is parsed. Transcripts are segmented.
2. **Constraint Extraction:** The parsed content is analyzed to identify statements that assert constraints. This MAY use:
   - **LLM-based extraction:** Prompt an LLM with the source text and a structured output schema matching the Context Schema. This is the recommended approach for unstructured sources.
   - **Regex/rule-based extraction:** For structured sources (e.g., "MUST", "SHALL NOT" patterns in RFC-style documents).
   - **Manual extraction:** Human annotators identify and transcribe constraints.
3. **Confidence Scoring:** Each extracted constraint receives a confidence score (0.0–1.0) from the extraction mechanism.
4. **Source Linking:** Each extracted constraint preserves a backlink to the exact location in the source (page number, paragraph, line number).

### Output

Extracted Candidate Contexts:
```yaml
context_candidate:
  source_item_id: "src-20260806-001"
  extraction_method: "llm-gpt4"
  confidence: 0.82
  raw_title: "Digital lending platforms must implement real-time credit scoring"
  raw_description: "Setiap platform pinjaman digital wajib..."
  raw_source_location: "POJK 45/2026, Pasal 12, Ayat 3"
  raw_category_suggestion: "fintech-regulation"
  raw_severity_suggestion: "critical"
```

### Quality Requirements

| Metric | Target |
|---|---|
| Extraction recall (constraints found / constraints present) | > 80% |
| Extraction precision (correct constraints / total extracted) | > 70% |
| Confidence calibration (confidence score accuracy) | Within 0.1 of actual correctness rate |

Human review in later stages compensates for imperfect extraction.

### Exit Criteria

- At least one candidate constraint extracted, OR source item marked as "no constraints found."
- Confidence scores assigned.
- Source locations preserved.

---

## Stage 3: Normalize

### Purpose

Map extracted candidates to the LCDD Context Schema, resolving format differences while preserving provenance.

### Inputs

- Extracted Candidate Contexts from the Extract stage.

### Process

1. **Schema Mapping:** Each extracted field is mapped to the corresponding Context Schema field. Missing required fields are flagged.
2. **ID Generation:** A unique Context ID is generated (UUID v4 or human-readable slug).
3. **Default Application:** Unpopulated optional fields receive sensible defaults:
   - `lifecycle`: `draft`
   - `version`: `1`
   - `governance.classification`: based on `authority.level` mapping
   - `enforcement.mode`: based on authority level mapping
4. **Validation:** The normalized context is validated against the Context Schema. Invalid contexts are returned to Extract with error details.
5. **Deduplication:** The normalized context is compared against existing Draft/Candidate/Active contexts. Near-duplicates (high text similarity) are flagged for human review rather than creating redundant contexts.

### Output

Normalized Contexts (valid against Context Schema, in Draft lifecycle stage).

### Exit Criteria

- Context passes schema validation.
- All required fields are populated (or flagged as intentionally missing with justification).
- Deduplication check complete.

---

## Stage 4: Classify

### Purpose

Assign lifecycle stage, authority level, governance classification, domain tags, and enforcement mode.

### Inputs

- Normalized Contexts from the Normalize stage.

### Process

1. **Authority Assignment:**
   - If the source is a recognized standard body → authority level 4 (Mandate).
   - If the source is an internal organization policy → authority level 3 (Standard).
   - If extracted by AI with low confidence → authority level 0 (Suggestion).
   - Otherwise → heuristic based on source type and content analysis.

2. **Governance Classification:**
   - Authority level 3-4 → Hardened (Hardened-Mandate or Hardened-Standard).
   - Authority level 1-2 → Local (Local-Standard or Local-Guideline).
   - Authority level 0 → Local-Experimental.

3. **Domain Tagging:** Auto-tagging based on content analysis and source metadata. Tags from a controlled vocabulary (e.g., `security`, `api`, `fintech`, `performance`).

4. **Severity Assignment:** Based on authority level and content analysis (e.g., words like "must," "wajib," "shall" → higher severity).

5. **Scope Inference:** Attempt to infer `appliesTo` from context content (e.g., "API endpoints" → `api/**`).

### Output

Classified Contexts (lifecycle=Draft, with populated authority, governance, tags, severity).

### Human Override

All automated classifications are provisional. Human reviewers in the Review stage MAY override any classification.

### Exit Criteria

- Authority level assigned.
- Governance classification assigned.
- At least one domain tag assigned.
- Severity assigned.
- Scope assigned (or explicitly set to `**/*` for unscoped contexts).

---

## Stage 5: Review

### Purpose

Human and/or automated review of classified contexts before they become enforceable.

### Inputs

- Classified Contexts from the Classify stage.

### Process

1. **Routing:** Contexts are routed to reviewers based on:
   - Domain tags → domain experts.
   - Authority level → appropriate approval chain.
   - Source → source owner or delegate.

2. **Review Checklist:**
   - [ ] Is the constraint factually correct?
   - [ ] Is the authority level appropriate?
   - [ ] Is the scope correct?
   - [ ] Does it conflict with existing Active contexts?
   - [ ] Is it enforceable (can an automated system detect violations)?
   - [ ] Is the description clear enough for both humans and AI agents?

3. **Decision:**
   - **Approve:** Context transitions to Candidate.
   - **Reject:** Context transitions to Archived with rejection reason.
   - **Request Revision:** Context returns to Draft with revision notes.

4. **Auto-Review (Local contexts only):** For Local-Guideline and Local-Experimental contexts with high extraction confidence (>0.9) and source type "automated" or "ai-system" at level 1, review MAY be automated — the context transitions directly to Active with an observation period.

### Output

Reviewed Contexts (lifecycle=Candidate, with review decisions recorded).

### Exit Criteria

- A review decision has been recorded.
- For approved contexts: all checklist items are satisfied.
- For rejected contexts: rejection reason is recorded.

---

## Stage 6: Version

### Purpose

Commit the approved Context to the Registry with an immutable version.

### Inputs

- Reviewed Contexts from the Review stage.

### Process

1. **Final Validation:** Full schema validation one final time before commit.
2. **Conflict Detection:** The Registry checks for conflicts with existing Active contexts.
3. **Version Assignment:** If this is a new context → version 1. If updating an existing context → current version + 1.
4. **Commit:** The context is written to the Registry as an immutable version.
5. **Event Emission:** A `context.versioned` event is emitted with the new state.

### Output

Versioned Context in the Registry (lifecycle=Approved, with version number, immutable).

### Exit Criteria

- Context is successfully written to the Registry.
- Version number is assigned and unique within the context lineage.
- Event is emitted.

---

## Stage 7: Enforce

### Purpose

Consume Active contexts through enforcement plugins and report violations.

*(Note: Enforcement is the domain of plugins, not the Registry. This stage describes the interface between the Registry and enforcement plugins.)*

### Process

1. **Context Retrieval:** Enforcement plugin queries Registry for Active contexts matching its scope.
2. **Artifact Evaluation:** Each target artifact (source file, API definition, infrastructure config) is evaluated against applicable contexts.
3. **Violation Detection:** Violations are detected and recorded with:
   - Context ID
   - Artifact path
   - Violation location (line/column or resource identifier)
   - Violation description
   - Severity
   - Enforcement action taken (block/warn/comment)

### Output

Enforcement Report.

### Exit Criteria

- All applicable Active contexts have been evaluated.
- Violations are recorded and surfaced.

---

## Stage 8: Observe

### Purpose

Collect and analyze enforcement outcomes to close the feedback loop.

### Process

1. **Data Collection:** Enforcement reports are aggregated into an observability store.
2. **Metrics Computation:**
   - Violation rate per context (violations / evaluations).
   - Violation trend (increasing, decreasing, stable).
   - AI vs. human violator ratio.
   - Context age vs. violation rate (are older contexts violated more or less?).
   - False positive ratio (violations that were overridden/dismissed by humans).
3. **Anomaly Detection:** Spikes in violations, sudden compliance drops, or contexts with rapidly declining relevance are flagged.
4. **Dashboard:** A queryable dashboard for governance stakeholders.

### Output

Observability data, dashboards, alerts.

### Exit Criteria

- Aggregated metrics are available.
- Anomalies are flagged.

---

## Stage 9: Improve

### Purpose

Use observation data to drive context evolution — refinement, deprecation, or creation of new contexts.

### Process

1. **Review Triggers:**
   - Context with zero violations for 90 days → "Is this still needed?"
   - Context with increasing violation rate → "Is the enforcement clear? Is the context correct?"
   - Context with high false positive rate → "Is the scope too broad?"
   - New regulation detected in Discover → "New context needed?"

2. **Change Proposal:** Based on the trigger, propose:
   - Refinement (update the context).
   - Deprecation (retire the context).
   - New context creation (loop back to Discover/Extract).
   - Governance reclassification (promote/demote).

3. **Approval:** Proposed changes enter the appropriate governance process (see [0004-governance.md]).

### Output

Context changes (new versions, deprecations, new contexts) fed back into the pipeline.

---

## Pipeline Configuration

A `pipeline.yaml` in the repository configures pipeline behavior:

```yaml
pipeline:
  version: "1.0"

  sources:
    - uri: "https://ojk.go.id/regulasi"
      type: "regulatory-website"
      poll_interval_hours: 24
      relevance_keywords: ["fintech", "pinjaman", "digital", "p2p"]
      owner: "compliance-team"

    - uri: "https://github.com/org/architecture-decisions"
      type: "git-repository"
      poll_interval_hours: 1
      paths: ["adr/**/*.md"]
      owner: "architecture-team"

    - uri: "slack://workspace/C012345"
      type: "slack-channel"
      poll_interval_hours: 6
      relevance_keywords: ["rule", "must", "wajib", "harus", "policy"]
      owner: "engineering"

  extraction:
    default_method: "llm-gpt4"
    confidence_threshold: 0.6
    max_candidates_per_source: 50

  classification:
    auto_authority_mapping:
      source_type_regulatory: 4
      source_type_organization_policy: 3
      source_type_team_standard: 2
      source_type_ai_suggestion: 0

  review:
    auto_approve:
      authority_max: 1
      confidence_min: 0.9
    review_sla_hours: 72

  improvement:
    zero_violation_days_before_prompt: 90
    increasing_violation_threshold_percent: 50
    high_false_positive_threshold_percent: 20
```

---

## References

1. LCDD Glossary (docs/glossary.md) — Context Builder, Pipeline stages
2. LCDD 0001 — Core Principles, Principle 2 and 10
3. LCDD 0000 — Problem Statement, P1 (Discovery Deficit), P2 (Source Fragmentation), P3 (No Unified Model)
4. GrayBeam Technology. *Constraint-Driven Development.* (2024–2025)
