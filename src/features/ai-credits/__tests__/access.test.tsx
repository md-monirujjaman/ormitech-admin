import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import AiProvidersPage from '@/features/ai-catalog/pages/AiProvidersPage';
import { ROLE_DEFINITIONS, resolvePermissions } from '@/lib/permissions';
import type { Permission } from '@/types/auth';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
vi.mock('@/api/dataSource', () => ({ isMockDataSource: false }));
const granted = vi.hoisted(() => ({ list: [] as string[] }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ can: (permission?: string) => !permission || granted.list.includes(permission) }) }));
vi.mock('@/features/plans/hooks', () => ({ usePlans: () => ({ data: [], isLoading: false, isError: false, error: null, refetch: () => undefined }) }));
vi.mock('@/components/shared/MockDataNotice', () => ({ MockDataNotice: () => null }));
const http = axiosClient as unknown as Record<'get', Mock>;

describe('who sees AI credits', () => {
  const holders = (permission: Permission) => ROLE_DEFINITIONS.filter((role) => role.permissions.includes(permission)).map((role) => role.name);

  it('is for super admins only, matching the API', () => {
    expect(holders('ai_credits.read')).toEqual(['SUPER_ADMIN']);
    expect(holders('ai_credits.write')).toEqual(['SUPER_ADMIN']);
    expect(resolvePermissions(['ADMIN', 'BILLING_ADMIN', 'SUPPORT_ADMIN', 'ANALYTICS_ADMIN', 'CONTENT_ADMIN'])).not.toEqual(expect.arrayContaining(['ai_credits.read']));
    expect(resolvePermissions(['SUPER_ADMIN'])).toEqual(expect.arrayContaining(['ai_credits.read', 'ai_credits.write']));
  });
});

describe('the AI gateway tabs', () => {
  beforeEach(() => http.get.mockImplementation(async () => ok([])));

  it('has no Credit policy tab for anyone any more: credits are set in the Credit System page', async () => {
    for (const list of [['ai_providers.read', 'ai_credits.read'], ['ai_providers.read']]) {
      granted.list = list;
      const view = renderWithClient(<AiProvidersPage />);
      expect(screen.queryByRole('tab', { name: 'Credit policy' })).toBeNull();
      for (const name of ['Connection', 'Models', 'Routing', 'Instructions']) expect(screen.getByRole('tab', { name })).toBeTruthy();
      view.unmount();
    }
  });
});
