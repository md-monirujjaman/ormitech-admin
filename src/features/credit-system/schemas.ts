import { z } from 'zod';
import { canonical, isDecimal, isZero, places, toUnits } from './decimal';

const required = (message: string) => z.string().trim().min(1, message);

/** An empty field means "not decided" and is sent as null; anything typed must be valid. */
const optional = <T extends z.ZodTypeAny>(inner: T) => z.union([z.literal(''), inner]);

const creditValue = z
  .string()
  .trim()
  .refine((value) => isDecimal(value), 'Digits and one point only, such as 0.0001 (no sign, exponent or comma)')
  .refine((value) => !isZero(value), 'Must be more than zero')
  .refine((value) => places(value) <= 12, 'At most 12 decimal places')
  .refine((value) => (value.split('.')[0] ?? '').replace(/^0+(?=\d)/, '').length <= 8, 'Must be below 100000000');

const markup = z
  .string()
  .trim()
  .refine((value) => isDecimal(value), 'A percentage such as 200 (digits and one point, no sign or exponent)')
  .refine((value) => places(value) <= 4, 'At most 4 decimal places')
  .refine((value) => !isDecimal(value) || toUnits(value, 4) <= 10_000n * 10_000n, 'At most 10000');

/** A plan's API budget (USD) and markup. Empty means not decided. */
export const planBudgetSchema = z
  .object({
    usdBudget: z
      .string()
      .trim()
      .refine((value) => value === '' || (/^\d{1,12}(\.\d{1,6})?$/.test(value) && !isZero(value)), 'A positive USD amount with up to 6 decimal places'),
    markupPercent: z.union([z.literal(''), markup]),
  })
  .superRefine((value, context) => {
    if (value.usdBudget === '' && value.markupPercent === '') context.addIssue({ code: 'custom', path: ['usdBudget'], message: 'Set a budget or a markup, or remove the plan’s settings instead' });
  });
export type PlanBudgetForm = z.infer<typeof planBudgetSchema>;

export const grantSchema = z.object({
  reason: z.string().trim().min(3, 'Say why, in at least 3 characters').max(300, 'Keep the reason under 300 characters'),
});

export const ROUNDING_LABEL: Record<string, string> = {
  ceil: 'Round up (ceil)',
  floor: 'Round down (floor)',
  half_up: 'Half up',
  half_even: 'Half even (banker’s rounding)',
};

export const financialSchema = z.object({
  creditValueUsd: optional(creditValue),
  roundingMode: z.union([z.literal(''), z.enum(['ceil', 'floor', 'half_up', 'half_even'])]),
  decimalPlaces: optional(z.string().trim().regex(/^[0-8]$/, 'A whole number from 0 to 8')),
});
export type FinancialForm = z.infer<typeof financialSchema>;

export const costUnitSchema = z
  .object({
    unit: z.string().trim(),
    usdFactor: z.string().trim(),
    evidence: z.string().trim(),
  })
  .superRefine((value, context) => {
    const cleared = value.unit === '' && value.usdFactor === '';
    if (cleared) return;
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(value.unit)) context.addIssue({ code: 'custom', path: ['unit'], message: 'Lower-case letters, digits and underscores, such as openrouter_credits' });
    if (!isDecimal(value.usdFactor) || isZero(value.usdFactor) || places(value.usdFactor) > 8 || (value.usdFactor.split('.')[0] ?? '').length > 16) context.addIssue({ code: 'custom', path: ['usdFactor'], message: 'More than zero, with up to 8 decimal places, such as 1' });
    if (value.evidence.length < 10) context.addIssue({ code: 'custom', path: ['evidence'], message: 'Say how the unit was verified (at least 10 characters). A verification without evidence is not recorded.' });
    if (value.evidence.length > 2000) context.addIssue({ code: 'custom', path: ['evidence'], message: 'At most 2000 characters' });
  });
export type CostUnitForm = z.infer<typeof costUnitSchema>;

const LIMIT = /^\d{1,12}(\.\d{1,6})?$/;
const limit = z
  .string()
  .trim()
  .refine((value) => value === '' || (LIMIT.test(value) && !isZero(value)), 'A positive USD amount with up to 6 decimal places');

export const LIMIT_FIELDS = [
  { key: 'budgetUsd', label: 'AI budget', hint: 'What the workspace is meant to use of AI.' },
  { key: 'maxSpendUsd', label: 'Maximum spend', hint: 'The most it may use in total. At least the budget.' },
  { key: 'monthlyLimitUsd', label: 'Monthly limit', hint: 'Per calendar month. At most the maximum spend.' },
  { key: 'dailyLimitUsd', label: 'Daily limit', hint: 'Per day. At most the monthly limit.' },
  { key: 'perTurnLimitUsd', label: 'Per-turn limit', hint: 'Per customer turn. At most the daily limit.' },
] as const;
export type LimitKey = (typeof LIMIT_FIELDS)[number]['key'];

export const limitsSchema = z
  .object({ budgetUsd: limit, maxSpendUsd: limit, monthlyLimitUsd: limit, dailyLimitUsd: limit, perTurnLimitUsd: limit })
  .superRefine((value, context) => {
    const set = (key: LimitKey) => (value[key] !== '' && LIMIT.test(value[key]) && !isZero(value[key]) ? toUnits(value[key], 6) : null);
    if (LIMIT_FIELDS.every((field) => value[field.key] === '')) context.addIssue({ code: 'custom', path: ['budgetUsd'], message: 'Set at least one limit, or remove the workspace’s limits instead' });
    const atMost = (small: LimitKey, large: LimitKey, message: string) => {
      const a = set(small);
      const b = set(large);
      if (a !== null && b !== null && a > b) context.addIssue({ code: 'custom', path: [small], message });
    };
    atMost('budgetUsd', 'maxSpendUsd', 'The budget cannot be more than the maximum spend');
    atMost('monthlyLimitUsd', 'maxSpendUsd', 'The monthly limit cannot be more than the maximum spend');
    atMost('dailyLimitUsd', 'monthlyLimitUsd', 'The daily limit cannot be more than the monthly limit');
    atMost('perTurnLimitUsd', 'dailyLimitUsd', 'The per-turn limit cannot be more than the daily limit');
  });
export type LimitsForm = z.infer<typeof limitsSchema>;

export const workspaceIdSchema = z.object({
  organizationId: required('Enter a workspace ID').regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'A workspace ID looks like 018f0000-0000-7000-8000-000000000001'),
  note: z.string().trim().max(200, 'At most 200 characters'),
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export { canonical };
