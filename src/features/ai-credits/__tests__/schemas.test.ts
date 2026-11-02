import { describe, expect, it } from 'vitest';
import { formatCredits, formatDelta } from '../format';
import { adjustSchema, fieldErrors, grantSchema, policySchema, reverseSchema } from '../schemas';

const grant = (overrides: Record<string, string> = {}) => ({ source: 'admin_grant', amount: '100', label: '', expiresAt: '', reason: 'goodwill', ...overrides });
const policy = (overrides: Record<string, string> = {}) => ({ mode: 'off', creditsPerCostUnit: '', costCurrency: '', markupPercent: '', rounding: 'half_up', estimateCharsPerToken: '3', reservationTtlSeconds: '300', ...overrides });

describe('credit amounts are shown exactly, never as floats', () => {
  it('trims only the padding and groups the thousands', () => {
    expect(formatCredits('1000.00000000')).toBe('1,000');
    expect(formatCredits('135.50000000')).toBe('135.5');
    expect(formatCredits('0.00000001')).toBe('0.00000001');
    expect(formatCredits('1234567.12345678')).toBe('1,234,567.12345678');
    expect(formatCredits('0.00000000')).toBe('0');
    expect(formatCredits('-12.50000000')).toBe('-12.5');
    expect(formatCredits('-0.00000000')).toBe('0');
    expect(formatCredits(null)).toBe('—');
    expect(formatDelta('12.5')).toBe('+12.5');
    expect(formatDelta('-12.50000000')).toBe('-12.5');
  });
});

describe('grant validation', () => {
  it('accepts a decimal amount with up to 8 places and a reason', () => {
    for (const amount of ['1', '0.00000001', '9999999999999999.99999999']) expect(grantSchema.safeParse(grant({ amount })).success, amount).toBe(true);
  });

  it.each(['', '0', '0.0', '-1', '1.123456789', 'abc', '1e5', '1,5'])('refuses the amount %j', (amount) => {
    expect(grantSchema.safeParse(grant({ amount })).success).toBe(false);
  });

  it('needs a reason and refuses a source that is not a grant', () => {
    expect(grantSchema.safeParse(grant({ reason: 'ok' })).success).toBe(false);
    expect(grantSchema.safeParse(grant({ reason: '' })).success).toBe(false);
    expect(grantSchema.safeParse(grant({ source: 'purchased' })).success).toBe(false);
    const result = grantSchema.safeParse(grant({ amount: '0' }));
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).amount).toMatch(/more than zero/);
  });
});

describe('adjustment validation', () => {
  it('takes a signed amount that is not zero, and a reason', () => {
    for (const amount of ['5', '-5', '-0.00000001']) expect(adjustSchema.safeParse({ bucketId: 'b', amount, reason: 'correction' }).success, amount).toBe(true);
    for (const amount of ['0', '-0', '', '--5', '+5', '1.123456789']) expect(adjustSchema.safeParse({ bucketId: 'b', amount, reason: 'correction' }).success, amount).toBe(false);
    expect(adjustSchema.safeParse({ bucketId: '', amount: '5', reason: 'correction' }).success).toBe(false);
    expect(adjustSchema.safeParse({ bucketId: 'b', amount: '5', reason: 'no' }).success).toBe(false);
    expect(reverseSchema.safeParse({ reason: '  ' }).success).toBe(false);
  });
});

describe('credit policy validation', () => {
  it('accepts the shipped state: nothing decided, mode off', () => {
    expect(policySchema.safeParse(policy()).success).toBe(true);
  });

  it('needs the rate, currency and markup together, or none', () => {
    expect(policySchema.safeParse(policy({ creditsPerCostUnit: '1000' })).success).toBe(false);
    expect(policySchema.safeParse(policy({ creditsPerCostUnit: '1000', costCurrency: 'USD' })).success).toBe(false);
    expect(policySchema.safeParse(policy({ creditsPerCostUnit: '1000', costCurrency: 'USD', markupPercent: '0' })).success).toBe(true);
    expect(policySchema.safeParse(policy({ costCurrency: 'USD' })).success).toBe(false);
  });

  it('will not turn credits on before the conversion is decided', () => {
    for (const mode of ['observe', 'enforce']) {
      const result = policySchema.safeParse(policy({ mode }));
      expect(result.success, mode).toBe(false);
      if (!result.success) expect(fieldErrors(result.error).mode).toMatch(/conversion/);
      expect(policySchema.safeParse(policy({ mode, creditsPerCostUnit: '1000', costCurrency: 'USD', markupPercent: '0' })).success).toBe(true);
    }
  });

  it('refuses a zero rate, a bad currency, a markup over 10000 and bad estimate or hold times', () => {
    const decided = { creditsPerCostUnit: '1000', costCurrency: 'USD', markupPercent: '0' };
    expect(policySchema.safeParse(policy({ ...decided, creditsPerCostUnit: '0' })).success).toBe(false);
    expect(policySchema.safeParse(policy({ ...decided, creditsPerCostUnit: '1.123456789' })).success).toBe(false);
    expect(policySchema.safeParse(policy({ ...decided, costCurrency: 'usd' })).success).toBe(false);
    expect(policySchema.safeParse(policy({ ...decided, markupPercent: '10001' })).success).toBe(false);
    expect(policySchema.safeParse(policy({ ...decided, markupPercent: '12.5' })).success).toBe(true);
    expect(policySchema.safeParse(policy({ estimateCharsPerToken: '0.5' })).success).toBe(false);
    expect(policySchema.safeParse(policy({ estimateCharsPerToken: '11' })).success).toBe(false);
    expect(policySchema.safeParse(policy({ reservationTtlSeconds: '29' })).success).toBe(false);
    expect(policySchema.safeParse(policy({ reservationTtlSeconds: '86401' })).success).toBe(false);
    expect(policySchema.safeParse(policy({ reservationTtlSeconds: '1.5' })).success).toBe(false);
  });
});
