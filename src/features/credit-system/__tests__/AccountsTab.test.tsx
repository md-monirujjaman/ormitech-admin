import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import { AccountsTab } from '../components/AccountsTab';
import type { CreditAccount, CreditAccountList } from '../types';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', Mock>;

const USER = '018f0000-0000-7000-8000-0000000000a1';
const list: CreditAccountList = { limit: 25, items: [{ userId: USER, email: 'owner@example.test', name: 'Fixture Owner', planSlug: 'free', workspaces: 2, allocatedUsd: '1', allocatedCredits: '1200', availableCredits: '1000', usedCredits: '200' }] };
const account = (planSlug = 'free'): CreditAccount => ({
  user: { userId: USER, email: 'owner@example.test', name: 'Fixture Owner' },
  plan: { slug: planSlug, updatedAt: null },
  wallet: { organizationId: 'w1', allocatedUsd: '1', allocatedCredits: '1200', availableCredits: '1000', heldCredits: '0', usedCredits: '200' },
  workspaces: [
    { organizationId: 'w1', name: 'Alpha Gym', slug: 'alpha', usedCredits: '150', uses: 3 },
    { organizationId: 'w2', name: 'Beta Shop', slug: 'beta', usedCredits: '50', uses: 1 },
  ],
  allocations: [{ id: 'a1', source: 'plan', planSlug: 'free', usdGranted: '1', usdTotalAfter: '1', markupPercent: '20', credits: '1200', createdAt: '2026-11-20T09:00:00.000Z' }],
  recentUse: [{ id: 'l1', workspaceId: 'w1', workspaceName: 'Alpha Gym', credits: '12', reason: null, createdAt: '2026-11-21T10:30:00.000Z' }],
});

function serve() {
  http.get.mockImplementation(async (path: string) => {
    if (path === '/admin/ai/credit-accounts') return ok(list);
    if (path === `/admin/ai/credit-accounts/${USER}`) return ok(account());
    if (path === '/admin/ai/credit-plans') return ok({ conversion: { ready: true, missing: [] }, items: [{ slug: 'growth', name: 'Growth', status: 'active', planVersion: 1, usdBudget: '5', markupPercent: '20', credits: '6000', missing: [], version: 1, updatedAt: null }] });
    throw new Error(`unexpected GET ${path}`);
  });
}

describe('AccountsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
  });

  it('lists users with plan, allocated, available and used, and opens one to show use per workspace with date and time', async () => {
    renderWithClient(<AccountsTab canWrite />);
    await userEvent.click(await screen.findByRole('button', { name: /Fixture Owner/ }));
    const perWorkspace = within(await screen.findByRole('region', { name: 'Used per workspace' }));
    expect(perWorkspace.getByText('Alpha Gym')).toBeTruthy();
    expect(perWorkspace.getByText('Beta Shop')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Recent use' })).getByText('Alpha Gym')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Allocations' })).getByText('Plan credit')).toBeTruthy();
  });

  it('sets a plan only after confirming, and says the credit was added', async () => {
    http.put.mockResolvedValue(ok(account('growth')));
    renderWithClient(<AccountsTab canWrite />);
    await userEvent.click(await screen.findByRole('button', { name: /Fixture Owner/ }));
    await userEvent.selectOptions(await screen.findByLabelText('Change this user’s plan'), 'growth');
    await userEvent.click(screen.getByRole('button', { name: 'Set plan' }));
    expect(http.put).not.toHaveBeenCalled();
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Set plan' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith(`/admin/ai/credit-accounts/${USER}/plan`, { planSlug: 'growth' }));
    expect(await screen.findByText(/Its credit was added to the wallet/)).toBeTruthy();
  });

  it('offers no plan change without the permission to', async () => {
    renderWithClient(<AccountsTab canWrite={false} />);
    await userEvent.click(await screen.findByRole('button', { name: /Fixture Owner/ }));
    await screen.findByRole('region', { name: 'Used per workspace' });
    expect(screen.queryByLabelText('Change this user’s plan')).toBeNull();
  });
});
