# Literature Review: Constraint-Driven Development in the Age of AI-Assisted Software Engineering

**Status:** Research  
**Version:** 0.2.0  
**Last Updated:** 2026-08-06  
**Authors:** LCDD Specification Team

> **Note:** This is a living document. Version 0.2.0 incorporates GitHub ecosystem research conducted on 2026-08-06, revealing the emerging "Context-Driven Development" (CDD) tooling ecosystem that was not captured in our initial v0.1.0 review.

---

## Abstract

This document surveys existing approaches to constraint-driven development (CDD) — methodologies, frameworks, and tools that encode and enforce rules governing software behavior — with particular attention to how they interact with AI-assisted development. We identify two dominant schools of thought and a critical gap: neither addresses how constraints are *discovered* from external, non-code sources before they are enforced. This gap motivates the Living Context Driven Development (LCDD) specification.

---

## 1. Scope and Methodology

### 1.1 Inclusion Criteria

We examined published works (papers, whitepapers, blog posts, open-source repositories) that:
- Propose a named methodology for constraint-driven or specification-driven development.
- Encode software constraints as machine-readable artifacts.
- Address the interaction between constraints and AI coding agents (LLM-based code generation).
- Discuss the governance, evolution, or lifecycle of software constraints.

### 1.2 Exclusion Criteria

We excluded:
- Generic prompt-engineering techniques that do not produce structured constraint artifacts.
- Traditional static-analysis tools (SonarQube, ESLint) unless augmented with AI-specific governance.
- Pure CI/CD pipeline configurations without explicit constraint semantics.

### 1.3 Sources

- GrayBeam Technology, *Constraint-Driven Development: A Technical Whitepaper* (2024–2025)
- Alex Bunardzic, *AI Harness: Governing Change by Rate of Evolution* (2025)
- Academic databases: arXiv, ACM Digital Library, IEEE Xplore (search terms: "constraint-driven development", "AI governance code", "specification drift")
- GitHub: 55+ repositories under the term "context-driven development" (searched 2026-08-06)
- GitHub: `gemini-cli-extensions/conductor` (3,700+ stars) — Spec-Driven Development plugin for AI coding agents
- GitHub: `lossyrob/phased-agent-workflow` (39 stars) — Context-Driven Development for GitHub Copilot
- GitHub: `microsoft/agentic-sdlc-starter` (9 stars) — Reference architecture for spec-driven, AI-assisted SDLC
- GitHub: `drafthq/draft` (39 stars) — Context-Driven Development plugin for multiple AI coding agents
- GitHub: `symbolicmatter/context-driven-development-workflow` — CDDW operational workflow

---

## 2. Prior Art

### 2.1 GrayBeam CDD (Constraint-Driven Development)

**Origin:** GrayBeam Technology (graybeam.com)  
**Status:** Early-stage — Phase 1 deployed, Phases 2–3 planned or in development. Open-source repository marked "coming soon."

#### 2.1.1 Architecture

- **Runtime:** Elixir/OTP with event-sourced architecture and immutable audit log.
- **Ordering:** Vector clocks for causal ordering across distributed systems.
- **Validation Latency:** Sub-50ms constraint validation.
- **Code Generation:** Encoded constraints become system prompts for AI models; auto-generated API contracts in TypeScript, Python, and Go.
- **CI/CD Integration:** Pipeline can block merges upon constraint violations.

#### 2.1.2 Self-Improving Constraints

GrayBeam proposes a fitness-function-based evolution mechanism:
1. A fitness function measures correctness, precision, user experience, and performance.
2. An LLM generates variant constraints.
3. Variants are tested via A/B testing.
4. Superior constraints are auto-deployed.

#### 2.1.3 Case Study: GridPlay

- **Claimed Results:** 100% reduction in validation bugs, 2× features per sprint.
- **Caveat:** Results are self-reported; external audits not available.

#### 2.1.4 Gap Analysis

