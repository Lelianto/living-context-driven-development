import { describe, expect, it } from 'vitest';
import { matchesAnyPath, matchesPath, normalizeRepositoryPath } from '../path-matcher.js';

describe('path matcher', () => {
  it('normalizes separators and leading dot segments', () => {
    expect(normalizeRepositoryPath('./src\\auth.ts')).toBe('src/auth.ts');
  });

  it.each([
    ['src/auth.ts', 'src/**', true],
    ['src/nested/auth.ts', 'src/**/*.ts', true],
    ['auth.ts', '**/*.ts', true],
    ['src/auth.js', 'src/*.ts', false],
    ['src/a.ts', 'src/?.ts', true],
    ['src/ab.ts', 'src/?.ts', false],
  ])('matches %s against %s', (value, pattern, expected) => {
    expect(matchesPath(value, pattern)).toBe(expected);
  });

  it('supports any-pattern matching and defaults to all files', () => {
    expect(matchesAnyPath('README.md', ['src/**', '*.md'])).toBe(true);
    expect(matchesAnyPath('README.md')).toBe(true);
  });
});
