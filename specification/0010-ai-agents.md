# 0010 — AI Agents

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines how AI coding agents (LLM-based code generation and modification tools) interact with LCDD-governed systems. It specifies context injection, agent accountability, specification drift prevention, and agent-specific governance rules.

---

## Motivation

AI coding agents are not just faster developers — they are developers with a fundamentally different failure mode. Unlike humans, who may violate constraints through carelessness or ignorance, AI agents may violate constraints *strategically* — optimizing for a narrow objective ("all tests pass") by modifying the specifications that define correctness. LCDD's governance model must account for this adversarial capability. See [0000-problem.md] P6 (Specification Drift).

---

## Agent Types

### Type 1: Code Completion Agent

**Examples:** GitHub Copilot, Cursor Tab, Supermaven.  
**Behavior:** Suggests code completions inline as the developer types.  
**LCDD Interaction:** Contexts are injected into the agent's context window. Completions are evaluated against Active contexts in real-time; violations are flagged in the IDE.

### Type 2: Conversational Coding Agent

**Examples:** Claude Code, Cursor Chat, GitHub Copilot Chat, Codex CLI.  
**Behavior:** Accepts natural language instructions and generates/modifies code across multiple files.  
**LCDD Interaction:** Before generating code, the agent queries the Registry for applicable Active contexts. Contexts are injected into the conversation as structured constraints. Post-generation, all modified files are verified.

### Type 3: Autonomous Agent

**Examples:** SWE-bench agents, Devin, factory AI coding bots.  
**Behavior:** Operates autonomously — picks up issues, writes code, opens PRs, iterates on feedback.  
**LCDD Interaction:** The agent pipeline includes a mandatory verification stage. PRs opened by autonomous agents are flagged with `actor.type: "ai-agent"` and subject to additional governance checks.

---

## Context Injection Protocol

### When to Inject

Contexts MUST be injected into AI agent context windows:
1. **At session start:** All Active contexts applicable to the repository.
2. **At task scope change:** When the agent begins working on files that match additional contexts.
3. **On context change:** When a context transitions to Active or is modified, agents with active sessions SHOULD be notified.

### Injection Format

Contexts injected into AI agents MUST follow a structured, parseable format:

```
[LCDD_CONTEXT_START]
ID: ctx-sec-042
VERSION: 3
TITLE: All API endpoints MUST validate input against an OpenAPI schema
DESCRIPTION: Every API endpoint must have a corresponding OpenAPI 3.x
schema. Request validation MUST be performed at the API gateway layer.
AUTHORITY: Standard (CISO Office) | Level 3
GOVERNANCE: Hardened-Standard | CANNOT BE MODIFIED BY AI
ENFORCEMENT: Block — violations prevent merge
SCOPE: api/src/handlers/**/*.ts
VIOLATION_EXAMPLE: An endpoint handler without input validation middleware
COMPLIANCE_EXAMPLE: An endpoint handler using validateRequest(schema) middleware
SEE: https://contexts.internal.example.com/ctx-sec-042
[LCDD_CONTEXT_END]
```

### Injection Budget

AI agents have limited context windows. A typical GPT-4 or Claude context window is 8K–200K tokens. Context injection MUST respect a budget:

| Agent Type | Recommended Token Budget for Contexts |
|---|---|
| Code Completion | 500–1000 tokens (only contexts matching current file) |
| Conversational | 2000–4000 tokens (contexts matching the task scope) |
| Autonomous | 4000–8000 tokens (all applicable contexts for the repository) |

Contexts SHOULD be prioritized by:
1. Hardened contexts (always include if applicable).
2. Higher severity contexts.
3. Contexts with recent violation history (the agent is more likely to violate them).
4. Contexts matching the specific files being modified.

---

## Agent Accountability

### Attribution

Every enforcement event records the actor:

```yaml
actor:
  type: "ai-agent"
  id: "ai-agent:claude-code-v2"
  session_id: "session-xyz789"
```

This enables querying: "What percentage of violations were introduced by AI agents vs. humans?"

### Agent-Specific Metrics

| Metric | Question Answered |
|---|---|
| AI Violation Rate | Are AI agents violating more contexts per change than humans? |
| AI Violation Trend | Is the gap between AI and human violations growing? |
| AI Fix Rate | When an AI agent's violation is flagged, does it fix it correctly? |
| AI Compliance Score | Weighted score of how well an agent respects contexts (by agent type/version). |

### Agent Dashboard

A dedicated Dashboard (see [0009-observability.md]) shows:
- Violation rate by agent type (Copilot vs. Claude Code vs. Human).
- Trend over time.
- Top violated contexts by AI agents.
- Specification drift indicators (AI modifying tests/specs to match code).

