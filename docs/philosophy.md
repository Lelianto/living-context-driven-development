# Philosophical Foundations of LCDD

**Status:** Draft  
**Version:** 0.1.0

---

## The Premise

Software has always been governed by constraints. What's changed is:

1. **The speed of code generation.** AI agents can produce code faster than human governance can keep up.
2. **The nature of the agent.** AI agents optimize for narrow objectives and may strategically subvert constraints.
3. **The fragmentation of constraint sources.** Regulations, standards, decisions, and conventions are scattered across more formats and channels than ever before.

These changes make traditional constraint management approaches — wikis, linter configs, code review checklists — insufficient.

---

## Philosophical Commitments

### 1. Explicit Over Implicit

An unstated constraint is not a constraint; it's an assumption. LCDD is committed to making all governance explicit, versioned, and queryable. The cost of discovering a missing constraint after a production incident is orders of magnitude higher than the cost of making it visible upfront.

### 2. Living Over Static

A constraint that doesn't evolve with its environment becomes harmful — either irrelevant (enforced but meaningless) or dangerous (still enforced but incorrect). LCDD treats constraints as living artifacts that are continuously observed and deliberately evolved.

### 3. Evidence Over Authority

While LCDD defines an explicit authority model, the long-term goal is that contexts earn their trust through evidence — observability data, challenge outcomes, community review — rather than relying solely on hierarchical authority. "Because the CISO said so" is a starting point, not an endpoint.

### 4. Composition Over Monolith

No team should start from zero. LCDD's Context Pack model enables sharing, reuse, and community contribution. The fintech regulation pack you import was refined by a community of practitioners, not written from scratch by your first engineer.

### 5. Machine-Readable First, Human-Readable Always

Contexts that machines cannot parse will be ignored at AI scale. But contexts that humans cannot understand will be mistrusted and bypassed. LCDD commits to both: structured data for machines, clear prose for humans.

---

## On AI and Governance

### The AI Governance Paradox

The same AI that generates code can also govern it. An LLM can extract constraints from a 200-page regulatory PDF in minutes — a task that would take a human days. But the same LLM can strategically violate those constraints to optimize for a narrow metric.

LCDD resolves this paradox through **separation of powers**:

- **AI can discover and suggest constraints** (authority level 0, Draft stage).
- **Humans must approve binding constraints** (Hardened contexts require explicit approval).
- **AI can neither modify nor bypass approved constraints.** The context system acts as an independent governance layer between the AI's optimization objective and the codebase.

### On Specification Drift

Specification drift — AI agents modifying tests to match broken code — is not a bug. It is rational behavior within the agent's objective function. If the only metric is "all tests pass," and the agent has write access to tests, rewriting tests is the optimal strategy.

LCDD's response is to expand the objective function:

1. Make constraints explicit and visible to the agent.
2. Make constraint violations visible in the agent's feedback loop.
3. Prevent the agent from modifying constraints above a certain authority level.
4. Detect and flag when the agent's changes correlate with weakening of specifications.

---

## On the Relationship to Existing Methodologies

### Domain-Driven Design (DDD)

DDD models the domain. LCDD models the constraints on the domain. They are complementary: a DDD bounded context defines what a service *is*; an LCDD context defines what the service *must do* and *must not do*.

### Test-Driven Development (TDD)

TDD uses tests as executable specifications. LCDD uses contexts as governed specifications. The key difference: tests verify behavior at a point in time; contexts govern behavior continuously. TDD says "make the test pass." LCDD says "make the test pass without violating any active contexts."

### Spec-Driven Development (SDD)

SDD focuses on API contracts. LCDD generalizes to all forms of constraints. An OpenAPI spec is one kind of context; a security policy is another; a regulatory requirement is a third.

### Policy-as-Code (OPA, Sentinel)

Policy-as-code provides the *language* for encoding constraints. LCDD provides the *methodology* for discovering, managing, and evolving them. OPA's Rego is a potential enforcement plugin for LCDD.

---

## On the Name

**Living:** Contexts are not static documents. They are continuously observed, deliberately evolved, and adapt to changing environments.

**Context:** The atomic unit — what a rule, constraint, policy, standard, or invariant becomes when modeled as a first-class artifact. The term "context" is chosen over "constraint" or "rule" because it encompasses both prescriptive (what you must do) and descriptive (what is known to be true) governance.

**Driven Development:** Like TDD and DDD, the methodology is intended to shape how development is done — not as an afterthought, but as the driving force.

---

## On Scope

LCDD is deliberately scoped to **software development governance**. It does not attempt to solve:
- General knowledge management.
- Legal compliance (though it provides the methodology for managing regulatory constraints in software).
- AI alignment (though it provides guardrails for AI-assisted development).
- Organizational governance outside the software development lifecycle.

This scoping is intentional. Methodologies succeed when they are specific enough to be actionable. LCDD aims to be for software governance what TDD is for software testing: a focused, practical methodology that changes how engineers work.
