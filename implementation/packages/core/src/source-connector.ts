import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import yaml from 'js-yaml';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';

export interface SourceChangeEvent {
  event_id: string;
  timestamp: string;
  source_id: string;
  url: string;
  type: 'git' | 'website';
  has_changes: boolean;
  summary: string;
}

export interface RegisteredSource {
  id: string;
  url: string;
  type: 'git' | 'website';
  label?: string;
  confidential?: boolean;
  last_checked?: string;
  last_checksum?: string;
  status: 'active' | 'error' | 'paused';
}

export interface SourceCheckResult {
  source_id: string;
  url: string;
  type: 'git' | 'website';
  has_changes: boolean;
  changes_summary: string;
  timestamp: string;
  error?: string;
}

export class SourceConnector {
  private projectRoot: string;
  private sourcesDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.sourcesDir = join(projectRoot, '.lcdd', 'sources');
  }

  private getSourcesFilePath(): string {
    return join(this.sourcesDir, 'sources.yaml');
  }

  private ensureDir(): void {
    mkdirSync(this.sourcesDir, { recursive: true });
  }

  loadSources(): RegisteredSource[] {
    const path = this.getSourcesFilePath();
    if (!existsSync(path)) return [];
    try {
      const data = yaml.load(readFileSync(path, 'utf-8')) as { sources: RegisteredSource[] };
      return data?.sources || [];
    } catch {
      return [];
    }
  }

  saveSources(sources: RegisteredSource[]): void {
    this.ensureDir();
    writeFileSync(this.getSourcesFilePath(), yaml.dump({ sources }, { lineWidth: 120 }));
  }

  addSource(params: {
    url: string;
    type?: 'git' | 'website';
    label?: string;
    confidential?: boolean;
  }): RegisteredSource {
    const id = `src-${params.type || 'unknown'}-${Date.now().toString(36)}`;

    const detectedType = params.type || this.detectType(params.url);
    this.validateSourceUrl(params.url, detectedType);
    const source: RegisteredSource = {
      id,
      url: params.url,
      type: detectedType,
      label: params.label,
      confidential: params.confidential,
      status: 'active',
    };

    const sources = this.loadSources();
    sources.push(source);
    this.saveSources(sources);

    return source;
  }

  removeSource(id: string): boolean {
    const sources = this.loadSources();
    const idx = sources.findIndex(s => s.id === id);
    if (idx === -1) return false;
    sources.splice(idx, 1);
    this.saveSources(sources);
    return true;
  }

  listSources(): RegisteredSource[] {
    return this.loadSources();
  }

  checkSource(sourceId?: string): SourceCheckResult[] {
    const sources = sourceId
      ? this.loadSources().filter(s => s.id === sourceId)
      : this.loadSources().filter(s => s.status === 'active');

    const results: SourceCheckResult[] = [];
    for (const source of sources) {
      try {
        if (source.type === 'git') {
          results.push(this.checkGitSource(source));
        } else if (source.type === 'website') {
          results.push(this.checkWebsiteSource(source));
        } else {
          results.push({
            source_id: source.id,
            url: source.url,
            type: source.type,
            has_changes: false,
            changes_summary: `Unknown source type: ${source.type}`,
            timestamp: new Date().toISOString(),
          });
        }
        source.last_checked = new Date().toISOString();
      } catch (e) {
        source.status = 'error';
        results.push({
          source_id: source.id,
          url: source.url,
          type: source.type,
          has_changes: false,
          changes_summary: '',
          timestamp: new Date().toISOString(),
          error: (e as Error).message,
        });
      }
    }

    this.saveSources(sources);
    return results;
  }

  private checkGitSource(source: RegisteredSource): SourceCheckResult {
    const repoDir = join(this.sourcesDir, 'repos', source.id);
    let hasChanges = false;
    let summary = '';

    try {
      if (!existsSync(repoDir)) {
        mkdirSync(repoDir, { recursive: true });
        execFileSync('git', ['clone', '--depth', '1', '--', source.url, repoDir], {
          cwd: this.sourcesDir,
          timeout: 30000,
          stdio: 'pipe',
        });
        summary = 'Initial clone completed.';
      } else {
        const beforeHash = this.getGitHeadHash(repoDir);
        execFileSync('git', ['fetch', '--depth', '1', 'origin'], {
          cwd: repoDir,
          timeout: 30000,
          stdio: 'pipe',
        });

        const headBranch = this.getDefaultBranch(repoDir);
        if (headBranch) {
          this.validateBranchName(headBranch);
          try {
            execFileSync('git', ['merge-base', '--is-ancestor', 'HEAD', `origin/${headBranch}`], {
              cwd: repoDir,
              timeout: 10000,
              stdio: 'pipe',
            });
          } catch {
            execFileSync('git', ['merge', '--ff-only', `origin/${headBranch}`], {
              cwd: repoDir,
              timeout: 30000,
              stdio: 'pipe',
            });
            hasChanges = true;
            const diffOutput = execFileSync('git', ['diff', '--stat', 'HEAD~1', 'HEAD'], {
              cwd: repoDir,
              timeout: 10000,
              stdio: 'pipe',
            }).toString().trim();
            summary = diffOutput || 'Changes detected.';
          }
        }

        const afterHash = this.getGitHeadHash(repoDir);
        if (beforeHash !== afterHash) {
          hasChanges = true;
          summary = summary || `HEAD: ${beforeHash.slice(0, 7)} → ${afterHash.slice(0, 7)}`;
        }
      }

      if (!hasChanges && !summary) {
        summary = 'No changes detected.';
      }
    } catch (e) {
      throw new Error(`Git operation failed: ${(e as Error).message}`);
    }

    return {
      source_id: source.id,
      url: source.url,
      type: 'git',
      has_changes: hasChanges,
      changes_summary: summary,
      timestamp: new Date().toISOString(),
    };
  }

  private checkWebsiteSource(source: RegisteredSource): SourceCheckResult {
    let content: string;
    let checksum: string;
    let hasChanges = false;
    let summary = '';

    try {
      const response = execFileSync('curl', ['-sL', '--max-time', '15', '--proto', '=https', '--proto-redir', '=https', '--', source.url], {
        timeout: 20000,
        stdio: 'pipe',
      });

      content = response.toString();
      checksum = createHash('sha256').update(content).digest('hex');
    } catch (e) {
      throw new Error(`HTTP request failed: ${(e as Error).message}`);
    }

    if (source.last_checksum) {
      hasChanges = source.last_checksum !== checksum;
      summary = hasChanges
        ? `Content changed (checksum: ${source.last_checksum.slice(0, 7)} → ${checksum.slice(0, 7)})`
        : 'No changes detected (checksum unchanged).';
    } else {
      summary = `Initial check complete. Content length: ${content.length} bytes.`;
    }

    source.last_checksum = checksum;

    return {
      source_id: source.id,
      url: source.url,
      type: 'website',
      has_changes: hasChanges,
      changes_summary: summary,
      timestamp: new Date().toISOString(),
    };
  }

  private getGitHeadHash(repoDir: string): string {
    try {
      return execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: repoDir,
        timeout: 5000,
        stdio: 'pipe',
      }).toString().trim();
    } catch {
      return '';
    }
  }

  private getDefaultBranch(repoDir: string): string | null {
    try {
      const ref = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: repoDir,
        timeout: 5000,
        stdio: 'pipe',
      }).toString().trim();
      return ref || null;
    } catch {
      return null;
    }
  }

  private detectType(url: string): 'git' | 'website' {
    if (url.startsWith('git@') || url.endsWith('.git') || url.includes('github.com') || url.includes('gitlab.com')) {
      return 'git';
    }
    return 'website';
  }

  private validateSourceUrl(url: string, type: 'git' | 'website'): void {
    if (url.length > 2048 || /[\0\r\n]/.test(url)) {
      throw new Error('Source URL is invalid.');
    }

    if (type === 'website') {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new Error('Website sources must use a valid HTTPS URL.');
      }
      if (parsed.protocol !== 'https:') {
        throw new Error('Website sources must use HTTPS.');
      }
      return;
    }

    const validGitUrl = url.startsWith('git@') || url.startsWith('ssh://') || url.startsWith('https://');
    if (!validGitUrl) {
      throw new Error('Git sources must use HTTPS, SSH, or git@ syntax.');
    }
  }

  private validateBranchName(branch: string): void {
    if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes('..') || branch.startsWith('-')) {
      throw new Error('Remote branch name contains unsafe characters.');
    }
  }

  async *watch(intervalMinutes: number): AsyncGenerator<SourceCheckResult, void, void> {
    while (true) {
      const results = this.checkSource();
      for (const result of results) {
        this.writeChangeEvent({
          event_id: `chg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          source_id: result.source_id,
          url: result.url,
          type: result.type,
          has_changes: result.has_changes,
          summary: result.changes_summary,
        });
        yield result;
      }

      if (results.length === 0) {
        await new Promise(resolve => setTimeout(resolve, intervalMinutes * 60 * 1000));
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMinutes * 60 * 1000));
    }
  }

  writeChangeEvent(event: SourceChangeEvent): void {
    this.ensureDir();
    const logPath = join(this.sourcesDir, '.changes.log');
    writeFileSync(logPath, JSON.stringify(event) + '\n', { flag: 'a' });
  }

  readChangeEvents(): SourceChangeEvent[] {
    const logPath = join(this.sourcesDir, '.changes.log');
    if (!existsSync(logPath)) return [];
    const content = readFileSync(logPath, 'utf-8').trim();
    if (!content) return [];
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try { return JSON.parse(line) as SourceChangeEvent; } catch { return null; }
      })
      .filter((e): e is SourceChangeEvent => e !== null);
  }

  static getScheduleCron(projectPath: string, intervalMinutes: number = 60): string {
    const cronExpr = intervalMinutes < 60
      ? `*/${intervalMinutes} * * * *`
      : `0 */${Math.floor(intervalMinutes / 60)} * * *`;
    return `${cronExpr} cd ${projectPath} && lcd source check`;
  }

  static getScheduleGitHubAction(intervalMinutes: number = 60): string {
    const cronExpr = intervalMinutes < 60
      ? `*/${intervalMinutes} * * * *`
      : `0 */${Math.floor(intervalMinutes / 60)} * * *`;
    return `name: LCDD Source Monitor
on:
  schedule:
    - cron: '${cronExpr}'
  workflow_dispatch:
jobs:
  check-sources:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx @lcdd/cli source check`;
  }
}
