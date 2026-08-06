import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

export interface RegisteredSource {
  id: string;
  url: string;
  type: 'git' | 'website';
  label?: string;
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
  }): RegisteredSource {
    const id = `src-${params.type || 'unknown'}-${Date.now().toString(36)}`;

    const detectedType = params.type || this.detectType(params.url);
    const source: RegisteredSource = {
      id,
      url: params.url,
      type: detectedType,
      label: params.label,
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
        execSync(`git clone --depth 1 "${source.url}" "${repoDir}"`, {
          cwd: this.sourcesDir,
          timeout: 30000,
          stdio: 'pipe',
        });
        summary = 'Initial clone completed.';
      } else {
        const beforeHash = this.getGitHeadHash(repoDir);
        execSync('git fetch --depth 1 origin', {
          cwd: repoDir,
          timeout: 30000,
          stdio: 'pipe',
        });

        const headBranch = this.getDefaultBranch(repoDir);
        if (headBranch) {
          try {
            execSync(`git merge-base --is-ancestor HEAD origin/${headBranch}`, {
              cwd: repoDir,
              timeout: 10000,
              stdio: 'pipe',
            });
          } catch {
            execSync(`git merge --ff-only origin/${headBranch}`, {
              cwd: repoDir,
              timeout: 30000,
              stdio: 'pipe',
            });
            hasChanges = true;
            const diffOutput = execSync('git diff --stat HEAD~1 HEAD', {
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = execSync(`curl -sL --max-time 15 "${source.url}"`, {
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
      return execSync('git rev-parse HEAD', {
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
      const ref = execSync('git rev-parse --abbrev-ref HEAD', {
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
}
