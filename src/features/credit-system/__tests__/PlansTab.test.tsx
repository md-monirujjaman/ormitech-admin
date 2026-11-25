import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { apiFailure, ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import { PlansTab } from '../components/PlansTab';
import { limitsList } from './fixtures';
import type { PlanBudget, WorkspaceBudget } from '../types';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', Mock>;
const ORG = '018f0000-0000-7000-8000-000000000001';

const plan = (over: Partial<PlanBudget> = {}): PlanBudget => ({ slug: 'growth', name: 'Growth', status: 'active', planVersion: 1, usdBudget: null, markupPercent: null, credits: null, missing: ['budget', 'markup', 'creditValueUsd'], version: null, updatedAt: null, ...over });
const plansOf = (items: PlanBudget[], ready = false) => ok({ conversion: { ready, missing: ready ? [] : ['creditValueUsd', 'roundingMode', 'decimalPlaces'] }, items });
const budget = (over: Partial<WorkspaceBudget> = {}): WorkspaceBudget => ({
  organizationId: ORG,
  name: 'Fixture Shop',
  plan: { slug: 'enterprise', name: 'Enterprise', usdBudget: '50', markupPercent: '20' },
  workspaceBudgetUsd: null,
  effective: { budgetUsd: '50', source: 'plan', markupPercent: '20', credits: '60000', missing: [] },
  wallet: { available: '0.00000000', reserved: '0.00000000' },
  grants: [],
  ...over,
});

function serve(plans = [plan()], workspace: WorkspaceBudget = budget(), limits = limitsList([])) {
  http.get.mockImplementation(async (path: string) => {
    if (path === '/admin/ai/credit-plans') return plansOf(plans, plans.some((entry) => entry.credits !== null));
    if (path === '/admin/ai/credit-budget/search') return ok([{ id: ORG, name: 'Fixture Shop', slug: 'fixture-shop', plan: 'enterprise' }]);
    if (path === `/admin/organizations/${ORG}/ai-credit-budget`) return ok(workspace);
    if (path === '/admin/ai/credit-settings/workspace-limits') return ok(limits);
    throw new Error(`unexpected GET ${path}`);
  });
}
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

describe('plan configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
  });

  it('shows the plan with nothing decided: Not set, and no credits invented, with what is missing', async () => {
    renderWithClient(<PlansTab canWrite />);
    const row = (await screen.findByText('Growth')).closest('tr')!;
    expect(within(row).getAllByText('Not set')).toHaveLength(2);
    expect(within(row).getByText(/Not available · Needs: budget, markup, credit value/)).toBeTruthy();
    expect(screen.getByText(/Credits not available: the credit value, rounding mode and precision are not all set/)).toBeTruthy();
  });

  it('shows the credits the API derived once everything is decided, and never computes them itself', async () => {
    serve([plan({ usdBudget: '10', markupPercent: '20', credits: '12000.00000000', missing: [], version: 2 })]);
    renderWithClient(<PlansTab canWrite />);
    const row = (await screen.findByText('Growth')).closest('tr')!;
    expect(within(row).getByText('$10')).toBeTruthy();
    expect(within(row).getByText('20%')).toBeTruthy();
    expect(within(row).getByText('12,000')).toBeTruthy();
  });

  it('has no field for credits: the budget and the markup are what is typed', async () => {
    renderWithClient(<PlansTab canWrite />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit the Growth plan' }));
    expect(input('API budget (USD)').placeholder).toBe('e.g. 10');
    expect(input('Markup (percent)').placeholder).toBe('e.g. 20');
    expect(screen.queryByLabelText(/credits/i)).toBeNull();
  });

  it('refuses a bad budget or markup before asking the API', async () => {
    renderWithClient(<PlansTab canWrite />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit the Growth plan' }));
    await userEvent.type(input('API budget (USD)'), '-5');
    await userEvent.type(input('Markup (percent)'), '10001');
    await userEvent.click(screen.getByRole('button', { name: 'Save plan' }));
    expect(await screen.findByText(/A positive USD amount/)).toBeTruthy();
    expect(screen.getByText('At most 10000')).toBeTruthy();
    expect(http.put).not.toHaveBeenCalled();
  });

  it('saves the budget and markup as text, against the version it read, and refreshes from the API', async () => {
    http.put.mockResolvedValue(plansOf([plan({ usdBudget: '10', markupPercent: '20', credits: '12000', missing: [], version: 1 })], true));
    renderWithClient(<PlansTab canWrite />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit the Growth plan' }));
    await userEvent.type(input('API budget (USD)'), '10');
    await userEvent.type(input('Markup (percent)'), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Save plan' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/ai/credit-plans/growth', { expectedVersion: null, usdBudget: '10', markupPercent: '20' }));
    expect(await screen.findByText('Growth: the budget and markup were saved.')).toBeTruthy();
  });

  it('keeps a zero markup as a decision and an empty one as not decided', async () => {
    http.put.mockResolvedValue(plansOf([plan()]));
    renderWithClient(<PlansTab canWrite />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit the Growth plan' }));
    await userEvent.type(input('API budget (USD)'), '10');
    await userEvent.type(input('Markup (percent)'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Save plan' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith(expect.any(String), { expectedVersion: null, usdBudget: '10', markupPercent: '0' }));
  });

  it('shows the API’s refusal of a stale save and keeps the dialog', async () => {
    http.put.mockRejectedValue(apiFailure(409, 'This plan’s credit settings were changed by someone else since you opened them. Reload and try again.'));
    renderWithClient(<PlansTab canWrite />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit the Growth plan' }));
    await userEvent.type(input('API budget (USD)'), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Save plan' }));
    expect(await screen.findByText(/changed by someone else/)).toBeTruthy();
    expect(input('API budget (USD)').value).toBe('10');
  });

  it('removes a plan’s settings only after confirming', async () => {
    serve([plan({ usdBudget: '10', markupPercent: '20', credits: '12000', missing: [], version: 1 })]);
    http.delete.mockResolvedValue(plansOf([plan()]));
    renderWithClient(<PlansTab canWrite />);
    await userEvent.click(await screen.findByRole('button', { name: 'Remove the settings of the Growth plan' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(http.delete).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/admin/ai/credit-plans/growth'));
  });

  it('offers no way to change anything without the permission to', async () => {
    renderWithClient(<PlansTab canWrite={false} />);
    await screen.findByText('Growth');
    expect(screen.queryByRole('button', { name: /Edit the Growth plan/ })).toBeNull();
  });
});
