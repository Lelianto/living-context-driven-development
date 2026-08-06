# Contributing to LCDD

**Version:** 0.1.0

---

## Welcome

Living Context Driven Development is an open specification. Contributions of all kinds are welcome: corrections, clarifications, new ideas, critiques, examples, and implementations.

---

## Ways to Contribute

### 1. Read and Critique

The most valuable contribution right now is critical reading. Does a principle hold up? Is a specification ambiguous? Is there prior art we've missed? Open an issue with the tag `critique`.

### 2. Propose Changes (RFC)

For significant changes, follow the RFC process:

1. Fork the repository.
2. Create a new specification document in `specification/` following the numbering convention.
3. Write using the [RFC template](#rfc-template) below.
4. Submit a Pull Request.
5. Engage with review feedback.

### 3. Contribute Context Packs

Create example Context Packs for your domain in `examples/`:

1. Create a directory in `examples/` named after your domain.
2. Add a `README.md` explaining the domain and the pack's purpose.
3. Add Context YAML files in a `contexts/` subdirectory.
4. Add a `CONTEXT.yaml` pack manifest.
5. Submit a Pull Request.

### 4. Report Issues

Found a bug, inconsistency, or missing piece? Open an issue.

### 5. Improve Documentation

Typos, unclear explanations, missing examples — all documentation improvements are welcome.

---

## Pull Request Process

1. Ensure your PR addresses an open issue or RFC discussion.
2. Follow the existing style and formatting conventions.
3. Update the CHANGELOG.md if the change is significant.
4. Ensure all links are valid.
5. A Core Contributor will review within 14 days.

---

## RFC Template

```markdown
# RFC: [Title]

**Status:** Draft
**Author:** [Your name/handle]
**Date:** [YYYY-MM-DD]

## Motivation
[Why is this change needed? What problem does it solve?]

## Proposal
[What do you propose? Be specific.]

## Impact
[How does this affect existing specifications? Is it backward compatible?]

## Alternatives Considered
[What other approaches were considered? Why were they rejected?]

## References
[Links to prior art, related issues, discussions.]
```

---

## Style Guide

- Write in clear, concise English.
- Use MUST, SHOULD, MAY per RFC 2119.
- Link to related specification documents by their number (e.g., `[0002-context-lifecycle.md]`).
- Use YAML for code examples, JSON Schema for formal definitions.
- Keep lines under 120 characters where practical.

---

## Community

- Be respectful and constructive.
- Assume good faith.
- Focus on the idea, not the person.
- Read the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License that covers this project.
