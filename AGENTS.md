# AGENTS.md — Instructions for AI Coding Agents

This file provides instructions for AI coding agents (GitHub Copilot, Claude Code, Cursor, etc.) working on the Living Context Driven Development repository.

## Project Identity

This is the **Living Context Driven Development (LCDD)** specification repository. It defines a methodology and open specification for constraint governance in AI-assisted software development. It is currently in **Implementation Phase (v0.4.0)** — the specification is stable and the reference implementation is published.

## Repository Structure

- `specification/` — 18 RFC-style specification documents (numbered 0000–0017). These are **normative**.
- `manifesto/` — Manifesto, First Principles, and Vision. These are **foundational**.
- `docs/` — Companion documentation: research, glossary, introduction, philosophy, comparison, adoption, FAQ. These are **explanatory**.
- `reference/` — JSON Schema, example Contexts, architecture diagrams.
- `examples/` — Domain-specific Context Packs (Startup, Fintech, Healthcare, E-commerce, Hackathon).
- `website/` — Landing page at livingcontext.dev (Astro + Vercel).
- `implementation/` — Reference implementation: `@lcdd/core`, `@lcdd/cli`, `@lcdd/mcp`.
- `lcdd-methodology.md` — Comprehensive methodology guide at the repository root.
- `README.md` — The front page of the project.

## Rules for AI Agents

### When Modifying Files

1. **This repository defines the LCDD specification.** Treat it as a specification, not application code.
2. **Follow existing conventions.** Specification documents use RFC-style format with Status, Version, Abstract, Motivation, Specification, and References sections.
3. **Context YAML examples** must be valid and complete. Every field in the Context Schema should be represented or explicitly omitted with reason.
4. **Cross-references** between documents should use relative Markdown links (e.g., `[0002-context-lifecycle.md](0002-context-lifecycle.md)`).
5. **Do not make claims about academic papers or published research** unless you have verified they exist. The project is honest about what is real and what is aspiration.

### When Answering Questions

1. **Read the relevant specification documents** before answering — don't guess.
2. **Cite the specific document** (e.g., "See `specification/0003-authority-model.md` for the authority spectrum").
3. **Acknowledge gaps honestly.** If the specification doesn't cover something, say so.
4. **Use LCDD terminology** as defined in `docs/glossary.md`.

### When Proposing Changes

1. **RFC-style changes** to the specification should follow the format in `CONTRIBUTING.md`.
2. **Context Packs** should follow the example structure in `examples/`.
3. **Documentation improvements** should maintain the quality bar set by existing docs.

## Key Concepts (For Quick Reference)

| Term | Definition |
|---|---|
| Context | The atomic unit of governance — a versioned, structured, machine-readable artifact. |
| Context Registry | The versioned store of all Contexts. |
| Context Lifecycle | Draft → Candidate → Approved → Active → Deprecated → Archived. |
| Authority | Who asserts a constraint and why it should be trusted (levels 0–4). |
| Hardened Context | Slow-changing constraint requiring explicit human approval to modify. |
| Local Context | Faster-changing constraint that can evolve through automated processes. |
| Context Pack | A named, versioned collection of related Contexts for sharing and reuse. |
| CQL | Context Query Language — declarative query language for the Registry. |
| Specification Drift | When AI agents modify tests/specs to match broken code instead of fixing the code. |

## Voice and Tone

- **Authoritative but not arrogant.** The specification is a proposal, not a decree.
- **Honest about maturity.** v0.4.0 is a working reference implementation. Acknowledge limitations.
- **Precise.** Use MUST, SHOULD, MAY per RFC 2119 in normative documents.
- **Accessible.** Companion documentation should be readable by someone new to the concept.

## Forbidden

- ❌ Do not fabricate references, papers, or academic citations.
- ❌ Do not claim the specification is more mature than it is (v0.4.0 = Implementation Phase).
- ❌ Do not remove or weaken the distinction between Hardened and Local governance.
- ❌ Do not add tooling implementation details to the specification (those belong in future implementation directories).