| Dimension | GrayBeam Coverage |
|---|---|
| Constraint enforcement | ✅ Full validation engine |
| Constraint evolution | ✅ Fitness-based self-improvement |
| Constraint discovery from codebase | ✅ Extracted from existing code |
| Constraint discovery from external sources | ❌ Not addressed |
| Constraint lifecycle management | ❌ No explicit lifecycle model |
| Constraint source diversity | ❌ Internal codebase only |
| Governance (who can change what) | ❌ Implicit, not formalized |
| Maturity | ⚠️ Phase 1 only; production unproven at scale |

---

### 2.2 AI Harness (Governing Change by Rate of Evolution)

**Origin:** Alex Bunardzic, Substack series (2025)  
**Status:** Conceptual framework; no public reference implementation found.

#### 2.2.1 Core Insight: Specification Drift

When AI coding agents (e.g., OpenAI Codex) are faced with failing tests, they may pursue a narrow goal of "make all tests pass" — not by fixing the implementation, but by rewriting test assertions. This phenomenon, termed **Specification Drift**, renders "green build" ambiguous: the system responsible for fixing failures is also allowed to redefine the expectations that caused the failure.

#### 2.2.2 Solution: Governing Change by Rate of Evolution

Constraints are classified by how frequently they are expected to change:

- **Hardened Rules (Global Architectural Rules):** Platform constraints that evolve slowly. Protected by repository governance, require explicit approval to change, enforced via CI. Architecture can only evolve through explicit, reviewed, versioned changes.
- **Local Rules (Repository-Level Policies):** Implementation policies that can move faster. Owned by individual teams, modifiable without broad governance.

#### 2.2.3 Gap Analysis

| Dimension | AI Harness Coverage |
|---|---|
| Constraint enforcement (CI) | ✅ Hardened rules enforced in CI |
| Constraint evolution governance | ✅ Explicit approval required for hardened rules |
| Specification drift prevention | ✅ Core contribution |
| Constraint discovery | ❌ Constraints are manually defined |
| Constraint lifecycle | ❌ Implicit binary classification only |
| Constraint from external sources | ❌ Not addressed |
| Reference implementation | ❌ None published |
| Multi-source constraint ingestion | ❌ Not addressed |

---

### 2.3 Other Relevant Work

#### 2.3.1 Spec-Driven Development (SDD)

Popularized by projects like Stainless API, SDD uses OpenAPI/GraphQL specifications as the source of truth from which server stubs, client SDKs, and documentation are generated. However, SDD:
- Focuses on API surface contracts, not business rules or regulatory constraints.
- Does not address constraint discovery or lifecycle.
- Treats the specification as manually authored, not evolved through observation.

#### 2.3.2 Policy-as-Code (Open Policy Agent, HashiCorp Sentinel)

Mature tooling for encoding organizational policies as code (Rego, Sentinel). However:
- Policies are manually authored by platform teams.
- No support for AI-assisted discovery or generation.
- No integration with AI coding agents.
- Policies are typically static; no lifecycle or evolution model beyond version control.

#### 2.3.3 Context Engineering

An emerging discipline focused on providing structured context to LLMs for improved generation quality. Related work includes RAG (Retrieval-Augmented Generation), prompt chaining, and agentic workflows. However:
- Context engineering focuses on *providing* context to AI, not *governing* what the AI produces.
- There is no formal constraint model; context is unstructured or semi-structured text.

#### 2.3.4 Living Documentation (Cyrille Martraire, 2019)

The practice of embedding executable specifications within documentation. However:
- Focuses on documentation artifacts, not constraint artifacts.
- Does not address AI agent governance.
- No formal constraint model or lifecycle.

---

### 2.4 Emerging: Context-Driven Development (CDD) for AI Coding Agents

A distinct category of tooling has emerged since 2024–2025 that uses the term **"Context-Driven Development"** to describe workflow management systems for AI coding agents. These tools focus on structuring *how* AI agents work through phases (Spec → Plan → Implement), not on governing *what* constraints agents must obey.

#### 2.4.1 Conductor (gemini-cli-extensions)

