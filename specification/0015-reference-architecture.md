# 0015 — Reference Architecture

**Status:** Draft  
**Version:** 0.1.0  
**Specification:** Living Context Driven Development  
**Last Updated:** 2026-08-06

---

## Abstract

This document defines the Reference Architecture — a high-level system design showing how LCDD components (Context Registry, Context Engineering Pipeline, enforcement plugins, observability collectors, AI agents) compose into a complete governance system. The architecture is normative in structure but implementation-agnostic in technology.

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        SOURCES (External)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  OJK PDF │ │  Slack   │ │  GitHub  │ │   AI     │  ...      │
│  │          │ │  Thread  │ │   ADR    │ │ Suggest  │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌──────────────────────────────────────────────────────────────────┐
│                 CONTEXT ENGINEERING PIPELINE                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Discover │→│ Extract  │→│Normalize │→│ Classify │           │
│  └──────────┘ └──────────┘ └──────────┘ └────┬─────┘           │
│                                              │                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐     │                  │
│  │ Improve  │←│ Observe  │←│ Enforce  │←────┘                  │
│  └──────────┘ └──────────┘ └──────────┘     │                  │
│                                              │                  │
│  ┌──────────┐ ┌──────────┐                  │                  │
│  │ Version  │←│  Review  │←─────────────────┘                  │
│  └──────────┘ └──────────┘                                     │
└──────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│                      CONTEXT REGISTRY                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Context     │  │  Event       │  │  Snapshot            │   │
│  │  Store       │  │  Store       │  │  Store               │   │
│  │  (current)   │  │  (immutable) │  │  (point-in-time)     │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                      │               │
│         └─────────────────┼──────────────────────┘               │
│                           │                                      │
│  ┌────────────────────────┴──────────────────────────┐          │
│  │              Registry API (CQL + Protocol)         │          │
│  └────────────────────────┬──────────────────────────┘          │
└───────────────────────────┼──────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Enforcement  │  │  AI Agents    │  │  Governance   │
│  Plugins      │  │  (Copilot,    │  │  Dashboards   │
│  (CI, IDE,    │  │   Claude,     │  │               │
│   Gateway)    │  │   Codex)      │  │               │
└───────┬───────┘  └───────┬───────┘  └───────────────┘
        │                  │
        ▼                  ▼
┌──────────────────────────────────────┐
│         OBSERVABILITY COLLECTOR      │
│  ┌──────────┐  ┌──────────┐         │
│  │ Metrics  │  │  Events  │         │
│  │ (Prom)   │  │ (Logs)   │         │
│  └──────────┘  └──────────┘         │
└──────────────────────────────────────┘
```

---

## Component Specifications

### 1. Source Connectors

**Purpose:** Bridge between external sources and the Discovery stage.

**Interface:**
```
SourceConnector {
  register(source: SourceConfig): void
  poll(sourceId: string): SourceItem[]
  detectChanges(sourceId: string): Change[]
}
```

**Implementations:**
- `WebsiteConnector`: Crawls and diffs web pages.
- `GitConnector`: Monitors Git repositories for file changes.
- `SlackConnector`: Listens to Slack channels via API.
- `PDFConnector`: Downloads and extracts text from PDF documents.
- `APIConnector`: Polls REST/GraphQL APIs for regulatory updates.

### 2. Extraction Engines

**Purpose:** Transform raw source content into candidate contexts.

**Interface:**
```
ExtractionEngine {
  extract(sourceItem: SourceItem): CandidateContext[]
  confidence(candidate: CandidateContext): number
}
```

**Implementations:**
- `LLMExtractionEngine`: Uses an LLM with structured output (GPT-4, Claude).
- `RegexExtractionEngine`: Pattern-based extraction for structured documents.
- `ManualExtractionUI`: Human-in-the-loop annotation interface.

### 3. Context Registry

**Purpose:** Source of truth for all Contexts.

**Interface:** Defined in [0005-context-registry.md].

**Storage Options:**
- **Git-backed:** Contexts stored as YAML files in a Git repository. Simple, offline-capable, leverages existing Git workflows. Suitable for small teams and open-source projects.
- **Database-backed:** PostgreSQL with JSONB columns. Full CQL query support, high performance. Suitable for mid-to-large organizations.
- **Event Store-backed:** EventStoreDB or Kafka. Native event sourcing, full audit trail. Suitable for enterprises with compliance requirements.

### 4. Enforcement Plugins

**Purpose:** Consume Active contexts and verify artifacts.

**Interface:**
```
EnforcementPlugin {
  verify(artifact: Artifact, contexts: Context[]): VerificationResult[]
  report(result: VerificationResult): void
}
```

**Implementations:**
- `CIEnforcement`: Runs in CI/CD pipelines. Blocks merges, posts PR comments.
- `IDEEnforcement`: VS Code / JetBrains extension. Real-time violation highlighting.
- `GatewayEnforcement`: API gateway plugin. Validates requests/responses at runtime.
- `PreCommitEnforcement`: Git pre-commit hook. Fast, local verification.

### 5. AI Agent Bridge

**Purpose:** Inject contexts into AI agent context windows and report agent-generated violations.

**Interface:**
```
AIAgentBridge {
  getContextsForTask(task: Task): Context[]
  injectIntoPrompt(contexts: Context[], prompt: string): string
  reportAgentViolation(violation: Violation): void
}
```

**Implementations:**
- `MCPBridge`: Model Context Protocol server for Claude, Cursor, etc.
- `CopilotBridge`: GitHub Copilot extension integration.
- `CLIBridge`: CLI tool that wraps `lcdd query` output for agent prompts.

### 6. Observability Collector

**Purpose:** Aggregate enforcement events, lifecycle events, and compute metrics.

**Interface:**
```
ObservabilityCollector {
  ingest(event: EnforcementEvent | LifecycleEvent): void
  query(metric: MetricQuery): MetricResult
  alert(rule: AlertRule): void
}
```

**Implementations:**
- `PrometheusCollector`: Metrics exported to Prometheus; dashboards via Grafana.
- `OpenTelemetryCollector`: Traces and metrics via OTLP.
- `BuiltInCollector`: Embedded SQLite-based collector for small deployments.

### 7. Governance Dashboard

**Purpose:** Provide visibility and control for governance stakeholders.

**Features:**
- Context lifecycle overview (Draft → Candidate → Approved → Active → Deprecated → Archived).
- Pending approvals queue.
- Violation trends and top violated contexts.
- AI agent compliance report.
- Context Pack catalog and import UI.

---

## Deployment Topologies

### Topology 1: Single Repository (Minimal)

```
my-project/
├── contexts/
│   ├── hardened/
│   │   └── security.yaml
│   └── local/
│       └── code-style.yaml
├── .github/
│   └── workflows/
│       └── lcdd-validate.yml
└── lcdd.yaml
```

**Components:** Git-backed Registry, GitHub Actions CI enforcement, no separate services.  
**Suitable for:** Individual developers, small teams, open-source projects.

### Topology 2: Team Server (Standard)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Developer  │────►│  CI/CD       │────►│  Registry       │
│  IDE Plugin │     │  Enforcement │     │  Server (DB)    │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
┌─────────────┐     ┌──────────────┐              │
│  AI Agent   │────►│  MCP Server  │──────────────┘
└─────────────┘     └──────────────┘
```

