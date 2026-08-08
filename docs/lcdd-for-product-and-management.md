# LCDD for Product and Management

**Status:** Documentation  
**Version:** 0.1.0  
**Last Updated:** 2026-08-08

---

This document is for people who are accountable for decisions but do not write code: founders,
product managers, operations leads, and compliance owners. It contains no YAML and assumes no
engineering background.

If you are an engineer, [lcdd-quick-start.md](lcdd-quick-start.md) is the better entry point.

---

## The problem, in one paragraph

Your organization makes decisions constantly. Most of them are recorded somewhere — a meeting note,
a Slack thread, a slide, a document nobody opens. A few months later, the decision is still binding
but nobody can find it, and the people who were in the room have moved on or changed their minds.
Engineering, meanwhile, is being asked to build against rules that exist only as memory. Now add AI
coding assistants, which write code quickly and have no memory of your meetings at all.

The result is predictable: work gets done that contradicts decisions nobody could look up.

## What LCDD proposes

Treat each significant decision as a **living artifact** stored in the same place as the code, with
four things attached:

1. **What** the decision is.
2. **Who** has the authority to make and change it.
3. **How strictly** it applies — is it a legal requirement or a preference?
4. **What happens** when someone acts against it — does work stop, or does someone get a note?

That artifact is called a **Context**. That is essentially the whole idea.

## Why put it in the code repository?

This is the part that usually needs explaining, because it sounds like an engineering detail. It is
not — it is the mechanism that makes the whole thing work.

Decisions stored in a wiki drift away from reality because nothing connects them to the work. When
a decision lives beside the code:

- changing it leaves a visible, reviewable record of who changed what and why,
- the tooling can check work against it automatically,
- AI coding assistants can read it, so they stop inventing their own answers,
- it is impossible to quietly lose.

You do not need to touch the repository yourself. You need to know that this is where the answer
lives, and that you can ask for a report from it at any time.

## The two categories that matter to you

Every decision falls into one of two buckets. Getting this right is the main judgment call asked of
you, and it is the one that determines whether adoption succeeds.

### Hardened — slow to change, deliberately

For decisions where being wrong is expensive: legal and regulatory requirements, security
commitments, contractual obligations, core architecture.

Changing one requires explicit human approval. An automated system is never permitted to change it.
This is a hard rule in the design, not a setting someone can toggle.

### Local — allowed to move quickly

For decisions that legitimately change as you learn: quarterly priorities, team working agreements,
style preferences, experiments.

These can be revised with light review, or automatically for the smallest ones.

### The judgment call

The most common failure in adopting this is marking everything Hardened, on the reasoning that all
decisions are important. The result is an organization that cannot move, and teams that route around
the process entirely.

A useful test: **if this decision would plausibly be different next quarter, it is Local.** Your
quarterly roadmap is Local even though it is important. A regulatory obligation is Hardened even if
it feels obvious.

## What it looks like in practice

Take a real decision: *"New features only ship if they are on the approved quarterly roadmap."*

Recorded as a Context, it captures that product management owns it, that it came from the Q3 roadmap
document, that it is a Local standard revisable each quarter, and that violations produce a warning
during planning rather than blocking anyone.

Three things change:

- Sprint planning has something to cite instead of a recollection.
- When the roadmap changes, that change is recorded with a reviewer and a date.
- Six months later, "why did we reject that feature?" has an answer.

Notice what it does **not** do: it does not stop anyone from shipping. That decision is a human
judgment, and the tooling cannot verify it, so it warns rather than blocks. Being honest about that
boundary is important — a system that claims to enforce what it cannot verify loses trust quickly.

For the technical version of this and two other scenarios, see
[lcdd-use-cases.md](lcdd-use-cases.md).

## What you can ask for

Once a handful of decisions are recorded, the system can report on itself. Useful questions to ask
your engineering team:

| Question | What it tells you |
|---|---|
| "What is our context health score?" | A 0–100 score with an A–F grade for how well-maintained the decision record is |
| "Which decisions have no owner?" | Rules nobody is accountable for — the first thing to fix |
| "Which decisions haven't been relevant in 90 days?" | Candidates for retirement; keeping dead rules costs attention |
| "Which rules are AI agents violating most?" | Where your decisions are written ambiguously enough that a machine misreads them |
| "Show me the change history for this decision" | The full audit trail with approvers and dates |

The last one is the one auditors and enterprise customers ask about.

## A note on AI

There is a design principle here worth understanding, because it will come up: **an LLM is a tool,
not an authority.**

AI can help draft a decision, suggest that an existing one looks stale, or flag a new regulation
worth reviewing. It is never permitted to approve a Hardened decision or activate a rule on its own.
Every AI suggestion enters as a draft with a confidence score and waits for a human.

This is deliberate and structural. If someone asks whether AI is "making governance decisions" here,
the answer is no — it prepares the work, and a person decides.

One related point, from the observability design: **violation data is never used to evaluate
individual performance.** If it were, people would stop surfacing problems, and the data would
become worthless. This is worth stating explicitly if you are the one introducing the practice.

## Getting started without a project

You do not need a program, a budget, or a rollout plan.

1. **Pick one decision** that has been forgotten or relitigated more than once. Choose a real
   irritant, not the most important decision you have.
2. **Ask an engineer to record it** as a Context. It takes a few minutes with `lcd context add`.
3. **Review it.** Read it and confirm it says what you meant. This is a two-minute conversation.
4. **Activate it** and cite it the next time the topic comes up.
5. **Check back in a month.** Ask for the health score. Add a second decision if the first one
   earned its keep.

If after a month nobody has referred to it, that is real information — either the decision did not
matter or it was written unclearly. Both are worth knowing, and neither cost you much to learn.

## What to expect, honestly

LCDD is at v0.5.0 with a working reference implementation. It is a proposal, not an industry
standard, and it is being developed in the open.

What works today: recording decisions, reviewing them, enforcing the mechanically checkable ones,
and measuring the health of the collection.

What does not exist yet: a hosted service, an editor extension, and a marketplace of ready-made
decision sets. The current interfaces are the CLI, MCP server, and a local dashboard. Drift-aware
retrieval and change-scoped governance are the next milestone; broader ecosystem integrations come
after the core contracts are proven.

If you want a polished product experience, this is early. If you want to stop losing decisions and
are willing to work through an engineer, it works now.

## A one-page version for a meeting

- **Problem:** decisions get made, then lost. Engineering and AI assistants build against rules
  nobody can look up.
- **Proposal:** record each significant decision next to the code, with its owner, how strictly it
  applies, and what happens when it is broken.
- **Two categories:** Hardened for expensive-to-get-wrong decisions, slow to change on purpose.
  Local for decisions that legitimately evolve.
- **Example:** "Features ship only if they are on the approved roadmap" — owned by product,
  revisable quarterly, warns during planning.
- **First step:** pick one frequently forgotten decision, record it, review it, cite it.
- **Cost:** minutes per decision. No infrastructure, no new vendor.

## Where to go next

- [introduction.md](introduction.md) — a fuller conceptual overview.
- [lcdd-use-cases.md](lcdd-use-cases.md) — the same scenarios with technical detail.
- [faq.md](faq.md) — common objections and answers.
- [cost-analysis.md](cost-analysis.md) — what adoption actually costs.
- [lcdd-cheat-sheet.md](lcdd-cheat-sheet.md) — a one-page reference to share with engineers.
