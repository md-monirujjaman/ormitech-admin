import type { DeliveryStatus, EmailCategory, TemplateSummary } from '../types';

export type TemplateStatus = 'disabled' | 'draft' | 'published' | 'builtin';

/**
 * What an administrator should see first about a template. A draft is work in progress whatever else is true, but a disabled template
 * is the thing that changes what customers receive, so it comes first.
 */
export function templateStatuses(template: Pick<TemplateSummary, 'enabled' | 'hasDraft' | 'publishedVersion'>): TemplateStatus[] {
  const out: TemplateStatus[] = [];
  if (!template.enabled) out.push('disabled');
  if (template.hasDraft) out.push('draft');
  if (template.publishedVersion !== null) out.push('published');
  if (out.length === 0 || (out.length === 1 && out[0] === 'disabled')) out.push('builtin');
  return out;
}

export const STATUS_LABEL: Record<TemplateStatus, string> = {
  disabled: 'Disabled',
  draft: 'Draft',
  published: 'Published',
  builtin: 'Built-in',
};

export const CATEGORY_LABEL: Record<EmailCategory, string> = {
  authentication: 'Authentication',
  security: 'Security',
  team: 'Team',
  support: 'Support',
  billing: 'Billing',
};

export const DELIVERY_LABEL: Record<DeliveryStatus, string> = { sent: 'Sent', queued: 'Queued', failed: 'Failed' };

/** Plain words for the short codes the API logs (never the provider's own text). */
export const ERROR_CODE_LABEL: Record<string, string> = {
  timeout: 'The mail server did not answer in time',
  connection: 'Could not connect to the mail server',
  deferred: 'The mail server asked to try later',
  provider_error: 'The mail server refused the message',
  rejected: 'The recipient address was rejected',
  auth: 'The mail server refused the sign-in',
  not_configured: 'Mail is not configured on this server',
  unknown: 'Unknown error',
  log_unavailable: 'The delivery log could not be written',
  undecryptable: 'The queued message could not be opened',
  render_failed: 'The template could not be rendered',
  unknown_template: 'Unknown template',
};

export const errorCodeLabel = (code: string | null): string => (code ? (ERROR_CODE_LABEL[code] ?? code) : '');

/** What the search box matches: the name, the key and the category's label, ignoring case. */
export const matchesSearch = (template: Pick<TemplateSummary, 'name' | 'key' | 'category'>, search: string): boolean => {
  const needle = search.trim().toLowerCase();
  return !needle || [template.name, template.key, CATEGORY_LABEL[template.category]].some((text) => text.toLowerCase().includes(needle));
};