**Components:** Database-backed Registry server, CI enforcement plugin, MCP server for AI agents, IDE extensions.  
**Suitable for:** Engineering teams, startups, mid-size organizations.

### Topology 3: Enterprise Platform (Advanced)

```
┌────────────────────────────────────────────────────────────────┐
│                        LOAD BALANCER                           │
└────┬───────────────────────┬───────────────────────┬──────────┘
     │                       │                       │
     ▼                       ▼                       ▼
┌─────────┐           ┌──────────┐           ┌──────────────┐
│Registry │           │ Registry │           │  Pipeline    │
│Primary  │◄─────────►│ Replica  │           │  Workers     │
└────┬────┘           └──────────┘           └──────┬───────┘
     │                                              │
     ▼                                              ▼
┌─────────┐                                   ┌──────────┐
│ Event   │                                   │  LLM     │
│ Store   │                                   │  Service │
│ (Kafka) │                                   └──────────┘
└────┬────┘
     │
     ▼
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│  Observability  │────►│  Grafana     │     │  PagerDuty   │
│  (ClickHouse)   │     │  Dashboards  │     │  Alerts      │
└─────────────────┘     └──────────────┘     └──────────────┘
```

**Components:** Highly available Registry, event-sourced with Kafka, LLM service for extraction, ClickHouse for observability at scale, Grafana dashboards, PagerDuty alerts.  
**Suitable for:** Large enterprises, regulated industries, multi-team platforms.

---

## Technology Recommendations (Non-Normative)

| Component | Recommended Technology | Alternative |
|---|---|---|
| Registry API | Node.js (Express/Fastify) or Go (Chi/Gin) | Python (FastAPI), Rust (Axum) |
| Registry Storage | PostgreSQL with JSONB | SQLite (small), CockroachDB (distributed) |
| Event Store | PostgreSQL (append-only table) | Kafka, EventStoreDB |
| CQL Parser | ANTLR or PEG.js | Hand-rolled parser |
| LLM Extraction | OpenAI GPT-4, Anthropic Claude | Open-source: Llama, Mistral (via Ollama) |
| CI Integration | GitHub Actions, GitLab CI | Jenkins, CircleCI, Buildkite |
| IDE Extension | VS Code Extension API | JetBrains Plugin SDK |
| MCP Server | TypeScript (MCP SDK) | Python (FastMCP) |
| Observability | OpenTelemetry + Prometheus + Grafana | Datadog, New Relic |
| CLI | Node.js (Commander) or Go (Cobra) | Python (Click), Rust (Clap) |

---

## References

1. LCDD 0005 — Context Registry
2. LCDD 0006 — Context Engineering Pipeline
3. LCDD 0008 — Verification
4. LCDD 0009 — Observability
5. LCDD 0010 — AI Agents
6. LCDD 0013 — Context Protocol
7. The Twelve-Factor App (https://12factor.net)
