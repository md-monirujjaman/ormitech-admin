/**
 * Money as text. Nothing here turns an amount into a JavaScript number: a decimal is checked and compared as digits, so what an
 * administrator typed is what is sent, and 0.1 stays 0.1.
 */

const DECIMAL = /^\d+(\.\d+)?$/;

export const isDecimal = (value: string): boolean => DECIMAL.test(value);
export const isZero = (value: string): boolean => !/[1-9]/.test(value);

/** The number of digits after the point, ignoring zeros that carry no value. */
export function places(value: string): number {
  const fraction = value.split('.')[1] ?? '';
  return fraction.replace(/0+$/, '').length;
}

/** The value as whole units of 10^-scale, for exact comparison. */
export function toUnits(value: string, scale: number): bigint {
  const [whole = '0', fraction = ''] = value.split('.');
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.slice(0, scale).padEnd(scale, '0') || '0');
}

/** A decimal without the padding or the leading zeros that a stored value or a typed one may have. */
export function canonical(value: string | null): string | null {
  if (value === null) return null;
  const [whole = '0', fraction = ''] = value.trim().split('.');
  const digits = fraction.replace(/0+$/, '');
  return `${whole.replace(/^0+(?=\d)/, '') || '0'}${digits ? `.${digits}` : ''}`;
}

/** Equal as decimals: 0.1 and 0.10 are the same value. */
export const sameDecimal = (a: string | null, b: string | null): boolean => canonical(a) === canonical(b);
