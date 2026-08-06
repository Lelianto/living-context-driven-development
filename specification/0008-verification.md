# 0008 — Verification

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines Verification — the process of determining whether an artifact (source code, configuration, infrastructure definition, API specification) complies with Active Contexts. Verification is the bridge between Context definition and enforcement action.

---

## Motivation

A Context that cannot be verified is a Context that cannot be enforced. Verification provides the deterministic (or probabilistic, for AI-assisted verification) mechanism for answering: "Does this artifact violate this context?" See [0000-problem.md] P3.

---

## Verification Types

### Static Verification

**Definition:** Verification performed without executing the artifact. Examples: linting, type checking, schema validation, import boundary analysis, infrastructure-as-code scanning.

**Characteristics:**
- Deterministic (same input → same result).
- Fast (sub-second to seconds).
- Suitable for CI pipelines, pre-commit hooks, IDE integration.
- Limited to constraints that can be checked structurally (syntax, patterns, types, dependencies).

### Dynamic Verification

**Definition:** Verification performed by executing the artifact. Examples: integration tests, contract tests, chaos experiments, runtime monitoring.

**Characteristics:**
- May be non-deterministic (depends on runtime state).
- Slower (seconds to hours).
- Suitable for CI pipelines (longer stages), staging environments, production canaries.
- Can verify behavioral constraints (performance, correctness, resilience).

### AI-Assisted Verification

**Definition:** Verification performed by an LLM or other AI system evaluating the artifact against the context description. The AI makes a judgment call about compliance.

**Characteristics:**
- Probabilistic (confidence score, not boolean).
- Variable speed (depends on model and context size).
- Suitable for constraints that require semantic understanding: "Does this error message provide enough context for the user?", "Does this PR description explain the rationale?"
- MUST be treated as advisory for Hardened contexts unless confirmed by deterministic or human review.

---

## Verification Model

### Input

```yaml
verification_request:
  context: <Context Record>
  artifact:
    path: "api/src/handlers/users.ts"
    content: "<file contents or reference>"
    type: "typescript-source"
  options:
    strict_mode: false       # If true, even Comment-mode contexts are treated as violations
    context_window: 2000     # For AI-assisted: max tokens of artifact content to analyze
```

### Output

```yaml
verification_result:
  context_id: "ctx-a1b2c3d4"
  artifact_path: "api/src/handlers/users.ts"
  status: "compliant" | "violation" | "not_applicable" | "error" | "uncertain"
  violations:
    - location:
        line: 42
        column: 5
        end_line: 42
        end_column: 52
      description: "Plaintext password detected: `const password = req.body.password`"
      severity: "critical"
      suggestion: "Use bcrypt.hash(password, 12) to hash the password before storage."
      rule_id: "no-plaintext-secrets"
  confidence: 0.98            # For AI-assisted verification
  metadata:
    verifier: "static-analyzer-v2.1"
    duration_ms: 12
    timestamp: "2026-08-06T10:30:00Z"
```

### Status Definitions

| Status | Meaning |
|---|---|
| `compliant` | Artifact satisfies the context. No violations found. |
| `violation` | Artifact violates the context. One or more violations found. |
| `not_applicable` | Context does not apply to this artifact (e.g., context scoped to `api/**` but artifact is `frontend/**`). |
| `error` | Verifier encountered an error during verification. The artifact's compliance status is unknown. |
| `uncertain` | AI-assisted verifier could not determine compliance with sufficient confidence (below threshold). Requires human review. |

---

## Verifier Specification

Each enforcement `specification` block in a Context declares a verifier type and configuration:

```yaml
enforcement:
  mode: "block"
  specification:
    type: "eslint-rule"
    config:
      rule: "prefer-const"
      level: "error"
    violation_message_template: >
      Variable '${var.name}' is never reassigned.
      Use 'const' instead of 'let' at ${location.line}:${location.column}.
```

### Built-in Verifier Types

| Type | Description | Deterministic |
|---|---|---|
| `eslint-rule` | ESLint rule execution | Yes |
| `regex-pattern` | Regular expression match against file content | Yes |
| `file-exists` | Check that a specific file exists (e.g., `README.md`, `LICENSE`) | Yes |
| `import-boundary` | Validate that imports respect architectural boundaries | Yes |
| `schema-validation` | Validate artifact against a JSON Schema or OpenAPI Schema | Yes |
| `terraform-resource-constraint` | Validate Terraform resources against required properties | Yes |
| `test-coverage` | Check test coverage thresholds | Yes |
| `dependency-check` | Validate dependency versions against allow/block lists | Yes |
| `llm-evaluation` | AI-assisted semantic evaluation | No (probabilistic) |
| `custom-script` | Execute a custom verification script; exit code 0 = compliant | Depends on script |
| `composite` | Combine multiple verifier types with AND/OR logic | Depends on children |

### Composite Verifier

```yaml
specification:
  type: "composite"
  config:
    operator: "and"  # All child verifiers must pass
    verifiers:
      - type: "eslint-rule"
        config: { rule: "no-eval", level: "error" }
      - type: "regex-pattern"
        config: { pattern: "eval\\s*\\(", should_not_match: true }
```

---

## Verification Pipeline

```
Artifact → Scope Check → Context Retrieval → Verification → Result Aggregation → Enforcement Action
```

1. **Scope Check:** Does this context's `appliesTo` match this artifact's path?
2. **Context Retrieval:** Fetch the current version of applicable Active contexts.
3. **Verification:** Execute the verifier for each context.
4. **Result Aggregation:** Collect all verification results, deduplicate violations, resolve conflicts.
5. **Enforcement Action:** Apply enforcement mode (Block, Warn, Comment, Silent) based on aggregated results.

---

## Performance Considerations

### Caching

Verification results SHOULD be cached per (context_id, context_version, artifact_path, artifact_hash). Cache invalidation on context version change or artifact content change.

### Incremental Verification

In CI pipelines, only verify artifacts that changed since the last successful verification. Unchanged artifacts SHOULD use cached results.

### Parallelization

Verification of independent artifacts MAY be parallelized. Verification within a composite verifier SHOULD be parallelized where sub-verifiers are independent.

### Timeout

Each verifier SHOULD have a configurable timeout. Default: 30 seconds for static verifiers, 120 seconds for dynamic verifiers, 300 seconds for AI-assisted verifiers. Timeouts produce `error` status.

---

## Trust and Verification

### Verification Trust Chain

```
Source Document → Context → Enforcement Specification → Verifier → Result → Action
```

A break in any link breaks the trust chain:
- **Source document is wrong:** Context is wrong → fix the context.
- **Context is ambiguous:** Verifier cannot determine compliance → improve the context.
- **Verifier is buggy:** False positives/negatives → fix the verifier.
- **Result is ignored:** Enforcement action is not applied → fix the enforcement pipeline.

### False Positive Handling

When a human determines a violation is incorrect (false positive):
1. The violation is dismissed with a reason.
2. The dismissal is recorded as an event.
3. If false positive rate exceeds 20% over 30 days, the context SHOULD be reviewed for refinement.
4. Dismissal patterns inform Context Improvement (see [0006-context-builder.md] Stage 9).

---

## References

1. LCDD 0005 — Context Registry (API for context retrieval)
2. LCDD 0006 — Context Builder (Stage 7: Enforce)
3. LCDD 0009 — Observability (tracking verification results)
4. LCDD 0012 — Context Schema (enforcement specification block)
