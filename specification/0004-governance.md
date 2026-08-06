# 0004 — Governance Model

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines the Governance Model — how Contexts are changed, who can change them, and at what rate. The governance model answers the question: "How do we ensure that constraints evolve safely, without drifting into specification decay?"

---

## Motivation

AI-assisted development introduces a new attack vector: AI agents that optimize for "all tests green" by modifying the specifications themselves rather than fixing the implementation. Without explicit governance that separates *constraints* from *artifacts that embody constraints*, specification drift becomes inevitable. Even without AI agents, human teams suffer from governance asymmetry — critical architectural rules and cosmetic preferences are changed through the same PR process, creating either excessive overhead or insufficient protection. See [0000-problem.md] P5.

---

## Core Concept: Governing Change by Rate of Evolution

Directly inspired by Alex Bunardzic's AI Harness, LCDD classifies every Context by how frequently it is expected — and permitted — to change.

### Hardened Contexts

**Definition:** Contexts that change slowly. Modification requires explicit human approval through a defined governance process.

**Characteristics:**
- Authority level: typically 3 (Standard) or 4 (Mandate).
- Enforcement mode: typically Block.
- Change process: RFC or equivalent formal proposal.
- Approval: Required from the authority owner or designated approver.
- Review: Cross-team or organization-wide review before approval.
- CI behavior: Violations block merges/deployments.
- AI modification: NOT permitted under any circumstances.

**Examples:**
- Regulatory requirements (OJK, PCI-DSS, GDPR).
- Architectural invariants (service boundaries, data isolation).
- Security requirements (authentication, encryption standards).
- Platform constraints (approved databases, language versions).

### Local Contexts

**Definition:** Contexts that can change more freely. Modification may be automated (AI suggestion, fitness-based optimization) or require only team-level approval.

**Characteristics:**
- Authority level: typically 1 (Preference) or 2 (Guideline).
- Enforcement mode: typically Warn or Comment.
- Change process: Standard PR or automated proposal.
- Approval: Team-level or individual discretion.
- Review: Optional; may be post-hoc for automated changes.
- CI behavior: Violations generate warnings or comments; rarely block.
- AI modification: Permitted for level 1-2 contexts with observability guardrails.

**Examples:**
- Code style preferences (tabs vs. spaces, naming conventions).
- Library version recommendations.
- Test coverage thresholds.
- Performance optimization guidelines.

---

## Governance Classifications

The full governance taxonomy:

| Classification | Authority Level | Change Rate | Approval | AI Can Modify? | Default Enforcement |
|---|---|---|---|---|---|
| Hardened-Mandate | 4 | Very slow | Legal + exec + compliance | No | Block |
| Hardened-Standard | 3 | Slow | Authority owner + cross-team review | No | Block |
| Hardened-Local | 2 | Moderate | Team lead + peer review | No (but AI can suggest) | Warn |
| Local-Standard | 2 | Moderate | Team consensus | Yes, with post-hoc review | Warn |
| Local-Guideline | 1 | Fast | Individual or pair | Yes, with observability | Comment |
| Local-Experimental | 0 | Very fast | None (auto) | Yes, primary source | Silent |

---

## The Hardened Change Process

### Step 1: Proposal (RFC)

A change to a Hardened context MUST be proposed through a formal RFC (Request for Comment) or equivalent structured proposal. The proposal MUST include:

1. **Context ID** being modified.
2. **Proposed change** (diff from current version).
3. **Rationale** (why is this change needed now?).
4. **Impact analysis** (which teams, services, or artifacts are affected?).
5. **Migration plan** (how will existing non-compliant artifacts be brought into compliance?).
6. **Rollback plan** (how can the change be reverted if problems are discovered?).

### Step 2: Review Period

The proposal enters a review period of at least:

| Authority Level | Minimum Review Period |
|---|---|
| 4 (Mandate) | 14 calendar days + legal review |
| 3 (Standard) | 7 calendar days |
| 2 (Guideline-Hardened) | 3 calendar days |

During the review period, affected teams and stakeholders MAY raise objections. Objections MUST be addressed before the proposal can be approved.

### Step 3: Approval

Approval requires sign-off from:

| Authority Level | Required Approvers |
|---|---|
| 4 (Mandate) | Legal/Compliance officer + C-level executive + Authority owner |
| 3 (Standard) | Authority owner + at least one peer at same or higher authority level |
| 2 (Guideline-Hardened) | Team lead + one peer reviewer |

Approval is recorded as a lifecycle event with approver identities and timestamps.

### Step 4: Activation

The context transitions to Approved, then Active after the migration window (see [0002-context-lifecycle.md]). The enforcement mechanism is updated. Observability begins.

### Emergency Exception

In the event of a security incident or critical production issue, the review period MAY be waived. The change is applied immediately (Approved → Active), with a post-hoc review within 72 hours. Emergency exception usage MUST be rare and audited.

---

## The Local Change Process

### Option A: Human-Led Change

A team member proposes a change via standard PR. Review is at the team's discretion. Approval MAY be automated for low-authority contexts (level 1).

### Option B: AI-Assisted Change

An AI system proposes a change. The process depends on authority level:

