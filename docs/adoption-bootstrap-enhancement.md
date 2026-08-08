# LCDD Adoption Bootstrap Enhancement

**Status:** Proposal

**Version:** 0.1.0

**Last Updated:** 2026-08-08

---

## Overview

This document proposes an **LCDD Adoption Bootstrap**: separate onboarding experiences for new and
existing projects, supported by progressive disclosure and safe, gradual enforcement.

The recommendation follows this decision framework:

> Problem → Options → Constraints → Trade-offs → Decision → Implementation → Evaluation

---

## 1. Problem

The mechanical setup for LCDD is already simple:

```bash
lcd init
lcd context add
lcd validate
```

The conceptual setup remains difficult. Before receiving meaningful value, an adopter may need to
understand the Context Schema, Authority, lifecycle, Hardened versus Local governance, ownership,
and enforcement.

### 1.1 New Projects

New projects have a cold-start problem:

- The team does not yet have enough evidence to identify the right constraints.
- Generic rules can be adopted as cargo-cult Contexts.
- Reusable Context Packs are not yet mature enough to provide a trusted default baseline.
- Teams may be pushed to design a governance system before their product and working practices
  have stabilized.

### 1.2 Existing Projects

Existing projects have a discovery and migration problem:

- Constraints are distributed across source code, configuration, tests, CI, README files, ADRs,
  issue history, and tacit team knowledge.
- The current onboarding workflow does not inventory the repository's existing constraints.
- Immediate activation can produce excessive violations and team resistance.
- Teams must distinguish real rules from technical facts, preferences, stale documentation, and
  accidental conventions.
- Existing guidance discusses migration of Context files, but does not provide a complete path for
  migrating an ordinary repository into LCDD governance.

The absence of local repository discovery is already identified as high-priority Context Debt in
[context-debt-remediation-plan.md](context-debt-remediation-plan.md), with an implementation design
in [v0.6-implementation-plan.md](v0.6-implementation-plan.md).

The core problem is therefore:

> LCDD has a strong governance model, but does not yet provide a sufficiently safe and simple path
> for converting the current state of a project into a trusted Context Registry.

---

## 2. Options

### Option A — Documentation Only

Add separate greenfield and existing-project guides, a Context selection checklist, and baseline
and migration examples.

**Advantages:**

- Fast and inexpensive.
- Requires no schema or CLI change.
- Can immediately reduce adopter confusion.

**Disadvantages:**

- Inventory remains manual.
- Does not remove the largest burden for existing projects.
- Additional documentation does not necessarily create an easier workflow.

### Option B — Templates and Context Packs

Make profiles the primary entry point:

```bash
lcd init --profile startup
lcd init --profile fintech
lcd init --profile healthcare
```

**Advantages:**

- Produces an initial Registry quickly.
- Provides concrete examples for new projects.
- Encourages reuse and standardization.

**Disadvantages:**

- Can produce cargo-cult governance.
- Domain Contexts may not match the adopter's jurisdiction or architecture.
- Packs require provenance, versioning, trust, and maintenance.
- Does not discover project-specific constraints in an existing repository.

### Option C — Automated Repository Discovery

Scan documentation, configuration, dependencies, CI, and selected source files:

```bash
lcd discover
```

**Advantages:**

- Addresses the largest brownfield adoption problem.
- Reuses artifacts the team already maintains.
- Aligns with the Context Engineering Pipeline in
  [0006-context-builder.md](../specification/0006-context-builder.md).

**Disadvantages:**

- Produces false positives and false negatives.
- A discovered statement is not necessarily an authoritative rule.
- Semantic extraction introduces privacy and cost concerns.
- Does not solve the greenfield cold-start problem.

### Option D — Guided Adoption Wizard

Introduce a problem-oriented wizard:

```bash
lcd onboard
```

It would ask about project state, recurring problems, existing enforcement tooling, approval
authority, and mechanical verifiability rather than exposing the full schema immediately.

**Advantages:**

- Problem-first instead of schema-first.
- More accessible to new adopters.
- Can generate safe initial defaults.

**Disadvantages:**

- A long wizard can itself feel bureaucratic.
- Answers remain subjective.
- A wizard alone cannot inventory an existing repository.

### Option E — Wizard, Discovery, and Progressive Enforcement

Use onboarding to select a greenfield or existing-project path. Scan existing projects, but keep
results as inventory entries or Candidates. Begin with non-blocking, change-scoped enforcement.

**Advantages:**

- Supports both greenfield and brownfield adoption.
- Reduces the risk of activating incorrect constraints.
- Provides value before users master the entire governance model.
- Preserves human governance.

**Disadvantages:**

- Has the largest implementation scope.
- Requires explicit discovery and baseline contracts.
- Requires coordinated changes across Core, CLI, MCP, and documentation.

---

## 3. Constraints

### 3.1 Human Authority Remains the Boundary

