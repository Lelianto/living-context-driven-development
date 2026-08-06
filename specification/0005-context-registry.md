# 0005 — Context Registry

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines the Context Registry — the versioned store that is the source of truth for all Contexts within an LCDD-governed system. The Registry supports creation, querying, versioning, snapshotting, and lifecycle management of Contexts and Context Packs.

---

## Motivation

Without a centralized, versioned, queryable store of Contexts, they scatter across files, databases, wikis, and minds — defeating the purpose of explicit constraint governance. The Registry is the single interface through which all Context operations flow, ensuring consistency, auditability, and queryability. See [0000-problem.md] P2, P3.

---

## Core Requirements

### R1: Immutable Versioning

Every write to the Registry creates a new immutable version. Previous versions are never overwritten. The Registry is append-only for writes; deletes are logical (archival), not physical.

### R2: Multi-Modal Query

The Registry MUST support queries by:
- Lifecycle stage
- Authority level
- Domain/category
- Source type
- Tags
- Applicability scope (file patterns, service boundaries)
- Governance classification
- Owner
- Date range (created, modified, effective, deprecated)

### R3: Snapshot Support

The Registry MUST support point-in-time snapshots — capturing the set of all Active contexts at a given timestamp. Snapshots are immutable and exportable.

### R4: Event Sourcing

All state transitions are recorded as events. The current state is derived from the event log. This ensures full auditability and enables time-travel queries.

### R5: Conflict Detection

The Registry MUST detect when two Active contexts impose contradictory constraints on the same artifact scope. Conflicts are surfaced as events, not silently resolved.

### R6: Schema Validation

The Registry MUST validate every Context against the LCDD Context Schema on write. Invalid contexts are rejected with error details.

---

## Data Model

### Context Record

```yaml
id: "ctx-a1b2c3d4"
version: 3
created_at: "2026-01-15T08:00:00Z"
updated_at: "2026-08-01T14:30:00Z"

title: "All API endpoints MUST validate input against an OpenAPI schema"
description: >
  Every API endpoint exposed by the system must have a corresponding
  OpenAPI 3.x schema, and request validation MUST be performed
  against that schema at the API gateway layer.

source:
  type: "organization"
  uri: "https://wiki.internal.example.com/security/api-standards"
  document_id: "SEC-STD-042"

authority:
  source:
    type: "organization"
    id: "ciso-office"
    name: "CISO Office"
  level: 3
  delegation:
    - from: "cto-office"
      to: "ciso-office"
      scope: "security"
      effective_date: "2025-01-01"

category: "security"
severity: "high"
applies_to:
  - "api/**/*.ts"
  - "api/**/*.go"
  - "gateway/**"

lifecycle: "active"

governance:
  classification: "hardened-standard"
  approval_required: true

effective_date: "2026-02-01T00:00:00Z"
deprecated_date: null
owner: "appsec-team"
review_status: "approved"

enforcement:
  mode: "block"
  specification:
    type: "openapi-validation"
    config:
      schema_directory: "/schemas"
      fail_on_missing_schema: true

evidence: []

tags:
  - "security"
  - "api"
  - "input-validation"
  - "owasp"

supersedes: ["ctx-old-validator"]
superseded_by: []
```

### Context Pack Manifest

```yaml
name: "@lcdd/fintech-ojk"
version: "1.3.0"
description: "Context Pack for OJK regulatory compliance in Indonesian fintech applications"
author: "LCDD Fintech Community"
license: "Apache-2.0"
repository: "https://github.com/lcdd-community/fintech-ojk"

dependencies:
  - name: "@lcdd/security-base"
    version: "^2.0.0"
  - name: "@lcdd/api-standards"
    version: "^1.0.0"

contexts:
  - id: "ctx-ojk-reporting"
    version: 1
  - id: "ctx-ojk-capital-adequacy"
    version: 2
  - id: "ctx-ojk-kyc"
    version: 1

effective_date: "2025-06-01"
```

---

## API Specification

### Create Context

```
POST /contexts

Request Body: Partial<Context> (title and description required; defaults applied)
Response: Context (fully populated with generated id, version=1, lifecycle=draft)

Validation:
- Schema validation against Context Schema
- Rejects if required fields missing
- Returns 201 Created with the new Context
```

### Get Context

```
GET /contexts/{id}
GET /contexts/{id}?version={n}

Response: Context at specified version (latest if no version specified)
```

### Update Context

```
PUT /contexts/{id}

Request Body: Partial<Context> (only fields to update)
Response: Context with incremented version

Validation:
- Lifecycle transitions validated against lifecycle rules
- Governance validation for Hardened contexts (approval required)
- Creates new version; previous version preserved
```

### List/Query Contexts

```
GET /contexts?lifecycle=active&authority_level=3&category=security&tags=api

Query Parameters:
- lifecycle: draft | candidate | approved | active | deprecated | archived
- authority_level: 0 | 1 | 2 | 3 | 4
- category: string
- severity: critical | high | medium | low | info
- applies_to: glob pattern
- governance: hardened-mandate | hardened-standard | hardened-local | local-standard | local-guideline | local-experimental
- owner: string
- tags: comma-separated
- source_type: individual | organization | standard-body | ai-system | community | automated
- created_after: ISO 8601
- created_before: ISO 8601
- effective_after: ISO 8601
- effective_before: ISO 8601
- deprecated_after: ISO 8601
- deprecated_before: ISO 8601
- limit: integer (default 50, max 500)
- offset: integer (default 0)
- sort: field name, ascending (default: updated_at, descending)

Response: { contexts: Context[], total: integer, offset: integer, limit: integer }
```

### Snapshot

```
POST /snapshots
GET /snapshots/{id}
GET /snapshots?timestamp=2026-06-01T00:00:00Z

Response: Snapshot containing all Active contexts at the specified point in time
```

### Diff

```
GET /contexts/{id}/diff?from={version}&to={version}
GET /snapshots/diff?from={snapshot_id}&to={snapshot_id}

Response: Structured diff showing added, removed, and modified contexts
```

### Lifecycle Transition

```
POST /contexts/{id}/transition

Request Body:
{
  "to_stage": "approved",
  "reason": "Reviewed and approved by security team",
  "approver": "user:security-lead"
}

Response: Updated Context with new lifecycle stage
```

---

## Reference Implementation Considerations

### Storage Backends

The Registry is abstract; implementations MAY use:
- Git repository (file-based, simple, offline-capable)
- SQL database (PostgreSQL with JSONB)
- Document store (MongoDB)
- Event store (EventStoreDB, Kafka)

### Caching

Active contexts SHOULD be cached by enforcement plugins. Cache invalidation MUST occur on any Active context change. Recommended TTL: 60 seconds with event-driven invalidation.

### Performance Targets

| Operation | Target Latency (p95) |
|---|---|
| Get single context | < 10ms |
| List 50 contexts with filters | < 50ms |
| Snapshot (1000 contexts) | < 200ms |
| Context validation on write | < 100ms |
| Conflict detection | < 500ms (async acceptable) |

---

## References

1. LCDD Glossary (docs/glossary.md) — Context Registry, Snapshot
2. LCDD 0002 — Context Lifecycle
3. LCDD 0012 — Context Schema (schema specification)
4. LCDD 0011 — Context Query Language (CQL specification)