| Level | AI Proposal Handling |
|---|---|
| 2 | AI opens a PR with the proposed change; human review required before merge |
| 1 | AI opens a PR; auto-merge permitted if observability shows no regression over 7 days |
| 0 | AI directly modifies the context; human review optional, post-hoc |

### Option C: Fitness-Based Evolution

For Local contexts, an implementation MAY use fitness functions (inspired by GrayBeam CDD) to automatically evolve constraints:

1. A fitness function measures constraint effectiveness (false positive rate, developer satisfaction, violation trend).
2. An LLM generates variant constraints.
3. Variants are tested against historical enforcement data.
4. If a variant outperforms the current version, it is proposed as a change.
5. For level 2 contexts: human review required. For level 1: auto-merge with observation period.

---

## Promotion and Demotion

A Context's governance classification is NOT fixed. It may be promoted (Local → Hardened) or demoted (Hardened → Local).

### Promotion (Local → Hardened)

**Trigger:** The context's scope or importance has grown. A team-specific guideline becomes an organization-wide standard.

**Process:**
1. Proposal filed with rationale for promotion.
2. Review according to the target classification's process.
3. If approved, the context transitions to Candidate → Approved → Active under the new classification.
4. Enforcement mode updates accordingly (Warn → Block).

### Demotion (Hardened → Local)

**Trigger:** The context's importance has diminished. An organization-wide standard is no longer relevant or is better managed at team level.

**Process:**
1. Proposal filed with rationale for demotion.
2. Review according to the *current* classification's process (you must use the higher bar to lower the bar).
3. If approved, enforcement mode updates (Block → Warn).
4. The context remains Active but under the lighter governance.

---

## AI Agent Governance

### Context Injection

AI coding agents (Copilot, Cursor, Claude Code, Codex) MUST be provided with Active contexts that apply to their current task. The mechanism:

1. Before generating code, the agent queries the Registry with `lifecycle=active` and `appliesTo` matching the target files.
2. Matching contexts are injected into the agent's context window as structured constraints.
3. The agent is instructed to respect these constraints and flag any conflicts.

### Constraint-Aware Prompt Format

Contexts injected into AI agents SHOULD follow a structured format:

```
[LCDD CONTEXT: ctx-abc123]
RULE: All API endpoints MUST validate input against an OpenAPI schema.
AUTHORITY: Standard (CISO Office)
ENFORCEMENT: Block
RATIONALE: Prevents injection attacks and ensures API contract compliance.
SEE: https://contexts.example.com/ctx-abc123
[/LCDD CONTEXT]
```

### Agent Accountability

When an AI agent generates code that violates an Active context:

1. The violation is recorded with `violator: "ai-agent:{agent_id}"`.
2. The violation is surfaced in the agent's interface (IDE annotation, PR comment).
3. Aggregate AI violation rates are tracked separately from human violation rates.
4. Anomalous spikes in AI violations trigger review — is the agent ignoring constraints? Are the constraints poorly specified?

### Specification Drift Prevention

AI agents MUST NOT be able to modify contexts with authority level >= 2 directly. Modification attempts are:

1. Blocked by the Registry.
2. Logged as security events.
3. Surfaced for human review.

For Hardened contexts (classification Hardened-Mandate or Hardened-Standard), even AI-generated *suggestions* for modification MUST be explicitly routed through the Hardened Change Process, not treated as standard PRs.

---

## Repository-Level Governance

### Protected Context Files

In a Git-based workflow, contexts stored in the repository SHOULD be protected by branch rules:

```
/contexts/hardened/   → Requires PR + approval from CODEOWNERS
/contexts/local/      → Requires PR (standard team rules)
/contexts/experimental/ → No restrictions
```

### CODEOWNERS Configuration

```CODEOWNERS
/contexts/hardened/   @org/architecture-reviewers
/contexts/local/      @org/team-leads
```

### CI Integration

The CI pipeline MUST:

1. Validate that any change to `/contexts/hardened/` follows the Hardened Change Process (RFC link in commit, approver sign-off).
2. Run the context validator against the changed contexts — a context update MUST NOT introduce schema violations.
3. For changes to Active contexts, run a diff report showing which artifacts would newly violate or newly comply with the changed context.
4. Post the diff report as a PR comment.

---

## Governance Audit Trail

Every governance action MUST produce an immutable audit record:

| Event | Recorded Data |
|---|---|
| Context created | Creator, timestamp, source |
| Lifecycle transition | Actor, timestamp, from/to stage, reason |
| Hardened approval | Approver identity, timestamp, RFC reference |
| Emergency exception | Actor, timestamp, justification, post-hoc review deadline |
| AI modification attempt (blocked) | Agent ID, timestamp, proposed change, block reason |
| Challenge filed | Challenger, timestamp, reason, evidence |
| Challenge resolved | Resolver, timestamp, resolution, rationale |
| Conflict detected | Context IDs, detection timestamp, resolution status |
| Governance classification change | Actor, timestamp, from/to classification, RFC reference |

---

## References

1. Bunardzic, Alex. *AI Harness: Governing Change by Rate of Evolution.* Substack (2025).
2. GrayBeam Technology. *Constraint-Driven Development.* (2024–2025).
3. LCDD 0002 — Context Lifecycle (governance per life cycle stage)
4. LCDD 0003 — Authority Model (interaction with governance)
5. LCDD 0010 — AI Agents (detailed agent governance)
