# LCDD Methodology Guide

**Status:** Draft  
**Version:** 0.1.0

---

## Overview

This document is a comprehensive walkthrough of the Living Context Driven Development methodology. It is intended for practitioners who want to understand the full methodology — what it is, why it exists, how it works, and how to apply it.

This is the LCDD equivalent of Spec-Driven Development's `spec-driven.md` or Domain-Driven Design's "Blue Book" — a methodology guide, not a specification reference.

---

## Table of Contents

1. [The World Before LCDD](#1-the-world-before-lcdd)
2. [The Core Idea](#2-the-core-idea)
3. [The Context: Your New Best Friend](#3-the-context-your-new-best-friend)
4. [The Lifecycle: A Context's Journey](#4-the-lifecycle-a-contexts-journey)
5. [The Pipeline: From Unknown to Enforced](#5-the-pipeline-from-unknown-to-enforced)
6. [Governance: Who Decides What Changes](#6-governance-who-decides-what-changes)
7. [Working with AI Agents](#7-working-with-ai-agents)
8. [Enforcement: Making Rules Real](#8-enforcement-making-rules-real)
9. [Observability: Closing the Loop](#9-observability-closing-the-loop)
10. [Context Packs: Sharing and Reuse](#10-context-packs-sharing-and-reuse)
11. [Adoption Path](#11-adoption-path)
12. [Patterns and Anti-Patterns](#12-patterns-and-anti-patterns)

---

## 1. The World Before LCDD

### How Teams Govern Software Today

Walk into any engineering team and ask: "What are the rules that govern your software?" You'll get answers like:

- "We have a linter config" — points to `.eslintrc`
- "Our security policy is in the wiki" — hasn't been updated in 18 months
- "We follow OJK regulations" — but nobody can point to which specific rules apply
- "The CTO mentioned we should use PostgreSQL" — in a Slack thread from March
- "Our AI coding tool knows our conventions" — it knows the file it was last prompted with

The rules exist. But they are **scattered, invisible, inconsistent, and unenforceable as a unified system.**

### What Happens When AI Enters

Add an AI coding agent to this environment. The agent:

1. Generates code faster than humans can review it.
2. Has no access to the wiki, the Slack thread, or the CTO's preferences.
3. Optimizes for a narrow metric: "all tests pass."
4. When a test fails, it may fix the implementation — or it may fix the test.

**Specification Drift** is not a bug. It is rational behavior within the agent's objective function. If the only metric is "all tests pass" and the agent has write access to tests, rewriting tests is optimal.

### The Three Bottlenecks

| Bottleneck | Symptom | Consequence |
|---|---|---|
| **Discovery Deficit** | "I didn't know we needed to comply with that regulation." | Fines, rejected certifications, security incidents |
| **Governance Asymmetry** | "Why does changing tabs-to-spaces require the same PR process as changing the auth system?" | Process fatigue or dangerous shortcuts |
| **Specification Drift** | "The tests all pass now. Why are users reporting the same bug?" | False confidence, silently degraded quality |

---

## 2. The Core Idea

### One Sentence

**Make every rule, constraint, policy, and piece of governance knowledge a first-class, versioned, machine-readable artifact with a defined lifecycle, explicit authority, and observable enforcement.**

### What Changes

| Before LCDD | After LCDD |
|---|---|
| Rules are scattered across wikis, Slack, PDFs, code, and minds. | Rules are **Contexts** — unified artifacts in a **Context Registry**. |
| "Someone mentioned this might be a rule." | The context is in **Draft** stage — visible but not enforced. |
| A regulation changes. Nobody notices for 6 months. | The **Discovery Pipeline** detects the change and opens a PR. |
| An AI agent rewrites a test to match broken code. | The agent cannot modify **Hardened** contexts; the drift is detected. |
| "Is this rule still relevant?" | **Observability data** shows violation trends; stale rules are flagged. |
| Every team reinvents their own policies. | Teams import **Context Packs** from community or organization. |

### The LCDD Stack

```
┌──────────────────────────────────────────────┐
│               GOVERNANCE LAYER                │
│  Who can change what, how fast, with what     │
│  approval? (Hardened vs. Local)               │
├──────────────────────────────────────────────┤
│               LIFECYCLE LAYER                  │
│  Draft → Candidate → Approved → Active →      │
│  Deprecated → Archived                        │
├──────────────────────────────────────────────┤
│               CONTEXT LAYER                    │
│  Structured, versioned artifacts with          │
│  authority, provenance, enforcement spec       │
├──────────────────────────────────────────────┤
│               DISCOVERY LAYER                  │
│  Pipeline: Discover → Extract → Normalize →   │
│  Classify → Review → Version                   │
├──────────────────────────────────────────────┤
│               ENFORCEMENT LAYER                │
│  Pluggable: CI, IDE, API Gateway, AI Agent,    │
│  Pre-commit                                    │
├──────────────────────────────────────────────┤
│               OBSERVABILITY LAYER              │
│  Metrics, dashboards, alerts, feedback →       │
│  Improve                                       │
└──────────────────────────────────────────────┘
```

---

## 3. The Context: Your New Best Friend

### What Is a Context, Really?

A Context is a **self-contained governance file**. Think of it as a unit test for a rule, except instead of testing code behavior, it declares and enforces a constraint.

Every Context answers these questions:

| Question | Field |
|---|---|
| What is the rule? | `title`, `description` |
| Where did it come from? | `source` |
| Who says so? | `authority` |
| What stage is it in? | `lifecycle` |
| Who can change it? | `governance` |
| Where does it apply? | `applies_to` |
| What happens on violation? | `enforcement` |
| Why does this rule exist? | `evidence` |

### A Real Context, Annotated

```yaml
# ── IDENTITY ──
id: "ctx-no-secrets-in-code"
version: 3                          # This is the third revision

# ── WHAT ──
title: "Secrets MUST NOT be committed to source code"
description: >
  API keys, tokens, passwords, and private keys MUST be stored
  in environment variables or a secrets manager. They MUST NOT
  appear in source code, config files, or documentation in version control.

  ## Compliant
  ```typescript
  const apiKey = process.env.API_KEY;  // ✅ From environment
  ```

  ## Non-Compliant
  ```typescript
  const apiKey = "sk-abc123xyz";       // ❌ Hardcoded secret
  ```

# ── WHERE FROM ──
source:
  type: "incident"                    # This rule exists because of an incident
  uri: "https://incidents.example.com/INC-2025-042"
  document_id: "INC-2025-042"
  location: "Root cause analysis, section 4"

# ── WHO SAYS ──
authority:
  source:
    type: "organization"
    id: "security-team"
    name: "Security Team"
  level: 3                            # Standard — organization-wide policy
  delegation:
    - from: "cto-office"
      to: "security-team"
      scope: "application-security"
      effective_date: "2024-06-01"

# ── WHERE ──
applies_to:
  - "**/*.ts"
  - "**/*.js"
  - "**/*.py"
  - "**/*.go"
  - "**/*.yaml"
  - "**/*.yml"
  - "**/*.env.example"               # Even example files!

# ── WHAT STAGE ──
lifecycle: "active"                   # This rule IS enforced right now
effective_date: "2025-02-01T00:00:00Z"

# ── WHO CAN CHANGE ──
governance:
  classification: "hardened-standard" # Changes require explicit approval
  approval_required: true
  approvers:
    - "org/security-team"
  min_review_period_hours: 168        # 7-day minimum review period

# ── HOW ENFORCED ──
enforcement:
  mode: "block"                       # Violations block merges
  specification:
    type: "composite"
    config:
      operator: "and"
      verifiers:
        - type: "regex-pattern"
          config:
            patterns:
              - "(?i)(api[_-]?key|secret|password|token)\\s*[:=]\\s*['\"][^'\"]+['\"]"
              - "-----BEGIN (RSA |EC )?PRIVATE KEY-----"
            should_not_match: true
        - type: "custom-script"
          config:
            command: "trufflehog filesystem --json --no-update ."
            exit_zero_on: "no verified secrets found"
    violation_message_template: >
      🚨 Secret detected in ${file.path}:${file.line}

      Do NOT commit secrets to version control.
      Move this value to an environment variable or secrets manager.

      See: https://security.internal.example.com/secrets-policy

# ── WHY ──
evidence:
  - type: "security-incident"
    uri: "https://incidents.example.com/INC-2025-042"
    description: "AWS key leaked via public GitHub repo (2025-01-15)."
  - type: "compliance-requirement"
    uri: "https://standards.example.com/SEC-STD-001"
    description: "Internal security standard requiring secrets management."

# ── METADATA ──
owner: "security-team"
tags:
  - "security"
  - "secrets"
  - "critical"
  - "all-languages"
```

### The Power of Structure

Because every Context follows the same schema:

- **CI can parse it** — and block merges that violate it.
- **AI agents can consume it** — and generate code that respects it.
- **Dashboards can query it** — "show me all Active contexts tagged 'security'."
- **Auditors can trace it** — from the rule to the source document to the incident that motivated it.
- **Teams can share it** — as a Context Pack that other teams import.

---

## 4. The Lifecycle: A Context's Journey

### The Six Stages

A Context is never "just active" or "just inactive." It moves through stages:

```
     ┌──────────┐
     │  DRAFT   │  ← "Someone mentioned this might be a rule."
     └────┬─────┘    No enforcement. Visible for discoverability.
          │
          ▼
     ┌──────────┐
     │CANDIDATE │  ← "Under formal review."
     └────┬─────┘    Comment-only. Reviewers evaluate correctness.
          │
          ▼
     ┌──────────┐
     │ APPROVED │  ← "Approved but not yet enforced."
     └────┬─────┘    Warn mode. Migration window for teams.
          │
          ▼
     ┌──────────┐
     │  ACTIVE  │  ← "This rules governs our software."
     └────┬─────┘    Full enforcement. Observability active.
          │
          ▼
     ┌──────────┐
     │DEPRECATED│  ← "No longer applies."
     └────┬─────┘    Warn mode. Points to replacement.
          │
          ▼
     ┌──────────┐
     │ ARCHIVED │  ← "Retained for audit only."
     └──────────┘    No enforcement. Immutable.
```

### Why Lifecycle Matters

A team discovers a new OJK regulation:

1. **Draft:** A context is created automatically. No enforcement. But the team can see: "There's a new regulation we should know about."
2. **Candidate:** The compliance officer reviews it. Is this correctly extracted? Does it apply to our product?
3. **Approved:** The compliance officer approves. The team has 30 days to prepare before enforcement.
4. **Active:** CI now blocks code that violates this regulation.
5. **Deprecated:** OJK revises the regulation. The old context is deprecated; a new one points to it.
6. **Archived:** After the grace period, the old context is archived for audit.

Without lifecycle, steps 1-3 and 5-6 don't exist. The only states are "rule exists somewhere" and "maybe we follow it?"

---

## 5. The Pipeline: From Unknown to Enforced

### The Nine Stages

```
Discover → Extract → Normalize → Classify → Review → Version → Enforce → Observe → Improve
```

### Walkthrough: A Fintech Startup Discovers a New OJK Regulation

#### Stage 1: Discover

The Discover stage monitors `https://ojk.go.id/regulasi` daily. A new POJK is published.

```
Source Item:
  id: "src-20260806-001"
  source_uri: "https://ojk.go.id/regulasi/pojk-2026-045"
  change_type: "new"
  relevance_score: 0.91
  summary: "New regulation on digital lending data residency"
```

#### Stage 2: Extract

An LLM reads the 200-page PDF and extracts candidate constraints:

```
Candidate: "Indonesian customer financial data MUST be stored in Indonesia"
Confidence: 0.85
Location: POJK 45/2026, Pasal 12, Ayat 3
```

#### Stage 3: Normalize

The candidate is mapped to the Context Schema. Missing fields are flagged. Duplicates are checked.

#### Stage 4: Classify

Based on source type (standard-body = OJK), the context is classified:
- Authority: Level 4 (Mandate)
- Governance: Hardened-Mandate
- Category: compliance
- Severity: critical

#### Stage 5: Review

The context is routed to the compliance team. They verify:
- ✅ The extraction is correct.
- ✅ The scope matches the startup's product.
- ✅ No conflict with existing Active contexts.
- Context transitions to Candidate → Approved.

#### Stage 6: Version

The context is committed to the Registry as version 1, lifecycle = Approved.

After a 14-day migration window, it transitions to Active.

#### Stage 7: Enforce

CI is updated. Any Terraform config that places data outside `ap-southeast-3` is blocked.

#### Stage 8: Observe

The team can see: this context has been violated 3 times this month, all by new hires who weren't aware of the regulation. The violation message template is improved.

#### Stage 9: Improve

After 6 months, the violation rate drops to zero. The context is working. No improvement needed — but it will be reviewed again in 6 months.

### What Makes This Different

Without LCDD, the same scenario plays out like this:

- **Month 1:** OJK publishes a new regulation. Nobody notices.
- **Month 4:** A compliance consultant mentions it in passing during an audit prep.
- **Month 5:** The CTO reads the regulation and sends a Slack message: "Team, we need to handle this."
- **Month 7:** A developer adds data residency checks to the Terraform config.
- **Month 8:** Another developer, unaware of the Slack thread, deploys a new service to `us-east-1` with Indonesian customer data.

With LCDD, the pipeline compresses this to **14 days** from publication to enforcement, and the constraint is visible, traceable, and auditable at every step.

---

## 6. Governance: Who Decides What Changes

### The Hardened / Local Split

Not all rules deserve the same process:

| Classification | Example | Change Process |
|---|---|---|
| **Hardened-Mandate** | OJK data residency requirement | Formal RFC + legal review + executive approval |
| **Hardened-Standard** | CISO security policy | RFC + authority owner + cross-team review |
| **Local-Guideline** | Preferred library versions | Team consensus PR |
| **Local-Experimental** | AI-suggested optimization | Auto-merge, observation period |

### Specification Drift Prevention

This is where LCDD directly addresses the AI Harness problem:

1. **Hardened contexts are immutable to AI agents.** An AI agent cannot modify `ctx-ojk-data-residency` — period. Any attempt is logged as a security event.
2. **AI agents can propose Local contexts** — as Draft, authority level 0, with a confidence score.
3. **When an AI agent's PR modifies test assertions**, the CI pipeline checks: did the assertion change make the test *weaker*? If yes, the PR is flagged for mandatory human review.

### The Governance Decision Matrix

When a change is proposed, this matrix determines the process:

| Context Classification | Proposed By | Process |
|---|---|---|
| Hardened | Human | Formal RFC → Review → Approval → Activation |
| Hardened | AI Agent | **Blocked** — logged as security event |
| Local-Standard | Human | Standard PR → Team review → Merge |
| Local-Standard | AI Agent | AI opens PR → Human review required → Merge |
| Local-Guideline | Human | PR → Optional review → Merge |
| Local-Guideline | AI Agent | AI opens PR → Auto-merge after 7-day observation |
| Local-Experimental | Anyone | Auto-merge → Post-hoc review if issues found |

---

## 7. Working with AI Agents

### Context Injection

When an AI coding agent works on your repository, LCDD ensures it knows the rules:

```
[LCDD_CONTEXT_START]
ID: ctx-no-secrets-in-code
TITLE: Secrets MUST NOT be committed to source code
AUTHORITY: Standard (Security Team) | Level 3
GOVERNANCE: Hardened-Standard | CANNOT BE MODIFIED BY AI
ENFORCEMENT: Block — violations prevent merge
VIOLATION EXAMPLE: const apiKey = "sk-abc123"
COMPLIANCE EXAMPLE: const apiKey = process.env.API_KEY
[LCDD_CONTEXT_END]
```

The agent receives only the contexts relevant to its current task (scoped by `applies_to`), prioritized by severity and governance classification.

### Agent Accountability

Every enforcement event is attributed:

```yaml
enforcement_event:
  actor:
    type: "ai-agent"                    # or "human"
    id: "ai-agent:claude-code-v2"
    session_id: "session-xyz789"
```

This enables queries like: "Are AI agents violating the secrets policy more than humans?"

---

## 8. Enforcement: Making Rules Real

### Where Enforcement Happens

Enforcement is **pluggable**. A single Context can be enforced in multiple places:

| Enforcement Point | Example |
|---|---|
| **CI/CD Pipeline** | Block merges that violate Hardened contexts |
| **IDE** | Red squiggly lines for violations in real-time |
| **Pre-commit Hook** | Fast checks before code is committed |
| **AI Agent Prompt** | Contexts injected into the agent's system prompt |
| **API Gateway** | Runtime validation of API requests |
| **Terraform Plan** | Infrastructure compliance before apply |

### Enforcement Modes

| Mode | Behavior | Used For |
|---|---|---|
| **Block** | Prevents the artifact from progressing (merge blocked, deploy halted) | Hardened contexts |
| **Warn** | Generates a visible warning but does not block | Candidate, Deprecated, Local contexts |
| **Comment** | Informational annotation only | Draft contexts, low-authority guidelines |
| **Silent** | Tracked but not surfaced | Experimental contexts, observation-only |

---

## 9. Observability: Closing the Loop

### What You Can Know

With observability enabled, you can answer:

- **Which contexts are violated most frequently?** → Prioritize documentation or automation.
- **Are AI agents violating more than humans?** → Review agent prompts and context injection.
- **Is this context still relevant?** → If violation rate is zero for 90 days, it may be obsolete.
- **Is this context causing friction?** → High false positive rate means the context or verifier needs refinement.

### The Feedback Loop

```
Observe → Improve → Version → Enforce → Observe → ...
```

A context is **living** because it evolves based on evidence, not assumption.

---

## 10. Context Packs: Sharing and Reuse

### What Is a Context Pack?

A named, versioned collection of related Contexts. Like an npm package, but for governance.

```yaml
name: "@lcdd/fintech-ojk"
version: "1.3.0"
description: "OJK regulatory compliance for Indonesian fintech"
contexts:
  - id: "ctx-ojk-data-residency"
  - id: "ctx-ojk-kyc-aml"
  - id: "ctx-ojk-interest-transparency"
```

### Why Packs Matter

- **A fintech startup** imports `@lcdd/fintech-ojk` and gets OJK compliance contexts maintained by the community.
- **A healthcare startup** imports `@lcdd/healthcare-hipaa` for HIPAA contexts.
- **An internal platform team** publishes `@acme/architecture-standards` for all teams.
- **A hackathon** publishes the judging rubric as `@hackathon/rubric-2026`.

Packs are the mechanism for community contribution and cross-team standardization.

---

## 11. Adoption Path

LCDD is designed for incremental adoption. You don't need tooling to start.

| Level | What You Do | Time Investment | Value |
|---|---|---|---|
| **0: Awareness** | Read the manifesto and introduction. | 30 minutes | Mental model. |
| **1: Manual Contexts** | Write 3–5 key constraints as YAML in `.lcdd/`. | 1–2 hours | Explicit, shared rules. |
| **2: CI Enforcement** | Map existing linters and scanners to contexts. | 2–4 hours | Rules are enforced. |
| **3: Lifecycle** | Quarterly context review sessions. | 1 hour/quarter | Rules stay relevant. |
| **4: AI Agent Awareness** | Include contexts in AI tool system prompts. | 30 minutes | AI agents respect rules. |
| **5: Reference Tooling** | Use `lcd` CLI (v0.2.0+). | Migration effort | Automated workflow. |
| **6: Full Pipeline** | Discovery, extraction, MCP, dashboards. | Platform deployment | Complete methodology. |

See the full [Adoption Guide](docs/adoption.md).

---

## 12. Patterns and Anti-Patterns

### Patterns

**Policy Context:** Encodes an organizational policy with Block enforcement.  
**Regulatory Context:** Encodes an external regulation. Highest authority.  
**Code Style Context:** Encodes a team preference. Warn or Comment mode.  
**Architectural Invariant:** Encodes a structural boundary (e.g., frontend must not import from backend).  
**AI-Suggested Context:** Generated by AI, awaiting human review. Level 0.  
**Temporal Context:** Active only during a time window (e.g., hackathon judging period).

### Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Vague Context** | "Write secure code" — unenforceable. | Be specific: what exactly must be done? |
| **God Context** | Bundles 8 unrelated constraints. | Split into separate contexts. |
| **Orphan Context** | Declares a rule but has no enforcement. | Add enforcement or keep in Draft. |
| **Zombie Context** | Active but never violated — probably obsolete. | Regular reviews catch these. |
| **Cargo Cult Context** | "100% test coverage" — adopted without evidence. | Link to evidence or reduce authority level. |

See the full [Context Engineering Patterns](specification/0007-context-engineering.md).

---

## Summary

Living Context Driven Development is a methodology for teams that:

- Use AI coding agents and need guardrails against specification drift.
- Operate in regulated industries and need to discover and manage compliance constraints.
- Want to make their governance explicit, versioned, and observable.
- Believe that "we should have a rule about that" should lead to a governed, enforceable artifact — not a forgotten Slack message.

The methodology is defined in the [specification/](specification/) directory. The values and principles are in the [manifesto/](manifesto/) directory. The companion documentation is in [docs/](docs/). Example Context Packs are in [examples/](examples/).

---

*This methodology guide is part of the Living Context Driven Development Specification v0.1.0.*
