# LCDD Self-Governance Registry

This Registry governs development of LCDD itself, as required by
[`specification/0001-core-principles.md`](../specification/0001-core-principles.md).

Tracked governance artifacts:

- `config.yaml` — self-governance configuration;
- `pack.yaml` — the versioned `lcdd-development` Context Pack;
- `contexts/hardened/*.yaml` — slow-changing specification and release invariants;
- `contexts/local/*.yaml` — implementation practices that may evolve through normal review;
- `contexts/.events.log` — lifecycle transitions for tracked governance Contexts.

Operational data remains local and ignored: source caches, discovery indexes, snapshots,
enforcement events, dismissals, and heal logs.

## Change process

1. Propose the governance change through an RFC or pull request appropriate to its classification.
2. Update the Context version and preserve source, authority, and evidence.
3. Record the lifecycle or review decision in `.events.log`.
4. Run `cd implementation && npm run verify:release`.
5. Hardened Context changes require explicit repository-owner approval.

The initial Active Contexts were approved by the repository owner when self-governance was adopted
on 2026-08-08. This is recorded as Draft → Candidate → Approved → Active events.
