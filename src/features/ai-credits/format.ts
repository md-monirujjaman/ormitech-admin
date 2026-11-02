import type { CreditMode, CreditSource } from './types';

/** A credit amount without the zeros the database pads it with. Text in, text out: nothing is turned into a float. */
export function formatCredits(value: string | null): string {
  if (value === null) return '—';
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  let text = unsigned;
  if (unsigned.includes('.')) {
    text = unsigned.replace(/0+$/, '').replace(/\.$/, '');
    if (text === '') text = '0';
  }
  const [whole = '0', fraction] = text.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative && text !== '0' ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
}

/** The sign and amount of a ledger movement: +100, -12.5. */
export const formatDelta = (value: string): string => (value.startsWith('-') ? formatCredits(value) : `+${formatCredits(value)}`);

export const SOURCE_LABEL: Record<CreditSource, string> = { plan_included: 'Plan-included', purchased: 'Purchased', admin_grant: 'Admin grant' };

export const MODE_LABEL: Record<CreditMode, string> = { off: 'Off', observe: 'Observe', enforce: 'Enforce' };
export const MODE_EXPLANATION: Record<CreditMode, string> = {
  off: 'Nothing is counted in credits. AI requests are never held or refused.',
  observe: 'Credits are counted for every AI request, but nothing is held, charged or refused.',
  enforce: 'Credit is held before each AI request and charged after it. A workspace without enough credit is refused and handed to a person.',
};

export const ENTRY_LABEL: Record<string, string> = {
  credit: 'Credit',
  debit: 'Charge',
  reserve: 'Hold',
  release: 'Release',
  adjustment: 'Adjustment',
  expiry: 'Expiry',
  reversal: 'Reversal',
};

export const COST_REASON: Record<string, string> = {
  not_from_catalogue: 'Served from the platform’s own configuration, so it has no catalogue price.',
  fallback_endpoint: 'Answered by the fallback endpoint, which has no catalogue price.',
  provider_reported_no_usage: 'The provider did not report token usage.',
  no_price_at_call_time: 'The model had no price when the call was made.',
  currency_differs_from_policy: 'The price is in a different currency than the credit conversion.',
  calculation_error: 'The cost could not be calculated.',
};

const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
export const formatWhen = (iso: string | null): string => (iso ? when.format(new Date(iso)) : '—');
