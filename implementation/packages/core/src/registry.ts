import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import yaml from 'js-yaml';
import { v4 as uuid } from 'uuid';
import type {
  Context,
  RegistryQuery,
  QueryCondition,
  Snapshot,
  ContextPackManifest,
  LifecycleEvent,
  LifecycleStage,
  EnforcementEvent,
  DismissalEvent,
  HealEvent,
} from './types.js';
import { LifecycleManager } from './lifecycle.js';
import { validateContextFull } from './schema.js';
import { readJsonl } from './jsonl.js';

export class FileRegistry {
  private contextsDir: string;
  private snapshotsDir: string;

  constructor(projectRoot: string) {
    this.contextsDir = join(projectRoot, '.lcdd', 'contexts');
    this.snapshotsDir = join(projectRoot, '.lcdd', 'snapshots');
  }

  ensureDir(): void {
    mkdirSync(this.contextsDir, { recursive: true });
    const subdirs = ['hardened', 'local', 'experimental'];
    for (const dir of subdirs) {
      mkdirSync(join(this.contextsDir, dir), { recursive: true });
    }
  }

  private getFilePath(id: string): string {
    return join(this.contextsDir, `${id}.yaml`);
  }

  private listFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    const results: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        results.push(...this.listFiles(full));
      } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
        results.push(full);
      }
    }
    return results;
  }

  load(id: string): Context | null {
    const filePath = this.getFilePath(id);
    if (existsSync(filePath)) {
      return yaml.load(readFileSync(filePath, 'utf-8')) as Context;
    }
    const allFiles = this.listFiles(this.contextsDir);
    for (const file of allFiles) {
      try {
        const ctx = yaml.load(readFileSync(file, 'utf-8')) as Context;
        if (ctx.id === id) return ctx;
      } catch { /* skip */ }
    }
    return null;
  }

  save(context: Context): void {
    this.ensureDir();
    const filePath = this.getFilePath(context.id);

    if (existsSync(filePath)) {
      const existing = this.load(context.id);
      if (existing && context.version !== existing.version + 1) {
        throw new Error(
          `Version mismatch: expected ${existing.version + 1}, got ${context.version}`
        );
      }
    } else if (context.version !== 1) {
      context.version = 1;
    }

    const result = validateContextFull(context);
    if (!result.valid) {
      throw new Error(`Invalid context: ${result.errors.join('; ')}`);
    }

    context.updated_at = new Date().toISOString();
    if (!context.created_at) {
      context.created_at = context.updated_at;
    }

    const dir = dirname(filePath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, yaml.dump(context, { lineWidth: 120 }));
  }

  create(
    partial: Partial<Context> & { title: string; description: string; authority: Context['authority'] }
  ): Context {
    const context: Context = {
      id: partial.id || `ctx-${uuid().slice(0, 8)}`,
      version: 1,
      title: partial.title,
      description: partial.description,
      source: partial.source || { type: 'unknown' },
      authority: partial.authority,
      lifecycle: 'draft',
      governance: partial.governance || {
        classification: partial.authority.level >= 3 ? 'hardened-standard' : 'local-guideline',
        approval_required: partial.authority.level >= 3,
      },
      category: partial.category,
      severity: partial.severity || 'medium',
      applies_to: partial.applies_to || ['**/*'],
      owner: partial.owner,
      tags: partial.tags || [],
      enforcement: partial.enforcement,
      evidence: partial.evidence || [],
      metadata: partial.metadata || {},
    };

    this.save(context);
    return context;
  }

  list(filter?: Partial<Context>): Context[] {
    this.ensureDir();
    const allFiles = this.listFiles(this.contextsDir);
    let contexts = allFiles
      .map(f => {
        try {
          return yaml.load(readFileSync(f, 'utf-8')) as Context;
        } catch {
          return null;
        }
      })
      .filter((c): c is Context => c !== null);

    if (filter) {
      contexts = contexts.filter(c => {
        for (const [key, value] of Object.entries(filter)) {
          if (value === undefined) continue;
          const ctxVal = (c as unknown as Record<string, unknown>)[key];
          if (ctxVal !== value) return false;
        }
        return true;
      });
    }

    return contexts;
  }

  query(q: RegistryQuery): { contexts: Context[]; total: number } {
    let contexts = this.list();

    for (const condition of q.conditions) {
      contexts = this.applyCondition(contexts, condition);
    }

    if (q.order_by && q.order_by.length > 0) {
      const order = q.order_by[0];
      contexts.sort((a, b) => {
        const av = this.getFieldValue(a as unknown as Record<string, unknown>, order.field);
        const bv = this.getFieldValue(b as unknown as Record<string, unknown>, order.field);
        const an = Number(av);
        const bn = Number(bv);
        if (an < bn) return order.desc ? 1 : -1;
        if (an > bn) return order.desc ? -1 : 1;
        return 0;
      });
    }

    const total = contexts.length;
    if (q.offset) contexts = contexts.slice(q.offset);
    if (q.limit) contexts = contexts.slice(0, q.limit);

    return { contexts, total };
  }

  private getFieldValue(obj: Record<string, unknown>, field: string): unknown {
    const parts = field.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current;
  }

  private applyCondition(contexts: Context[], condition: QueryCondition): Context[] {
    const { field, op, value } = condition;

    return contexts.filter(c => {
      const ctxVal = this.getFieldValue(c as unknown as Record<string, unknown>, field);

      switch (op) {
        case '=': return ctxVal === value;
        case '!=': return ctxVal !== value;
        case '>': return (ctxVal as number) > (value as number);
        case '<': return (ctxVal as number) < (value as number);
        case '>=': return (ctxVal as number) >= (value as number);
        case '<=': return (ctxVal as number) <= (value as number);
        case 'IN': {
          const arr = value as unknown[];
          return arr.includes(ctxVal);
        }
        case 'NOT IN': {
          const arr = value as unknown[];
          return !arr.includes(ctxVal);
        }
        case 'CONTAINS': {
          const arr = ctxVal as string[];
          return Array.isArray(arr) && arr.includes(value as string);
        }
        case 'CONTAINS_ANY': {
          const arr = ctxVal as string[];
          const vals = value as string[];
          return Array.isArray(arr) && vals.some(v => arr.includes(v));
        }
        case 'CONTAINS_ALL': {
          const arr = ctxVal as string[];
          const vals = value as string[];
          return Array.isArray(arr) && vals.every(v => arr.includes(v));
        }
        case 'IS NULL': return ctxVal === null || ctxVal === undefined;
        case 'IS NOT NULL': return ctxVal !== null && ctxVal !== undefined;
        case 'GLOB': {
          if (typeof ctxVal === 'string') {
            return this.matchGlob(ctxVal, value as string);
          }
          if (Array.isArray(ctxVal)) {
            return ctxVal.some((s: string) => this.matchGlob(s, value as string));
          }
          return false;
        }
        default: return true;
      }
    });
  }

  private matchGlob(str: string, pattern: string): boolean {
    const regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\?/g, '.')
      .replace(/\*\*\//g, '\x00SLASH\x00')
      .replace(/\*\*/g, '\x00STAR\x00')
      .replace(/\*/g, '[^/]*')
      .replace(/\x00SLASH\x00/g, '(.*\\/)?')
      .replace(/\x00STAR\x00/g, '.*');
    return new RegExp(`^${regex}$`).test(str);
  }

  transition(
    id: string,
    to: LifecycleStage,
    actor: string,
    reason?: string,
    actorRole?: string
  ): { context: Context; event: LifecycleEvent } {
    const context = this.load(id);
    if (!context) throw new Error(`Context not found: ${id}`);

    const result = LifecycleManager.transition(context, to, actor, reason);
    if (actorRole) result.event.actor_role = actorRole;
    this.save(result.context);
    this.appendLog('.events.log', result.event);

    return result;
  }

  writeEnforcementEvent(event: EnforcementEvent): void {
    this.appendLog('.enforcements.log', event);
  }

  readEnforcementEvents(): EnforcementEvent[] {
    return readJsonl<EnforcementEvent>(join(this.contextsDir, '.enforcements.log'));
  }

  writeDismissalEvent(event: DismissalEvent): void {
    this.appendLog('.dismissals.log', event);
  }

  readDismissalEvents(): DismissalEvent[] {
    return readJsonl<DismissalEvent>(join(this.contextsDir, '.dismissals.log'));
  }

  writeHealEvent(event: HealEvent): void {
    this.appendLog('.heals.log', event);
    // Healing is a governance action, so it also belongs in the lifecycle audit
    // trail that reviewers and auditors read.
    this.appendLog('.events.log', {
      context_id: event.context_id ?? 'registry',
      from_stage: 'active',
      to_stage: 'active',
      timestamp: event.timestamp,
      actor: event.actor,
      actor_role: 'improve-engine',
      reason: `heal:${event.operation}:${event.action} (${event.heal_id})`,
      metadata: { heal_id: event.heal_id, recommendation_id: event.recommendation_id },
    } satisfies LifecycleEvent);
  }

  readHealEvents(): HealEvent[] {
    return readJsonl<HealEvent>(join(this.contextsDir, '.heals.log'));
  }

  readLifecycleEvents(): LifecycleEvent[] {
    return readJsonl<LifecycleEvent>(join(this.contextsDir, '.events.log'));
  }

  writeLifecycleEvent(event: LifecycleEvent): void {
    this.appendLog('.events.log', event);
  }

  private appendLog(name: string, event: unknown): void {
    const logPath = join(this.contextsDir, name);
    mkdirSync(dirname(logPath), { recursive: true });
    writeFileSync(logPath, JSON.stringify(event) + '\n', { flag: 'a' });
  }

  /**
   * Capture every context regardless of lifecycle and persist it to disk.
   *
   * All lifecycles are included deliberately: a heal may modify a draft or
   * deprecated context, and a snapshot that omitted them could not restore the
   * registry to its prior state.
   */
  snapshot(timestamp?: string): Snapshot {
    const contexts = this.list();
    const ts = timestamp || new Date().toISOString();
    const snapshot: Snapshot = {
      snapshot_id: `snap-${ts.replace(/[:.]/g, '-')}`,
      timestamp: ts,
      contexts,
      count: contexts.length,
    };

    mkdirSync(this.snapshotsDir, { recursive: true });
    writeFileSync(
      join(this.snapshotsDir, `${snapshot.snapshot_id}.yaml`),
      yaml.dump(snapshot, { lineWidth: 120 })
    );

    return snapshot;
  }

  loadSnapshot(snapshotId: string): Snapshot | null {
    const path = join(this.snapshotsDir, `${snapshotId}.yaml`);
    if (!existsSync(path)) return null;
    return yaml.load(readFileSync(path, 'utf-8')) as Snapshot;
  }

  listSnapshots(): string[] {
    if (!existsSync(this.snapshotsDir)) return [];
    return readdirSync(this.snapshotsDir)
      .filter(f => f.endsWith('.yaml'))
      .map(f => f.replace(/\.yaml$/, ''))
      .sort();
  }

  /**
   * Restore the registry to a snapshot. Contexts created after the snapshot are
   * removed, so the result is the recorded state rather than a merge.
   *
   * Writes bypass `save()` because restoring a prior version legitimately lowers
   * the version number, which `save()` rejects by design.
   */
  restoreSnapshot(snapshotId: string): { restored: number; removed: number } {
    const snapshot = this.loadSnapshot(snapshotId);
    if (!snapshot) throw new Error(`Snapshot not found: ${snapshotId}`);

    const snapshotIds = new Set(snapshot.contexts.map(c => c.id));
    let removed = 0;
    for (const ctx of this.list()) {
      if (!snapshotIds.has(ctx.id)) {
        const path = this.getFilePath(ctx.id);
        if (existsSync(path)) {
          rmSync(path);
          removed++;
        }
      }
    }

    mkdirSync(this.contextsDir, { recursive: true });
    for (const ctx of snapshot.contexts) {
      writeFileSync(this.getFilePath(ctx.id), yaml.dump(ctx, { lineWidth: 120 }));
    }

    return { restored: snapshot.contexts.length, removed };
  }
}