**Origin:** Google / Gemini CLI Extensions  
**Repository:** `gemini-cli-extensions/conductor`  
**Status:** Active — 3,700+ stars, 286 forks, 129 commits. Apache 2.0.

**Core Philosophy:** "Measure twice, code once. Control your code. By treating context as a managed artifact alongside your code, you transform your repository into a single source of truth."

**Architecture:**
- Plugin for AI coding agents (Antigravity, Claude Code).
- Lifecycle: **Context → Spec & Plan → Implement.**
- Context artifacts: `product.md`, `product-guidelines.md`, `tech-stack.md`, `workflow.md`, `code_styleguides/`.
- Track-based work: `/conductor:conductor-setup`, `/conductor:conductor-new-track`, `/conductor:conductor-implement`.
- Adaptive UX: GUI modals in IDEs, CLI text menus in terminals.

**What It Does Well:**
- Provides structured workflow for AI coding agents.
- Maintains project context as persistent artifacts.
- Supports Spec-Driven Development with human-in-the-loop review.
- Multi-platform (Antigravity, Claude Code).

**What It Does Not Do:**
- No formal constraint schema — contexts are informal Markdown, not structured artifacts.
- No constraint lifecycle (Draft → Active → Deprecated).
- No authority or provenance tracking for rules.
- No discovery pipeline for external sources (regulations, standards).
- No specification drift prevention (agent could modify product.md to match code).
- No enforcement mechanism beyond agent prompt adherence.
- No observability or violation tracking.
- No Context Packs for community sharing of governance rules.

#### 2.4.2 Phased Agent Workflow (PAW)

**Origin:** Rob Emanuele (lossyrob)  
**Repository:** `lossyrob/phased-agent-workflow`  
**Status:** Active — 39 stars, 1,174 commits. MIT.

**Core Philosophy:** "Context-Driven Development — a practice where AI agents build understanding through structured research and planning phases before writing code."

**Architecture:**
- Four-stage workflow: **Specification → Planning → Implementation → Finalization.**
- Dedicated research phases: Spec Research and Code Research.
- PR-integrated: every implementation phase can create a PR for human review.
- Review workflow: AI-assisted PR review agent (PAW-Review).
- Extensible skills architecture with orchestrator agents.

**Platforms:** GitHub Copilot CLI (plugin marketplace), VS Code extension, Claude Code (npm).

**What It Does Well:**
- Mature, well-documented workflow with 1,174 commits.
- PR integration matches real team workflows.
- Rewindable at any layer (artifacts are checkpoints).
- Extensible skills architecture.

**What It Does Not Do:**
- Same gaps as Conductor: no formal constraint schema, no lifecycle, no authority, no discovery.
- Contexts are informal Markdown, scoped to a single feature track, not cross-cutting governance.

#### 2.4.3 Microsoft Agentic SDLC Starter

**Origin:** Microsoft  
**Repository:** `microsoft/agentic-sdlc-starter`  
**Status:** Early — 9 stars, 4 commits. MIT.

**Core Philosophy:** "Reference architecture for spec-driven, AI-assisted software development using GitHub Copilot, MCP, and repo-based context engineering."

**Architecture:**
- Five-step pipeline: **Assessor → Resolver → Specifier → Generator → Validator.**
- Zero-Assumption Principle: every ambiguity is flagged before code generation.
- Spec-Driven Generation: Generator reads only specs, never the PRD directly.
- Stack-agnostic prompts; only `copilot-instructions.md` is stack-specific.

**What It Does Well:**
- Microsoft's institutional backing gives credibility to the concept.
- Zero-assumption principle addresses a real failure mode.
- Clean separation between spec generation and code generation.

**What It Does Not Do:**
- Same gaps as above: workflow-oriented, not governance-oriented.
- Extremely early stage (4 commits, minimal community).
- Focused on greenfield generation from PRD, not ongoing governance of existing codebases.

#### 2.4.4 Draft (drafthq)

**Origin:** DraftHQ  
**Repository:** `drafthq/draft`  
**Status:** Active — 39 stars. Multi-agent support.

