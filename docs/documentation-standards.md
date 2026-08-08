# LCDD Documentation & Package Standards

| Field | Value |
| --- | --- |
| Document title | LCDD Documentation & Package Standards |
| Version | 1.0.0 |
| Date | 2026-08-08 |
| Classification | Public |
| Applies to | `docs/`, `README.md`, `specification/`, package READMEs, API references, the `website/` |
| Status | Proposal — for review and adoption by maintainers |

> This document defines how LCDD writes documentation that is **easy to understand, internationally consistent, and
> aligned with international standards**. It is the companion to the security audit
> ([security-audit.md](security-audit.md)): where that document governs *what the product does safely*, this document
> governs *how we explain it clearly*.

---

## 1. Purpose & Scope

### 1.1 Why a documentation standard

LCDD's product is a **specification plus reference implementation**. Its users are developers, AI coding agents, and
organizations in many countries. Documentation is therefore part of the product surface, and inconsistent or
unreadable documentation is itself a form of Context Debt (see [docs/glossary.md](glossary.md)).

### 1.2 Scope

- Prose documentation in `docs/` and `README.md`.
- Normative specification documents in `specification/`.
- Package artifacts: npm READMEs, `package.json` metadata, TSDoc comments, examples.
- Public-facing copy on `website/`.

Out of scope: product code style (covered by project linting), API design of the CLI itself.

---

## 2. Applicable Standards

| Standard | What it governs | How LCDD uses it |
| --- | --- | --- |
| ISO/IEC/IEEE 26514:2022 | Design and development of information for users | Structure and audience-driven content for `docs/` |
| ISO/IEC/IEEE 82079-1:2019 | Preparation of information for use (general principles) | Completeness, correctness, and task-orientation of instructions |
| ISO 24495-1:2023 | Plain language — governing principles and guidelines | Readability rules (Section 4) |
| RFC 2119 + RFC 8174 | Normative keywords MUST/SHOULD/MAY | Required wording in `specification/` and Contexts |
| ISO 8601 | Date and time representation | All timestamps in prose, examples, and data (`2026-08-08`) |
| ISO 639-1 | Language codes | Declared content language (`en-US`) |
| semver.org | Version numbering | All packages, packs, and documents |
| Keep a Changelog | Changelog format | `CHANGELOG.md` |
| TSDoc (microsoft/tsdoc) | TypeScript API documentation | `@lcdd/core` public API |
| WCAG 2.1 (AA) | Accessibility | Website and rendered docs |
| Diátaxis (four-quadrant model) | Documentation architecture | Content classification (Section 3) |

---

## 3. Documentation Architecture

LCDD follows the **Diátaxis** model, which separates documentation by *user task* and *cognitive orientation*. Every
document in `docs/` should map to exactly one quadrant; mixed-purpose documents should be split.

| Quadrant | Purpose | LCDD documents |
| --- | --- | --- |
| **Tutorials** | Learning-oriented (first-time experience) | `lcdd-quick-start.md`, `lcdd-concepts.md` |
| **How-to guides** | Task-oriented (solve a problem) | `lcdd-cheat-sheet.md`, `lcdd-templates.md`, `lcdd-use-cases.md`, package READMEs |
| **Reference** | Information-oriented (exact and complete) | `specification/`, `reference/`, `docs/glossary.md`, API reference |
| **Explanation** | Understanding-oriented (why) | `introduction.md`, `philosophy.md`, `comparison.md`, `research*.md`, `adoption.md` |

### 3.1 Rules derived from the model

1. A **Tutorial** gives a complete path from zero to a working result; it never assumes prior LCDD knowledge.
2. A **How-to** answers one question ("How do I promote a context to Active?") and is skimmable.
3. **Reference** content is exhaustive and terse; it never teaches.
4. **Explanation** documents connect concepts to rationale and may cite external work; they never contain
   step-by-step instructions.
5. Every new `docs/` file declares its quadrant in its header (see Section 6).

