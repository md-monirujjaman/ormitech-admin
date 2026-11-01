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

export const CAPABILITIES = ['chat', 'vision', 'json_output'] as const;
export const CAPABILITY_LABELS: Record<(typeof CAPABILITIES)[number], string> = { chat: 'Chat', vision: 'Vision (reads pictures)', json_output: 'JSON output' };

/** The same rule the API applies to an address that will receive an API key. The API checks it again. */
export const providerUrlSchema = z
  .string()
  .trim()
  .max(200, 'The address is too long')
  .superRefine((value, context) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return context.addIssue({ code: 'custom', message: 'Enter a full address such as https://api.openai.com/v1' });
    }
    if (url.protocol !== 'https:') return context.addIssue({ code: 'custom', message: 'The address must use https' });
    if (url.username || url.password) return context.addIssue({ code: 'custom', message: 'The address must not contain a user name or password' });
    if (url.search || url.hash) return context.addIssue({ code: 'custom', message: 'The address must not contain a query or a fragment' });
    if (url.port && url.port !== '443') return context.addIssue({ code: 'custom', message: 'Use the standard https port' });
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    const isAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
    if (isAddress || !host.includes('.') || host === 'localhost' || /\.(local|localhost|internal|intranet|lan|home|corp|test|example|invalid)$/.test(host)) {
      context.addIssue({ code: 'custom', message: 'Use a public host name, not an IP address or an internal name' });
    }
  });

export const apiKeySchema = z
  .string()
  .trim()
  .regex(/^[\x21-\x7E]{20,400}$/, 'An API key is 20 to 400 characters without spaces');

const priority = z
  .number({ invalid_type_error: 'Priority must be a number' })
  .int('Priority must be a whole number')
  .min(0, 'Priority cannot be negative')
  .max(10_000, 'Priority cannot be more than 10000');

export const createProviderSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Enter an identifier')
    .max(40)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lower-case letters, digits and single hyphens, for example openai-main'),
  name: z.string().trim().min(1, 'Enter a name').max(80),
  baseUrl: providerUrlSchema,
  priority,
  /** Optional here; a provider cannot be switched on until it has one. */
  apiKey: z.union([apiKeySchema, z.literal('')]),
});

export const updateProviderSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(80),
  baseUrl: providerUrlSchema,
  priority,
});

export const credentialsSchema = z.object({ apiKey: apiKeySchema });

export const createModelSchema = z.object({
  providerId: z.string().min(1, 'Choose a provider'),
  modelId: z
    .string()
    .trim()
    .min(1, "Enter the provider's model id")
    .max(120)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/, 'Use only letters, digits and . _ : / -'),
  displayName: z.string().trim().min(1, 'Enter a display name').max(100),
  description: z.string().trim().max(500),
  contextWindow: z.union([z.literal(''), z.string().trim().regex(/^\d{1,9}$/, 'Enter a whole number of tokens').refine((v) => Number(v) >= 1 && Number(v) <= 100_000_000, 'Between 1 and 100000000')]),
  capabilities: z.array(z.enum(CAPABILITIES)).min(1, 'Choose at least one capability'),
});

export const updateModelSchema = createModelSchema.omit({ providerId: true, modelId: true });

export const pricingSchema = z
  .object({
    inputPerMillion: price('The input price'),
    outputPerMillion: price('The output price'),
    cachedInputPerMillion: z.union([z.literal(''), price('The cached input price')]),
    currency: z.string().trim().regex(/^[A-Z]{3}$/, 'Use a three-letter upper-case code such as USD'),
    note: z.string().trim().max(300, 'Keep the note under 300 characters'),
  })
  .strict();

export type CreateProviderForm = z.infer<typeof createProviderSchema>;
export type UpdateProviderForm = z.infer<typeof updateProviderSchema>;
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
