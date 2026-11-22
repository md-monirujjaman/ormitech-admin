/** `{{name}}`, the only placeholder syntax the API accepts. */
export const placeholder = (name: string): string => `{{${name}}}`;

/**
 * `value` with a placeholder put where the cursor is (or over the selection), and where the cursor should be afterwards. With no
 * selection information it is appended.
 */
export function insertPlaceholder(value: string, name: string, selection?: { start: number; end: number } | null): { value: string; cursor: number } {
  const token = placeholder(name);
  const start = selection ? Math.min(selection.start, value.length) : value.length;
  const end = selection ? Math.min(Math.max(selection.end, start), value.length) : value.length;
  return { value: value.slice(0, start) + token + value.slice(end), cursor: start + token.length };
}

/** Every variable name a text mentions, in order of first use. */
export function placeholdersIn(text: string): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(/\{\{\s*([a-z][a-z0-9_]{0,39})\s*\}\}/g)) seen.add(match[1]!);
  return [...seen];
}
