import type { MonitoringAttention } from '@/types/monitoring';
import type { Tone } from './components/StatusPill';

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** "45s", "7m 5s", "2h 10m", "3d 4h" — how long something has been waiting. */
export function formatAge(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

/** "webhook-events" → "Webhook events", "ai-replies" → "AI replies". */
export function queueLabel(name: string): string {
  const spaced = name.replace(/[-_]+/g, ' ').trim().replace(/\bai\b/g, 'AI');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const ATTENTION_TEXT: Record<string, string> = {
  redis_unreachable: 'Redis cannot be reached',
  redis_settings_unreadable: "Redis answers, but its settings could not be read",
  redis_eviction_policy_unsafe: 'Redis may delete queued jobs when memory is full (its eviction policy is not noeviction)',
  redis_persistence_off: 'Redis keeps nothing on disk, so a restart loses every queued job',
  redis_evicted_keys: 'Redis has already evicted keys to free memory',
  redis_memory_high: 'Redis memory is nearly at its limit',
  queue_backlog: 'is falling behind',
  queue_failed_jobs: 'has failed jobs',
  outbox_stuck: 'Some outbox rows are well past the time they should have been picked up',
  outbox_backlog: 'The outbox is falling behind',
  outbox_unreadable: 'The outbox could not be read',
  outbox_failed_rows: 'The outbox has failed rows',
};

/** One line for a finding the API raised. A code this screen has not heard of is shown as it came, not hidden. */
export function attentionText(item: MonitoringAttention): string {
  const text = ATTENTION_TEXT[item.code] ?? item.code.replace(/_/g, ' ');
  return item.queue ? `${queueLabel(item.queue)} ${text}` : text;
}

export const AREA_LABEL: Record<MonitoringAttention['area'], string> = { redis: 'Redis', queues: 'Queues', outbox: 'Outbox' };

/** A boolean setting the server may not have reported: on / off / unknown. */
export function onOff(value: boolean | null | undefined): { label: string; tone: Tone } {
  return value === null || value === undefined ? { label: 'Unknown', tone: 'muted' } : value ? { label: 'On', tone: 'ok' } : { label: 'Off', tone: 'warn' };
}
