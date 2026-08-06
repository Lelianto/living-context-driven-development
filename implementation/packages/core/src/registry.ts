import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'fs';
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
} from './types.js';
import { LifecycleManager } from './lifecycle.js';
import { validateContextFull } from './schema.js';

export class FileRegistry {
  private contextsDir: string;

  constructor(projectRoot: string) {
    this.contextsDir = join(projectRoot, '.lcdd', 'contexts');
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

  private resolveClassificationDir(classification: string): string {
    if (classification.startsWith('hardened')) return join(this.contextsDir, 'hardened');
    if (classification.startsWith('local-') && classification !== 'local-experimental')
      return join(this.contextsDir, 'local');
    return join(this.contextsDir, 'experimental');
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
    reason?: string
  ): { context: Context; event: LifecycleEvent } {
    const context = this.load(id);
    if (!context) throw new Error(`Context not found: ${id}`);

    const result = LifecycleManager.transition(context, to, actor, reason);
    this.save(result.context);

    const eventLogPath = join(this.contextsDir, '.events.log');
    const eventLine = JSON.stringify(result.event) + '\n';
    mkdirSync(dirname(eventLogPath), { recursive: true });
    writeFileSync(eventLogPath, eventLine, { flag: 'a' });

    return result;
  }

  writeEnforcementEvent(event: EnforcementEvent): void {
    const logPath = join(this.contextsDir, '.enforcements.log');
    const eventLine = JSON.stringify(event) + '\n';
    mkdirSync(dirname(logPath), { recursive: true });
    writeFileSync(logPath, eventLine, { flag: 'a' });
  }

  readEnforcementEvents(): EnforcementEvent[] {
    const logPath = join(this.contextsDir, '.enforcements.log');
    if (!existsSync(logPath)) return [];
    const content = readFileSync(logPath, 'utf-8').trim();
    if (!content) return [];
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try { return JSON.parse(line) as EnforcementEvent; } catch { return null; }
      })
      .filter((e): e is EnforcementEvent => e !== null);
  }

  snapshot(timestamp?: string): Snapshot {
    const contexts = this.list({ lifecycle: 'active' as LifecycleStage });
    const ts = timestamp || new Date().toISOString();

    return {
      snapshot_id: `snap-${ts.replace(/[:.]/g, '-')}`,
      timestamp: ts,
      contexts,
      count: contexts.length,
    };
  }
}
