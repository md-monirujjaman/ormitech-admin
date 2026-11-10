import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { apiFailure, ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import ServerHealth from '@/pages/ServerHealth';
import { useAuthStore } from '@/store/authStore';
import type { MonitoringSnapshot } from '@/types/monitoring';
import { formatAge, formatBytes, queueLabel } from '../format';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn() }, setAccessToken: vi.fn(), setUnauthorizedHandler: vi.fn() }));
const http = axiosClient as unknown as Record<'get', Mock>;

const QUEUES = ['webhook-events', 'ai-replies', 'outgoing-messages', 'ai-follow-ups', 'token-health-checks', 'ai-contact-wait', 'lead-detection', 'gmail-sync', 'support-ai', 'support-notify', 'courier-dispatch'];

const snapshot = (overrides: Partial<MonitoringSnapshot> = {}): MonitoringSnapshot => ({
  checkedAt: '2026-11-10T10:00:00.000Z',
  needsAttention: false,
  attention: [],
  redis: {
    status: 'up',
    responseTimeMs: 3,
    configuration: { maxmemoryPolicy: 'noeviction', appendonly: true, snapshots: true, evictionSafe: true, persistenceOn: true },
    memory: { usedBytes: 52_428_800, maxBytes: 268_435_456, evictedKeys: 0 },
  },
  queues: { status: 'ok', items: QUEUES.map((queue) => ({ queue, waiting: 0, active: 0, delayed: 0, failed: 0, oldestWaitingAgeSeconds: null })) },
  outbox: { enabled: true, status: 'ok', counts: { pending: 2, enqueued: 1, processing: 0, failed: 0, done: 120 }, oldestPendingAgeSeconds: 12, stuck: 0 },
  ...overrides,
});

const signIn = (roles: Array<'SUPER_ADMIN' | 'ADMIN'>) =>
  useAuthStore.setState({ admin: { id: 'a1', name: 'Test Admin', email: 'a@example.test', roles, permissions: ['system.read'], createdAt: '2026-01-01T00:00:00.000Z' }, isAuthenticated: true });

beforeEach(() => signIn(['SUPER_ADMIN']));
afterEach(() => {
  vi.useRealTimers();
  useAuthStore.setState({ admin: null, isAuthenticated: false });
});

