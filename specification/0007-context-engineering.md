# 0007 — Context Engineering

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines Context Engineering — the discipline of designing, maintaining, and evolving the Context artifacts that govern AI-assisted software development. Context Engineering is to LCDD what Prompt Engineering is to LLM interaction: a practitioner discipline for maximizing the effectiveness of the methodology.

---

## Motivation

Contexts are not just data — they are interfaces between governance intent and AI agent behavior. Poorly engineered contexts (vague, contradictory, unscoped, unenforceable) produce the same result as no contexts at all: AI agents that operate without effective guardrails. Context Engineering provides principles and patterns for crafting contexts that are clear, enforceable, and evolvable.

---

## Core Principles of Context Engineering

### CEP 1: Specificity over Generality

A context that says "Write secure code" is useless. A context that says "All SQL queries MUST use parameterized statements; string concatenation with user input is BLOCKED" is enforceable.

**Guideline:** Every context SHOULD be specific enough that an automated system can determine, without ambiguity, whether a given artifact violates it.

### CEP 2: Single Responsibility

A context SHOULD assert exactly one constraint. Contexts that bundle multiple constraints ("API responses must include request IDs, be under 1MB, and never expose stack traces") are harder to scope, enforce, and deprecate independently.

**Guideline:** If a context's description contains "and" connecting two independent requirements, split it.

### CEP 3: Positive Framing with Negative Guardrails

Where possible, frame constraints positively ("X MUST do Y") rather than negatively ("X MUST NOT do Z"), but always include the negative guardrail for the enforcement specification.

**Example:**
- **Bad:** "Don't store plaintext passwords."
- **Good:** "Passwords MUST be hashed using bcrypt with cost factor >= 12. Plaintext password storage is BLOCKED."

### CEP 4: Actionable Violation Messages

When a context is violated, the violation message MUST tell the developer exactly what to do. "Violation of ctx-sec-001" is not actionable. "This file stores a plaintext password (line 42). Use bcrypt.hash(password, 12) instead. See: https://security.internal.example.com/password-policy" is actionable.

**Guideline:** Every enforcement specification SHOULD include a `violation_message_template` with placeholders for artifact-specific details.

### CEP 5: Scope Minimalism

A context's `appliesTo` SHOULD be as narrow as possible while still covering all relevant artifacts. `**/*` scope is a code smell — it means the context author didn't think about scope, or the context is aspirational rather than enforceable.

**Guideline:** Prefer explicit file patterns (`api/src/handlers/**/*.ts`) over broad patterns (`**/*.ts`).

### CEP 6: Evidence-Anchored

Every context SHOULD link to evidence — the source document, the incident report, the regulation paragraph — that justifies its existence. A context without evidence is an assertion; a context with evidence is a traceable requirement.

### CEP 7: AI-Aware Language

Contexts are consumed by both humans and AI agents. Language that is clear to humans may be ambiguous to AI agents, and vice versa. Context engineering SHOULD consider both audiences:

- **For humans:** Clear prose, examples, rationale, links to documentation.
- **For AI agents:** Structured enforcement specification, explicit scope patterns, machine-readable severity, template violation messages.

### CEP 8: Evolvability by Design

Contexts SHOULD be designed with the expectation of change. This means:
- Version numbers from day one.
- Supersedes/supersededBy fields maintained.
- Deprecation paths considered at creation time.
- No hard-coded references to specific tool versions unless that *is* the constraint.

---

## Context Patterns

### Pattern: Policy Context

A context that encodes an organizational policy.

```yaml
title: "All production services MUST run on Kubernetes 1.28+"
category: "platform"
authority: { level: 3, source: "platform-team" }
governance: { classification: "hardened-standard" }
enforcement:
  mode: "block"
  specification:
    type: "infrastructure-as-code"
    config:
      check: "kubernetes_version"
      min_version: "1.28"
      applies_to: "infrastructure/terraform/**/*.tf"
```

### Pattern: Regulatory Context

A context that encodes an external regulation.

```yaml
title: "Customer PII MUST be stored in Indonesia-region data centers"
category: "compliance"
severity: "critical"
authority: { level: 4, source: "ojk-pojo-2026-045" }
governance: { classification: "hardened-mandate" }
enforcement:
  mode: "block"
  specification:
    type: "terraform-resource-constraint"
    config:
      resource_type: "aws_s3_bucket"
      required_tags:
        - key: "data-residency"
          value: "id"
      violation_message_template: >
        S3 bucket ${resource.name} does not enforce Indonesia data residency.
        Add tag data-residency=id or use ap-southeast-3 region.
```

