# Reference Architecture Diagrams

**Status:** Draft  
**Version:** 0.1.0

---

## System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SOURCES                              │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │Government│  │Community │  │ Internal │  │   Team   │  │   AI    │  │
│  │ Websites │  │Context   │  │   Docs   │  │  Chats   │  │ Agents  │  │
│  │ (OJK)    │  │ Packs    │  │ (Wiki)   │  │ (Slack)  │  │ (Copilot│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘  │
└───────┼─────────────┼─────────────┼─────────────┼─────────────┼────────┘
        │             │             │             │             │
        ▼             ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     CONTEXT ENGINEERING PIPELINE                         │
│                                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ DISCOVER │───▶│ EXTRACT  │───▶│NORMALIZE │───▶│ CLASSIFY │          │
│  │          │    │          │    │          │    │          │          │
│  │ Monitor  │    │ LLM/     │    │ Schema   │    │ Authority│          │
│  │ sources  │    │ Regex/   │    │ mapping  │    │ Tags     │          │
│  │ for      │    │ Manual   │    │ De-dupe  │    │ Scope    │          │
│  │ changes  │    │ parse    │    │ Validate │    │ Severity │          │
│  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘          │
│                                                       │                │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐         │                │
│  │ IMPROVE  │◀───│ OBSERVE  │◀───│ ENFORCE  │◀────────┘                │
│  │          │    │          │    │          │         │                 │
│  │ Refine   │    │ Metrics  │    │ CI/IDE/  │         │                 │
│  │ Deprecate│    │ Dash     │    │ Gateway  │         │                 │
│  │ Create   │    │ Alerts   │    │ AI Agent │         │                 │
│  └──────────┘    └──────────┘    └──────────┘         │                 │
│                                                        │                │
│                    ┌──────────┐    ┌──────────┐        │                │
│                    │ VERSION  │◀───│  REVIEW  │◀───────┘                │
│                    │          │    │          │                         │
│                    │ Commit   │    │Human/Auto│                         │
│                    │ Immutable│    │ Approve  │                         │
│                    └────┬─────┘    └──────────┘                         │
└─────────────────────────┼───────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTEXT REGISTRY                                 │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        REGISTRY API                               │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │  │
│  │  │   Query    │  │    CRUD    │  │  Lifecycle │  │  Snapshot  │  │  │
│  │  │   (CQL)    │  │  Contexts  │  │Transitions │  │   / Diff   │  │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  Context Store   │  │   Event Store    │  │   Snapshot Store     │  │
│  │  (Current State) │  │  (Audit Trail)   │  │   (Point-in-Time)    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ENFORCEMENT  │  │  AI AGENTS   │  │  GOVERNANCE  │
│  PLUGINS     │  │              │  │  DASHBOARD   │
│              │  │  Copilot     │  │              │
│  • CI/CD     │  │  Cursor      │  │  • Metrics   │
│  • IDE       │  │  Claude Code │  │  • Approvals │
│  • PreCommit │  │  Codex       │  │  • Alerts    │
│  • Gateway   │  │              │  │              │
└──────┬───────┘  └──────┬───────┘  └──────────────┘
       │                 │
       ▼                 ▼
┌──────────────────────────────────────────┐
│         OBSERVABILITY COLLECTOR          │
│                                          │
│  ┌────────────┐    ┌────────────┐        │
│  │  Metrics   │    │   Events   │        │
│  │  (PromQL)  │    │  (Logs)    │        │
│  └────────────┘    └────────────┘        │
│                                          │
│  ┌────────────┐    ┌────────────┐        │
│  │ Dashboards │    │   Alerts   │        │
│  │ (Grafana)  │    │ (PagerDuty)│        │
│  └────────────┘    └────────────┘        │
└──────────────────────────────────────────┘
```

---

## Context Lifecycle State Machine

```
                         ┌──────────┐
                         │  (Start) │
                         └────┬─────┘
                              │ discover
                              ▼
┌──────────────────────────────────────────────────────────┐
│                       ┌──────────┐                       │
│                       │  DRAFT   │                       │
│                       └────┬─────┘                       │
│                            │ review requested            │
│              ┌─────────────┼─────────────┐              │
│              │ rejected    │              │ rejected     │
│              ▼             ▼              ▼              │
│       ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│       │ ARCHIVED │  │CANDIDATE │  │ ARCHIVED │         │
│       └──────────┘  └────┬─────┘  └──────────┘         │
│                          │ approved                     │
│              ┌───────────┼───────────┐                  │
│              │ rejected  │           │ rejected         │
│              ▼           ▼           ▼                  │
│       ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│       │  DRAFT   │ │ APPROVED │ │  DRAFT   │           │
│       └──────────┘ └────┬─────┘ └──────────┘           │
│                         │ activated                     │
│              ┌──────────┼──────────┐                    │
│              │deactivate│          │ rejected           │
│              ▼          ▼          ▼                    │
│       ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│       │ APPROVED │ │  ACTIVE  │ │ ARCHIVED │           │
│       └──────────┘ └────┬─────┘ └──────────┘           │
│                         │ deprecated                    │
│                         ▼                               │
│                  ┌──────────┐                           │
│                  │DEPRECATED│                           │
│                  └────┬─────┘                           │
│                       │ archived                        │
│              ┌────────┼────────┐                        │
│              │reactivate       │                        │
│              ▼                 ▼                        │
│       ┌──────────┐     ┌──────────┐                    │
│       │  ACTIVE  │     │ ARCHIVED │                    │
│       └──────────┘     └──────────┘                    │
│                       (End state)                       │
└──────────────────────────────────────────────────────────┘
```

---

## Enforcement Flow

```
┌─────────┐     ┌──────────────┐     ┌──────────────┐
│  Event  │     │   Registry   │     │ Enforcement  │
│ Trigger │     │              │     │   Plugin     │
│ (PR,    │────▶│ Query Active │────▶│              │
│  Push,  │     │  Contexts    │     │ Verify each  │
│  Save)  │     │  (CQL)       │     │  artifact    │
└─────────┘     └──────────────┘     └──────┬───────┘
                                            │
                    ┌───────────────────────┼──────────────┐
                    │                       │              │
                    ▼                       ▼              ▼
             ┌──────────┐           ┌──────────┐   ┌──────────┐
             │COMPLIANT │           │VIOLATION │   │   N/A    │
             └──────────┘           └────┬─────┘   └──────────┘
                                        │
                    ┌───────────────────┼──────────────┐
                    │                   │              │
                    ▼                   ▼              ▼
             ┌──────────┐        ┌──────────┐   ┌──────────┐
             │  BLOCK   │        │   WARN   │   │ COMMENT  │
             │ (Hardened│        │(Candidate│   │(Guideline│
             │  Level 3+)│       │ Deprec.) │   │  Level 1)│
             └────┬─────┘        └────┬─────┘   └────┬─────┘
                  │                   │              │
                  ▼                   ▼              ▼
             ┌──────────┐        ┌──────────┐   ┌──────────┐
             │Merge     │        │PR Annot. │   │PR Annot. │
             │Blocked   │        │+ Warning │   │+ Sugg.   │
             └──────────┘        └──────────┘   └──────────┘
                      │                   │              │
                      └───────────────────┴──────────────┘
                                          │
                                          ▼
                                   ┌──────────┐
                                   │OBSERVAB. │
                                   │Collector │
                                   │(Metrics, │
                                   │ Events)  │
                                   └──────────┘
```

---

## Deployment Topology: Standard (Team Server)

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Machine                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  IDE Plugin  │  │   AI Agent   │  │   lcd CLI    │      │
│  │  (VS Code)   │  │  (Copilot)   │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     MCP Server (Local)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Context injection, context-aware agent prompts       │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   CI/CD Pipeline (GitHub Actions)            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  lcd validate → Enforcement Report → Block/Warn      │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Context Registry Server                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API (Context Protocol)                               │   │
│  │  Database (PostgreSQL + JSONB)                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Context Data Model (Entity Relationship)

```
┌─────────────────────┐
│      Context        │
├─────────────────────┤
│ PK id: string       │
│ version: int        │
│ title: string       │
│ description: text   │
│ source_type: enum   │
│ authority_level: int│
│ category: string    │
│ severity: enum      │
│ lifecycle: enum     │
│ gov_class: enum     │
│ effective_date: ts  │
│ deprecated_date: ts │
│ owner: string       │
│ enforcement_mode:.. │
│ created_at: ts      │
│ updated_at: ts      │
└────────┬────────────┘
         │ 1
         │ has many
         ▼ *
┌─────────────────────┐     ┌─────────────────────┐
│  LifecycleEvent     │     │      Evidence       │
├─────────────────────┤     ├─────────────────────┤
│ PK id: uuid         │     │ PK id: uuid         │
│ FK context_id       │     │ FK context_id       │
│ from_stage: enum    │     │ type: string        │
│ to_stage: enum      │     │ uri: string         │
│ actor: string       │     │ description: text   │
│ reason: text        │     └─────────────────────┘
│ timestamp: ts       │
└─────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│   ContextPack       │     │ EnforcementEvent    │
├─────────────────────┤     ├─────────────────────┤
│ PK id: string       │     │ PK id: uuid         │
│ name: string        │     │ FK context_id       │
│ version: string     │     │ artifact_path: str  │
│ description: text   │     │ status: enum        │
│ author: string      │     │ enforcement: enum   │
│ dependencies: json  │     │ actor_type: enum    │
│ contexts: json[]    │     │ actor_id: string    │
└─────────────────────┘     │ timestamp: ts       │
                            └─────────────────────┘
```
