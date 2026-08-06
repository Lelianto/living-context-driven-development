# 0011 — Context Query Language (CQL)

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines the Context Query Language (CQL) — a declarative language for querying the Context Registry. CQL is the primary interface through which Consumers (enforcement plugins, AI agents, dashboards, governance tools) retrieve relevant Contexts.

---

## Motivation

The Context Registry is a rich, multi-dimensional store. Simple key-value lookups are insufficient. Consumers need to express queries like "all Active Hardened contexts applicable to TypeScript files in the API directory, with Mandate or Standard authority, tagged security" — and receive precise, paginated results. CQL provides a standard, implementation-agnostic query syntax.

---

## Query Structure

### Basic Form

```cql
SELECT [fields] FROM contexts WHERE [conditions] ORDER BY [field] [ASC|DESC] LIMIT [n] OFFSET [n]
```

### Simplest Query

```cql
SELECT * FROM contexts WHERE lifecycle = 'active'
```

### Complex Query

```cql
SELECT id, title, authority, enforcement FROM contexts
WHERE lifecycle = 'active'
  AND authority.level >= 3
  AND applies_to GLOB 'api/**'
  AND tags CONTAINS 'security'
  AND governance.classification IN ('hardened-mandate', 'hardened-standard')
ORDER BY severity DESC, updated_at ASC
LIMIT 50
```

---

## Field Reference

### Selectable Fields

All fields from the Context Schema (see [0012-context-schema.md]) are selectable, plus computed fields:

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique context identifier |
| `version` | integer | Current version number |
| `title` | string | Human-readable title |
| `description` | string | Extended description |
| `source.type` | string | Source type |
| `source.uri` | string | Source URI |
| `authority.source.type` | string | Authority source type |
| `authority.source.id` | string | Authority source ID |
| `authority.level` | integer | Authority level (0–4) |
| `category` | string | Domain category |
| `severity` | string | Severity level |
| `applies_to` | string array | Scope glob patterns |
| `lifecycle` | string | Lifecycle stage |
| `governance.classification` | string | Governance classification |
| `governance.approval_required` | boolean | Whether approval is required |
| `effective_date` | timestamp | When context became Active |
| `deprecated_date` | timestamp | When context was deprecated |
| `owner` | string | Responsible person/team |
| `review_status` | string | Current review state |
| `enforcement.mode` | string | Enforcement mode |
| `tags` | string array | Free-form tags |
| `created_at` | timestamp | When context was created |
| `updated_at` | timestamp | When context was last updated |
| `violation_count_30d` | integer | Violations in last 30 days (computed) |
| `violation_trend` | string | Increasing / decreasing / stable (computed) |
| `age_days` | integer | Days since creation (computed) |
| `days_since_last_violation` | integer | Computed |
| `false_positive_rate` | float | Computed from observability data |

---

## Operators

### Comparison Operators

| Operator | Applicable Types | Description |
|---|---|---|
| `=` | string, integer, boolean, timestamp | Exact equality |
| `!=` | string, integer, boolean, timestamp | Not equal |
| `<` | integer, timestamp | Less than |
| `<=` | integer, timestamp | Less than or equal |
| `>` | integer, timestamp | Greater than |
| `>=` | integer, timestamp | Greater than or equal |
| `IN (...)` | string, integer | Value in set |
| `NOT IN (...)` | string, integer | Value not in set |
| `BETWEEN x AND y` | integer, timestamp | Range inclusive |

### String Operators

| Operator | Description | Example |
|---|---|---|
| `LIKE 'pattern'` | SQL-like pattern matching (% wildcard, _ single char) | `title LIKE '%security%'` |
| `GLOB 'pattern'` | Glob pattern matching | `applies_to GLOB 'api/**'` |
| `MATCHES 'regex'` | Regular expression matching | `id MATCHES '^ctx-sec-.*'` |

### Array Operators

| Operator | Description | Example |
|---|---|---|
| `CONTAINS 'value'` | Array contains element | `tags CONTAINS 'security'` |
| `CONTAINS_ANY ('v1', 'v2')` | Array contains any of specified values | `tags CONTAINS_ANY ('security', 'compliance')` |
| `CONTAINS_ALL ('v1', 'v2')` | Array contains all specified values | `tags CONTAINS_ALL ('api', 'security')` |
| `LENGTH [op] n` | Array length comparison | `tags LENGTH > 0` |

