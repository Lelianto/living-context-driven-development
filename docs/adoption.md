# Adoption Guide

**Status:** Draft  
**Version:** 0.1.0

---

## Overview

This guide helps teams adopt Living Context Driven Development incrementally. LCDD is not an all-or-nothing methodology. Start small, prove value, expand.

---

## Adoption Levels

### Level 0: Awareness

**You:** "I've heard of LCDD. I understand the problem it solves."

**Action:**
1. Read the [Manifesto](../manifesto/manifesto.md).
2. Read the [Introduction](introduction.md).
3. Share with your team.

**Cost:** 30 minutes.  
**Value:** Vocabulary and mental model for constraint governance.

---

### Level 1: Manual Context Registry

**You:** "We've written down our key constraints as structured contexts."

**Action:**
1. Create a `.lcdd/` directory in your repository.
2. Write 3–5 key constraints as Context YAML files.
3. Manually review PRs against these contexts.

**Tools:** None yet (pure documentation).

**Example:**
```yaml
# .lcdd/contexts/security-no-secrets.yaml
id: "ctx-no-secrets"
version: 1
title: "No secrets in source code"
description: "API keys, tokens, and passwords MUST NOT be committed to the repository."
source: { type: "organization" }
authority: { source: { type: "organization", id: "security-team", name: "Security Team" }, level: 3 }
category: "security"
severity: "critical"
lifecycle: "active"
governance: { classification: "hardened-standard", approval_required: true }
enforcement: { mode: "block" }
```

**Cost:** 1–2 hours to write initial contexts.  
**Value:** Explicit, shared understanding of key constraints.

---

### Level 2: CI Enforcement (Manual)

**You:** "Our CI pipeline checks PRs against our contexts."

**Action:**
1. Install a static analysis tool that covers your key contexts (e.g., ESLint for code style, Trivy for secrets, OPA for policies).
2. Configure CI to block merges on violations.
3. Manually map each CI check to a context document.

**Tools:** ESLint, Trivy, OPA, custom scripts.  
**No LCDD tooling required yet.**

**Cost:** 2–4 hours of CI configuration.  
**Value:** Constraints are enforced, not just documented.

---

### Level 3: Living Lifecycle

**You:** "Our contexts have a lifecycle. We review them regularly."

**Action:**
1. Assign an owner to each active context.
2. Schedule quarterly context review sessions.
3. Track context age and violation trends.
4. Deprecate contexts that are no longer relevant.

**Tools:** Spreadsheet or simple dashboard.  
**No LCDD tooling required yet.**

**Cost:** 1 hour per quarter for review.  
**Value:** Constraints stay relevant; stale rules don't accumulate.

---

### Level 4: AI Agent Awareness

**You:** "Our AI coding tools are aware of our contexts."

**Action:**
1. Create a `.lcdd/agent-prompt.md` with your active contexts in LCDD prompt format.
2. Include it in your AI tool's system prompt or context rules.
3. Review AI-generated PRs for context violations.

**Tools:** Copilot instructions, Cursor rules, Claude Code CLAUDE.md.  
**Cost:** 30 minutes to write prompt; ongoing review time.  
**Value:** AI agents respect known constraints; specification drift is detected early.

---

### Level 5: Reference Tooling (v0.2.0+)

**You:** "We use `lcd` CLI to manage contexts and validate artifacts."

**Action:**
1. Install `@lcdd/cli`.
2. Run `lcd init` in your repository.
3. Migrate manual contexts to the LCDD file format.
4. Use `lcd validate` in CI.
5. Use `lcd query` to find applicable contexts.

**Tools:** LCDD CLI (future reference implementation).  
**Cost:** Migration effort (1–2 hours).  
**Value:** Full LCDD workflow with tooling support.

---

### Level 6: Full Pipeline (v0.5.0+)

**You:** "We have automated discovery, extraction, and enforcement."

**Action:**
1. Deploy the Context Registry with database backend.
2. Configure source connectors for regulatory websites, internal docs.
3. Enable LLM-based extraction for unstructured sources.
4. Deploy MCP server for AI agent integration.
5. Set up observability dashboards.

**Tools:** Full LCDD platform.  
**Cost:** Platform deployment and configuration.  
**Value:** Complete LCDD methodology in production.

---

## Adoption by Organization Size

### Solo Developer / Indie Hacker

- Start at Level 1 (manual contexts).
- Focus on: regulatory constraints you didn't know about, AI agent guardrails.
- Skip: complex governance; you are the reviewer.

### Small Startup (2–20 engineers)

- Start at Level 2 (CI enforcement).
- Focus on: key security and compliance contexts, preventing specification drift in AI-generated code.
- Add: quarterly context review sessions (Level 3).

### Mid-Size Company (20–200 engineers)

- Start at Level 3 (lifecycle management).
- Focus on: cross-team context sharing via Context Packs, governance classification (Hardened vs. Local).
- Add: AI agent context injection (Level 4), multiple enforcement plugins.

### Large Enterprise (200+ engineers)

- Start at Level 5 (reference tooling).
- Focus on: database-backed Registry with full audit trail, observability dashboards, compliance reporting.
- Add: automated discovery (Level 6), dedicated context engineering team.

---

## Common Adoption Challenges

### Challenge 1: "We don't have time for this."

**Response:** You're already spending time on governance — it's just invisible and ad-hoc. Time spent reviewing PRs for security issues, debating coding standards, and fixing compliance problems post-deployment. LCDD makes that time visible and reduces it over time.

### Challenge 2: "We already have linters and tests."

**Response:** Linters and tests enforce known constraints. LCDD helps you discover constraints you didn't know you needed, and manages the lifecycle of all constraints — including which linter rules are active and why.

### Challenge 3: "Our AI tools don't support LCDD."

**Response:** You don't need tool support to start. Write contexts in Markdown or YAML. Include them in your AI tool's system prompt manually. The methodology works before the tooling exists.

### Challenge 4: "It seems bureaucratic."

**Response:** LCDD scales governance to match authority. A preference for tabs over spaces (Level 1) has near-zero governance overhead. A regulatory requirement (Level 4) deserves the overhead it gets. The methodology prevents over-governance as much as under-governance.

---

## Measuring Success

Track these metrics as you adopt LCDD:

| Metric | What It Tells You |
|---|---|
| Number of Active contexts | Are you discovering relevant constraints? |
| Context age distribution | Are stale rules accumulating? |
| Violation rate by severity | Are hard constraints being followed? |
| AI violation rate vs. human | Are AI agents respecting constraints? |
| Time from Draft to Active | Is your review process efficient? |
| False positive rate | Are your contexts well-specified? |
| Incidents traced to missing context | What constraints did you not know you needed? |

---

## Getting Help

- [FAQ](faq.md) — Common questions.
- [GitHub Issues](https://github.com/lcdd/living-context-driven-development/issues) — Ask the community.
- [Specification](../specification/) — Detailed reference.