Discovery results MUST NOT become Active automatically, especially when classified as Hardened.
This follows the Authority model in
[0003-authority-model.md](../specification/0003-authority-model.md) and the governance rules in
[0004-governance.md](../specification/0004-governance.md).

### 3.2 Hardened and Local Governance Remain Distinct

Onboarding MAY suggest a classification, but MUST NOT treat all rules equally. Regulatory
constraints and team preferences require different governance.

### 3.3 Existing Repositories Must Not Be Required to Become Clean Immediately

LCDD needs a baseline or change-scoped validation mechanism. Turning all existing debt into
blocking violations would make adoption impractical.

### 3.4 Discovery Is Not Approval

A normative statement in a README or ADR may be a Candidate, but it may be obsolete, conflicting,
unverifiable, or asserted without sufficient authority.

### 3.5 Discovery Is Local-First and Privacy-Safe

Initial scanning SHOULD be deterministic and local. Sending source content to an external semantic
provider MUST be opt-in, particularly for private repositories.

### 3.6 Existing Workflows Remain Compatible

The existing `.lcdd/` structure and `lcd init` command MUST remain valid. The onboarding flow is a
higher-level entry point, not a replacement for low-level commands.

### 3.7 Maturity Is Communicated Honestly

LCDD remains an Implementation Phase v0.x project. Discovery and classification recommendations
MUST NOT be presented as fully reliable automated governance.

---

## 4. Trade-offs

| Design Decision | Benefit | Cost or Risk |
|---|---|---|
| Separate greenfield and existing-project paths | More relevant guidance | More documentation and tests |
| Automated discovery | Less manual inventory work | False positives and privacy risk |
| Candidate-only discovery | Preserves human governance | Adds a review step |
| Baseline existing violations | Avoids blocking adoption | Legacy debt may persist |
| Change-scoped enforcement | Produces value on new work | Does not automatically fix legacy code |
| Progressive disclosure | Reduces initial cognitive load | Some concepts appear later |
| Interactive wizard | Easier for new users | Less suitable for automation |
| JSON and non-interactive output | Supports CI and agents | Expands the CLI contract |
| Optional packs and templates | Accelerates greenfield setup | May introduce irrelevant rules |

The most important trade-off concerns baselines. Without a baseline, existing projects may receive
hundreds of violations immediately. With a permanent baseline, old violations may remain hidden
indefinitely.

The preferred compromise is a **ratcheting baseline**: existing violations are recorded and do not
initially block delivery, new violations cannot increase, and every baseline exception has an owner
and review date.

---

## 5. Decision

Adopt **Option E: Adaptive Adoption Bootstrap**.

The design has three principles:

1. **Problem-first onboarding.** Users begin with a recurring problem or important decision, not
   the entire Context Schema.
2. **Discover, never presume authority.** The system may find and classify potential constraints,
   but it may not activate them autonomously.
3. **No-new-debt enforcement.** Existing projects first prevent additional Context Debt before
   undertaking complete remediation.

### 5.1 Onboarding Model

```text
lcd onboard
    |
    +-- New project
    |     -> identify one recurring risk or decision
    |     -> create Draft Context
    |     -> review
    |     -> activate in warn or comment mode
    |
    +-- Existing project
          -> inventory repository
          -> produce Candidates and conflict report
          -> human review
          -> create baseline
          -> validate changed files
          -> activate progressively
```

### 5.2 Proposed Commands

```bash
# Guided entry point
lcd onboard

# Explicit paths
lcd onboard --new
lcd onboard --existing

# Individual operations
lcd discover
lcd review
lcd baseline create
lcd validate --changes
lcd adoption status
```

`lcd init` remains available as the lower-level initialization primitive.

---

## 6. Implementation

### Phase 1 — Define the Adoption Contract

Create dedicated adoption guidance:

```text
docs/adoption/
├── README.md
├── greenfield.md
├── existing-project.md
├── baseline-and-ratcheting.md
└── evaluation.md
```

The current [adoption.md](adoption.md) maturity levels remain useful, but should no longer be the
only onboarding path.

Documentation must distinguish between:

- technical initialization in approximately five minutes; and
- incremental adoption of trustworthy governance.

### Phase 2 — Implement Greenfield Bootstrap

Add:

```bash
lcd onboard --new
```

The workflow SHOULD:

1. Ask for one recurring problem or important decision.
2. Create one Draft Context.
3. Default to `warn` or `comment` enforcement.
4. Suggest Local governance unless higher authority is supported by evidence.
5. Add an owner and review date.
6. Show the next useful action rather than the complete LCDD feature set.

A safe default resembles:

```yaml
lifecycle: draft
governance:
  classification: local-guideline
enforcement:
  mode: warn
```

Hardened MUST NOT be the default merely because a rule is considered important. Classification
follows authority and expected rate of change, as specified by
[0004-governance.md](../specification/0004-governance.md).

### Phase 3 — Implement Existing-Project Discovery

