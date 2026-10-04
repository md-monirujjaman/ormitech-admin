import axios from 'axios';

interface ApiErrorEnvelope {
  success?: boolean;
  message?: unknown;
  error?: { code?: unknown; details?: unknown };
}

/** `details` on a validation error: one entry per field, each with the messages for it. */
function firstFieldMessage(details: unknown): string | null {
  if (!Array.isArray(details)) return null;
  for (const entry of details) {
    const messages = (entry as { messages?: unknown })?.messages;
    if (Array.isArray(messages) && typeof messages[0] === 'string') return messages[0];
  }
  return null;
}

/**
 * The message `ormitech-api` sent, when it sent one.
 *
 * Its error envelope is `{ success: false, message, error: { code, details? } }`, and that message is written
 * for the person reading it — "The current password is incorrect" is more use than "Request failed with
 * status code 400". A validation failure carries the field detail instead, because "Validation failed" alone
 * does not say which field. Anything else (no response, a proxy's HTML, a thrown value that is not an error)
 * falls back to the caller's wording rather than showing whatever the network layer happened to say.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  // No response at all: the API is unreachable, which is worth distinguishing from a refusal.
  if (!error.response) return 'The OrmiTech API could not be reached.';

  const payload = error.response.data as ApiErrorEnvelope | undefined;
  const detail = firstFieldMessage(payload?.error?.details);
  if (detail) return detail;

  const message = payload?.message;
  if (typeof message === 'string' && message.trim()) return message;

  return fallback;
}
