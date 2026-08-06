# 0013 — Context Protocol

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines the Context Protocol — the application-layer protocol for communication between LCDD components (Registry, enforcement plugins, AI agents, observability collectors, governance tools). The protocol enables interoperable implementations across different languages and platforms.

---

## Motivation

The Context Registry, enforcement plugins, AI agents, and observability dashboards are separate components that may be implemented in different languages, run on different infrastructure, and be maintained by different teams. Without a standard protocol, each integration becomes a bespoke engineering effort. The Context Protocol provides a common language for LCDD component communication.

---

## Protocol Overview

```
┌─────────────┐     Context Protocol      ┌──────────────────┐
│  AI Agent   │◄─────────────────────────►│ Context Registry │
└─────────────┘     (HTTP/gRPC/stdio)     └──────────────────┘
       │                                           │
       │     Context Protocol                      │
       ▼                                           ▼
┌─────────────┐                          ┌──────────────────┐
│ Enforcement │◄────────────────────────►│   Observability  │
│   Plugin    │                          │    Collector     │
└─────────────┘                          └──────────────────┘
```

### Transport Options

| Transport | Use Case | Recommendation |
|---|---|---|
| HTTP/2 + JSON | Web services, dashboards, CI integrations | Default for network-accessible components |
| gRPC | High-performance, strongly-typed integrations | Preferred for Registry ←→ Enforcement communication |
| stdio (JSON-RPC) | CLI tools, IDE extensions, MCP servers | For local tooling |
| File-based (YAML/JSON) | Offline usage, Git-backed Registries | Fallback for disconnected environments |

---

## RPC Methods

### Context Query

```
Method: query
Description: Retrieve contexts matching a CQL query.

Request:
{
  "jsonrpc": "2.0",
  "method": "query",
  "params": {
    "query": "SELECT * FROM contexts WHERE lifecycle = 'active'",
    "limit": 50,
    "offset": 0
  },
  "id": 1
}

Response:
{
  "jsonrpc": "2.0",
  "result": {
    "contexts": [...],
    "total": 142,
    "limit": 50,
    "offset": 0
  },
  "id": 1
}
```

### Get Context

```
Method: get_context
Description: Retrieve a single context by ID, optionally at a specific version.

Request:
{
  "jsonrpc": "2.0",
  "method": "get_context",
  "params": {
    "id": "ctx-a1b2c3d4",
    "version": null  // null = latest
  },
  "id": 2
}

Response:
{
  "jsonrpc": "2.0",
  "result": { ... full context record ... },
  "id": 2
}
```

### Create Context

```
Method: create_context
Description: Create a new context in the Registry.

Request:
{
  "jsonrpc": "2.0",
  "method": "create_context",
  "params": {
    "context": {
      "title": "...",
      "description": "...",
      ...
    }
  },
  "id": 3
}

Response:
{
  "jsonrpc": "2.0",
  "result": { ... created context with id, version=1, lifecycle=draft ... },
  "id": 3
}
```

### Update Context

```
Method: update_context
Description: Update an existing context (creates a new version).

Request:
{
  "jsonrpc": "2.0",
  "method": "update_context",
  "params": {
    "id": "ctx-a1b2c3d4",
    "changes": {
      "description": "... updated description ...",
      "enforcement.mode": "warn"
    },
    "reason": "Relaxing enforcement mode for migration period"
  },
  "id": 4
}

Response:
{
  "jsonrpc": "2.0",
  "result": { ... updated context with incremented version ... },
  "id": 4
}
```

### Transition Lifecycle

```
Method: transition_lifecycle
Description: Move a context to a new lifecycle stage.

Request:
{
  "jsonrpc": "2.0",
  "method": "transition_lifecycle",
  "params": {
    "id": "ctx-a1b2c3d4",
    "to_stage": "approved",
    "reason": "Reviewed and approved by security team",
    "approver": "user:security-lead"
  },
  "id": 5
}

Response:
{
  "jsonrpc": "2.0",
  "result": { ... context with updated lifecycle ... },
  "id": 5
}
```

### Report Verification