---

## 4. Writing Principles (Plain Language)

Based on ISO 24495-1:2023 (plain language) and ISO/IEC/IEEE 26514 (user information). These are the acceptance
criteria for prose in every LCDD document.

### 4.1 Relevance & audience

- Write for one primary audience per document: **developer**, **engineering manager**, **AI agent operator**, or
  **non-technical stakeholder**. State the audience in the header.
- Answer the user's question before anything else: "What is this? Why do I need it? How do I start?"

### 4.2 Clarity

- **Active voice** by default: "The CLI writes the context to `.lcdd/contexts/`" not "The context is written…".
- **One idea per sentence.** Prefer sentences under 25 words; keep paragraphs under 6 lines.
- Prefer common words over jargon; when a term is required, link it to the glossary on first use.
- Use lists for enumeration, tables for comparison, and code blocks for commands and data.
- Present commands as copy-pasteable, complete lines with a neutral prompt (`$`), not prose fragments.

### 4.3 Accuracy & currency

- Documentation is subject to the same lifecycle discipline as Contexts: every document has a **Version** and
  **Last Updated** date (Section 6), and stale documents are flagged, updated, or deprecated — never left silent.
- Commands, flags, and schema fields must be verified against the implementation before writing. When in doubt,
  mark the claim with a date or link to source.
- Do not claim capabilities the implementation does not have (see `AGENTS.md` — honesty about maturity).

### 4.4 Consistency

- One term, one meaning, project-wide, maintained in `docs/glossary.md`.
- Spelling: **American English** (`contextualize`, `registry`, not `contextualise`/`registries` style variants).
- Consistent punctuation for enumerations and consistent Markdown conventions (Section 6).

---

## 5. Internationalization & Locale

LCDD documentation is written **once, in English (en-US)**, and may be translated. To keep translations
cost-effective and unambiguous:

| Concern | Rule |
| --- | --- |
| Baseline language | en-US, declared in the document header (`Language: en-US`) |
| Dates | ISO 8601, e.g. `2026-08-08`; never month-name-first or ambiguous formats |
| Times | UTC with `Z` suffix or explicit offset in data; prose may use local time with timezone named |
| Numbers & units | SI units; thousands separators avoided in prose; currencies written as `USD 100` |
| Code & identifiers | Never translated; keep `lcd`, `.lcdd/`, context IDs in the original form |
| Idioms & humor | Avoid culture-specific idioms, puns, and humor that do not survive translation |
| Sentence construction | Avoid long noun chains and nested clauses; they break MT and human readers equally |
| Translation readiness | Keep sentences short, headings sentence-case, tables simple; provide `docs/translations/` index if translated |

---

## 6. Document Header & Metadata Convention

Every Markdown document in `docs/` and `specification/` starts with a header block so readers and tooling can assess
its lifecycle and freshness — mirroring the existing convention in `research-v2.md` and `0016-roadmap.md`.

```markdown
# <Title>

| Field | Value |
| --- | --- |
| Status | Draft \| Proposal \| Active \| Deprecated |
| Version | 0.1.0 (semver; increment on substantive change) |
| Last Updated | 2026-08-08 (ISO 8601) |
| Audience | developers \| managers \| non-technical \| AI agents |
| Quadrant | tutorial \| how-to \| reference \| explanation |
| Language | en-US |
```

Rules:

1. **Status** reflects content maturity, not the codebase version. A document that tracks implementation (like
   `research-v2.md`) states which release it reflects.
2. **Version + Last Updated are mandatory.** A PR that changes content must bump one of them.
3. Cross-references use relative Markdown links and are checked for existence on every change.
4. No document may silently contradict another; conflicting documents are resolved through the glossary and RFC
   process, not by editorial silence.

---

## 7. Normative Language (Specifications)

The `specification/` documents are normative and MUST use RFC 2119/8174 keywords exactly:

