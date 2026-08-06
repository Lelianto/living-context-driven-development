# Vision

**Status:** Draft  
**Version:** 0.1.0  
**Last Updated:** 2026-08-06

---

## The World We Want to Build

Imagine a world where:

- A startup founder runs `lcd discover` and within seconds receives a structured report of every regulation, standard, and best practice that applies to their product — sourced from government websites, industry bodies, and community knowledge packs.

- An AI coding agent, before generating any code, queries the Context Registry for the constraints that govern this task — and generates code that respects them, or explicitly flags where compliance requires human judgment.

- A CI pipeline does not just run tests and linting; it validates every change against the organization's living contexts — blocking merges that violate hardened rules and commenting on those that merely suggest improvement.

- When a government agency publishes a new regulation, the Context Discovery Pipeline detects the change within hours, extracts the relevant constraints, and opens a PR with the proposed new contexts — flagged for human review by the appropriate domain owner.

- A hackathon team checks in a `context.yaml` file alongside their code, automatically enforcing the competition rubric as constraints throughout their development sprint.

- An engineering team says, with confidence: "We practice Living Context Driven Development" — and everyone in the room understands what that means, just as they understand TDD or DDD today.

---

## The Change We Seek

### From Invisible to Visible

Today, most constraints governing software are invisible — embedded in code as implicit assumptions, scattered across wikis as outdated documentation, or existing only in the minds of senior engineers. LCDD makes them visible, versioned, and queryable.

### From Static to Living

Today, constraints are frozen in documents written months ago — architectural decision records that nobody updated, coding standards that nobody reads, compliance checklists that are checked once a year. LCDD makes them living — observed continuously, evolved deliberately, enforced automatically.

### From Human-Only to Human-AI Collaboration

Today, constraints are written by humans for humans — prose documents that AI agents cannot parse, enforce, or reference. LCDD makes them machine-readable, enabling AI agents to be *governed by* constraints rather than being the *source of* constraints.

### From Siloed to Shared

Today, every team reinvents their constraint management — a custom linter here, a wiki page there, a checklist spreadsheet somewhere else. LCDD provides a common schema, enabling Context Packs to be shared across teams, organizations, and the open-source community.

---

## The Long Arc

### Phase 1: Specification (v0.1.0 — Current)

The methodology is defined. The core abstractions — Context, Lifecycle, Authority, Registry — are specified. The manifesto is written. The problem is articulated.

### Phase 2: Reference Implementation (v0.2.0)

A reference CLI (`lcd`) exists. A team can run `lcd init`, `lcd context add`, `lcd validate`, and `lcd observe`. The schema is implemented in TypeScript and Go. The first Context Packs are published.

### Phase 3: Ecosystem (v0.5.0)

Plugins exist for GitHub (PR comments with context violations), VS Code (in-editor context awareness), MCP (Claude and other AI agents), and CI/CD platforms. Community-contributed Context Packs cover common domains: fintech, healthtech, e-commerce, hackathons.

### Phase 4: Methodology Adoption (v1.0.0)

"Living Context Driven Development" is recognized alongside TDD, DDD, BDD, and SDD as a named methodology. Conference talks, workshops, and training materials exist. Teams list LCDD in their job descriptions and engineering blogs.

### Phase 5: Ubiquity (v2.0.0+)

Context Registries are as common in repositories as `package.json` or `.github/workflows`. AI coding agents query them by default. Regulatory bodies publish machine-readable context packs. The idea that software development can proceed without explicit context governance becomes as archaic as the idea of development without version control.

---

## The Invitation

This vision is not a product roadmap. It is an invitation — to tool builders, methodology authors, engineering leaders, and anyone who believes that software development in the age of AI needs a new kind of discipline.

We invite you to:

- **Read** the specification and challenge its assumptions.
- **Contribute** Context Packs for your domain.
- **Build** plugins, tools, and integrations that extend the ecosystem.
- **Adopt** LCDD in your team and share what you learn.
- **Critique** the methodology — rigorous criticism is how it improves.

The vision is large. The work is incremental. But every specification, every context, every plugin brings us closer to a world where software is governed not by forgotten assumptions and outdated documents, but by living contexts that earn their authority through transparency, observability, and deliberate evolution.

---

*"The best way to predict the future is to specify it."*
