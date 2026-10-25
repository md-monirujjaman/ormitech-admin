/**
 * Dates for the announcement form. An `<input type="datetime-local">` holds a wall-clock time with no zone, so these
 * convert between that text (in the browser's own time zone) and the ISO instants the API stores.
 */
const pad = (value: number) => String(value).padStart(2, '0');

/** An ISO instant as the text a datetime-local input shows, in local time. */
export function toLocalInput(iso: string | Date): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** What a datetime-local input holds, as an ISO instant, or null when it is empty or not a date. */
export function fromLocalInput(text: string): string | null {
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export const DAY_MS = 86_400_000;

/** `days` days after a datetime-local text, as datetime-local text. */
export function addDaysLocal(text: string, days: number): string {
  const start = new Date(text);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + days, start.getHours(), start.getMinutes());
  return toLocalInput(end);
}

const full = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const formatWhen = (iso: string | Date) => full.format(new Date(iso));

/** "7 days", "1 day 6 hours", "45 minutes": how long a window lasts, in words. */
export function describeSpan(fromIso: string, toIso: string): string {
  const minutes = Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000);
  if (!(minutes > 0)) return '';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts = [days && `${days} ${days === 1 ? 'day' : 'days'}`, hours && `${hours} ${hours === 1 ? 'hour' : 'hours'}`, !days && mins && `${mins} ${mins === 1 ? 'minute' : 'minutes'}`].filter(Boolean);
  return parts.join(' ');
}

/** The time left until `endsIso`, as the dashboard counts it down: "2d 4h", "3h 12m", "9m". Empty once past. */
export function timeLeft(endsIso: string, now = Date.now()): string {
  const ms = new Date(endsIso).getTime() - now;
  if (ms <= 0) return '';
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(minutes, 1)}m`;
}
