import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { ROLE_DEFINITIONS, resolvePermissions } from '@/lib/permissions';
import { NAV_SECTIONS } from '@/lib/navigation';
import { ROUTES } from '@/lib/constants';
import type { Permission } from '@/types/auth';
import AiProvidersPage from '../pages/AiProvidersPage';
import { model, ok, provider, renderWithClient } from './testUtils';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
const mode = vi.hoisted(() => ({ mock: false }));
vi.mock('@/api/dataSource', () => ({
  get isMockDataSource() {
    return mode.mock;
  },
}));
const granted = vi.hoisted(() => ({ list: [] as string[] }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ can: (permission?: string) => !permission || granted.list.includes(permission) }) }));
vi.mock('@/features/plans/hooks', () => ({ usePlans: () => ({ data: [], isLoading: false, isError: false, error: null, refetch: () => undefined }) }));
vi.mock('@/components/shared/MockDataNotice', () => ({ MockDataNotice: () => null }));

const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch', Mock>;

describe('AiProvidersPage', () => {
  beforeEach(() => {
    mode.mock = false;
    granted.list = ['ai_providers.read', 'ai_providers.write'];
    http.get.mockImplementation(async (path: string) => (path === '/admin/ai/providers' ? ok([provider()]) : path === '/admin/ai/models' ? ok([model()]) : ok([])));
  });

  it('shows the three sections and loads the providers first', async () => {
    renderWithClient(<AiProvidersPage />);
    expect(screen.getByRole('tab', { name: 'Providers' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Models & pricing' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Plan access' })).toBeTruthy();
    expect(await screen.findByText('OpenAI Main')).toBeTruthy();
    expect(http.get).toHaveBeenCalledWith('/admin/ai/providers');
  });

  it('moves between sections and loads each section’s data from the API', async () => {
    renderWithClient(<AiProvidersPage />);
    await screen.findByText('OpenAI Main');
    await userEvent.click(screen.getByRole('tab', { name: 'Models & pricing' }));
    expect(await screen.findByText('Fixture A')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'Plan access' }));
    expect(await screen.findByText('No active plans')).toBeTruthy();
    expect(http.get).toHaveBeenCalledWith('/admin/ai/models');
  });

  it('shows a notice after a change, which can be dismissed', async () => {
    http.post.mockResolvedValue(ok({ provider: provider(), check: { status: 'healthy', error: null } }));
    renderWithClient(<AiProvidersPage />);
    await screen.findByText('OpenAI Main');
    await userEvent.click(screen.getByRole('button', { name: 'Check connection' }));
    const notice = await screen.findByRole('status');
    expect(notice.textContent).toContain('OpenAI Main answered: the key works.');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('announces an error as an alert, and keeps it until it is dismissed', async () => {
    http.post.mockResolvedValue(ok({ provider: provider(), check: { status: 'unauthorized', error: 'http_401' } }));
    renderWithClient(<AiProvidersPage />);
    await screen.findByText('OpenAI Main');
    await userEvent.click(screen.getByRole('button', { name: 'Check connection' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('The provider rejected the key (401).'));
  });

  it('hides every control that changes something from a viewer without write permission', async () => {
    granted.list = ['ai_providers.read'];
    renderWithClient(<AiProvidersPage />);
    await screen.findByText('OpenAI Main');
    expect(screen.queryByRole('button', { name: /Add provider|Check connection|Replace key|Edit/ })).toBeNull();
  });

  describe('with the mock data source', () => {
    it('asks for the live API and does not request or show anything', async () => {
      mode.mock = true;
      renderWithClient(<AiProvidersPage />);
      expect(screen.getByText('This page needs the live API')).toBeTruthy();
      expect(screen.queryByRole('tab')).toBeNull();
      expect(document.body.textContent).not.toContain('OpenAI Main');
      expect(http.get).not.toHaveBeenCalled();
    });
  });
});

describe('who sees the AI providers section', () => {
  const holders = (permission: Permission) => ROLE_DEFINITIONS.filter((role) => role.permissions.includes(permission)).map((role) => role.name);

  it('is for super admins only, matching the API', () => {
    expect(holders('ai_providers.read')).toEqual(['SUPER_ADMIN']);
    expect(holders('ai_providers.write')).toEqual(['SUPER_ADMIN']);
    expect(resolvePermissions(['ADMIN'])).not.toContain('ai_providers.read');
    expect(resolvePermissions(['SUPPORT_ADMIN', 'BILLING_ADMIN', 'CONTENT_ADMIN', 'ANALYTICS_ADMIN'])).not.toContain('ai_providers.write');
    expect(resolvePermissions(['SUPER_ADMIN'])).toEqual(expect.arrayContaining(['ai_providers.read', 'ai_providers.write']));
  });

  it('has one navigation entry, behind that permission, next to AI Configuration', () => {
    const items = NAV_SECTIONS.flatMap((section) => section.items);
    const entry = items.filter((item) => item.href === ROUTES.aiProviders);
    expect(entry).toHaveLength(1);
    expect(entry[0]?.permission).toBe('ai_providers.read');
    expect(ROUTES.aiProviders).toBe('/ai/providers');
    expect(items.find((item) => item.href === ROUTES.ai)?.permission).toBe('ai.read');
  });
});
