import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import { NAV_SECTIONS, findNavMeta, hasNestedNavItem } from '@/lib/navigation';
import { ROUTES } from '@/lib/constants';
import { ROLE_DEFINITIONS } from '@/lib/permissions';
import CreditSystemPage from '../pages/CreditSystemPage';
import { dashboard, limitsList, pilotRow, settings } from './fixtures';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const mockSource = vi.hoisted(() => ({ value: false }));
vi.mock('@/api/dataSource', () => ({ get isMockDataSource() { return mockSource.value; } }));
const granted = vi.hoisted(() => ({ list: ['ai_credits.read', 'ai_credits.write'] as string[] }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ can: (permission?: string) => !permission || granted.list.includes(permission) }) }));
vi.mock('@/components/shared/MockDataNotice', () => ({ MockDataNotice: () => null }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', Mock>;

function serve() {
  http.get.mockImplementation(async (path: string) => {
    if (path === '/admin/ai/credit-settings') return ok(settings());
    if (path === '/admin/ai/credit-settings/pilot-workspaces') return ok([pilotRow()]);
    if (path === '/admin/ai/credit-settings/workspace-limits') return ok(limitsList([]));
    if (path === '/admin/ai/credit-plans') return ok({ conversion: { ready: false, missing: ['creditValueUsd'] }, items: [] });
    if (path === '/admin/ai/credit-dashboard') return ok(dashboard());
    if (path === '/admin/ai/credit-operations') return ok({ costUnit: { verified: false, unit: null }, items: [], nextCursor: null });
    throw new Error(`unexpected GET ${path}`);
  });
}

describe('the credit system page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSource.value = false;
    granted.list = ['ai_credits.read', 'ai_credits.write'];
    serve();
  });

  it('opens on the dashboard, with the five areas as tabs and the credit mode said to be off unless changed', async () => {
    renderWithClient(<CreditSystemPage />);
    expect(screen.getByRole('tab', { name: 'Dashboard' }).getAttribute('data-state')).toBe('active');
    for (const name of ['Operations', 'Plans & budgets', 'Settings', 'Workspace limits']) expect(screen.getByRole('tab', { name: name })).toBeTruthy();
    expect(screen.getByText(/Credit mode is off unless you change it/)).toBeTruthy();
    expect(await screen.findByText('Credits issued')).toBeTruthy();
  });

  it('shows nothing from mock data: it asks for the live API instead', () => {
    mockSource.value = true;
    renderWithClient(<CreditSystemPage />);
    expect(screen.getByText('This page needs the live API')).toBeTruthy();
    expect(http.get).not.toHaveBeenCalled();
  });

  it('shows the settings cards, and warns before leaving the Settings tab with an unsaved change', async () => {
    renderWithClient(<CreditSystemPage />);
    await userEvent.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(await screen.findByText('Financial settings')).toBeTruthy();
    await userEvent.type(await screen.findByLabelText('Decimal places of the debit'), '5');
    expect(await screen.findByText('Unsaved changes')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'Dashboard' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Leave with unsaved changes?')).toBeTruthy();
    // Staying keeps what was typed.
    await userEvent.click(within(dialog).getByRole('button', { name: 'Stay' }));
    expect((screen.getByLabelText('Decimal places of the debit') as HTMLInputElement).value).toBe('5');
    await userEvent.click(screen.getByRole('tab', { name: 'Dashboard' }));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Discard and leave' }));
    expect(await screen.findByText('Credits issued')).toBeTruthy();
  });

  it('leaves a tab freely when nothing is unsaved', async () => {
    renderWithClient(<CreditSystemPage />);
    await userEvent.click(screen.getByRole('tab', { name: 'Settings' }));
    await screen.findByText('Financial settings');
    await userEvent.click(screen.getByRole('tab', { name: 'Workspace limits' }));
    expect(await screen.findByText('No workspace has limits.')).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('asks the browser to confirm closing the page while something is unsaved, and stops once it is not', async () => {
    renderWithClient(<CreditSystemPage />);
    await userEvent.click(screen.getByRole('tab', { name: 'Settings' }));
    const markup = await screen.findByLabelText('Decimal places of the debit');
    const attempt = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(attempt()).toBe(false);
    await userEvent.type(markup, '5');
    await waitFor(() => expect(attempt()).toBe(true));
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(attempt()).toBe(false));
  });

  it('is read-only for someone who can read but not write', async () => {
    granted.list = ['ai_credits.read'];
    renderWithClient(<CreditSystemPage />);
    await userEvent.click(screen.getByRole('tab', { name: 'Settings' }));
    await screen.findByText('Financial settings');
    expect(screen.queryByRole('button', { name: 'Review changes' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add to pilot' })).toBeNull();
    expect((await screen.findByLabelText('Decimal places of the debit') as HTMLInputElement).disabled).toBe(true);
  });
});

describe('where the page is in the admin', () => {
  it('has its own sidebar entry for super admins only, matching the API', () => {
    const entry = NAV_SECTIONS.flatMap((section) => section.items).find((item) => item.href === ROUTES.aiCreditSystem);
    expect(entry).toMatchObject({ label: 'Credit System', permission: 'ai_credits.read' });
    const holders = ROLE_DEFINITIONS.filter((role) => role.permissions.includes('ai_credits.read')).map((role) => role.name);
    expect(holders).toEqual(['SUPER_ADMIN']);
    expect(ROLE_DEFINITIONS.filter((role) => role.permissions.includes('ai_credits.write')).map((role) => role.name)).toEqual(['SUPER_ADMIN']);
  });

  it('is titled after itself, and lights only its own entry', () => {
    expect(findNavMeta(ROUTES.aiCreditSystem)).toEqual({ title: 'Credit System', section: 'Product' });
    expect(findNavMeta(ROUTES.aiProviders).title).toBe('AI Gateway & Models');
    expect(hasNestedNavItem(ROUTES.ai)).toBe(true);
    expect(hasNestedNavItem(ROUTES.aiCreditSystem)).toBe(false);
  });
});
