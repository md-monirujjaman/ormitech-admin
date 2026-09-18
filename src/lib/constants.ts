/** The only place in the app that reads `import.meta.env` — every Vite env var is public, never a secret. */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  clientUrl: import.meta.env.VITE_CLIENT_URL ?? 'https://ormitech-client.monirujjaman.me',
  docsUrl: import.meta.env.VITE_DOCS_URL ?? 'https://ormitech-docs.monirujjaman.me',
  webUrl: import.meta.env.VITE_WEB_URL ?? 'https://ormitech-web.monirujjaman.me',
} as const;

/**
 * Which `AdminDataSource` backs every admin screen: `mock` (in-memory fixtures, the default while
 * ormitech-api's admin endpoints don't exist) or `api` (real HTTP). See `src/api/dataSource.ts`.
 */
export const adminDataSourceMode = (import.meta.env.VITE_ADMIN_DATA_SOURCE ?? 'mock') as 'mock' | 'api';

export const APP_NAME = 'OrmiTech Admin';

/** Centralized route paths — the sidebar config and <AppRoutes> both read from here so they can't drift apart. */
export const ROUTES = {
  login: '/login',
  forgotPassword: '/forgot-password',
  dashboard: '/dashboard',

  organizations: '/organizations',
  users: '/users',
  conversations: '/conversations',
  leads: '/leads',

  plans: '/plans',
  features: '/features',
  ai: '/ai',
  channels: '/channels',

  billing: '/billing',
  subscriptions: '/subscriptions',
  payments: '/payments',
  invoices: '/invoices',
  usage: '/usage',

  docs: '/docs',
  announcements: '/announcements',

  api: '/api',
  webhooks: '/webhooks',
  integrations: '/integrations',
  systemHealth: '/system-health',
  jobs: '/jobs',

  adminUsers: '/admin-users',
  roles: '/roles',
  auditLogs: '/audit-logs',
  securityEvents: '/security-events',

  settings: '/settings',
  email: '/email',
  notifications: '/notifications',
  featureFlags: '/feature-flags',

  support: '/support',
} as const;
