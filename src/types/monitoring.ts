/**
 * What `GET /admin/monitoring` returns: counts, ages and settings only. The endpoint never sends a job's data, a customer's
 * words, an identifier, a credential or the Redis address, and none of those has a field here.
 */
export type RedisStatus = 'up' | 'down' | 'not_configured' | 'unavailable';
export type QueuesStatus = 'ok' | 'backlog' | 'unavailable' | 'not_configured';
export type OutboxStatus = 'off' | 'ok' | 'backlog' | 'stuck' | 'unavailable';

export interface MonitoringAttention {
  area: 'redis' | 'queues' | 'outbox';
  code: string;
  queue?: string;
}

export interface RedisMonitoring {
  status: RedisStatus;
  responseTimeMs: number | null;
  configuration: {
    maxmemoryPolicy: string | null;
    appendonly: boolean | null;
    /** Whether RDB snapshots are scheduled. */
    snapshots: boolean | null;
    /** true for noeviction; null when the server would not say. */
    evictionSafe: boolean | null;
    /** true when the append-only file or snapshots are on; null when unknown. */
    persistenceOn: boolean | null;
  } | null;
  memory: { usedBytes: number | null; maxBytes: number | null; evictedKeys: number | null } | null;
}

export interface QueueStats {
  queue: string;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  /** How long the job that has waited longest has been waiting; null when nothing waits. */
  oldestWaitingAgeSeconds: number | null;
}

export interface QueuesMonitoring {
  status: QueuesStatus;
  items: QueueStats[];
}

export interface OutboxMonitoring {
  enabled: boolean;
  status: OutboxStatus;
  counts: { pending: number; enqueued: number; processing: number; failed: number; done: number } | null;
  oldestPendingAgeSeconds: number | null;
  stuck: number | null;
}

export interface MonitoringSnapshot {
  checkedAt: string;
  needsAttention: boolean;
  attention: MonitoringAttention[];
  redis: RedisMonitoring;
  queues: QueuesMonitoring;
  outbox: OutboxMonitoring;
}
