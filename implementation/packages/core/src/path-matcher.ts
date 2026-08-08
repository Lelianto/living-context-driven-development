/** Normalize a repository-relative path for deterministic cross-platform matching. */
export function normalizeRepositoryPath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
}

/** Match a repository-relative path using LCDD's *, **, and ? glob subset. */
export function matchesPath(value: string, pattern: string): boolean {
  const normalizedValue = normalizeRepositoryPath(value);
  const normalizedPattern = normalizeRepositoryPath(pattern);
  const regex = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\?/g, '[^/]')
    .replace(/\*\*\//g, '\x00SLASH\x00')
    .replace(/\*\*/g, '\x00STAR\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\x00SLASH\x00/g, '(?:.*\/)?')
    .replace(/\x00STAR\x00/g, '.*');
  return new RegExp(`^${regex}$`).test(normalizedValue);
}

export function matchesAnyPath(value: string, patterns: string[] = ['**/*']): boolean {
  return patterns.some(pattern => matchesPath(value, pattern));
}
