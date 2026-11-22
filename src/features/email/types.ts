/** Shapes of `/admin/email` on ormitech-api (super admins only). Nothing here is computed in the browser: the API renders, validates and decides. */

export type EmailCategory = 'authentication' | 'security' | 'team' | 'support' | 'billing';
export type VariableKind = 'text' | 'code' | 'url';
export type DeliveryStatus = 'queued' | 'sent' | 'failed';

export interface TemplateVariable {
  name: string;
  kind: VariableKind;
  description: string;
  /** A made-up value the preview uses. Never a real code or link. */
  sample: string;
  required: boolean;
}

export interface TemplateSource {
  subject: string;
  preheader?: string;
  html: string;
  text: string;
}

export interface TemplateSummary {
  key: string;
  name: string;
  category: EmailCategory;
  /** A sign-in or recovery email: always falls back to the built-in wording if anything goes wrong. */
  critical: boolean;
  variables: TemplateVariable[];
  /** False: the built-in wording is used even when a version is published. */
  enabled: boolean;
  hasDraft: boolean;
  publishedVersion: number | null;
  draftUpdatedAt: string | null;
  updatedAt: string | null;
}

export interface TemplateDetail extends TemplateSummary {
  builtIn: TemplateSource;
  draft: TemplateSource | null;
  published: (TemplateSource & { version: number }) | null;
}

export interface VersionInfo {
  version: number;
  createdAt: string;
  createdBy: string | null;
  restoredFromVersion: number | null;
  note: string | null;
  published: boolean;
}

export type VersionDetail = VersionInfo & TemplateSource;

export interface EmailPreview {
  key: string;
  subject: string;
  html: string;
  text: string;
  /** Parts of an edited template the sanitizer will remove, by name. */
  warnings: string[];
  viewport: 'desktop' | 'mobile';
  frameWidth: number;
}

export type PreviewUse = 'draft' | 'published' | 'builtin';

export interface PreviewRequest {
  variables?: Record<string, string>;
  draft?: TemplateSource;
  use?: PreviewUse;
  viewport?: 'desktop' | 'mobile';
}

export interface TestSendResult {
  status: 'sent' | 'queued' | 'failed' | 'duplicate';
  logId: string | null;
  errorCode?: string;
}

export interface Branding {
  productName: string;
  logoUrl: string | null;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  headerTagline: string;
  footerLines: string[];
  /** False: nobody has saved a look yet and these are the built-in values. */
  custom: boolean;
}

export type BrandingInput = Omit<Branding, 'custom'>;

export interface DeliveryLog {
  id: string;
  templateKey: string;
  versionId: string | null;
  /** Masked by the API (ta***@example.com). */
  recipient: string;
  status: DeliveryStatus;
  delivery: 'inline' | 'queued';
  attempts: number;
  errorCode: string | null;
  isTest: boolean;
  /** Whether the queue may still hold the message, so Retry can work. */
  retryable: boolean;
  createdAt: string;
  sentAt: string | null;
}

export interface DeliveryPage {
  items: DeliveryLog[];
  next: string | null;
}

export interface DeliveryQuery {
  status?: DeliveryStatus;
  template?: string;
}
