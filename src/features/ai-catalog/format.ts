import type { GatewayHealth, VerificationReason } from './types';

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

export const GATEWAY_LABEL: Record<GatewayHealth | 'unchecked', string> = {
  unchecked: 'Not tested yet',
  healthy: 'Connected',
  unauthorized: 'Key rejected',
  unhealthy: 'Unreachable',
  no_key: 'No key set',
};

/** What a health code or a verification result means, in words. The API sends a short code, never the provider's message. */
export const CHECK_ERROR_TEXT: Record<string, string> = {
  no_key: 'OPENROUTER_API_KEY is not set on the server.',
  url_invalid: 'OPENROUTER_BASE_URL is not an acceptable address (it must be a public https address).',
  http_401: 'OpenRouter rejected the key (401).',
  http_403: 'OpenRouter refused the key (403).',
  network: 'OpenRouter could not be reached.',
  timeout: 'OpenRouter did not answer in time.',
  address_not_public: 'The address resolves to a non-public address.',
  too_large: 'OpenRouter answered with too much data.',
};

export function describeCheckError(code: string | null): string | null {
  if (!code) return null;
  if (CHECK_ERROR_TEXT[code]) return CHECK_ERROR_TEXT[code];
  const http = /^http_(\d{3})$/.exec(code);
  return http ? `OpenRouter answered with status ${http[1]}.` : 'The check failed.';
}

export const VERIFICATION_TEXT: Record<VerificationReason, { tone: 'success' | 'warning' | 'error'; text: string }> = {
  available: { tone: 'success', text: 'OpenRouter confirmed the key can use this model.' },
  not_found: { tone: 'warning', text: 'OpenRouter does not know this model. It was switched off and can no longer be offered.' },
  unauthorized: { tone: 'error', text: 'OpenRouter rejected the key, so the model could not be checked.' },
  unreachable: { tone: 'error', text: 'OpenRouter could not be reached or no provider serves the model right now, so it could not be checked. Nothing was changed.' },
  no_key: { tone: 'error', text: 'OPENROUTER_API_KEY is not set on the server.' },
  provider_url_invalid: { tone: 'error', text: 'OPENROUTER_BASE_URL is not an acceptable address, so nothing was sent.' },
};
