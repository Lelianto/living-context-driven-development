import { afterEach, describe, expect, it } from 'vitest';
import { sanitizeErrorMessage, TOOLS } from '../index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('MCP tool contracts', () => {
  it('exposes eight unique, object-shaped tool contracts', () => {
    expect(TOOLS).toHaveLength(8);
    expect(new Set(TOOLS.map(tool => tool.name)).size).toBe(8);
    for (const tool of TOOLS) {
      expect(tool.name).toMatch(/^lcdd_[a-z_]+$/);
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });

  it('declares required inputs for context, query, and validation tools', () => {
    const requiredByName = new Map(TOOLS.map(tool => [tool.name, tool.inputSchema.required ?? []]));
    expect(requiredByName.get('lcdd_get_context')).toContain('id');
    expect(requiredByName.get('lcdd_query_contexts')).toContain('query');
    expect(requiredByName.get('lcdd_validate_artifact')).toContain('path');
  });

  it('redacts project and absolute filesystem paths from errors', () => {
    const root = '/Users/example/private-project';
    const message = sanitizeErrorMessage(new Error(`${root}/.lcdd/contexts/secret.yaml failed`), [root]);
    expect(message).toContain('<project-root>');
    expect(message).not.toContain('/Users/example');
  });

  it('serves tool contracts and structured unknown-tool errors over stdio', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lcdd-mcp-'));
    tempDirs.push(projectRoot);
    const env = Object.fromEntries(
      Object.entries({ ...process.env, LCDD_PROJECT_ROOT: projectRoot })
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [join(packageRoot, 'dist', 'index.js')],
      env,
      stderr: 'pipe',
    });
    const client = new Client({ name: 'lcdd-contract-test', version: '1.0.0' });

    try {
      await client.connect(transport);
      const listed = await client.listTools();
      expect(listed.tools).toHaveLength(8);

      const error = await client.callTool({ name: 'lcdd_unknown', arguments: {} });
      expect(error.isError).toBe(true);
      expect(error.content).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'text', text: 'Unknown tool: lcdd_unknown' }),
      ]));
    } finally {
      await client.close();
    }
  });
});
