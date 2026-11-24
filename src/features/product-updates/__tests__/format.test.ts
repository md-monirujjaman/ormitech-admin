import { describe, expect, it } from 'vitest';
import { formatReleaseDate, newTagNote, todayLocal } from '../format';

describe('formatReleaseDate', () => {
  it('reads a day as a calendar day, whatever the time zone', () => {
    expect(formatReleaseDate('2026-11-24')).toBe('24 Nov 2026');
    expect(formatReleaseDate('2026-01-01')).toBe('1 Jan 2026');
    expect(formatReleaseDate('nonsense')).toBe('nonsense');
  });
});

describe('todayLocal', () => {
  it('is the local calendar day', () => {
    expect(todayLocal(new Date(2026, 10, 4, 23, 59))).toBe('2026-11-04');
  });
});

describe('newTagNote', () => {
  const NOW = Date.parse('2026-11-24T12:00:00.000Z');
  const ago = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();
  it('says what a draft will do', () => {
    expect(newTagNote({ status: 'draft', newOverride: 'auto', publishedAt: null }, NOW)).toBe('Gets NEW when published');
    expect(newTagNote({ status: 'draft', newOverride: 'never', publishedAt: null }, NOW)).toBe('No NEW tag');
  });
  it('counts down the three automatic days and then says it ended', () => {
    expect(newTagNote({ status: 'published', newOverride: 'auto', publishedAt: ago(1) }, NOW)).toBe('NEW for 3 more days');
    expect(newTagNote({ status: 'published', newOverride: 'auto', publishedAt: ago(60) }, NOW)).toBe('NEW for 12 more hours');
    expect(newTagNote({ status: 'published', newOverride: 'auto', publishedAt: ago(73) }, NOW)).toBe('NEW ended');
  });
  it('reports a forced tag', () => {
    expect(newTagNote({ status: 'published', newOverride: 'always', publishedAt: ago(500) }, NOW)).toBe('NEW (forced on)');
    expect(newTagNote({ status: 'published', newOverride: 'never', publishedAt: ago(1) }, NOW)).toBe('No NEW tag (forced off)');
  });
});
