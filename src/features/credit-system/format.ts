import { formatCredits } from '@/features/ai-credits/format';
import { canonical } from './decimal';
import type { OperationStatus } from './types';

/** Shown for a figure the API could not give. Never a zero: nothing was counted as nothing. */
export const NOT_AVAILABLE = 'Not available';

export { formatCredits };

/** A USD amount as text, or Not available. Trailing zeros the database pads are removed; nothing is rounded. */
export function formatUsd(value: string | null | undefined): string {
  if (value === null || value === undefined) return NOT_AVAILABLE;
  const text = canonical(value) ?? NOT_AVAILABLE;
  const [whole = '0', fraction] = text.split('.');
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''}`;
}

export function formatCreditsOrNA(value: string | null | undefined): string {
  return value === null || value === undefined ? NOT_AVAILABLE : formatCredits(value);
}

export const STATUS_LABEL: Record<OperationStatus, string> = {
  reserved: 'Reserved',
  settled: 'Settled',
  released: 'Released',
  pending_reconciliation: 'Pending reconciliation',
  failed: 'Failed',
  unknown_cost: 'Unknown cost',
  recorded: 'Recorded (not charged)',
};

export const STATUS_ORDER: OperationStatus[] = ['reserved', 'settled', 'released', 'pending_reconciliation', 'failed', 'unknown_cost', 'recorded'];

export const STATUS_TONE: Record<OperationStatus, 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'> = {
  reserved: 'warning',
  settled: 'success',
  released: 'secondary',
  pending_reconciliation: 'warning',
  failed: 'destructive',
  unknown_cost: 'outline',
  recorded: 'secondary',
};

export const COST_VERIFICATION_LABEL: Record<string, string> = {
  verified_usd: 'Verified USD',
  unit_unverified: 'Unit not verified',
  pending_reconciliation: 'Pending reconciliation',
  unknown: 'Unknown',
};

export const COST_REASON_LABEL: Record<string, string> = {
  usage_absent: 'The provider sent no usage',
  usage_malformed: 'The usage could not be read',
  cost_absent: 'The provider sent no cost',
  cost_malformed: 'The cost could not be read',
  outcome_unknown: 'No answer: the outcome is unknown',
  error_response: 'The provider answered with an error',
};

const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
export const formatWhen = (iso: string | null): string => (iso ? when.format(new Date(iso)) : '—');

export const shortId = (id: string | null): string => (id ? `${id.slice(0, 8)}…` : '—');

/** `2026-11-21` for an <input type="date"> from a day offset, in the browser's own calendar day. */
export function dayInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
