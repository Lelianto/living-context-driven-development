<div align="center">
    <img src="https://raw.githubusercontent.com/Lelianto/living-context-driven-development/main/media/logo.png" alt="LCDD Logo" width="120" height="120"/>
    <h1>@lcdd/core</h1>
    <p><strong>Core SDK for Living Context Driven Development</strong></p>
    <p>Context model, schema validation, Registry client, CQL parser, and enforcement verifier.</p>
</div>

<p align="center">
    <a href="https://www.npmjs.com/package/@lcdd/core"><img src="https://img.shields.io/npm/v/@lcdd/core?color=10b981" alt="npm version"/></a>
    <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/npm/l/@lcdd/core" alt="License"/></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/@lcdd/core" alt="Node.js"/></a>
</p>

---

## Install

```bash
npm install @lcdd/core
```

---

## What It Does

`@lcdd/core` is the foundation of the LCDD ecosystem. It provides everything you need to work with Living Contexts programmatically — from parsing and validating contexts, to querying a Registry, to enforcing constraints against artifacts.

| Module | Purpose |
|---|---|---|
| **Context Model** | Full TypeScript types for Contexts, Lifecycle, Authority, Governance, Enforcement |
| **Schema Validator** | JSON Schema + semantic rule validation for Context artifacts |
| **Lifecycle Manager** | 12 transition rules, enforcement mode derivation, audit events |
| **File Registry** | File-based Context Registry — YAML storage, CQL querying, snapshots, event logging |
| **CQL Parser** | Full lexer/parser for Context Query Language (SELECT/FROM/WHERE/ORDER BY/LIMIT) |
| **Context Verifier** | Pluggable enforcement engine with built-in regex and file-exists verifiers |
| **Context Doctor** | Health score computation: 8 metrics, letter grade A–F, delegate to TriggerEvaluator |
| **Rule Engine** | Deterministic auto-classification: source → authority, keyword → severity, domain → tags |
| **Review Manager** | Review workflow: list, approve, reject, revision, auto-approval for Local contexts |
| **Trigger Evaluator** | Single-source-of-truth threshold engine: stale, violation-rate, false-positive, increasing-violations, AI-drift, new-source |
| **Improve Engine** | Self-healing loop: guardrail-gated plans, apply with snapshot+verify, rollback |
| **Source Connector** | External source management: Git (clone+fetch+diff), Website (HTTP GET+checksum) |

---

## Quick Start

```ts
import { FileRegistry, ContextVerifier, LifecycleManager, parseCQL } from '@lcdd/core';

// Initialize a file-based Registry
const registry = new FileRegistry('./my-project');
registry.ensureDir();

// Create a context
const context = registry.create({
  title: 'All API endpoints must validate input',
  description: 'Every endpoint must validate against an OpenAPI schema.',
  authority: {
    source: { type: 'organization', id: 'security-team', name: 'Security Team' },
    level: 3,
  },
  category: 'security',
  severity: 'high',
});

// Promote through lifecycle
registry.transition(context.id, 'candidate', 'user:dev', 'Ready for review');
registry.transition(context.id, 'approved', 'user:reviewer', 'Looks good');
registry.transition(context.id, 'active', 'user:admin', 'Deploying');

// Query with CQL
const result = registry.query(parseCQL(
  "SELECT * FROM contexts WHERE lifecycle = 'active' AND authority.level >= 3"
));
console.log(`${result.total} active, high-authority contexts`);

// Verify artifacts
const verifier = new ContextVerifier();
const activeContexts = registry.list({ lifecycle: 'active' });
const { results, events, blocked } = await verifier.enforce(
  activeContexts,
  'src/api/users.ts',
  { type: 'human', id: 'user:dev' }
);

if (blocked) {
  console.error('Merge blocked — constraint violations found');
  process.exit(1);
}
```

---

## API Reference

### `FileRegistry`

