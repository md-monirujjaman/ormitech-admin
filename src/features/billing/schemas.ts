import { z } from 'zod';
import { limitValueSchema } from '@/features/organizations/schemas';

/** Changing a subscription's lifecycle state. The reason is what a future audit entry would carry. */
export const subscriptionStatusSchema = z.object({
  status: z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED']),
  reason: z.string().max(280, 'Keep the reason under 280 characters').optional(),
});

export type SubscriptionStatusFormValues = z.infer<typeof subscriptionStatusSchema>;

export const invoiceVoidSchema = z.object({
  reason: z.string().min(3, 'Give a reason this invoice is being voided').max(280, 'Keep the reason under 280 characters'),
});

export type InvoiceVoidFormValues = z.infer<typeof invoiceVoidSchema>;

/**
 * A quota setting. `limit` reuses the entitlement model's tagged union, so unlimited stays explicit here too —
 * a quota form can't express "unlimited" as a large number.
 */
export const quotaSettingsSchema = z.object({
  resource: z.string().min(1, 'Pick a resource'),
  period: z.enum(['monthly', 'daily', 'per_conversation', 'per_organization']),
  limit: limitValueSchema,
});

export type QuotaSettingsFormValues = z.infer<typeof quotaSettingsSchema>;

/** Platform billing defaults. Nothing here is a credential — gateway keys live on ormitech-api. */
export const billingSettingsSchema = z.object({
  currency: z.string().regex(/^[A-Za-z]{3}$/, 'Use a 3-letter currency code'),
  invoicePrefix: z
    .string()
    .min(2, 'Prefix must be at least 2 characters')
    .max(10, 'Prefix must be 10 characters or fewer')
    .regex(/^[A-Z0-9-]+$/, 'Use uppercase letters, numbers and hyphens'),
  paymentTermsDays: z.number().int().min(0, 'Cannot be negative').max(120, 'Keep terms within 120 days'),
  trialLengthDays: z.number().int().min(0, 'Cannot be negative').max(90, 'Keep trials within 90 days'),
});

export type BillingSettingsFormValues = z.infer<typeof billingSettingsSchema>;
