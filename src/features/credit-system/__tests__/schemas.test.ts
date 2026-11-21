import { describe, expect, it } from 'vitest';
import { canonical, isDecimal, places, sameDecimal, toUnits } from '../decimal';
import { costUnitSchema, financialSchema, limitsSchema, workspaceIdSchema } from '../schemas';

const FINANCIAL = { creditValueUsd: '0.0001', markupPercentage: '200', roundingMode: 'ceil' as const, decimalPlaces: '2' };
const problem = (result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }, field: string) => result.error?.issues.some((issue) => issue.path[0] === field) ?? false;

describe('money as text', () => {
  it('compares decimals as digits, never as floats', () => {
    expect(isDecimal('0.1')).toBe(true);
    expect(isDecimal('1e-4')).toBe(false);
    expect(isDecimal('-1')).toBe(false);
    expect(places('0.1000')).toBe(1);
    expect(toUnits('0.1', 4) + toUnits('0.2', 4)).toBe(toUnits('0.3', 4));
    expect(canonical('0.000100000000')).toBe('0.0001');
    expect(canonical('200.0000')).toBe('200');
    expect(sameDecimal('0.10', '0.1')).toBe(true);
    expect(sameDecimal('0.1', '0.11')).toBe(false);
    expect(sameDecimal(null, null)).toBe(true);
    expect(sameDecimal(null, '0')).toBe(false);
  });
});

describe('the financial form', () => {
  it('accepts the four values, a zero markup and the empty (not decided) form', () => {
    expect(financialSchema.safeParse(FINANCIAL).success).toBe(true);
    expect(financialSchema.safeParse({ ...FINANCIAL, markupPercentage: '0' }).success).toBe(true);
    expect(financialSchema.safeParse({ creditValueUsd: '', markupPercentage: '', roundingMode: '', decimalPlaces: '' }).success).toBe(true);
  });

  it.each(['0', '0.0', '-0.0001', '1e-4', '0,0001', ' 1 000', 'abc', '0.0000000000001', '123456789'])('refuses the credit value %j', (creditValueUsd) => {
    expect(problem(financialSchema.safeParse({ ...FINANCIAL, creditValueUsd }), 'creditValueUsd')).toBe(true);
  });

  it.each(['-1', '10000.0001', '10001', 'abc', '1e2', '5.00001'])('refuses the markup %j', (markupPercentage) => {
    expect(problem(financialSchema.safeParse({ ...FINANCIAL, markupPercentage }), 'markupPercentage')).toBe(true);
  });

  it('accepts a markup of exactly 10000, with the exact comparison', () => {
    expect(financialSchema.safeParse({ ...FINANCIAL, markupPercentage: '10000' }).success).toBe(true);
    expect(financialSchema.safeParse({ ...FINANCIAL, markupPercentage: '10000.0000' }).success).toBe(true);
  });

  it.each(['round', 'up', 'CEIL'])('refuses the rounding mode %j', (roundingMode) => {
    expect(financialSchema.safeParse({ ...FINANCIAL, roundingMode }).success).toBe(false);
  });

  it.each(['9', '-1', '1.5', 'x', '10'])('refuses %j decimal places', (decimalPlaces) => {
    expect(problem(financialSchema.safeParse({ ...FINANCIAL, decimalPlaces }), 'decimalPlaces')).toBe(true);
  });
});

describe('the cost unit form', () => {
  const good = { unit: 'openrouter_credits', usdFactor: '1', evidence: 'compared with the provider dashboard' };
  it('accepts a unit with a factor and evidence', () => {
    expect(costUnitSchema.safeParse(good).success).toBe(true);
  });
  it.each([
    ['no evidence', { ...good, evidence: '' }, 'evidence'],
    ['short evidence', { ...good, evidence: 'ok' }, 'evidence'],
    ['a zero factor', { ...good, usdFactor: '0' }, 'usdFactor'],
    ['an exponent factor', { ...good, usdFactor: '1e0' }, 'usdFactor'],
    ['a unit with capitals', { ...good, unit: 'USD' }, 'unit'],
    ['a factor with no unit', { ...good, unit: '' }, 'unit'],
  ])('refuses %s', (_name, input, field) => {
    expect(problem(costUnitSchema.safeParse(input), field)).toBe(true);
  });
});

describe('the limits form', () => {
  const good = { budgetUsd: '2', maxSpendUsd: '10', monthlyLimitUsd: '5', dailyLimitUsd: '1', perTurnLimitUsd: '' };
  it('accepts limits in order, with an empty one meaning not set', () => {
    expect(limitsSchema.safeParse(good).success).toBe(true);
    expect(limitsSchema.safeParse({ budgetUsd: '', maxSpendUsd: '', monthlyLimitUsd: '', dailyLimitUsd: '1', perTurnLimitUsd: '' }).success).toBe(true);
  });
  it.each([
    ['a budget above the maximum', { budgetUsd: '11' }, 'budgetUsd'],
    ['a monthly limit above the maximum', { monthlyLimitUsd: '11' }, 'monthlyLimitUsd'],
    ['a daily limit above the monthly limit', { dailyLimitUsd: '6' }, 'dailyLimitUsd'],
    ['a per-turn limit above the daily limit', { perTurnLimitUsd: '2' }, 'perTurnLimitUsd'],
    ['zero', { dailyLimitUsd: '0' }, 'dailyLimitUsd'],
    ['a negative amount', { dailyLimitUsd: '-1' }, 'dailyLimitUsd'],
    ['seven decimal places', { dailyLimitUsd: '0.5000001' }, 'dailyLimitUsd'],
  ])('refuses %s', (_name, over, field) => {
    expect(problem(limitsSchema.safeParse({ ...good, ...over }), field)).toBe(true);
  });
  it('refuses a form with nothing in it', () => {
    expect(problem(limitsSchema.safeParse({ budgetUsd: '', maxSpendUsd: '', monthlyLimitUsd: '', dailyLimitUsd: '', perTurnLimitUsd: '' }), 'budgetUsd')).toBe(true);
  });
  it('compares exactly: an equal limit is in order', () => {
    expect(limitsSchema.safeParse({ ...good, dailyLimitUsd: '5' }).success).toBe(true);
  });
});

describe('the workspace ID', () => {
  it('accepts a UUID and refuses anything else', () => {
    expect(workspaceIdSchema.safeParse({ organizationId: '018f0000-0000-7000-8000-000000000001', note: '' }).success).toBe(true);
    expect(workspaceIdSchema.safeParse({ organizationId: 'not-an-id', note: '' }).success).toBe(false);
    expect(workspaceIdSchema.safeParse({ organizationId: '', note: '' }).success).toBe(false);
    expect(workspaceIdSchema.safeParse({ organizationId: '018f0000-0000-7000-8000-000000000001', note: 'x'.repeat(201) }).success).toBe(false);
  });
});