```ts
class FileRegistry {
  constructor(projectRoot: string)

  ensureDir(): void
  load(id: string): Context | null
  save(context: Context): void
  create(partial: Partial<Context>): Context
  list(filter?: Partial<Context>): Context[]
  query(q: RegistryQuery): { contexts: Context[]; total: number }
  transition(id: string, to: LifecycleStage, actor: string, reason?: string, actorRole?: string): { context: Context; event: LifecycleEvent }

  // Observability logs (append-only JSONL under .lcdd/contexts/)
  writeEnforcementEvent(event: EnforcementEvent): void
  readEnforcementEvents(): EnforcementEvent[]
  writeDismissalEvent(event: DismissalEvent): void          // .dismissals.log
  readDismissalEvents(): DismissalEvent[]
  writeHealEvent(event: HealEvent): void                    // .heals.log + lifecycle audit
  readHealEvents(): HealEvent[]
  writeLifecycleEvent(event: LifecycleEvent): void          // .events.log
  readLifecycleEvents(): LifecycleEvent[]

  // Snapshots (all contexts, persisted to .lcdd/snapshots/)
  snapshot(timestamp?: string): Snapshot
  loadSnapshot(snapshotId: string): Snapshot | null
  listSnapshots(): string[]
  restoreSnapshot(snapshotId: string): { restored: number; removed: number }
}
```

### `ContextVerifier`

```ts
class ContextVerifier {
  register(type: string, fn: VerifierFn): void

  verify(context: Context, artifactPath: string, artifactContent?: string): Promise<VerificationResult>
  verifyAll(contexts: Context[], artifactPath: string, artifactContent?: string): Promise<VerificationResult[]>
  enforce(contexts: Context[], artifactPath: string, actor: Actor, options?: EnforceOptions): Promise<EnforceResult>
}
```

### `LifecycleManager`

```ts
class LifecycleManager {
  static getAllowedTransitions(current: LifecycleStage): LifecycleStage[]
  static canTransition(context: Context, to: LifecycleStage): boolean
  static transition(context: Context, to: LifecycleStage, actor: string, reason?: string): TransitionResult
  static isEnforceable(stage: LifecycleStage): boolean
  static getEnforcementMode(context: Context): EnforcementMode
}
```

### `parseCQL`

```ts
function parseCQL(input: string): RegistryQuery
```

### `validateContext` / `validateContextFull`

```ts
function validateContext(context: unknown): { valid: boolean; errors: string[] }
function validateContextFull(context: Context): { valid: boolean; errors: string[] }
```

### `ContextDoctor`

```ts
class ContextDoctor {
  constructor(projectRoot: string, evaluator?: TriggerEvaluator)
  diagnose(contexts: Context[]): HealthReport
}
```

Health metrics: Stale Contexts, Missing Owners, Enforcement Conflicts, Deprecation Backlog, Draft Stagnation, Authority Gaps, Tag Hygiene, Review Backlog. Trigger evaluation is delegated to `TriggerEvaluator`, so the doctor and evaluator can never disagree on thresholds.

### `RuleEngine`

```ts
class RuleEngine {
  classify(params: {
    title: string;
    description: string;
    category?: string;
    source_type?: ContextSource['type'];
  }): ClassificationSuggestion
}
```

### `ReviewManager`

```ts
class ReviewManager {
  constructor(registry: FileRegistry)

  listPending(): ReviewItem[]
  listAll(): ReviewItem[]
  getReviewItem(id: string): ReviewItem | null
  approve(id: string, actor: string, reason?: string): ReviewResult
  reject(id: string, actor: string, reason?: string): ReviewResult
  requestRevision(id: string, actor: string, reason?: string): ReviewResult
  autoApprove(actor: string): ReviewResult[]
  canAutoApprove(ctx: Context): boolean
}
```

### `TriggerEvaluator`

```ts
class TriggerEvaluator {
  evaluate(
    contexts: Context[],
    enforcements: EnforcementEvent[],
    dismissals: DismissalEvent[] = []
  ): TriggerEvaluation
}
```

Six deterministic triggers, with every threshold exported from a single `TRIGGER_THRESHOLDS` const:

| Trigger | Signal |
|---|---|
| `STALE_NO_VIOLATION` | Active context with recent checks but zero violations in `STALE_DAYS` |
| `HIGH_VIOLATION_RATE` | violations / evaluations > 20%. The pre-0.5.0 "false positive" trigger actually measured this, so it was renamed |
| `HIGH_FALSE_POSITIVE` | dismissals / violations > 20%. Requires dismissal events; dormant without them |
| `INCREASING_VIOLATIONS` | recent violations trending up |
| `AI_DRIFT` | AI violation rate > 2x the human rate |
| `NEW_SOURCE_DETECTED` | context references an unregistered source URI |

