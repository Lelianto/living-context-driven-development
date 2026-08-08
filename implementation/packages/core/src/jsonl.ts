import { readFileSync, existsSync } from 'fs';

/**
 * Read a JSONL log file, skipping blank and malformed lines.
 *
 * Every log in the registry (.events.log, .enforcements.log, .dismissals.log,
 * .heals.log, .changes.log) uses this format. Previously each consumer
 * reimplemented this read, which let their behaviour drift.
 */
export function readJsonl<T>(logPath: string): T[] {
  if (!existsSync(logPath)) return [];
  const content = readFileSync(logPath, 'utf-8').trim();
  if (!content) return [];
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line) as T;
      } catch {
        return null;
      }
    })
    .filter((e): e is T => e !== null);
}

/** Days elapsed since an ISO timestamp. Returns Infinity when absent or unparseable. */
export function daysSince(dateStr: string | undefined | null): number {
  if (!dateStr) return Infinity;
  const ms = new Date(dateStr).getTime();
  if (Number.isNaN(ms)) return Infinity;
  return (Date.now() - ms) / (1000 * 60 * 60 * 24);
}