Implement `lcd discover` according to the foundation already described in
[v0.6-implementation-plan.md](v0.6-implementation-plan.md).

Initial allowlisted sources SHOULD include:

- `README.md`;
- `docs/**`;
- ADR files;
- `AGENTS.md`, `CLAUDE.md`, and `.cursor/**`;
- package and compiler configuration;
- linter configuration;
- CI workflows;
- bounded dependency and import patterns.

The default operation is read-only and reports an inventory:

```text
Discovered sources:        42
Potential constraints:     31
Duplicates:                 8
Possible conflicts:         4
Mechanically enforced:      9
Needs human interpretation: 10
```

Candidate creation requires an explicit operation:

```bash
lcd discover --apply-candidates
```

No discovery path may create an Active Context.

### Phase 4 — Add Baseline and Ratcheting

Add an implementation-level Adoption Baseline rather than a new normative lifecycle state:

```bash
lcd baseline create
```

The baseline records:

- Context ID;
- violation fingerprint;
- location;
- discovery date;
- owner;
- remediation target;
- exception status and review date.

Change-scoped validation then behaves as follows:

- Existing violation: report without newly blocking adoption.
- New violation: warn or block according to its Context.
- Fixed baseline violation: remove it from the baseline.
- Reintroduced violation: treat it as a new violation.

The baseline controls enforcement rollout; it does not change the normative meaning of an Active
Context.

### Phase 5 — Expose Adoption Status

Add:

```bash
lcd adoption status
```

Example output:

```text
LCDD adoption: Foundation

Contexts
  Draft:       7
  Candidate:   4
  Active:      3

Readiness
  Ownership:           71%
  Verifiable contexts: 43%
  Conflicts resolved:  50%
  Baseline trend:      -12%

Recommended next action:
  Resolve 2 high-severity candidate conflicts.
```

The command SHOULD explain readiness dimensions and recommend the next action. It SHOULD NOT reduce
adoption to an unexplained aggregate score.

### Phase 6 — Add MCP Onboarding Support

After CLI contracts stabilize, expose read-oriented operations such as:

- `lcdd_discover_repository`;
- `lcdd_get_adoption_status`;
- `lcdd_explain_candidate`;
- `lcdd_recommend_next_step`.

AI MAY explain evidence and draft Candidates, but approval continues through the applicable human
governance path, consistent with
[0010-ai-agents.md](../specification/0010-ai-agents.md).

---

## 7. Evaluation

Success must not be measured only through installations or the number of Contexts created.

### 7.1 Activation Metrics

- Time from installation to the first valid Context.
- Time to first value, such as use in review or detection of a relevant violation.
- Onboarding completion rate.
- Number of concepts required before creating the first Draft.

Initial targets:

| Metric | Target |
|---|---:|
| Technical setup | 5 minutes or less |
| First Draft Context | 10 minutes or less |
| Existing-project inventory | 15 minutes or less |
| First reviewed Candidate | 30 minutes or less |
| Change-scoped CI validation | 60 minutes or less |

### 7.2 Quality Metrics

- Candidate acceptance rate.
- Duplicate rate.
- Conflict detection precision.
- Discovery false-positive rate.
- Percentage of Contexts with an owner and rationale.
- Percentage of blocking Contexts with mechanical enforcement.
- Number of Contexts reclassified from Hardened to Local after review.

### 7.3 Governance Safety Metrics

- Discovery results automatically activated: MUST remain `0`.
- Hardened Contexts changed without approval: MUST remain `0`.
- Baseline exceptions without owner or review date: MUST remain `0`.
- Private content sent to an external provider without opt-in: MUST remain `0`.

### 7.4 Adoption Outcome Metrics

Run pilots on at least three repository types:

1. A small greenfield project.
2. An existing startup repository.
3. A monorepo with established CI and extensive documentation.

Compare the current onboarding workflow, the proposed workflow, and a control workflow without
LCDD. Evaluate them for 30–60 days using:

- missed constraints;
- new violations;
- review time;
- stale Contexts;
- false positives;
- enforcement avoidance or disablement;
- AI-generated changes that contradict Active Contexts.

### 7.5 Exit Criteria

The enhancement is successful when:

- At least 70% of pilot participants complete onboarding without maintainer assistance.
- Median time-to-first-value is below 30 minutes.
- At least 50% of discovery Candidates are accepted or remain useful after revision.
- Deterministic discovery false positives remain below 20%.
- No automatic activation occurs.
- Baseline debt declines and does not grow during the pilot.
- Users can explain the Hardened and Local distinction after using the workflow without first
  reading the complete specification.

---

## Conclusion

LCDD's next adoption priority should not be another layer of governance capability. It should be a
bridge from an ordinary repository to the governance capabilities that already exist.

The onboarding success criterion is not that `lcd init` completed. It is that:

> One real constraint was discovered, trusted, and used without disrupting the team's delivery.
