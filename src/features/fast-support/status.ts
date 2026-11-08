import type { SupportStatus } from './types';

export const STATUS_INFO: Record<SupportStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' }> = {
  waiting_for_moderator: { label: 'Waiting for a moderator', variant: 'warning' },
  assigned: { label: 'Assigned', variant: 'default' },
  ai_troubleshooting: { label: 'AI troubleshooting', variant: 'default' },
  human_active: { label: 'Human active', variant: 'default' },
  waiting_for_customer: { label: 'Waiting for customer', variant: 'secondary' },
  resolved: { label: 'Resolved', variant: 'success' },
  closed: { label: 'Closed', variant: 'outline' },
};

export const formatSeconds = (seconds: number | null): string => {
  if (seconds === null) return '—';
  if (seconds < 90) return `${seconds}s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
};

export const formatWhen = (value: string): string => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
