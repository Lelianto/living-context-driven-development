# 0012 — Context Schema

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines the canonical Context Schema — the JSON Schema that all Context records MUST conform to. The schema is the universal adapter that enables heterogeneous sources to be normalized into a uniform, queryable, enforceable format.

---

## JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://livingcontext.dev/schema/context/v0.1.0",
  "title": "LCDD Context",
  "description": "A Living Context — the atomic unit of governance in LCDD.",
  "type": "object",
  "required": ["id", "version", "title", "description", "source", "authority", "lifecycle", "governance"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique, immutable identifier. UUID v4 recommended.",
      "pattern": "^[a-zA-Z0-9_-]+$",
      "maxLength": 128
    },
    "version": {
      "type": "integer",
      "description": "Monotonic version number. Starts at 1.",
      "minimum": 1
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of initial creation."
    },
    "updated_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of last modification."
    },
    "title": {
      "type": "string",
      "description": "Human-readable title. Short, descriptive, unambiguous.",
      "minLength": 1,
      "maxLength": 256
    },
    "description": {
      "type": "string",
      "description": "Extended description including rationale, examples, and counter-examples. Markdown supported.",
      "minLength": 1,
      "maxLength": 16384
    },
    "source": {
      "type": "object",
      "description": "Reference to the original source before normalization.",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["individual", "organization", "standard-body", "ai-system", "community", "automated", "regulatory", "documentation", "meeting", "incident", "unknown"]
        },
        "uri": {
          "type": "string",
          "format": "uri",
          "description": "URI of the original source document."
        },
        "document_id": {
          "type": "string",
          "description": "Identifier within the source system (document number, message ID, etc.)."
        },
        "location": {
          "type": "string",
          "description": "Location within the source (page, paragraph, line number)."
        },
        "extraction_method": {
          "type": "string",
          "enum": ["manual", "llm", "regex", "api", "unknown"]
        },
        "confidence": {
          "type": "number",
          "description": "Extraction confidence score (0.0–1.0). Required for non-manual extraction.",
          "minimum": 0,
          "maximum": 1
        }
      }
    },
    "authority": {
      "type": "object",
      "description": "Declaration of who asserts this constraint and why it should be trusted.",
      "required": ["source", "level"],
      "properties": {
        "source": {
          "type": "object",
          "required": ["type", "id", "name"],
          "properties": {
            "type": {
              "type": "string",
              "enum": ["individual", "organization", "standard-body", "ai-system", "community", "automated"]
            },
            "id": {
              "type": "string",
              "description": "Unique identifier for the authority source."
            },
            "name": {
              "type": "string",
              "description": "Human-readable name."
            },
            "uri": {
              "type": "string",
              "format": "uri",
              "description": "Optional URL for the authority source."
            }
          }
        },
        "level": {
          "type": "integer",
          "description": "Authority level: 0=Suggestion, 1=Preference, 2=Guideline, 3=Standard, 4=Mandate.",
          "minimum": 0,
          "maximum": 4
        },
        "delegation": {
          "type": "array",
          "description": "Chain of delegation from ultimate authority to this context.",
          "items": {
            "type": "object",
            "required": ["from", "to", "scope", "effective_date"],
            "properties": {
              "from": { "type": "string" },
              "to": { "type": "string" },
              "scope": { "type": "string" },
              "effective_date": { "type": "string", "format": "date" },
              "expiration": { "type": ["string", "null"], "format": "date" }
            }
          }
        },
        "trust_model": {
          "type": "string",
          "enum": ["direct", "delegated", "community-consensus", "ai-inferred"]
        },
        "trust_score": {
          "type": "number",
          "description": "Optional computed trust score (0.0–1.0).",
          "minimum": 0,
          "maximum": 1
        },
        "challenge_policy": {
          "type": "object",
          "properties": {
            "process": { "type": "string" },
            "uri": { "type": "string", "format": "uri" },
            "sla_hours": { "type": "integer", "minimum": 0 }
          }
        }
      }
    },
    "category": {
      "type": "string",
      "description": "Primary domain classification.",
      "examples": ["security", "performance", "accessibility", "architecture", "compliance", "code-style", "testing", "documentation", "api-design", "data-privacy"]
    },
    "severity": {
      "type": "string",
      "enum": ["critical", "high", "medium", "low", "info"],
      "description": "Impact classification of violation."
    },
    "applies_to": {
      "type": "array",
      "description": "Glob patterns declaring which artifacts this context governs.",
      "items": { "type": "string" },
      "minItems": 1,
      "default": ["**/*"]
    },
    "lifecycle": {
      "type": "string",
      "enum": ["draft", "candidate", "approved", "active", "deprecated", "archived"],
      "description": "Current lifecycle stage."
    },
    "governance": {
      "type": "object",
      "required": ["classification", "approval_required"],
      "properties": {
        "classification": {
          "type": "string",
          "enum": ["hardened-mandate", "hardened-standard", "hardened-local", "local-standard", "local-guideline", "local-experimental"]
        },
        "approval_required": {
          "type": "boolean",
          "description": "Whether human approval is required to modify this context."
        },
        "approvers": {
          "type": "array",
          "description": "Required approver identities or roles.",
          "items": { "type": "string" }
        },
        "min_review_period_hours": {
          "type": "integer",
          "minimum": 0,
          "description": "Minimum review period before activation."
        }
      }
    },
    "effective_date": {
      "type": ["string", "null"],
      "format": "date-time",
      "description": "When this context became (or will become) Active."
    },
    "deprecated_date": {
      "type": ["string", "null"],
      "format": "date-time",
      "description": "When this context was deprecated."
    },
    "owner": {
      "type": "string",
      "description": "Person or team responsible for this context."
    },
    "review_status": {
      "type": "string",
      "enum": ["pending", "in-review", "approved", "rejected", "needs-revision"],
      "description": "Current review state."
    },
    "enforcement": {
      "type": "object",
      "description": "Enforcement configuration.",
      "properties": {
        "mode": {
          "type": "string",
          "enum": ["block", "warn", "comment", "silent"]
        },
        "specification": {
          "type": "object",
          "description": "Mechanism-agnostic enforcement rules.",
          "required": ["type"],
          "properties": {
            "type": { "type": "string" },
            "config": { "type": "object" },
            "violation_message_template": { "type": "string" }
          }
        }
      }
    },
    "evidence": {
      "type": "array",
      "description": "Links to evidence supporting or challenging this context.",
      "items": {
        "type": "object",
        "properties": {
          "type": { "type": "string" },
          "uri": { "type": "string", "format": "uri" },
          "description": { "type": "string" }
        }
      }
    },
    "tags": {
      "type": "array",
      "description": "Free-form tags for categorization and search.",
      "items": { "type": "string" },
      "uniqueItems": true
    },
    "supersedes": {
      "type": "array",
      "description": "Context IDs that this context replaces.",
      "items": { "type": "string" }
    },
    "superseded_by": {
      "type": "array",
      "description": "Context IDs that replace this context.",
      "items": { "type": "string" }
    },
    "metadata": {
      "type": "object",
      "description": "Arbitrary key-value metadata for implementation-specific extensions.",
      "additionalProperties": true
    }
  }
}
```

---

## Validation Rules

Beyond JSON Schema, the following semantic validation rules apply:

### R1: Lifecycle-Dependent Required Fields

| Lifecycle Stage | Additionally Required Fields |
|---|---|
| Candidate | `review_status` MUST be set |
| Approved | `effective_date` SHOULD be set; `enforcement` SHOULD be configured |
| Active | `effective_date` MUST be set; `enforcement` MUST be configured |
| Deprecated | `deprecated_date` MUST be set; `superseded_by` SHOULD be set if replacement exists |
| Archived | `deprecated_date` MUST be set |

### R2: Authority-Enforcement Consistency

If `authority.level >= 3` and `lifecycle = 'active'`, then `enforcement.mode` SHOULD be `block` unless explicitly justified.

### R3: Governance-Lifecycle Consistency

If `governance.classification` starts with `hardened-` and `lifecycle = 'active'`, then `governance.approval_required` MUST be `true`.

### R4: Temporal Consistency

- `effective_date` MUST be before `deprecated_date` if both are set.
- `effective_date` MUST be in the past if `lifecycle = 'active'`.
- `deprecated_date` MUST be in the past if `lifecycle = 'deprecated'` or `'archived'`.

### R5: Supersedes Chain Integrity

If `supersedes` references context IDs, those contexts MUST exist in the Registry and SHOULD have this context's ID in their `superseded_by` field.

---

## YAML Representation

For human-authored contexts, YAML is the recommended format. The schema is identical; the serialization format is different.

```yaml
id: "ctx-api-input-validation"
version: 1
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
category: "security"
severity: "high"
applies_to:
  - "api/**/*.ts"
  - "api/**/*.go"
lifecycle: "active"
governance:
  classification: "hardened-standard"
  approval_required: true
effective_date: "2026-02-01T00:00:00Z"
owner: "appsec-team"
enforcement:
  mode: "block"
  specification:
    type: "openapi-validation"
    config:
      schema_directory: "/schemas"
    violation_message_template: >
      Endpoint ${endpoint.path} in ${file.path} does not validate
      input against an OpenAPI schema. Add schema to ${schema_directory}
      and wrap handler with validateRequest().
tags:
  - "security"
  - "api"
  - "input-validation"
```

---

## Schema Evolution

The Context Schema itself is versioned (v0.1.0). Future versions:

1. **v0.2.0:** Add `depends_on` field for context-to-context dependencies.
2. **v0.3.0:** Add `cost` field for contexts that have quantifiable compliance cost.
3. **v1.0.0:** Stabilize schema; remove experimental fields; add migration guide from v0.x.

Schema changes MUST go through the LCDD RFC process.

---

## References

1. LCDD Glossary (docs/glossary.md) — Context Schema section
2. JSON Schema Specification (https://json-schema.org/draft/2020-12)
3. LCDD 0005 — Context Registry (schema validation on write)
