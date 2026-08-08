import { describe, expect, it } from 'vitest';
import { parseNameStatus } from '../git-change-detector.js';

describe('parseNameStatus', () => {
  it('preserves spaces, unicode, and rename origins', () => {
    const files = parseNameStatus('M\0docs/a file.md\0R100\0lama.ts\0baru-λ.ts\0');
    expect(files).toEqual([
      { path: 'docs/a file.md', status: 'modified', binary: false },
      { path: 'baru-λ.ts', previous_path: 'lama.ts', status: 'renamed', binary: false },
    ]);
  });
});