- **MUST / MUST NOT** — absolute requirements (unconditional).
- **SHOULD / SHOULD NOT** — recommended; valid reasons may justify exceptions, but the reasons should be recorded.
- **MAY** — optional.
- Keywords are written in uppercase; a short legend appears in each document's abstract or references.

Same rules apply to prose inside Context artifacts (e.g. `enforcement.specification` descriptions) so that AI agents
and CI interpret constraints deterministically.

---

## 8. Package & API Documentation Standard

Every npm package (`@lcdd/core`, `@lcdd/cli`, `@lcdd/mcp`) follows the template below. This mirrors the quality bar
already present in the existing package READMEs.

### 8.1 Package README template

````markdown
# @lcdd/<package>

> One-sentence value proposition (what problem it solves, for whom).

## Features
- 3–6 bullet capabilities, each verifiable in the codebase.

## Requirements
Node.js >= 18. Optional peer dependencies and when they are needed
(e.g. `openai`/`@anthropic-ai/sdk` only for cloud extraction).

## Installation
```bash
npm install @lcdd/<package>
```

## Quick Start
A complete, runnable example (copy-paste, no placeholders).

## Usage / API
For each public symbol: one-line purpose, signature, parameters, return value,
a 3–8 line example. TSDoc comments are the source of truth; the README links to them.

## Security Notes
Local-first defaults, secrets handling, and any network behavior (see
[security-audit.md](../docs/security-audit.md)).

## License
Apache-2.0. See LICENSE.
````

### 8.2 TSDoc rules (`@lcdd/core`)

- Every exported interface, class, method, and type has a TSDoc comment.
- Document **parameter contracts** (undefined/null behavior, thrown errors) explicitly.
- Examples inside TSDoc are runnable and minimal.
- Do not duplicate the README; reference instead.

### 8.3 `package.json` metadata

- `description` ≤ 160 chars, keyword-rich, and factual.
- `repository`, `homepage`, `license` (Apache-2.0), `engines` (Node ≥ 18), `keywords` present — this is already the
  convention in all three packages.
- `files` whitelist only published artifacts (`dist`, `README.md`).
- Dependency ranges are **continuously audited** (see security-audit.md F-08).

### 8.4 Changelog

`CHANGELOG.md` follows Keep a Changelog: one `## [version] — YYYY-MM-DD` section per release, grouped by
Added/Changed/Fixed/Deprecated/Removed/Security. **Every released version has a section**; a release without a
changelog entry is an incomplete release.

---

## 9. Terminology & Glossary Governance

1. All defined terms live in `docs/glossary.md` (the canonical vocabulary).
2. First use of a glossary term in any document links to it; subsequent uses are plain.
3. New terms are added to the glossary in the same PR that introduces them.
4. A term with two spellings is a defect; the glossary is the arbiter.
5. AI-generated documentation must be reviewed against the glossary before merging (human-governed, mirroring
   Hardened context rules).

---

## 10. Accessibility (WCAG 2.1 AA)

- Headings are hierarchical (one `#`, then `##`, then `###`) and never skip levels.
- Every image/diagram has descriptive alt text; diagrams are additionally described in prose.
- Tables have a header row and are not used for layout.
- Color is never the only channel for meaning (e.g. status ✅/❌ is accompanied by the word "Complete"/"Not started").
- Links have meaningful text ("see [0009-observability.md](specification/0009-observability.md)"), not "click here".
- Code blocks are wrapped; line lengths respect the repository lint limit (200 chars).

---

## 11. Current-State Gap Analysis (as of 2026-08-08, v0.5.0)

