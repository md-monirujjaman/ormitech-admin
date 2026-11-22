import { describe, expect, it } from 'vitest';
import { FONT_PRESETS, footerFromText, validateBranding } from '../lib/branding';
import { diffLines, hasChanges } from '../lib/diff';
import { errorCodeLabel, matchesSearch, templateStatuses } from '../lib/status';
import { insertPlaceholder, placeholdersIn } from '../lib/variables';
import { branding } from './fixtures';

describe('diffLines', () => {
  it('marks what was removed, added and kept', () => {
    expect(diffLines('a\nb\nc', 'a\nx\nc')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'removed', text: 'b' },
      { kind: 'added', text: 'x' },
      { kind: 'same', text: 'c' },
    ]);
  });

  it('reports identical texts as unchanged', () => {
    expect(hasChanges(diffLines('same\ntext', 'same\ntext'))).toBe(false);
  });

  it('handles an empty side', () => {
    expect(diffLines('', 'new').filter((line) => line.kind === 'added')).toHaveLength(1);
    expect(diffLines('gone', '').filter((line) => line.kind === 'removed')).toHaveLength(1);
  });

  it('compares a very long text as two blocks instead of building a huge table', () => {
    const long = Array.from({ length: 1500 }, (_, i) => `line ${i}`).join('\n');
    const lines = diffLines(long, `${long}\nextra`);
    expect(lines.filter((line) => line.kind === 'removed')).toHaveLength(1500);
    expect(lines.filter((line) => line.kind === 'added')).toHaveLength(1501);
  });
});

describe('templateStatuses', () => {
  it.each([
    [{ enabled: true, hasDraft: false, publishedVersion: null }, ['builtin']],
    [{ enabled: true, hasDraft: true, publishedVersion: null }, ['draft']],
    [{ enabled: true, hasDraft: true, publishedVersion: 3 }, ['draft', 'published']],
    [{ enabled: false, hasDraft: false, publishedVersion: 2 }, ['disabled', 'published']],
    [{ enabled: false, hasDraft: false, publishedVersion: null }, ['disabled', 'builtin']],
  ])('%j is %j', (input, expected) => {
    expect(templateStatuses(input)).toEqual(expected);
  });
});

describe('matchesSearch', () => {
  const template = { name: 'Password reset link', key: 'auth.password_reset', category: 'authentication' as const };
  it('matches the name, the key and the category, ignoring case', () => {
    expect(matchesSearch(template, 'RESET')).toBe(true);
    expect(matchesSearch(template, 'auth.pass')).toBe(true);
    expect(matchesSearch(template, 'authentication')).toBe(true);
    expect(matchesSearch(template, '  ')).toBe(true);
    expect(matchesSearch(template, 'invoice')).toBe(false);
  });
});

describe('error codes', () => {
  it('says what a code means, and passes an unknown one through', () => {
    expect(errorCodeLabel('rejected')).toMatch(/rejected/i);
    expect(errorCodeLabel('weird_code')).toBe('weird_code');
    expect(errorCodeLabel(null)).toBe('');
  });
});

describe('variables', () => {
  it('inserts at the cursor, over a selection, or at the end', () => {
    expect(insertPlaceholder('Hello !', 'name', { start: 6, end: 6 })).toEqual({ value: 'Hello {{name}}!', cursor: 14 });
    expect(insertPlaceholder('Hello XXX', 'name', { start: 6, end: 9 }).value).toBe('Hello {{name}}');
    expect(insertPlaceholder('Hi', 'code').value).toBe('Hi{{code}}');
    expect(insertPlaceholder('Hi', 'code', { start: 99, end: 99 }).value).toBe('Hi{{code}}');
  });

  it('lists the placeholders a text uses once each', () => {
    expect(placeholdersIn('{{a}} {{ b }} {{a}} {{Bad}}')).toEqual(['a', 'b']);
  });
});

describe('validateBranding', () => {
  it('accepts the built-in look, and every font preset', () => {
    const base = branding();
    expect(validateBranding(base)).toEqual({});
    for (const font of FONT_PRESETS) expect(validateBranding({ ...base, fontFamily: font.value })).toEqual({});
  });

  it('refuses what the API refuses, beside the field', () => {
    const base = branding();
    expect(validateBranding({ ...base, accentColor: 'red' }).accentColor).toBeTruthy();
    expect(validateBranding({ ...base, logoUrl: 'http://insecure.example/l.png' }).logoUrl).toBeTruthy();
    expect(validateBranding({ ...base, fontFamily: 'Arial" onmouseover' }).fontFamily).toBeTruthy();
    expect(validateBranding({ ...base, productName: '' }).productName).toBeTruthy();
    expect(validateBranding({ ...base, footerLines: Array(7).fill('x') }).footerLines).toBeTruthy();
  });

  it('turns footer text into non-empty lines', () => {
    expect(footerFromText(' one \n\n two\n')).toEqual(['one', 'two']);
  });
});
