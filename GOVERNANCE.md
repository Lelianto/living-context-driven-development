# Governance

**Version:** 0.1.0  
**Last Updated:** 2026-08-06

---

## Overview

This document defines how the Living Context Driven Development specification is governed. In accordance with LCDD Principle 10 ("The Methodology Applies to Itself"), the governance of this project follows LCDD principles.

---

## Roles

### Specification Lead

The Specification Lead is responsible for the overall direction, quality, and coherence of the LCDD specification. They have final decision-making authority on specification changes but are expected to build consensus.

### Core Contributors

Core Contributors are individuals who have made sustained, high-quality contributions to the specification. They have approval authority on RFCs within their domain expertise.

### Community Contributors

Anyone who contributes to the specification through issues, RFCs, pull requests, or community discussion is a Community Contributor.

---

## Decision Making

### RFC Process

Significant changes to the specification follow the RFC (Request for Comment) process:

1. **Proposal:** An RFC is submitted as a Markdown document in the `specification/` directory (following the numbering convention).
2. **Discussion:** The community discusses the proposal in the associated issue/PR for a minimum period based on impact:
   - Minor changes (typos, clarifications): 3 days
   - Significant changes (new sections, redefinitions): 14 days
   - Breaking changes (incompatible with prior versions): 30 days
3. **Decision:** The Specification Lead or designated Core Contributor makes a decision: Accept, Revise, or Reject.
4. **Implementation:** If accepted, the change is merged and the version is incremented.

### Consensus Seeking

The default decision-making mode is consensus. When consensus cannot be reached, the Specification Lead acts as tiebreaker, documenting the rationale for the decision.

### Voting

For controversial changes, a vote among Core Contributors may be called. A 2/3 majority is required to accept.

---

## Versioning

The LCDD specification follows Semantic Versioning:

- **MAJOR** (1.0.0): Incompatible changes to the specification.
- **MINOR** (0.1.0): New sections, significant additions.
- **PATCH** (0.1.1): Clarifications, typo fixes, non-semantic changes.

Pre-1.0 versions (0.x.x) are considered Draft and MAY have breaking changes between minor versions.

---

## Context Governance (Dogfooding)

The governance policies of this project are themselves represented as Contexts:

```yaml
id: "ctx-lcdd-governance"
title: "LCDD Specification Governance"
lifecycle: "active"
authority: { level: 3, source: "Specification Lead" }
governance: { classification: "hardened-standard", approval_required: true }
```

Any change to this GOVERNANCE.md file follows the Hardened Change Process defined in [specification/0004-governance.md](specification/0004-governance.md).

---

## Code of Conduct

All participants are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Violations may result in removal from the project.

---

## Amendments

This governance document may be amended through the RFC process. Amendments require approval from the Specification Lead and a 2/3 majority of Core Contributors.