### `ImproveEngine`

```ts
class ImproveEngine {
  constructor(registry: FileRegistry, doctor: ContextDoctor, evaluator?: TriggerEvaluator)

  plan(): HealPlan[]                  // recommendations gated by the 9 guardrails
  apply(recommendationId: string, opts?: ApplyOptions): HealResult
  rollback(healId: string): HealResult
}
```

Phase A executes three conservative actions — `deprecate`, `refine-scope`, `register-source` — and treats everything else as advisory. Every mutation is snapshotted before it runs, verified against the doctor after, and auto-rolled-back if health regresses in a metric the action did not intend to affect. Heal events land in `.heals.log` and are mirrored into the lifecycle audit trail; heal bookkeeping is excluded from the Stale Contexts and Draft Stagnation signals so a heal cannot mask a dormant context.

### `SourceConnector`

```ts
class SourceConnector {
  constructor(projectRoot: string)

  addSource(params: { url: string; type?: 'git' | 'website'; label?: string }): RegisteredSource
  removeSource(id: string): boolean
  listSources(): RegisteredSource[]
  checkSource(sourceId?: string): SourceCheckResult[]
}
```

---

## Lifecycle Stages

```
Draft → Candidate → Approved → Active → Deprecated → Archived
```

| Stage | Enforced? | Default Mode | Description |
|---|---|---|---|
| `draft` | No | silent | Discovered but not reviewed |
| `candidate` | Comment only | comment | Under formal review |
| `approved` | Warn only | warn | Approved, migration window |
| `active` | Yes | block / warn | Fully enforced |
| `deprecated` | Warn only | warn | No longer applies |
| `archived` | No | silent | Audit trail |

---

## Authority Levels

| Level | Name | Default Enforcement | Example |
|---|---|---|---|
| 4 | Mandate | block | OJK regulation, PCI-DSS |
| 3 | Standard | block | CISO security policy |
| 2 | Guideline | warn | Team best practice |
| 1 | Preference | comment | Code style preference |
| 0 | Suggestion | silent | AI-generated suggestion |

---

## Governance Classifications

| Classification | Change Speed | AI Can Modify? | Approval Required |
|---|---|---|---|
| `hardened-mandate` | Very slow | Never | Legal + executive |
| `hardened-standard` | Slow | Never | Authority owner + cross-team |
| `hardened-local` | Moderate | Suggest only | Team lead + peer |
| `local-standard` | Moderate | With review | Team consensus |
| `local-guideline` | Fast | Auto-merge | Optional |
| `local-experimental` | Very fast | Primary source | None |

---

## Custom Verifiers

The verifier system is extensible. Register your own:

```ts
import { ContextVerifier } from '@lcdd/core';

const verifier = new ContextVerifier();

verifier.register('my-custom-check', (spec, artifactPath, artifactContent) => {
  if (artifactContent.includes('TODO')) {
    return {
      context_id: '',
      artifact_path: artifactPath,
      status: 'violation',
      violations: [{ description: 'TODO comment found in production code' }],
      confidence: 1,
    };
  }
  return {
    context_id: '',
    artifact_path: artifactPath,
    status: 'compliant',
    confidence: 1,
  };
});
```

---

## CQL Examples

```cql
-- All active security contexts
SELECT * FROM contexts WHERE lifecycle = 'active' AND category = 'security'

-- Hardened rules applicable to TypeScript files
SELECT id, title, enforcement FROM contexts
WHERE lifecycle = 'active'
  AND governance.classification IN ('hardened-mandate', 'hardened-standard')
  AND applies_to GLOB '**/*.ts'

-- Top violated contexts
SELECT id, title, violation_count_30d FROM contexts
WHERE lifecycle = 'active'
  AND violation_count_30d > 0
ORDER BY violation_count_30d DESC
LIMIT 10
```

---

## Related

- [@lcdd/cli](https://www.npmjs.com/package/@lcdd/cli) — Command-line tool for LCDD
- [Living Context Driven Development](https://github.com/Lelianto/living-context-driven-development) — Full specification
- [LCDD Methodology Guide](https://github.com/Lelianto/living-context-driven-development/blob/main/lcdd-methodology.md)

## License

Apache 2.0