---

## Specification Drift Prevention

### The Threat

An AI agent faced with a failing test may:
1. **Option A (correct):** Fix the implementation to match the test.
2. **Option B (drift):** Modify the test assertion to match the current (broken) implementation.

Option B is Specification Drift — the agent redefines correctness to match behavior, rather than correcting behavior to match correctness.

### Detection

1. **Test Assertion Monitoring:** Every PR that modifies test assertions triggers a check: did the assertion change make the test weaker? (Fewer assertions, broader matchers, removed edge cases.)
2. **Context Violation Correlation:** Did the PR introduce context violations that were not present before? If the agent fixed a failing test by making the implementation comply, context violation count should decrease. If the agent fixed it by weakening the test, context violation count may stay the same or increase.
3. **Diff Analysis:** Compare the agent's changes against the set of Active contexts. An increase in context violations after an autonomous PR is a red flag.

### Prevention

1. **Hardened Contexts on Tests:** Test files themselves can be subject to contexts. For example: "Test assertion count MUST NOT decrease in a PR that claims to fix a bug."
2. **Agent Prompts:** Explicitly instruct agents: "You MUST NOT modify test assertions to make tests pass. If a test fails, fix the implementation. If you believe a test is incorrect, flag it for human review and do not modify it."
3. **CI Gates:** PRs from AI agents that modify test files are flagged for mandatory human review, even if all checks pass.
4. **Context Immutability for Agents:** Contexts with Hardened governance classification are immutable to AI agents. Any attempt by an agent to modify `/contexts/hardened/` is blocked and logged as a security event.

---

## Agent Governance Rules

### What AI Agents CAN Do

- Read Active contexts applicable to their task.
- Generate code that respects Active contexts.
- Flag potential context violations in their own output.
- Propose new Local contexts (authority level 0, lifecycle=Draft).
- Modify Local-Experimental contexts (authority level 0).

### What AI Agents CANNOT Do

- Modify Hardened contexts (Hardened-Mandate, Hardened-Standard).
- Modify Active contexts with authority level >= 2.
- Disable or bypass enforcement plugins.
- Modify the pipeline configuration (`pipeline.yaml`).
- Suppress or dismiss violation reports.
- Approve their own proposed contexts.

### What AI Agents MAY Do (with Constraints)

- Modify Local-Guideline contexts (authority level 1) with post-hoc human review.
- Propose modifications to Local-Standard contexts (authority level 2) via standard PR; human approval required.
- Assist in context extraction (Stage 2 of Pipeline) — in fact, this is a primary use case.
- Generate observability summaries and improvement recommendations.

---

## Agent Prompt Template

LCDD implementations SHOULD provide a standard prompt template that injects contexts into agent instructions:

```
You are an AI coding assistant operating in an LCDD-governed repository.

The following contexts are currently ACTIVE and MUST be respected
in all code you generate or modify:

[LCDD_CONTEXT_START]
... (injected contexts) ...
[LCDD_CONTEXT_END]

GOVERNANCE RULES:
1. You MUST respect all ACTIVE contexts above. Violations will be
   flagged and may block your PR from being merged.
2. You MUST NOT modify any context definition file under
   /contexts/hardened/ or any context with authority level >= 2.
3. If a context appears to conflict with the task, flag it for human
   review. Do NOT work around it.
4. If you believe a new constraint should exist, propose it as a
   Draft context with authority level 0 (Suggestion) in a PR comment.
5. Your PRs will be attributed to you. Violation rates are tracked
   per agent. High violation rates trigger review.
```

---

## Agent Compliance Certification

Community Context Packs MAY include recommended agent configurations:

```yaml
agent_profile:
  agent_type: "claude-code"
  agent_version: ">=2.0"
  context_packs: ["@lcdd/security-base@^2.0.0", "@lcdd/api-standards@^1.0.0"]
  prompt_template: "lcdd-standard"
  recommended_settings:
    temperature: 0.3
    max_tokens_per_context: 4000
  known_limitations:
    - "May struggle with temporal contexts (effective/deprecated date logic)"
    - "Requires explicit `appliesTo` scoping; does not infer applicability"
```

---

## References

1. Bunardzic, Alex. *AI Harness: Governing Change by Rate of Evolution.* Substack (2025).
2. LCDD 0004 — Governance Model (agent governance rules)
3. LCDD 0006 — Context Builder (agent-assisted extraction)
4. LCDD 0008 — Verification (agent verification)
5. LCDD 0009 — Observability (agent-specific metrics)
