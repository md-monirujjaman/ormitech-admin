const DAY_MS = 86_400_000;

/** "24 Nov 2026" from a YYYY-MM-DD day, read as a calendar day (no time zone shift). */
export function formatReleaseDate(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  if (!year || !month || !date) return day;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, date)));
}

/** Today as YYYY-MM-DD in the browser's own time zone. */
export function todayLocal(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** What the NEW tag will do, in words, for the form and the list. */
export function newTagNote(item: { status: string; newOverride: string; publishedAt: string | null }, now = Date.now()): string {
  if (item.status !== 'published') return item.newOverride === 'never' ? 'No NEW tag' : 'Gets NEW when published';
  if (item.newOverride === 'always') return 'NEW (forced on)';
  if (item.newOverride === 'never') return 'No NEW tag (forced off)';
  if (!item.publishedAt) return 'No NEW tag';
  const left = new Date(item.publishedAt).getTime() + 3 * DAY_MS - now;
  if (left <= 0) return 'NEW ended';
  const hours = Math.ceil(left / 3_600_000);
  return hours >= 24 ? `NEW for ${Math.ceil(hours / 24)} more days` : `NEW for ${hours} more hours`;
}
