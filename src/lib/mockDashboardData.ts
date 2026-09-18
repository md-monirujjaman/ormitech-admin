import type { ActivityEvent, DashboardStat, SystemServiceStatus } from '@/types/admin';

/**
 * Phase 1 dashboard data. Every value below is hand-written mock data, not a snapshot of anything real — there
 * is no production organization, subscription or usage data behind these numbers. Swapping to live data later
 * means replacing these constants with `useQuery` calls against `systemApi`/`organizationsApi`/etc.
 * (`api/adminApi.ts`); every chart and card below is already written against the same shapes those would return.
 */

export const DASHBOARD_STATS: DashboardStat[] = [
  { id: 'total-organizations', label: 'Total Organizations', value: '482', change: { value: '+6.1%', direction: 'up' } },
  { id: 'active-organizations', label: 'Active Organizations', value: '417', change: { value: '+3.4%', direction: 'up' } },
  { id: 'total-users', label: 'Total Users', value: '9,842', change: { value: '+2.8%', direction: 'up' } },
  { id: 'active-subscriptions', label: 'Active Subscriptions', value: '398', change: { value: '+1.2%', direction: 'up' } },
  { id: 'monthly-revenue', label: 'Monthly Revenue', value: '$128,450', change: { value: '+8.9%', direction: 'up' } },
  { id: 'messages-today', label: 'Messages Today', value: '54,203', change: { value: '-2.1%', direction: 'down' } },
  { id: 'ai-conversations', label: 'AI Conversations', value: '12,904', change: { value: '+11.4%', direction: 'up' } },
  { id: 'api-requests', label: 'API Requests', value: '1.84M', change: { value: '+4.7%', direction: 'up' } },
];

export const ORGANIZATIONS_GROWTH = [
  { month: 'Feb', organizations: 268 },
  { month: 'Mar', organizations: 301 },
  { month: 'Apr', organizations: 334 },
  { month: 'May', organizations: 362 },
  { month: 'Jun', organizations: 389 },
  { month: 'Jul', organizations: 411 },
  { month: 'Aug', organizations: 448 },
  { month: 'Sep', organizations: 482 },
];

export const MESSAGES_VOLUME = [
  { day: 'Mon', messages: 48200 },
  { day: 'Tue', messages: 51900 },
  { day: 'Wed', messages: 49750 },
  { day: 'Thu', messages: 55300 },
  { day: 'Fri', messages: 58100 },
  { day: 'Sat', messages: 39400 },
  { day: 'Sun', messages: 33800 },
];

export const AI_USAGE = [
  { day: 'Mon', conversations: 1580 },
  { day: 'Tue', conversations: 1720 },
  { day: 'Wed', conversations: 1690 },
  { day: 'Thu', conversations: 1890 },
  { day: 'Fri', conversations: 2050 },
  { day: 'Sat', conversations: 1410 },
  { day: 'Sun', conversations: 1204 },
];

export const SUBSCRIPTION_DISTRIBUTION = [
  { plan: 'Starter', value: 168 },
  { plan: 'Growth', value: 142 },
  { plan: 'Scale', value: 71 },
  { plan: 'Enterprise', value: 17 },
];

export const API_USAGE = [
  { hour: '00:00', requests: 42000 },
  { hour: '04:00', requests: 28500 },
  { hour: '08:00', requests: 61200 },
  { hour: '12:00', requests: 88900 },
  { hour: '16:00', requests: 94300 },
  { hour: '20:00', requests: 73100 },
];

export const RECENT_ACTIVITY: ActivityEvent[] = [
  { id: '1', type: 'organization', title: 'New organization registered', description: 'Northwind Logistics signed up on the Growth plan.', createdAt: '2026-09-16T08:12:00Z' },
  { id: '2', type: 'subscription', title: 'Subscription changed', description: 'Acme Retail upgraded from Starter to Scale.', createdAt: '2026-09-16T07:48:00Z' },
  { id: '3', type: 'channel', title: 'Channel connected', description: 'Bright Dental connected a WhatsApp Business number.', createdAt: '2026-09-16T06:55:00Z' },
  { id: '4', type: 'ai', title: 'AI usage limit reached', description: 'Coastal Realty hit its monthly AI conversation limit.', createdAt: '2026-09-15T22:10:00Z' },
  { id: '5', type: 'docs', title: 'Documentation updated', description: '"Webhooks" reference page updated on ormitech-docs.', createdAt: '2026-09-15T19:32:00Z' },
  { id: '6', type: 'settings', title: 'Platform setting changed', description: 'Default trial length changed from 14 to 21 days.', createdAt: '2026-09-15T16:05:00Z' },
];

export const SYSTEM_STATUSES: SystemServiceStatus[] = [
  { id: 'api', label: 'API', status: 'operational', latencyMs: 84, checkedAt: '2026-09-16T09:00:00Z' },
  { id: 'database', label: 'Database', status: 'operational', latencyMs: 12, checkedAt: '2026-09-16T09:00:00Z' },
  { id: 'redis', label: 'Redis', status: 'operational', latencyMs: 3, checkedAt: '2026-09-16T09:00:00Z' },
  { id: 'socket', label: 'Socket Service', status: 'degraded', latencyMs: 410, message: 'Elevated reconnect rate', checkedAt: '2026-09-16T09:00:00Z' },
  { id: 'webhooks', label: 'Webhook Processing', status: 'operational', latencyMs: 156, checkedAt: '2026-09-16T09:00:00Z' },
  { id: 'ai', label: 'AI Service', status: 'operational', latencyMs: 620, checkedAt: '2026-09-16T09:00:00Z' },
];