| Area | Current state | Gap vs this standard | Action |
| --- | --- | --- | --- |
| Content language | Research and newer docs are en-US; 4 practical docs are Indonesian (`lcdd-cheat-sheet.md`, `lcdd-concepts.md`, `lcdd-quick-start.md`, `lcdd-templates.md`) | Mixed-language corpus violates international consistency (Sections 4–5) | Migrate the 4 docs to en-US (keep translations under `docs/translations/`) |
| Document headers | `research-v2.md`, `0016-roadmap.md`, spec docs have headers | `adoption.md`, `comparison.md`, `cost-analysis.md`, `faq.md`, `introduction.md`, `philosophy.md` lack Version/Last Updated (verified 2026-08-08) | Backfill headers per Section 6 |
| Changelog | `CHANGELOG.md` ends at `[0.4.0]` | Missing `[0.5.0]` section; violates Section 8.4 | Add the v0.5.0 release section |
| Roadmap freshness | `ROADMAP.md` and `0016-roadmap.md` reflect v0.4.0; 0016 marks MCP milestone "Not Started" | Stale lifecycle data contradicts Section 4.3 | Update to v0.5.0; reconcile milestone status |
| Package READMEs | `@lcdd/core`, `@lcdd/cli`, `@lcdd/mcp` READMEs exist and are good | Missing "Security Notes" section in some; no uniform template | Align to Section 8.1 template |
| TSDoc | Partial coverage (`registry.ts`, `types.ts` have comments) | Not every exported symbol documented | Enforce TSDoc on public API |
| Glossary linkage | `docs/glossary.md` exists and is used | First-use links not consistently applied | Add a link-check step in review |
| Website | `website/` at v0.5.0 | Content language and a11y not yet audited against WCAG | Schedule a WCAG review |

---

## 12. Compliance Checklist

Use this checklist in every documentation PR (extend `CONTRIBUTING.md` if adopted):

- [ ] Header block present: Status, Version, Last Updated, Audience, Quadrant, Language.
- [ ] Language en-US; ISO 8601 dates; no culture-specific idioms.
- [ ] Belongs to exactly one Diátaxis quadrant; no mixed teaching/reference content.
- [ ] Every command/flag/schema field verified against the implementation.
- [ ] RFC 2119 keywords uppercase and used correctly (specification + contexts).
- [ ] Glossary terms linked on first use; no new term without a glossary entry.
- [ ] Headings hierarchical; links meaningful; code blocks wrapped ≤ 200 chars.
- [ ] Changelog updated for user-visible changes; version bumped (doc or package as applicable).
- [ ] markdownlint clean (`npx markdownlint-cli2 "docs/**/*.md" "*.md"`).
- [ ] Cross-references resolve (relative links exist).

---

## 13. Implementation Action Plan

| # | Action | Owner | Priority |
| --- | --- | --- | --- |
| 1 | Add `[0.5.0]` section to `CHANGELOG.md`; update `ROADMAP.md` and `0016-roadmap.md` to v0.5.0 | Maintainers | Immediate |
| 2 | Migrate the 4 Indonesian docs to en-US; archive originals under `docs/translations/id/` | Maintainers | Short-term |
| 3 | Backfill header blocks on docs lacking them | Maintainers | Short-term |
| 4 | Align package READMEs to the Section 8.1 template (add Security Notes) | Maintainers | Short-term |
| 5 | Enforce TSDoc coverage on `@lcdd/core` public API | Maintainers | Medium-term |
| 6 | Adopt this standard as a CONTRIBUTING.md section + PR checklist | Maintainers | Medium-term |
| 7 | WCAG 2.1 AA review of `website/` | Maintainers | Medium-term |

---

## 14. References

1. ISO/IEC/IEEE 26514:2022 — Design and development of information for users.
2. ISO/IEC/IEEE 82079-1:2019 — Preparation of information for use.
3. ISO 24495-1:2023 — Plain language.
4. RFC 2119 / RFC 8174 — Key words for use in RFCs.
5. ISO 8601 — Date and time; ISO 639-1 — Language codes.
6. semver.org; Keep a Changelog; TSDoc (microsoft/tsdoc); WCAG 2.1.
7. Diátaxis — <https://diataxis.fr>
8. Repository: `docs/glossary.md`, `CHANGELOG.md`, `ROADMAP.md`, package READMEs, [security-audit.md](security-audit.md).
