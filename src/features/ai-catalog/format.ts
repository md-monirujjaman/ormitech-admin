import type { ProviderHealthStatus, VerificationReason } from './types';

const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
export const formatWhen = (iso: string | null): string => (iso ? when.format(new Date(iso)) : 'never');

/**
 * A price without the zeros the database pads it with: 0.15000000 reads as 0.15. Text in, text out; nothing is ever
 * turned into a float, so no price is rounded on the way to the screen.
 */
export function formatPrice(value: string | null): string {
  if (value === null) return 'not set';
  if (!value.includes('.')) return value;
  const trimmed = value.replace(/0+$/, '').replace(/\.$/, '');
  return trimmed === '' ? '0' : trimmed;
}

/** A decimal as a whole number of 1e-8 units, so two prices can be compared exactly. */
function units(value: string): bigint {
  const [whole = '0', fraction = ''] = value.trim().split('.');
  return BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, '0').slice(0, 8) || '0');
}

/** Whether two prices are the same amount, whatever their padding. `null` equals only `null`. */
export function pricesEqual(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  try {
    return units(a) === units(b);
  } catch {
    return false;
  }
}

export const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && [...a].sort().every((value, index) => value === [...b].sort()[index]);

export const HEALTH_LABEL: Record<ProviderHealthStatus, string> = {
  unknown: 'Not checked',
  healthy: 'Healthy',
  unhealthy: 'Unreachable',
  unauthorized: 'Key rejected',
};

/** What a health code or a verification result means, in words. The API sends a short code, never the provider's message. */
export const CHECK_ERROR_TEXT: Record<string, string> = {
  no_key: 'No API key is stored.',
  url_invalid: 'The stored address is not acceptable.',
  key_unreadable: 'The stored key could not be opened.',
  http_401: 'The provider rejected the key (401).',
  http_403: 'The provider refused the key (403).',
  network: 'The provider could not be reached.',
  timeout: 'The provider did not answer in time.',
  address_not_public: 'The address resolves to a non-public address.',
  too_large: 'The provider answered with too much data.',
};

export function describeCheckError(code: string | null): string | null {
  if (!code) return null;
  if (CHECK_ERROR_TEXT[code]) return CHECK_ERROR_TEXT[code];
  const http = /^http_(\d{3})$/.exec(code);
  return http ? `The provider answered with status ${http[1]}.` : 'The check failed.';
}

export const VERIFICATION_TEXT: Record<VerificationReason, { tone: 'success' | 'warning' | 'error'; text: string }> = {
  available: { tone: 'success', text: 'The provider confirmed this key can use the model.' },
  not_found: { tone: 'warning', text: 'The provider does not know this model for this key. It was switched off and can no longer be offered.' },
  unauthorized: { tone: 'error', text: 'The provider rejected the key, so the model could not be checked.' },
  unreachable: { tone: 'error', text: 'The provider could not be reached, so the model could not be checked. Nothing was changed.' },
  no_key: { tone: 'error', text: 'The provider has no API key yet.' },
  provider_url_invalid: { tone: 'error', text: "The provider's stored address is not acceptable. Edit the provider first." },
};
