import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { SourceConnector, type RegisteredSource, type SourceChangeEvent } from '../source-connector.js';

describe('SourceConnector', () => {
  let testDir: string;
  let connector: SourceConnector;

  beforeEach(() => {
    testDir = join(os.tmpdir(), `lcdd-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, '.lcdd', 'sources'), { recursive: true });
    connector = new SourceConnector(testDir);
  });

  afterEach(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch {}
  });

  describe('writeChangeEvent + readChangeEvents', () => {
    it('writes and reads change events', () => {
      const event: SourceChangeEvent = {
        event_id: 'evt-1',
        timestamp: new Date().toISOString(),
        source_id: 'src-test',
        url: 'https://example.com',
        type: 'website',
        has_changes: true,
        summary: 'Content changed.',
      };

      connector.writeChangeEvent(event);
      const events = connector.readChangeEvents();

      expect(events).toHaveLength(1);
      expect(events[0].event_id).toBe('evt-1');
      expect(events[0].has_changes).toBe(true);
    });

    it('returns empty array when no log exists', () => {
      const events = connector.readChangeEvents();
      expect(events).toHaveLength(0);
    });

    it('appends multiple events', () => {
      connector.writeChangeEvent({
        event_id: 'evt-1', timestamp: '2026-01-01', source_id: 's1',
        url: 'x', type: 'website', has_changes: false, summary: '',
      });
      connector.writeChangeEvent({
        event_id: 'evt-2', timestamp: '2026-01-02', source_id: 's2',
        url: 'y', type: 'git', has_changes: true, summary: '',
      });

      const events = connector.readChangeEvents();
      expect(events).toHaveLength(2);
      expect(events[0].event_id).toBe('evt-1');
      expect(events[1].event_id).toBe('evt-2');
    });
  });

  describe('addSource + listSources', () => {
    it('adds and lists sources', () => {
      connector.addSource({ url: 'https://example.com', type: 'website', label: 'Test' });
      const sources = connector.listSources();
      expect(sources).toHaveLength(1);
      expect(sources[0].url).toBe('https://example.com');
      expect(sources[0].type).toBe('website');
      expect(sources[0].label).toBe('Test');
    });

    it('auto-detects git type', () => {
      connector.addSource({ url: 'https://github.com/user/repo.git' });
      const sources = connector.listSources();
      expect(sources[0].type).toBe('git');
    });

    it('removes source', () => {
      const src = connector.addSource({ url: 'https://example.com' });
      expect(connector.removeSource(src.id)).toBe(true);
      expect(connector.listSources()).toHaveLength(0);
    });

    it('rejects non-HTTPS website sources', () => {
      expect(() => connector.addSource({ url: 'http://example.com', type: 'website' }))
        .toThrow('Website sources must use HTTPS');
    });

    it('rejects shell-like and local-path Git sources', () => {
      expect(() => connector.addSource({ url: 'repo;touch-pwned', type: 'git' }))
        .toThrow('Git sources must use HTTPS, SSH, or git@ syntax');
    });

    it('persists confidential source classification', () => {
      connector.addSource({ url: 'https://example.com', type: 'website', confidential: true });
      expect(connector.listSources()[0].confidential).toBe(true);
    });
  });

  describe('getScheduleCron', () => {
    it('generates valid cron expression', () => {
      const cron = SourceConnector.getScheduleCron('/my/project', 60);
      expect(cron).toContain('lcd source check');
      expect(cron).toContain('/my/project');
    });

    it('uses */N for sub-hour intervals', () => {
      const cron = SourceConnector.getScheduleCron('/p', 15);
      expect(cron).toContain('*/15');
    });
  });

  describe('getScheduleGitHubAction', () => {
    it('generates valid YAML', () => {
      const yaml = SourceConnector.getScheduleGitHubAction(60);
      expect(yaml).toContain('name: LCDD Source Monitor');
      expect(yaml).toContain('schedule:');
      expect(yaml).toContain('cron:');
      expect(yaml).toContain('npx @lcdd/cli source check');
    });
  });
});

describe('SourceConnector - checkSource', () => {
  it('checks a website source', () => {
    const testDir = join(os.tmpdir(), `lcdd-check-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, '.lcdd', 'sources'), { recursive: true });

    const connector = new SourceConnector(testDir);
    connector.addSource({ url: 'https://example.com', type: 'website' });
    const results = connector.checkSource();

    expect(results).toHaveLength(1);
    expect(results[0].has_changes).toBeDefined();
    expect(results[0].timestamp).toBeTruthy();

    rmSync(testDir, { recursive: true, force: true });
  });
});