describe('System health with a successful answer', () => {
  it('asks the monitoring endpoint through the admin API client, and shows every section', async () => {
    http.get.mockResolvedValue(ok(snapshot()));
    renderWithClient(<ServerHealth />);

    expect(await screen.findByText('Nothing needs attention')).toBeTruthy();
    expect(http.get).toHaveBeenCalledWith('/admin/monitoring');

    // Redis
    expect(screen.getByText('Connected')).toBeTruthy();
    expect(screen.getByText('noeviction')).toBeTruthy();
    expect(screen.getByText('Safe')).toBeTruthy();
    expect(screen.getByText('AOF on · Snapshots on')).toBeTruthy();
    expect(screen.getByText('50.0 MB')).toBeTruthy();
    expect(screen.getByText('of 256 MB')).toBeTruthy();
    expect(screen.getByText('Evicted keys').nextSibling?.textContent).toBe('0');

    // Every queue the API reports, not a fixed list
    for (const queue of QUEUES) expect(screen.getByText(queueLabel(queue))).toBeTruthy();
    expect(screen.getByText('11 background queues, as of the last check.')).toBeTruthy();
    expect(screen.getAllByRole('row')).toHaveLength(QUEUES.length + 1);

    // Outbox
    expect(screen.getByText('Enabled')).toBeTruthy();
    expect(screen.getByText('Oldest pending').nextSibling?.textContent).toBe('12s');
    expect(screen.getByText('Done').nextSibling?.textContent).toBe('120');
  });

  it('flags the queue that is behind and the one with failed jobs, and lists what needs attention', async () => {
    const items = QUEUES.map((queue) => ({ queue, waiting: 0, active: 0, delayed: 0, failed: 0, oldestWaitingAgeSeconds: null as number | null }));
    items[1] = { ...items[1]!, waiting: 900, oldestWaitingAgeSeconds: 640 };
    items[2] = { ...items[2]!, failed: 4 };
    http.get.mockResolvedValue(
      ok(
        snapshot({
          needsAttention: true,
          attention: [
            { area: 'queues', code: 'queue_backlog', queue: 'ai-replies' },
            { area: 'queues', code: 'queue_failed_jobs', queue: 'outgoing-messages' },
          ],
          queues: { status: 'backlog', items },
        }),
      ),
    );
    renderWithClient(<ServerHealth />);

    expect(await screen.findByText('2 things need attention')).toBeTruthy();
    expect(screen.getByText('AI replies is falling behind')).toBeTruthy();
    expect(screen.getByText('Outgoing messages has failed jobs')).toBeTruthy();
    expect(screen.getAllByText('Backlog')).toHaveLength(2); // the queue's own pill and the card's
    const aiRow = screen.getByText('AI replies', { selector: 'td' }).closest('tr')!;
    expect(aiRow.textContent).toContain('900');
    expect(aiRow.textContent).toContain('10m 40s');
    expect(aiRow.textContent).toContain('Backlog');
    const outRow = screen.getByText('Outgoing messages', { selector: 'td' }).closest('tr')!;
    expect(outRow.textContent).toContain('Failed jobs');
    expect(screen.getByText('Webhook events', { selector: 'td' }).closest('tr')!.textContent).toContain('Healthy');
  });

  it('says so when Redis is unreachable, and still shows the outbox, which lives in PostgreSQL', async () => {
    http.get.mockResolvedValue(
      ok(
        snapshot({
          needsAttention: true,
          attention: [{ area: 'redis', code: 'redis_unreachable' }],
          redis: { status: 'unavailable', responseTimeMs: null, configuration: null, memory: null },
          queues: { status: 'unavailable', items: [] },
        }),
      ),
    );
    renderWithClient(<ServerHealth />);

    expect(await screen.findByText('Redis cannot be reached')).toBeTruthy();
    expect(screen.getByText('Unreachable')).toBeTruthy();
    expect(screen.getByText('Redis did not answer, so its settings and memory cannot be shown.')).toBeTruthy();
    expect(screen.getByText('Queue statistics are unavailable')).toBeTruthy();
    expect(screen.getByText('Job outbox')).toBeTruthy();
    expect(screen.getByText('Pending').nextSibling?.textContent).toBe('2');
  });

  it('says so when Redis is not configured', async () => {
    http.get.mockResolvedValue(ok(snapshot({ redis: { status: 'not_configured', responseTimeMs: null, configuration: null, memory: null }, queues: { status: 'not_configured', items: [] } })));
    renderWithClient(<ServerHealth />);
    expect(await screen.findByText('Redis is not configured for this deployment.')).toBeTruthy();
    expect(screen.getByText('Queues are not configured')).toBeTruthy();
  });

  it('shows unsafe Redis settings and lost keys as problems', async () => {
    http.get.mockResolvedValue(
      ok(
        snapshot({
          redis: {
            status: 'up',
            responseTimeMs: 4,
            configuration: { maxmemoryPolicy: 'allkeys-lru', appendonly: false, snapshots: false, evictionSafe: false, persistenceOn: false },
            memory: { usedBytes: 250_000_000, maxBytes: 268_435_456, evictedKeys: 17 },
          },
        }),
      ),
    );
    renderWithClient(<ServerHealth />);
    expect(await screen.findByText('allkeys-lru')).toBeTruthy();
    expect(screen.getByText('Unsafe')).toBeTruthy();
    expect(screen.getByText('AOF off · Snapshots off')).toBeTruthy();
    expect(screen.getByText('Keys lost')).toBeTruthy();
    expect(screen.getByText('Evicted keys').nextSibling?.textContent).toContain('17');
  });

  it('shows the outbox switched off, and switched on with stuck rows', async () => {
    http.get.mockResolvedValue(ok(snapshot({ outbox: { enabled: false, status: 'off', counts: { pending: 0, enqueued: 0, processing: 0, failed: 0, done: 0 }, oldestPendingAgeSeconds: null, stuck: 0 } })));
    const first = renderWithClient(<ServerHealth />);
    expect(await screen.findByText('Disabled')).toBeTruthy();
    expect(screen.getByText('Off, nothing waiting')).toBeTruthy();
    expect(screen.getByText('Nothing pending')).toBeTruthy();
    first.unmount();

    http.get.mockResolvedValue(
      ok(
        snapshot({
          needsAttention: true,
          attention: [{ area: 'outbox', code: 'outbox_stuck' }],
          outbox: { enabled: true, status: 'stuck', counts: { pending: 9, enqueued: 0, processing: 3, failed: 2, done: 40 }, oldestPendingAgeSeconds: 4000, stuck: 5 },
        }),
      ),
    );
    renderWithClient(<ServerHealth />);
    expect(await screen.findByText('Enabled')).toBeTruthy();
    expect(screen.getAllByText('Stuck')).toHaveLength(2); // the outbox's status and the stuck-rows flag
    expect(screen.getByText('Oldest pending').nextSibling?.textContent).toBe('1h 6m');
    expect(screen.getByText('Some outbox rows are well past the time they should have been picked up')).toBeTruthy();
  });
});

