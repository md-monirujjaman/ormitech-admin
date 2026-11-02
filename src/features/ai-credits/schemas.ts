import { z } from 'zod';

/** A credit amount: a decimal with up to 8 places, text end to end. */
const AMOUNT = /^\d{1,16}(\.\d{1,8})?$/;
const SIGNED = /^-?\d{1,16}(\.\d{1,8})?$/;

const isZero = (value: string): boolean => !/[1-9]/.test(value);
const reason = z.string().trim().min(3, 'Say why, in at least 3 characters').max(500, 'Keep the reason under 500 characters');

export const grantSchema = z.object({
  source: z.enum(['plan_included', 'admin_grant']),
  amount: z.string().trim().regex(AMOUNT, 'Enter a number with up to 8 decimal places').refine((value) => !isZero(value), 'The amount must be more than zero'),
  label: z.string().trim().max(120, 'Keep the label under 120 characters'),
  expiresAt: z.string().trim(),
  reason,
});

export const adjustSchema = z.object({
  bucketId: z.string().min(1, 'Choose a bucket'),
  amount: z.string().trim().regex(SIGNED, 'Enter a number, with a minus to take credit away, up to 8 decimal places').refine((value) => !isZero(value), 'The amount cannot be zero'),
  reason,
});

export const reverseSchema = z.object({ reason });

export const policySchema = z
  .object({
    mode: z.enum(['off', 'observe', 'enforce']),
    creditsPerCostUnit: z.string().trim(),
    costCurrency: z.string().trim(),
    markupPercent: z.string().trim(),
    rounding: z.enum(['half_up', 'up', 'down']),
    estimateCharsPerToken: z.string().trim().regex(/^\d{1,2}(\.\d{1,2})?$/, 'Enter a number with up to 2 decimal places').refine((value) => Number(value) >= 1 && Number(value) <= 10, 'Between 1 and 10'),
    reservationTtlSeconds: z.string().trim().regex(/^\d{1,5}$/, 'Enter whole seconds').refine((value) => Number(value) >= 30 && Number(value) <= 86_400, 'Between 30 and 86400 seconds'),
  })
  .superRefine((value, context) => {
    const decided = [value.creditsPerCostUnit, value.costCurrency, value.markupPercent].filter((entry) => entry !== '').length;
    if (decided !== 0 && decided !== 3) context.addIssue({ code: 'custom', path: ['creditsPerCostUnit'], message: 'Set the rate, the currency and the markup together, or leave all three empty' });
    if (value.creditsPerCostUnit !== '' && (!/^\d{1,16}(\.\d{1,8})?$/.test(value.creditsPerCostUnit) || isZero(value.creditsPerCostUnit))) context.addIssue({ code: 'custom', path: ['creditsPerCostUnit'], message: 'The rate must be more than zero, with up to 8 decimal places' });
    if (value.costCurrency !== '' && !/^[A-Z]{3}$/.test(value.costCurrency)) context.addIssue({ code: 'custom', path: ['costCurrency'], message: 'Use a three-letter upper-case code such as USD' });
    if (value.markupPercent !== '' && (!/^\d{1,5}(\.\d{1,4})?$/.test(value.markupPercent) || Number(value.markupPercent) > 10_000)) context.addIssue({ code: 'custom', path: ['markupPercent'], message: 'A percentage up to 10000, with up to 4 decimal places (0 for no markup)' });
    if (value.mode !== 'off' && decided !== 3) context.addIssue({ code: 'custom', path: ['mode'], message: 'Set the conversion before turning credits on' });
  });

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
