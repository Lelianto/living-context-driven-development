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
|---|---|
| **Context Model** | Full TypeScript types for Contexts, Lifecycle, Authority, Governance, Enforcement |
| **Schema Validator** | JSON Schema + semantic rule validation for Context artifacts |
| **Lifecycle Manager** | 12 transition rules, enforcement mode derivation, audit events |
| **File Registry** | File-based Context Registry — YAML storage, CQL querying, snapshots, event logging |
| **CQL Parser** | Full lexer/parser for Context Query Language (SELECT/FROM/WHERE/ORDER BY/LIMIT) |
| **Context Verifier** | Pluggable enforcement engine with built-in regex and file-exists verifiers |

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
  transition(id: string, to: LifecycleStage, actor: string, reason?: string): { context: Context; event: LifecycleEvent }
  snapshot(timestamp?: string): Snapshot
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
