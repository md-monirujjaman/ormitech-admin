import { z } from 'zod';
import { limitValueSchema } from '@/features/organizations/schemas';

export const planSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only'),
  description: z.string().min(1, 'Description is required').max(280),
  price: z.number().min(0, 'Price cannot be negative'),
  currency: z.string().regex(/^[A-Za-z]{3}$/, 'Use a 3-letter currency code'),
  billingInterval: z.enum(['monthly', 'yearly']),
  status: z.enum(['active', 'draft', 'archived']),
  custom: z.boolean(),
  features: z.record(z.string(), z.boolean()),
  channels: z.record(z.string(), z.boolean()),
  limits: z.record(z.string(), limitValueSchema),
});

export type PlanFormValues = z.infer<typeof planSchema>;