A Context-Driven Development plugin for Claude Code, Cursor, GitHub Copilot, and Gemini. Similar workflow approach to Conductor and PAW.

#### 2.4.5 Other CDD Repositories

GitHub search for "context-driven development" returns 55+ repositories (2026-08-06). Notable additional projects:
- `cofin/flow` (15 stars) — CDD toolkit with spec-first planning and TDD workflow.
- `enxengineer/conductor_cc` (52 stars) — Conductor port for Claude Code.
- `symbolicmatter/context-driven-development-workflow` (3 stars) — CDDW operational workflow with living documentation.
- `guilhermedemorais-dev/context-engineering-factory` — Context engineering, SDD, AI agent workflows, software governance.
- `mgriott/context-driven-ai-development` — "AI-assisted methodology based on Context Engineering, Governance of Context."

#### 2.4.6 Gap Analysis — All CDD Tools

| Dimension | Conductor | PAW | MS Agentic SDLC | Draft |
|---|---|---|---|---|
| AI agent workflow management | ✅ Core | ✅ Core | ✅ Core | ✅ Core |
| Persistent project context | ✅ Markdown | ✅ Markdown | ✅ Markdown | ✅ Markdown |
| Spec-Driven Development | ✅ | ✅ | ✅ | ✅ |
| Multi-platform support | ✅ | ✅ | ⚠️ Copilot only | ✅ |
| Formal constraint schema | ❌ | ❌ | ❌ | ❌ |
| Constraint lifecycle | ❌ | ❌ | ❌ | ❌ |
| Authority & provenance | ❌ | ❌ | ❌ | ❌ |
| External source discovery | ❌ | ❌ | ❌ | ❌ |
| Specification drift prevention | ❌ | ❌ | ❌ | ❌ |
| Enforcement (beyond prompt) | ❌ | ❌ | ❌ | ❌ |
| Observability & metrics | ❌ | ❌ | ❌ | ❌ |
| Context Packs (shareable) | ❌ | ❌ | ❌ | ❌ |
| Hardened vs. Local governance | ❌ | ❌ | ❌ | ❌ |
| Maturity | ★★★★☆ | ★★★★☆ | ★☆☆☆☆ | ★★★☆☆ |

> **Key Insight:** The CDD ecosystem focuses on *workflow* — how AI agents should work through structured phases. LCDD focuses on *governance* — what constraints AI agents must obey, across any workflow. These are complementary, not competitive. A team could use Conductor for workflow management *and* LCDD for constraint governance simultaneously.

---

## 3. The Gap: From Workflow to Governance

### 3.1 The Territory Already Occupied

The CDD ecosystem (Conductor, PAW, Draft, Microsoft) has established that:
1. AI coding agents benefit from structured workflows (Spec → Plan → Implement).
2. Context should be managed as artifacts alongside code.
3. Spec-Driven Development with AI agents produces better outcomes than open-ended prompting.

This is valuable work, and LCDD acknowledges it. However, these tools solve the *workflow* problem, not the *governance* problem.

### 3.2 The Territory Still Unoccupied

Both GrayBeam CDD and the CDD ecosystem tools (Conductor, PAW, etc.) begin with the assumption that constraints *already exist* — whether extracted from code (GrayBeam) or manually authored as Markdown (Conductor, PAW). Neither addresses the fundamental question:

**"How do you know what constraints you need?"**

For a startup or small team, this is the actual bottleneck. Founders and engineers do not know:
- Which government regulations apply (OJK, POJK, Permendag, Kemenkop).
- Which competition rubrics will be used to judge their product.
- Which industry standards they must comply with.
- Which architectural invariants they should protect.

Enforcement is not the bottleneck. Workflow is not the bottleneck. **Discovery is the bottleneck.**

### 3.3 The Classification Gap

Neither existing approach provides a taxonomy of constraint sources:

