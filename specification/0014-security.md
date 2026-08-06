# 0014 — Security

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines the security model for LCDD implementations. It covers the threat model, security guarantees, access control, data protection, and secure defaults for Context Registries, enforcement plugins, and the Context Protocol.

---

## Threat Model

### Assets

| Asset | Sensitivity | Impact of Compromise |
|---|---|---|
| Context definitions | Medium–High | Incorrect or malicious contexts can corrupt governance, block legitimate work, or allow non-compliant artifacts. |
| Enforcement events | Medium | Reveals violation patterns; could be used to identify weak points in compliance. |
| Lifecycle events (audit trail) | High | Tampering undermines the entire governance system. |
| Registry credentials | Critical | Full control over context lifecycle. |
| Context Pack signatures | High | Compromised pack could distribute malicious contexts. |

### Threat Actors

| Actor | Capability | Motivation |
|---|---|---|
| External attacker | Limited network access | Disrupt development, inject malicious contexts |
| Malicious insider | Legitimate access to some contexts | Bypass governance, hide non-compliance |
| Compromised AI agent | Code generation access | Specification drift, bypass constraints |
| Rogue enforcement plugin | Access to verification pipeline | Report false compliance |
| Supply chain attacker | Access to Context Pack distribution | Distribute compromised contexts |

### Attack Vectors

| Vector | Risk | Mitigation |
|---|---|---|
| Unauthorized context modification | High | Access control, approval gates, immutable versioning |
| Context Registry tampering | High | Event sourcing, append-only storage, integrity hashes |
| False context injection (malicious pack) | Medium | Pack signing, community review, sandboxed import |
| Enforcement bypass | Medium | Plugin authentication, verification result signing |
| Audit log tampering | High | Immutable event store, WORM storage |
| Denial of service (context spam) | Low | Rate limiting, quota enforcement |
| Privacy leak (violation data) | Medium | Anonymization, retention policies |

---

## Access Control Model

### Roles

| Role | Permissions |
|---|---|
| **Registry Admin** | Full administrative access. Manage roles, quotas, schema versions. |
| **Context Author** | Create Draft contexts. Modify own contexts in Draft/Candidate. |
| **Context Reviewer** | Approve/reject Candidate contexts. Transition lifecycle stages within authority scope. |
| **Context Owner** | Full management of assigned contexts (all stages, all operations). |
| **Enforcement Plugin** | Read Active contexts. Report verification results. Cannot modify contexts. |
| **AI Agent** | Read Active contexts applicable to current task. Propose Draft contexts (level 0). Cannot modify existing contexts (level >= 1). |
| **Observer** | Read contexts and aggregated observability data. Cannot modify. |
| **Auditor** | Read-only access to all data including audit logs and archived contexts. |

### Scope-Based Access

Access to specific contexts MAY be scoped:

```yaml
access_policy:
  role: "context-reviewer"
  scope: "category = 'security' AND authority.level <= 3"
```

### Enforcement Plugin Authentication

Enforcement plugins authenticate to the Registry with a service account. The plugin's identity is attested in verification reports, enabling traceability: "Which verifier reported this violation?"

---

## Data Protection

### Integrity

1. **Context Version Integrity:** Each context version is hashed (SHA-256). The hash is stored with the version and verified on read.
2. **Audit Trail Integrity:** Lifecycle events form a hash chain. Each event includes the hash of the previous event. Tampering with any event breaks the chain.
3. **Pack Integrity:** Context Packs are signed by their publisher. Consumers verify the signature before importing.

### Confidentiality

1. **Context Content:** Context definitions are generally not secret (they are rules, after all). However, some contexts MAY contain sensitive internal references. Implementations SHOULD support access control on the `evidence` and `metadata` fields.
2. **Violation Data:** Individual violation data SHOULD be accessible only to the violator and designated reviewers. Aggregate data is available to dashboards.
3. **Agent Prompts:** Contexts injected into third-party AI agent prompts pass through external infrastructure. Implementations SHOULD support marking contexts as `confidential: true` to prevent injection into external agents.

### Availability

1. **Registry Availability:** The Registry is on the critical path for development. If the Registry is unavailable, enforcement plugins SHOULD fall back to a cached snapshot (stale but available).
2. **Snapshot Redundancy:** Snapshots SHOULD be stored redundantly (multiple locations, multiple formats).
3. **Rate Limiting:** API rate limits prevent abuse. Default: 1000 requests/minute for enforcement plugins, 100 requests/minute for AI agents.

---

## Secure Defaults

Implementations SHOULD adopt these defaults unless explicitly overridden:

| Setting | Default |
|---|---|
| Registry transport | HTTPS (TLS 1.3) |
| Authentication required | Yes (except file-based local registries) |
| Context access | Read-all for authenticated users (contexts are discoverable by design) |
| Context modification | Role-based + lifecycle-governed |
| Audit log retention | Indefinite |
| Violation data retention | 12 months (active), 7 years (archived) |
| Pack signature verification | Required for level >= 2 contexts |
| AI agent context injection | Disabled for contexts marked `confidential: true` |
| Hardened context modification | Requires multi-factor authentication |

---

## Incident Response

### Context Compromise

If a context is found to be malicious or incorrect:
1. Immediately transition to Deprecated (emergency exception process).
2. Audit all artifacts validated against the compromised context during its Active period.
3. Notify affected teams.
4. Create a replacement context if the governance need remains.
5. Post-incident review.

### Registry Breach

If the Registry's integrity is compromised:
1. Freeze all context modifications.
2. Restore from the last known-good snapshot.
3. Replay audit trail to identify the breach point.
4. Rotate all credentials.
5. Notify all consumers to refresh their caches.
6. Post-incident review with root cause analysis.

---

## Compliance

LCDD implementations MAY need to comply with:
- **SOC 2:** Audit trail completeness, access control, change management.
- **ISO 27001:** Information security management system alignment.
- **GDPR:** Violation data anonymization, right to access, right to deletion.
- **PCI-DSS:** If contexts govern payment systems, the Registry itself becomes part of the CDE.

Implementations SHOULD document their compliance posture and provide compliance evidence upon request.

---

## References

1. OWASP Top 10 (https://owasp.org/www-project-top-ten/)
2. NIST SP 800-53 (Security and Privacy Controls)
3. LCDD 0003 — Authority Model (challenge and revocation)
4. LCDD 0004 — Governance (approval requirements)
5. LCDD 0013 — Context Protocol (authentication)
