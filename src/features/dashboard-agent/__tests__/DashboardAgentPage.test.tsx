import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import { ROUTES } from '@/lib/constants';
import { findNavMeta } from '@/lib/navigation';
import DashboardAgentPage from '../pages/DashboardAgentPage';
import type { AgentFeedbackPage, AgentOverview } from '../types';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('@/api/dataSource', () => ({ isMockDataSource: false }));
const granted = vi.hoisted(() => ({ list: ['ai_providers.read', 'ai_providers.write'] as string[] }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ can: (permission?: string) => !permission || granted.list.includes(permission) }) }));
vi.mock('@/components/shared/MockDataNotice', () => ({ MockDataNotice: () => null }));
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', Mock>;

const overview = (over: Partial<AgentOverview> = {}): AgentOverview => ({
  primaryRole: null,
  backupRole: null,
  updatedAt: null,
  slots: [
    { role: 'slot1', label: 'Model 1', modelId: 'vendor/fast', ready: true },
    { role: 'slot2', label: 'Model 2', modelId: 'vendor/smart', ready: true },
    { role: 'slot3', label: 'Model 3', modelId: null, ready: false },
    { role: 'slot4', label: 'Model 4', modelId: null, ready: false },
  ],
  stats: { days: 30, answers: 40, thumbsDown: 3, thumbsDownPercent: 7.5, byModel: [{ role: 'slot1', modelId: 'vendor/fast', answers: 40, thumbsDown: 3 }] },
  ...over,
});
const feedback = (over: Partial<AgentFeedbackPage> = {}): AgentFeedbackPage => ({
  items: [{ id: 'f1', createdAt: '2026-11-24T10:00:00.000Z', workspace: 'Rina Fashion', reason: 'wrong_answer', note: 'price is 2500', question: 'dam koto?', answer: 'Your price is 2200.', modelRole: 'slot1', modelId: 'vendor/fast' }],
  next: null,
  ...over,
});

function serve(data: AgentOverview = overview(), page: AgentFeedbackPage = feedback()) {
  http.get.mockImplementation(async (url: string) => ok(url.endsWith('/feedback') ? page : data));
}

describe('the Dashboard Agent page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    granted.list = ['ai_providers.read', 'ai_providers.write'];
    serve();
  });

  it('is in the Product navigation for super admins, on its own route', () => {
    expect(findNavMeta(ROUTES.dashboardAgent)).toEqual({ title: 'Dashboard Agent', section: 'Product' });
  });

  it('shows how answers did and each thumbs down with the workspace, reason, note, question and answer', async () => {
    renderWithClient(<DashboardAgentPage />);
    expect(await screen.findByText('Rina Fashion')).toBeTruthy();
    expect(screen.getByText('Wrong answer')).toBeTruthy();
    expect(screen.getByText('“price is 2500”')).toBeTruthy();
    expect(screen.getByText('dam koto?')).toBeTruthy();
    expect(screen.getByText('Your price is 2200.')).toBeTruthy();
    expect(screen.getAllByText('7.5%').length).toBe(2);
    expect(screen.getAllByText('40').length).toBeGreaterThan(0);
  });

  it('says so when nothing has a thumbs down', async () => {
    serve(overview(), feedback({ items: [] }));
    renderWithClient(<DashboardAgentPage />);
    expect(await screen.findByText('No thumbs down yet')).toBeTruthy();
  });

  it('saves the chosen main and backup models', async () => {
    http.put.mockResolvedValue(ok(overview({ primaryRole: 'slot2', backupRole: 'slot1' })));
    const user = userEvent.setup();
    renderWithClient(<DashboardAgentPage />);
    const save = await screen.findByRole('button', { name: 'Save models' });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole('combobox', { name: 'Main model' }));
    await user.click(await screen.findByRole('option', { name: /Model 2 · vendor\/smart/ }));
    await user.click(screen.getByRole('combobox', { name: 'Backup model' }));
    await user.click(await screen.findByRole('option', { name: /Model 1 · vendor\/fast/ }));
    await user.click(screen.getByRole('button', { name: 'Save models' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/dashboard-agent/models', { primaryRole: 'slot2', backupRole: 'slot1' }));
  });

  it('shows the server\'s reason when a choice is refused', async () => {
    http.put.mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { error: { message: 'Model 2 has no model yet.' } } } });
    const user = userEvent.setup();
    renderWithClient(<DashboardAgentPage />);
    await user.click(await screen.findByRole('combobox', { name: 'Main model' }));
    await user.click(await screen.findByRole('option', { name: /Model 2/ }));
    await user.click(screen.getByRole('button', { name: 'Save models' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('lets someone without write access look but not change', async () => {
    granted.list = ['ai_providers.read'];
    renderWithClient(<DashboardAgentPage />);
    await screen.findByText('Rina Fashion');
    expect(screen.queryByRole('button', { name: 'Save models' })).toBeNull();
    expect((screen.getByRole('combobox', { name: 'Main model' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
