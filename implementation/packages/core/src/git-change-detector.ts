import { execFileSync } from 'node:child_process';
import { openSync, readSync, closeSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { ChangedFile, ChangeSet, ChangeStatus } from './types.js';
import { normalizeRepositoryPath } from './path-matcher.js';

const GIT_OPTIONS = { encoding: 'buffer' as const, timeout: 10_000, maxBuffer: 5_000_000 };

function statusOf(code: string): ChangeStatus {
  return ({ A: 'added', M: 'modified', D: 'deleted', R: 'renamed', C: 'copied' } as const)[code[0]] ?? 'modified';
}

export function parseNameStatus(output: Buffer | string): ChangedFile[] {
  const parts = Buffer.isBuffer(output) ? output.toString('utf8').split('\0') : output.split('\0');
  const files: ChangedFile[] = [];
  for (let i = 0; i < parts.length && parts[i];) {
    const statusToken = parts[i++];
    const status = statusOf(statusToken);
    if (status === 'renamed' || status === 'copied') {
      const previous_path = normalizeRepositoryPath(parts[i++] ?? '');
      const current = normalizeRepositoryPath(parts[i++] ?? '');
      if (current) files.push({ path: current, previous_path, status, binary: false });
    } else {
      const current = normalizeRepositoryPath(parts[i++] ?? '');
      if (current) files.push({ path: current, status, binary: false });
    }
  }
  return files;
}

function isBinary(root: string, file: ChangedFile): boolean {
  if (file.status === 'deleted') return false;
  const target = path.resolve(root, file.path);
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`) || !existsSync(target)) return false;
  let descriptor: number | undefined;
  try {
    descriptor = openSync(target, 'r');
    const sample = Buffer.alloc(8_000);
    const count = readSync(descriptor, sample, 0, sample.length, 0);
    return sample.subarray(0, count).includes(0);
  } catch { return false; }
  finally { if (descriptor !== undefined) closeSync(descriptor); }
}

export class GitChangeDetector {
  constructor(private readonly root: string = process.cwd()) {}

  private git(args: string[]): Buffer {
    try { return execFileSync('git', args, { cwd: this.root, ...GIT_OPTIONS }); }
    catch (error) { throw new Error(`Git change detection failed: ${(error as Error).message}`); }
  }

  detect(options: { staged?: boolean; base?: string; head?: string } = {}): ChangeSet {
    if (options.head && !options.base) throw new Error('--head requires --base');
    if (options.staged && options.base) throw new Error('--staged cannot be combined with --base');
    this.git(['rev-parse', '--show-toplevel']);

    let mode: ChangeSet['mode'];
    let files: ChangedFile[];
    let merge_base: string | undefined;
    if (options.base) {
      mode = 'range';
      const head = options.head ?? 'HEAD';
      merge_base = this.git(['merge-base', '--', options.base, head]).toString('utf8').trim();
      files = parseNameStatus(this.git(['diff', '--name-status', '-z', '--find-renames', `${merge_base}...${head}`]));
    } else if (options.staged) {
      mode = 'staged';
      files = parseNameStatus(this.git(['diff', '--name-status', '-z', '--find-renames', '--cached', 'HEAD']));
    } else {
      mode = 'working-tree';
      files = [
        ...parseNameStatus(this.git(['diff', '--name-status', '-z', '--find-renames', 'HEAD'])),
        ...parseNameStatus(this.git(['diff', '--name-status', '-z', '--find-renames', '--cached', 'HEAD'])),
        ...this.git(['ls-files', '--others', '--exclude-standard', '-z']).toString('utf8').split('\0')
          .filter(Boolean).map(file => ({ path: normalizeRepositoryPath(file), status: 'untracked' as const, binary: false })),
      ];
    }

    const unique = new Map<string, ChangedFile>();
    for (const file of files) unique.set(file.path, { ...file, binary: isBinary(this.root, file) });
    return {
      mode, base: options.base, head: options.head, merge_base,
      files: [...unique.values()].sort((a, b) => a.path.localeCompare(b.path)), warnings: [],
    };
  }
}