### Pattern: Code Style Context

A context that encodes a team preference.

```yaml
title: "Use const over let when variable is never reassigned"
category: "code-style"
authority: { level: 1, source: "frontend-team" }
governance: { classification: "local-guideline" }
enforcement:
  mode: "warn"
  specification:
    type: "eslint-rule"
    config:
      rule: "prefer-const"
      level: "warn"
```

### Pattern: Architectural Invariant

A context that encodes an architectural boundary.

```yaml
title: "Frontend modules MUST NOT import directly from backend modules"
category: "architecture"
authority: { level: 3, source: "architecture-board" }
governance: { classification: "hardened-standard" }
enforcement:
  mode: "block"
  specification:
    type: "import-boundary"
    config:
      forbidden_imports:
        - from: "packages/frontend/**"
          to: "packages/backend/**"
          except: "packages/shared/**"
```

### Pattern: AI-Suggested Context

A context generated by an LLM, awaiting human review.

```yaml
title: "Rate limiting SHOULD be applied to all public API endpoints"
authority:
  source: { type: "ai-system", id: "claude-code" }
  level: 0
  trust_model: "ai-inferred"
  trust_score: 0.72
governance: { classification: "local-experimental" }
enforcement:
  mode: "comment"
source:
  type: "ai-system"
  confidence: 0.72
  extraction_context: "Codebase analysis detected missing rate limiting on 12/15 endpoints"
evidence:
  - type: "codebase-analysis"
    uri: "analysis://run/2026-08-06/rate-limiting"
    summary: "12 of 15 public API endpoints lack rate limiting middleware"
```

### Pattern: Temporal Context

A context that is only active during a specific time window (e.g., hackathon judging period).

```yaml
title: "Competition rubric: All features MUST have integration tests"
category: "hackathon"
authority: { level: 2, source: "hackathon-judges" }
governance: { classification: "hardened-local" }
effective_date: "2026-08-10T00:00:00Z"
deprecated_date: "2026-08-12T23:59:59Z"
enforcement:
  mode: "block"
  specification:
    type: "test-coverage"
    config:
      test_type: "integration"
      min_coverage_pct: 60
```

---

## Anti-Patterns

### Vague Context

```yaml
# BAD
title: "Write good code"
description: "Code should be good."
```

**Problem:** Unenforceable. Neither humans nor AI agents can determine what "good" means.

**Fix:** Be specific about what constitutes "good" in a measurable, enforceable way.

### God Context

```yaml
# BAD
title: "API Security Requirements"
description: >
  All APIs must use HTTPS, validate input, implement rate limiting,
  use OAuth 2.0, return proper error codes, log all requests,
  include correlation IDs, and never expose stack traces.
```

**Problem:** Bundles 8 independent concerns. Hard to scope, enforce, and deprecate individually.

**Fix:** Split into 8 separate contexts, each scoped appropriately.

### Orphan Context

```yaml
# BAD
title: "All deployments must pass security scan"
# No enforcement specification, no observability link
```

**Problem:** Declares a constraint but provides no mechanism to verify compliance. Becomes ignored.

**Fix:** Add an enforcement specification and observability mechanism, or keep it in Draft until they exist.

### Zombie Context

```yaml
# BAD
title: "Use Java 8"  # Active, but org migrated to Java 21 two years ago
lifecycle: "active"
```

**Problem:** An Active context that no one follows and no one remembers why it exists.

**Fix:** Regular review cycles (see [0002-context-lifecycle.md]) catch these. Observability data showing zero recent violations should trigger deprecation review.

### Cargo Cult Context

```yaml
# BAD
title: "100% test coverage required"
# Enforced with Block mode
```

**Problem:** A rule adopted because "everyone says you should" without evidence that it improves outcomes in this specific context.

**Fix:** Link to evidence. If no evidence exists, reduce authority level and enforcement mode until evidence is gathered.

---

## Context Engineering Workflow

```
1. Identify need → What constraint is missing?
2. Research source → Where does this constraint come from?
3. Draft context → Write it in Context Schema.
4. Validate → Can an automated system enforce this?
5. Review → Is it correct? Scoped right? Clear?
6. Activate → Push to Active with enforcement + observability.
7. Observe → Is it working? False positives? Developer friction?
8. Improve → Refine, deprecate, or replace.
```

---

## References

1. LCDD Glossary (docs/glossary.md) — Context definitions
2. LCDD 0006 — Context Builder (pipeline)
3. LCDD 0008 — Verification
4. LCDD 0009 — Observability
5. LCDD Context Schema (specification/0012-context-schema.md)
