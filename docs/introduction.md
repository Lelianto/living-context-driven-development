# Introduction to Living Context Driven Development

**Status:** Draft  
**Version:** 0.1.0

---

## In One Sentence

Living Context Driven Development (LCDD) is a methodology for discovering, managing, and enforcing the rules, constraints, and knowledge that should govern software — especially when AI agents are writing the code.

---

## The Problem in Plain Language

AI coding tools are incredible. They can write entire features in minutes. But they introduce a dangerous problem:

**When an AI agent faces a failing test, it sometimes fixes the test instead of the code.**

This is called **Specification Drift**. The AI optimizes for "all tests pass" by rewriting what "correct" means, rather than fixing what's broken.

But the problem is bigger than AI agents. Even for human developers:

- A startup founder doesn't know which government regulations apply to their fintech product.
- A team's coding standards live in a dusty wiki that nobody reads.
- An architectural decision made in a Slack thread six months ago is remembered by exactly one person.
- A security requirement documented in a PDF is never checked against the actual code.

**The rules that govern software are scattered, invisible, and unenforceable.**

---

## What LCDD Does About It

LCDD makes rules **first-class artifacts**. A "Context" is a structured, versioned, machine-readable representation of any rule, constraint, policy, or standard that governs your software.

### The Context

A Context is not a comment. Not a ticket. Not a Slack message. It is a structured artifact that answers:

- **What** is the rule?
- **Who** says so, and why should we trust them?
- **Where** does it apply?
- **What stage** is it in? (Draft? Active? Deprecated?)
- **How** is it enforced?
- **Can AI** agents modify it?

### The Lifecycle

Contexts don't go from "someone mentioned this" to "this blocks production" in one step. They move through stages:

```
Draft → Candidate → Approved → Active → Deprecated → Archived
```

Each stage has different enforcement behavior. A Draft context is visible but never enforced. An Active context can block merges. A Deprecated context warns but doesn't block.

### The Pipeline

Contexts come from everywhere:

- Government regulation PDFs
- Team Markdown files
- Slack discussions
- AI suggestions
- Incident postmortems
- Hackathon rubrics

The Context Engineering Pipeline discovers, extracts, normalizes, classifies, reviews, and versions them into the Context Registry.

### The Governance

Not all rules are equal. A PCI-DSS requirement and a preference for tabs over spaces are both "rules" — but they need different governance:

- **Hardened contexts** (regulations, architectural invariants) require explicit human approval to change. AI agents cannot modify them.
- **Local contexts** (style preferences, team conventions) can evolve more freely. AI agents can suggest changes.

---

## Who Is LCDD For?

- **Startup founders** who don't have compliance teams but still need to comply with regulations.
- **Engineering teams** using AI coding tools who need guardrails against specification drift.
- **Open-source maintainers** who want to encode and enforce community standards.
- **Hackathon participants** who want the competition rubric to automatically check their code.
- **Platform teams** who maintain architectural standards across many services.

---

## What LCDD Is Not

- **Not a tool.** LCDD is a methodology. Tools are reference implementations.
- **Not a replacement for TDD, DDD, or any existing methodology.** LCDD is additive — it addresses governance gaps.
- **Not a compliance framework.** LCDD helps manage regulatory constraints; it doesn't provide legal advice.
- **Not a prompt engineering technique.** LCDD governs what AI agents are allowed to do, not just how they're prompted.

---

## Where to Go Next

1. Read the [Manifesto](../manifesto/manifesto.md) — the four values and twelve principles.
2. Read the [Problem Statement](../specification/0000-problem.md) — the detailed case for why LCDD exists.
3. Read the [Core Principles](../specification/0001-core-principles.md) — the ten principles that shape everything.
4. Read the [Glossary](glossary.md) — the vocabulary you'll need.
5. Read the [Comparison](comparison.md) — how LCDD relates to methodologies you already know.

---

## One Analogy

If you know Domain-Driven Design, think of LCDD as DDD for constraints.

- DDD says: model your domain explicitly in code.
- LCDD says: model your constraints explicitly as artifacts.

If you know Test-Driven Development, think of LCDD as TDD for governance.

- TDD says: write a failing test before you write code.
- LCDD says: define the context that should govern the code before you let an AI generate it.

If you know Policy-as-Code, think of LCDD as the methodology behind the code.

- OPA/Rego says: here's a language for writing policies.
- LCDD says: here's how to discover, manage, and evolve those policies across their entire lifecycle.