| Source | Example | GrayBeam | AI Harness | CDD Tools |
|---|---|---|---|---|
| Internal codebase | Business invariants embedded in code | ✅ Extracted | ❌ | ❌ |
| Internal policy | Team coding standards | ❌ | ✅ Manual | ✅ Manual (Markdown) |
| External regulation | OJK/POJK for fintech | ❌ | ❌ | ❌ |
| External rubric | Hackathon/competition judging criteria | ❌ | ❌ | ❌ |
| External standard | ISO, PCI-DSS, SOC 2 | ❌ | ❌ | ❌ |
| AI-generated | LLM-suggested constraints | ⚠️ Planned | ❌ | ❌ |
| Human-authored | Architecture Decision Records | ❌ | ✅ | ✅ Manual |
| Meeting/discussion | Design decisions from Slack/transcripts | ❌ | ❌ | ❌ |
| Documentation | README, Confluence, Notion | ❌ | ❌ | ❌ |
| Customer feedback | Support tickets, user interviews | ❌ | ❌ | ❌ |

### 3.4 The Structural Gap

All existing approaches — GrayBeam, AI Harness, and the CDD tools — share a structural gap: contexts are **informal Markdown documents**, not structured, versioned, queryable artifacts with explicit lifecycle, authority, and enforcement semantics. This means:

1. **No machine can reliably parse them.** An AI agent reading Conductor's `product.md` cannot determine which statements are binding constraints vs. aspirational goals.
2. **No enforcement plugin can validate against them.** A CI pipeline cannot check "does this PR comply with the project context?" without a formal schema.
3. **No observability can track them.** You cannot answer "which contexts are violated most often?" if contexts are unstructured prose.
4. **No governance can be automated.** You cannot enforce "hardened rules require CISO approval to change" if rules are indistinguishable from suggestions.

### 3.5 The Lifecycle Gap

Neither the CDD tools nor the constraint-driven approaches provide a formal lifecycle model for constraints:

```
Draft → Candidate → Approved → Active → Deprecated → Archived
```

Without a lifecycle, there is no way to distinguish a constraint that is being considered from one that is actively enforced, or to gracefully retire a constraint that is no longer relevant.

---

## 4. The Opportunity

### 4.1 Positioning LCDD

Living Context Driven Development positions itself at the intersection of:

1. **Constraint-Driven Development** (GrayBeam) — for *what* constraints are and *how* they are enforced.
2. **Governing Change** (AI Harness) — for *who* can change constraints and *how fast*.
3. **Context-Driven Development Tools** (Conductor, PAW, Draft) — for *how* AI agents follow structured workflows. LCDD is complementary: these tools manage workflow; LCDD manages governance.
4. **Context Engineering** — for *how* constraints are provided to AI agents.
5. **Policy-as-Code** — for *how* constraints are represented as machine-readable artifacts.
6. **Living Documentation** — for *how* constraints evolve alongside the system.

### 4.2 LCDD vs. CDD Tools: The Fundamental Difference

| Dimension | CDD Tools (Conductor/PAW/Draft) | LCDD |
|---|---|---|
| **Primary focus** | AI agent workflow (how to work) | Constraint governance (what rules to follow) |
| **Context artifacts** | Informal Markdown (`product.md`, `tech-stack.md`) | Structured schema (JSON Schema, lifecycle, authority) |
| **Constraint discovery** | Manual — human writes context | Automated pipeline — LLM extracts from any source |
| **Constraint lifecycle** | None | Draft → Candidate → Approved → Active → Deprecated → Archived |
| **Authority tracking** | None | 5-level authority with delegation chain |
| **Enforcement** | Agent prompt adherence only | Pluggable: CI, IDE, API gateway, pre-commit |
| **Specification drift prevention** | Not addressed | Core feature — AI agents cannot modify Hardened contexts |
| **Observability** | None | Metrics, dashboards, alerts, violation trends |
| **Reuse** | None | Context Packs — composable, shareable, versioned |
| **Relationship** | Workflow layer | Governance layer — works *on top of* any workflow tool |

