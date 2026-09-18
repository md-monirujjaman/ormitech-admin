import { z } from 'zod';

/** A limit is always one of the three states — the form can't produce an ambiguous "0 means unlimited" value. */
export const limitValueSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('disabled') }),
  z.object({ kind: z.literal('limited'), value: z.number().int().min(0, 'Must be zero or more') }),
  z.object({ kind: z.literal('unlimited') }),
]);

export const entitlementOverridesSchema = z.object({
  features: z.record(z.string(), z.boolean()),
  channels: z.record(z.string(), z.boolean()),
  limits: z.record(z.string(), limitValueSchema),
});

export const organizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only'),
  ownerName: z.string().min(2, 'Owner name is required').max(80),
  ownerEmail: z.string().min(1, 'Owner email is required').email('Enter a valid email address'),
  status: z.enum(['ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED', 'PENDING']),
  planId: z.string().min(1, 'Select a plan'),
});

export type OrganizationFormValues = z.infer<typeof organizationSchema>;

export const organizationUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  role: z.enum(['owner', 'admin', 'agent', 'viewer']),
  status: z.enum(['active', 'invited', 'disabled']),
});

export type OrganizationUserFormValues = z.infer<typeof organizationUserSchema>;

export const aiConfigurationSchema = z.object({
  aiEnabled: z.boolean(),
  aiBotEnabled: z.boolean(),
  humanHandoverEnabled: z.boolean(),
  conversationLimit: limitValueSchema,
  messageLimit: limitValueSchema,
  model: z.string().nullable(),
  systemPrompt: z.string().max(4000, 'System prompt is limited to 4000 characters'),
});

export type AiConfigurationFormValues = z.infer<typeof aiConfigurationSchema>;
