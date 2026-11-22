import type { Branding, DeliveryLog, TemplateDetail, TemplateSummary, VersionInfo } from '../types';

export const summary = (over: Partial<TemplateSummary> = {}): TemplateSummary => ({
  key: 'team.invitation',
  name: 'Team invitation',
  category: 'team',
  critical: false,
  variables: [
    { name: 'inviter_name', kind: 'text', description: 'Who sent it', sample: 'Rafi Ahmed', required: true },
    { name: 'accept_url', kind: 'url', description: 'The link', sample: 'https://app.example.test/accept?token=SAMPLE-NOT-A-REAL-TOKEN', required: true },
  ],
  enabled: true,
  hasDraft: false,
  publishedVersion: null,
  draftUpdatedAt: null,
  updatedAt: null,
  ...over,
});

export const detail = (over: Partial<TemplateDetail> = {}): TemplateDetail => ({
  ...summary(),
  builtIn: { subject: 'BUILT-IN {{inviter_name}}', preheader: 'pre', html: '<p>Hi {{inviter_name}} <a href="{{accept_url}}">Go</a></p>', text: 'Hi {{inviter_name}} {{accept_url}}' },
  draft: null,
  published: null,
  ...over,
});

export const templates: TemplateSummary[] = [
  summary(),
  summary({ key: 'auth.password_reset', name: 'Password reset link', category: 'authentication', critical: true, publishedVersion: 2, updatedAt: '2026-11-20T10:00:00Z' }),
  summary({ key: 'security.password_changed', name: 'Password was changed', category: 'security', hasDraft: true, draftUpdatedAt: '2026-11-21T10:00:00Z' }),
  summary({ key: 'support.new_request', name: 'New support request', category: 'support', enabled: false, publishedVersion: 1 }),
];

export const versions: VersionInfo[] = [
  { version: 2, createdAt: '2026-11-20T10:00:00Z', createdBy: null, restoredFromVersion: null, note: 'Shorter subject', published: true },
  { version: 1, createdAt: '2026-11-10T10:00:00Z', createdBy: null, restoredFromVersion: null, note: null, published: false },
];

export const branding = (over: Partial<Branding> = {}): Branding => ({
  productName: 'OrmiTech',
  logoUrl: null,
  accentColor: '#4f46e5',
  textColor: '#1f2937',
  backgroundColor: '#f3f4f6',
  fontFamily: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  headerTagline: '',
  footerLines: ['You are receiving this email because of activity on your OrmiTech account.'],
  custom: false,
  ...over,
});

export const log = (over: Partial<DeliveryLog> = {}): DeliveryLog => ({
  id: '018f0000-0000-7000-8000-000000000001',
  templateKey: 'team.invitation',
  versionId: null,
  recipient: 'ta***@example.com',
  status: 'sent',
  delivery: 'inline',
  attempts: 1,
  errorCode: null,
  isTest: false,
  retryable: false,
  createdAt: '2026-11-22T10:00:00Z',
  sentAt: '2026-11-22T10:00:02Z',
  ...over,
});