```
Method: report_verification
Description: Submit enforcement verification results to the observability collector.

Request:
{
  "jsonrpc": "2.0",
  "method": "report_verification",
  "params": {
    "events": [
      {
        "context_id": "ctx-a1b2c3d4",
        "artifact_path": "api/src/handlers/users.ts",
        "status": "violation",
        "violations": [...],
        "enforcement_action": "block",
        "actor": { "type": "human", "id": "user:jane-doe" },
        ...
      }
    ]
  },
  "id": 6
}

Response:
{
  "jsonrpc": "2.0",
  "result": { "accepted": 1, "rejected": 0 },
  "id": 6
}
```

### Get Snapshot

```
Method: get_snapshot
Description: Retrieve a point-in-time snapshot of all Active contexts.

Request:
{
  "jsonrpc": "2.0",
  "method": "get_snapshot",
  "params": {
    "timestamp": "2026-03-31T23:59:59Z"
  },
  "id": 7
}

Response:
{
  "jsonrpc": "2.0",
  "result": {
    "snapshot_id": "snap-20260331",
    "timestamp": "2026-03-31T23:59:59Z",
    "contexts": [...],
    "count": 47
  },
  "id": 7
}
```

### Subscribe to Events

```
Method: subscribe
Description: Subscribe to Registry events (context created, updated, lifecycle transition).

Request:
{
  "jsonrpc": "2.0",
  "method": "subscribe",
  "params": {
    "event_types": ["context.updated", "context.lifecycle_changed"],
    "filter": "category = 'security'"
  },
  "id": 8
}

// Server pushes events as notifications:
{
  "jsonrpc": "2.0",
  "method": "event",
  "params": {
    "event_type": "context.lifecycle_changed",
    "context_id": "ctx-sec-042",
    "from": "candidate",
    "to": "active",
    "timestamp": "2026-08-06T14:00:00Z"
  }
}
```

---

## Error Codes

| Code | Message | Description |
|---|---|---|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid request | Request does not conform to protocol |
| -32601 | Method not found | Method does not exist |
| -32602 | Invalid params | Parameters are invalid for method |
| -32603 | Internal error | Unexpected server error |
| -32000 | Context not found | Context ID does not exist |
| -32001 | Validation failed | Context does not conform to schema |
| -32002 | Lifecycle transition invalid | Transition violates lifecycle rules |
| -32003 | Governance denied | Operation requires approval that was not provided |
| -32004 | Conflict detected | Operation would create a conflict |
| -32005 | Quota exceeded | Rate limit or resource quota exceeded |
| -32006 | Unauthorized | Caller lacks permission for operation |
| -32007 | Schema version mismatch | Client schema version incompatible with server |

---

## Authentication

The protocol is authentication-agnostic. Implementations MUST support at minimum:

1. **Bearer Token:** `Authorization: Bearer <token>` (HTTP/gRPC metadata).
2. **API Key:** `X-API-Key: <key>` (for service-to-service communication).
3. **No Auth:** For local, single-user, file-based Registries.

Implementations MAY support:
- OAuth 2.0
- mTLS
- Signed JWTs

---

## Versioning

The protocol is versioned independently of the LCDD specification version. Protocol version is `v1` initially.

Negotiation:
1. Client sends `protocol_version: "v1"` in request.
2. Server responds with `protocol_version: "v1"` in response.
3. If server does not support client's version, it returns error `-32007` with `supported_versions: ["v1"]`.

---

## MCP (Model Context Protocol) Integration

LCDD MAY expose the Context Protocol through an MCP Server for integration with AI coding assistants:

```json
{
  "mcpServers": {
    "lcdd": {
      "command": "lcdd-mcp",
      "args": ["--registry", "https://contexts.internal.example.com"],
      "env": {
        "LCDD_API_KEY": "${LCDD_API_KEY}"
      }
    }
  }
}
```

MCP tools exposed:
- `lcdd_query` — Execute CQL query.
- `lcdd_get_context` — Get a single context.
- `lcdd_validate` — Validate an artifact against applicable contexts.
- `lcdd_propose` — Propose a new context (creates in Draft).

---

## References

1. JSON-RPC 2.0 Specification (https://www.jsonrpc.org/specification)
2. gRPC (https://grpc.io)
3. Model Context Protocol (https://modelcontextprotocol.io)
4. LCDD 0005 — Context Registry (API specification)
5. LCDD 0011 — Context Query Language
