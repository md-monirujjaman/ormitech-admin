import { dayInput } from './format';
import type { OperationStatus } from './types';

const DAY = 86_400_000;

/** The dates the page opens on: the last 30 days, up to the end of today (local days). */
export function defaultPeriod(now = new Date()): { from: string; to: string } {
  return { from: dayInput(new Date(now.getTime() - 29 * DAY)), to: dayInput(now) };
}

/** A day typed in a date box as the API's period: the start of that local day, and the start of the day after `to` (the end is exclusive). */
export function periodToFilters(range: { from: string; to: string }): { from: string; to: string } {
  const start = new Date(`${range.from}T00:00:00`);
  const end = new Date(`${range.to}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

export interface FilterDraft {
  from: string;
  to: string;
  organizationId: string;
  kind: string;
  model: string;
  status: OperationStatus | '';
}
