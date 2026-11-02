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

describe('the credit policy tab', () => {
  beforeEach(() => http.get.mockImplementation(async () => ok([])));

  it('is offered to someone who may read credits', async () => {
    granted.list = ['ai_providers.read', 'ai_credits.read'];
    renderWithClient(<AiProvidersPage />);
    expect(screen.getByRole('tab', { name: 'Credit policy' })).toBeTruthy();
  });

  it('is not there for anyone else, and the other tabs are untouched', async () => {
    granted.list = ['ai_providers.read'];
    renderWithClient(<AiProvidersPage />);
    expect(screen.queryByRole('tab', { name: 'Credit policy' })).toBeNull();
    for (const name of ['Providers', 'Models & pricing', 'Plan access']) expect(screen.getByRole('tab', { name })).toBeTruthy();
  });
});