describe('System health when the request does not succeed', () => {
  it('shows a loading state until the first answer', () => {
    http.get.mockReturnValue(new Promise(() => undefined));
    renderWithClient(<ServerHealth />);
    expect(screen.getByRole('status', { name: 'Loading monitoring status' })).toBeTruthy();
  });

  it('shows the API error with a retry that asks again', async () => {
    http.get.mockRejectedValue(apiFailure(500, 'Monitoring is not available right now.'));
    renderWithClient(<ServerHealth />);
    // The hook retries a failed request once, after a second, before it gives up.
    expect(await screen.findByText("Couldn't load monitoring status", {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByText('Monitoring is not available right now.')).toBeTruthy();

    http.get.mockResolvedValue(ok(snapshot()));
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Nothing needs attention')).toBeTruthy();
  });

  it('says the API could not be reached when there is no answer at all', async () => {
    http.get.mockRejectedValue(Object.assign(new Error('Network Error'), { isAxiosError: true }));
    renderWithClient(<ServerHealth />);
    expect(await screen.findByText('The OrmiTech API could not be reached.', {}, { timeout: 4000 })).toBeTruthy();
  });

  it('answers 403 with "super admins only" and stops asking', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    http.get.mockRejectedValue(apiFailure(403, 'Insufficient role'));
    renderWithClient(<ServerHealth />);
    expect(await screen.findByText('Super admins only')).toBeTruthy();
    expect(http.get).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Redis')).toBeNull();
  });

  it('answers 401 with "your session has ended"', async () => {
    http.get.mockRejectedValue(apiFailure(401, 'Authentication required'));
    renderWithClient(<ServerHealth />);
    expect(await screen.findByText('Your session has ended')).toBeTruthy();
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('does not even ask when the signed-in role is not super admin (the API would refuse and record it)', async () => {
    signIn(['ADMIN']);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderWithClient(<ServerHealth />);
    expect(await screen.findByText('Super admins only')).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(90_000);
    });
    expect(http.get).not.toHaveBeenCalled();
  });
});

describe('refreshing', () => {
  it('asks again every 30 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    http.get.mockResolvedValue(ok(snapshot()));
    renderWithClient(<ServerHealth />);
    expect(await screen.findByText('Nothing needs attention')).toBeTruthy();
    expect(http.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29_000);
    });
    expect(http.get).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500);
    });
    expect(http.get).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(http.get).toHaveBeenCalledTimes(3);
  });

  it('picks up a change on the next refresh', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    http.get.mockResolvedValueOnce(ok(snapshot()));
    http.get.mockResolvedValue(ok(snapshot({ needsAttention: true, attention: [{ area: 'redis', code: 'redis_evicted_keys' }] })));
    renderWithClient(<ServerHealth />);
    expect(await screen.findByText('Nothing needs attention')).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_500);
    });
    expect(await screen.findByText('Redis has already evicted keys to free memory')).toBeTruthy();
  });

  it('keeps the last good check on screen, and says so, when a refresh fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    http.get.mockResolvedValueOnce(ok(snapshot()));
    http.get.mockRejectedValue(apiFailure(500, 'Monitoring is not available right now.'));
    renderWithClient(<ServerHealth />);
    expect(await screen.findByText('Nothing needs attention')).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
    });
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('The last refresh failed');
    expect(screen.getByText('Nothing needs attention')).toBeTruthy();
  });

  it('has a manual refresh', async () => {
    http.get.mockResolvedValue(ok(snapshot()));
    renderWithClient(<ServerHealth />);
    await screen.findByText('Nothing needs attention');
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
  });
});

describe('what the screen will and will not show', () => {
  it('shows only the fields it knows: an extra field in the answer never reaches the page', async () => {
    const leaky = { ...snapshot(), redisUrl: 'redis://default:hunter2@10.0.0.5:6379', jobs: [{ data: { customerName: 'Rina Akter', phone: '01712345678' } }] };
    leaky.redis = { ...leaky.redis, host: '10.0.0.5' } as typeof leaky.redis;
    http.get.mockResolvedValue(ok(leaky));
    renderWithClient(<ServerHealth />);
    await screen.findByText('Nothing needs attention');
    const text = document.body.textContent ?? '';
    for (const secret of ['hunter2', '10.0.0.5', 'redis://', 'Rina', '01712345678']) expect(text).not.toContain(secret);
  });

  it('never reads mock data: the page and everything under features/monitoring import none', () => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => (statSync(path.join(dir, name)).isDirectory() && name !== '__tests__' ? files(path.join(dir, name)) : name.endsWith('.ts') || name.endsWith('.tsx') ? [path.join(dir, name)] : []));
    const sources = [...files(path.resolve(__dirname, '..')), path.resolve(__dirname, '../../../pages/ServerHealth.tsx'), path.resolve(__dirname, '../../../api/monitoringApi.ts')];
    expect(sources.length).toBeGreaterThan(8);
    for (const file of sources) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/mockDashboardData|mockDataSource|@\/mocks|SYSTEM_STATUSES|MockDataNotice|isMockDataSource/);
    }
  });
});

describe('formatting', () => {
  it('formats sizes and ages', () => {
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(268_435_456)).toBe('256 MB');
    expect(queueLabel('ai-follow-ups')).toBe('AI follow ups');
    expect(queueLabel('courier-dispatch')).toBe('Courier dispatch');
    expect(formatAge(null)).toBe('—');
    expect(formatAge(45)).toBe('45s');
    expect(formatAge(425)).toBe('7m 5s');
    expect(formatAge(7_800)).toBe('2h 10m');
    expect(formatAge(273_600)).toBe('3d 4h');
  });
});
