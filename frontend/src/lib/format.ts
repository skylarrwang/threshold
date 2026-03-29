/** Convert a snake_case string to Title Case. */
export function titleCase(snakeStr: string): string {
  return snakeStr
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Format a field value for human-readable display. */
export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(String).join(', ') || '—';
  if (typeof value === 'number') return value.toLocaleString();
  const s = String(value);
  // ISO date (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(s + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return s;
}