### Logical Operators

| Operator | Description |
|---|---|
| `AND` | Logical conjunction |
| `OR` | Logical disjunction |
| `NOT` | Logical negation |
| `( ... )` | Grouping for precedence |

### Null Handling

| Operator | Description |
|---|---|
| `IS NULL` | Field is null |
| `IS NOT NULL` | Field is not null |

---

## Query Examples

### Example 1: Enforcement Plugin — Get Contexts for a File

```cql
SELECT * FROM contexts
WHERE lifecycle = 'active'
  AND (applies_to GLOB 'api/src/handlers/users.ts'
       OR applies_to GLOB 'api/**')
ORDER BY authority.level DESC, severity DESC
```

### Example 2: Governance Dashboard — Aging Drafts

```cql
SELECT id, title, owner, age_days FROM contexts
WHERE lifecycle = 'draft'
  AND age_days > 90
ORDER BY age_days DESC
```

### Example 3: Security Audit — All Hardened Contexts

```cql
SELECT * FROM contexts
WHERE lifecycle = 'active'
  AND governance.classification IN ('hardened-mandate', 'hardened-standard')
ORDER BY authority.level DESC, effective_date DESC
```

### Example 4: AI Agent Context Window — File-Specific

```cql
SELECT id, title, description, enforcement, severity FROM contexts
WHERE lifecycle = 'active'
  AND applies_to GLOB 'src/components/**'
  AND enforcement.mode IN ('block', 'warn')
ORDER BY governance.classification DESC, severity DESC
LIMIT 20
```

### Example 5: Observability — Top Violated Contexts

```cql
SELECT id, title, violation_count_30d, violation_trend FROM contexts
WHERE lifecycle = 'active'
  AND violation_count_30d > 0
ORDER BY violation_count_30d DESC
LIMIT 10
```

### Example 6: Snapshot — Contexts at a Point in Time

```cql
SELECT * FROM snapshot('2026-03-31T23:59:59Z')
WHERE category = 'security'
```

---

## REST API Representation

CQL queries over HTTP:

```
GET /contexts/query?q={url-encoded-cql}
```

Or as a POST body:

```json
{
  "query": "SELECT id, title FROM contexts WHERE lifecycle = 'active' AND category = 'security'",
  "limit": 50,
  "offset": 0
}
```

Response:

```json
{
  "contexts": [...],
  "total": 142,
  "offset": 0,
  "limit": 50,
  "query": "..."
}
```

---

## SDK Representation

```typescript
// TypeScript
const contexts = await registry.query(cql`
  SELECT * FROM contexts
  WHERE lifecycle = 'active'
    AND authority.level >= 3
    AND applies_to GLOB ${filePath}
  ORDER BY severity DESC
`);

// Go
contexts, err := registry.Query(ctx, cql.Query{
  Select: []string{"*"},
  Conditions: []cql.Condition{
    {Field: "lifecycle", Op: "=", Value: "active"},
    {Field: "authority.level", Op: ">=", Value: 3},
    {Field: "applies_to", Op: "GLOB", Value: filePath},
  },
  OrderBy: []cql.Order{{Field: "severity", Desc: true}},
})
```

---

## Security

### Query Timeout

All CQL queries MUST have a timeout. Default: 5 seconds. Queries exceeding the timeout return partial results with a warning.

### Query Complexity Limits

| Limit | Value |
|---|---|
| Maximum conditions | 50 |
| Maximum `LIMIT` | 500 |
| Maximum `OFFSET` | 10000 |
| Maximum query length | 4096 characters |

### Authorization

CQL queries respect the caller's authorization. Some fields (e.g., `evidence` containing internal incident data) MAY be restricted based on the caller's role. Enforcement plugins typically have read access to all fields; public dashboards have restricted access.

---

## References

1. LCDD 0005 — Context Registry (CQL as query interface)
2. LCDD 0012 — Context Schema (field definitions)
3. LCDD 0013 — Context Protocol (remote query protocol)