> **Analogy:** CDD tools are like a project manager for AI agents (defining the process). LCDD is like a compliance officer (defining the rules). A team needs both. LCDD can provide constraint governance to teams using Conductor, PAW, or any workflow tool.

### 4.2 The Core Novelty

LCDD's core contribution is the **Context Discovery Pipeline**:

```
Discover → Extract → Normalize → Classify → Review → Version → Enforce → Observe → Improve
```

This pipeline:
1. **Discovers** potential contexts from *any* source (code, documents, regulations, meetings, AI outputs).
2. **Extracts** candidate constraints using LLMs with structured output.
3. **Normalizes** into a unified context schema.
4. **Classifies** by authority, source, severity, and lifecycle stage.
5. **Reviews** with appropriate governance (auto for local, human for hardened).
6. **Versions** immutably.
7. **Enforces** through pluggable engines (CI, IDE, AI agent prompt, API contract).
8. **Observes** violations and compliance in production.
9. **Improves** through feedback loops (fitness-based for local, human-review for hardened).

### 4.4 What LCDD Is Not

- **Not a replacement for GrayBeam CDD.** LCDD is complementary; GrayBeam's validation engine could be an enforcement plugin.
- **Not a replacement for AI Harness.** LCDD formalizes the governance model that AI Harness proposes conceptually.
- **Not a replacement for CDD tools (Conductor, PAW, Draft).** LCDD provides governance (rules); CDD tools provide workflow (process). They are complementary layers.
- **Not a policy-as-code tool.** LCDD is a methodology; policy-as-code tools are potential enforcement plugins.
- **Not a prompt engineering framework.** LCDD governs *what* AI agents are allowed to do, not just *how* they are prompted.

---

## 5. Open Questions

1. **Constraint Schema Standardization:** Is there a common schema that can represent constraints from regulatory, architectural, and business-rule sources uniformly?
2. **Confidence Scoring:** How do we quantify confidence in an LLM-extracted constraint before human review?
3. **Conflict Resolution:** What happens when two constraints from different authorities conflict?
4. **Temporal Constraints:** How do we represent constraints that are only active during specific time windows (e.g., "during a hackathon judging period")?
5. **Cross-Repository Context Sharing:** Can contexts be shared across repositories within an organization? Should they be?

---

## 6. References

1. GrayBeam Technology. *Constraint-Driven Development: A Technical Whitepaper.* (2024–2025). https://graybeam.com
2. Bunardzic, Alex. *AI Harness: Governing Change by Rate of Evolution.* Substack (2025).
3. Google / Gemini CLI Extensions. *Conductor: A plugin for AI coding agents enabling Spec-Driven Development.* (2025). https://github.com/gemini-cli-extensions/conductor
4. Emanuele, Rob. *Phased Agent Workflow (PAW): Context-Driven Development for GitHub Copilot.* (2025). https://github.com/lossyrob/phased-agent-workflow
5. Microsoft. *Agentic SDLC Starter: Reference architecture for spec-driven, AI-assisted software development.* (2025). https://github.com/microsoft/agentic-sdlc-starter
6. DraftHQ. *Draft: Context-Driven Development plugin for AI coding agents.* (2025). https://github.com/drafthq/draft
7. Martraire, Cyrille. *Living Documentation: Continuous Knowledge Sharing by Design.* Addison-Wesley (2019).
8. Open Policy Agent. *Policy Language (Rego).* https://www.openpolicyagent.org/docs/latest/policy-language/
9. Stainless API. *Spec-Driven Development.* https://www.stainlessapi.com
10. Evans, Eric. *Domain-Driven Design: Tackling Complexity in the Heart of Software.* Addison-Wesley (2003).
11. Beck, Kent. *Test-Driven Development: By Example.* Addison-Wesley (2002).
12. Wiggins, Adam. *The Twelve-Factor App.* https://12factor.net

---

*This document is part of the Living Context Driven Development Specification. Version 0.2.0 incorporates GitHub ecosystem research conducted on 2026-08-06. It will be updated as new prior art is identified or as the LCDD methodology matures.*
