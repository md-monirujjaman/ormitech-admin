import { z } from 'zod';

/** A price: a non-negative decimal with at most 8 places, no more than a million per million tokens. Kept as text. */
const PRICE = /^\d{1,10}(\.\d{1,8})?$/;
export const priceTooLarge = (value: string): boolean => {
  const [whole = '0', fraction = ''] = value.split('.');
  return Number(whole) > 1_000_000 || (Number(whole) === 1_000_000 && /[1-9]/.test(fraction));
};

const price = (label: string) =>
  z
    .string()
    .trim()
    .regex(PRICE, `${label} must be a number with up to 8 decimal places`)
    .refine((value) => !priceTooLarge(value), `${label} cannot be more than 1000000`);

export const CAPABILITIES = ['chat', 'vision', 'json_output', 'audio'] as const;
export const CAPABILITY_LABELS: Record<(typeof CAPABILITIES)[number], string> = { chat: 'Chat', vision: 'Vision (reads pictures)', json_output: 'JSON output', audio: 'Audio (listens to voice messages)' };

/** OpenRouter names a model `author/slug`, with an optional `:variant` (for example `:free`). The API checks the same pattern. */
export const OPENROUTER_MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*(:[A-Za-z0-9._-]+)?$/;

export const createModelSchema = z.object({
  modelId: z
    .string()
    .trim()
    .min(1, "Enter OpenRouter's model id, for example vendor/model-name")
    .max(120)
    .regex(OPENROUTER_MODEL_ID, 'Use the OpenRouter id: author/model-name, with an optional :variant (letters, digits and . _ - only)'),
  displayName: z.string().trim().min(1, 'Enter a display name').max(100),
  description: z.string().trim().max(500),
  contextWindow: z.union([z.literal(''), z.string().trim().regex(/^\d{1,9}$/, 'Enter a whole number of tokens').refine((v) => Number(v) >= 1 && Number(v) <= 100_000_000, 'Between 1 and 100000000')]),
  capabilities: z.array(z.enum(CAPABILITIES)).min(1, 'Choose at least one capability'),
});

export const updateModelSchema = createModelSchema.omit({ modelId: true });

export const pricingSchema = z
  .object({
    inputPerMillion: price('The input price'),
    outputPerMillion: price('The output price'),
    cachedInputPerMillion: z.union([z.literal(''), price('The cached input price')]),
    currency: z.string().trim().regex(/^[A-Z]{3}$/, 'Use a three-letter upper-case code such as USD'),
    note: z.string().trim().max(300, 'Keep the note under 300 characters'),
  })
  .strict();

export type CreateModelForm = z.infer<typeof createModelSchema>;
export type UpdateModelForm = z.infer<typeof updateModelSchema>;
export type PricingForm = z.infer<typeof pricingSchema>;

/** The first problem in a failed parse, per field, for showing under the field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
