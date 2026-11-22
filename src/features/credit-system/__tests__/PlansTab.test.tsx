import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { apiFailure, ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import { PlansTab } from '../components/PlansTab';
import { limitsList, limitsRow } from './fixtures';
import type { PlanBudget, WorkspaceBudget } from '../types';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', Mock>;
const ORG = '018f0000-0000-7000-8000-000000000001';

const plan = (over: Partial<PlanBudget> = {}): PlanBudget => ({ planId: 'plan-growth', slug: 'growth', name: 'Growth', status: 'active', planVersion: 1, usdBudget: null, markupPercent: null, credits: null, missing: ['budget', 'markup', 'creditValueUsd'], version: null, updatedAt: null, ...over });
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
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/ai/credit-plans/plan-growth', { expectedVersion: null, usdBudget: '10', markupPercent: '20' }));
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
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/admin/ai/credit-plans/plan-growth'));
  });

  it('offers no way to change anything without the permission to', async () => {
    renderWithClient(<PlansTab canWrite={false} />);
    await screen.findByText('Growth');
    expect(screen.queryByRole('button', { name: /Edit the Growth plan/ })).toBeNull();
  });
});

describe('workspace budget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
  });

  const open = async (canWrite = true) => {
    renderWithClient(<PlansTab canWrite={canWrite} />);
    await userEvent.type(await screen.findByLabelText('Workspace ID, client ID or name'), ORG);
    await userEvent.click(screen.getByRole('button', { name: /Find/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Fixture Shop/ }));
  };

  it('finds a workspace by what was typed, and asks the API with exactly that', async () => {
    await open();
    expect(http.get).toHaveBeenCalledWith('/admin/ai/credit-budget/search', { params: { q: ORG } });
    expect(await screen.findByText('Budget in force')).toBeTruthy();
  });

  it('refuses a search that is too short and asks nothing', async () => {
    renderWithClient(<PlansTab canWrite />);
    await userEvent.type(await screen.findByLabelText('Workspace ID, client ID or name'), 'a');
    await userEvent.click(screen.getByRole('button', { name: /Find/ }));
    expect(await screen.findByText('Enter at least 2 characters')).toBeTruthy();
    expect(http.get).not.toHaveBeenCalledWith('/admin/ai/credit-budget/search', expect.anything());
  });

  it('shows the plan default, the budget in force and what it is worth, with nothing granted by itself', async () => {
    await open();
    expect(await screen.findByText('$50 (plan default)')).toBeTruthy();
    expect(screen.getByText('60,000')).toBeTruthy();
    expect(screen.getByText('Nothing has been granted to this workspace.')).toBeTruthy();
    expect(screen.getByText(/Nothing renews by itself/)).toBeTruthy();
  });

  it('shows a workspace override as the budget in force: the Enterprise example', async () => {
    serve([plan()], budget({ workspaceBudgetUsd: '100', effective: { budgetUsd: '100', source: 'workspace', markupPercent: '20', credits: '120000', missing: [] } }));
    await open();
    expect(await screen.findByText('$100 (workspace override)')).toBeTruthy();
    expect(screen.getByText('120,000')).toBeTruthy();
  });

  it('says what is missing instead of a number, and cannot grant', async () => {
    serve([plan()], budget({ effective: { budgetUsd: null, source: null, markupPercent: null, credits: null, missing: ['budget', 'markup'] } }));
    await open();
    await screen.findByText('Budget in force');
    expect(screen.getAllByText(/Not available · Needs: budget, markup/).length).toBeGreaterThanOrEqual(1);
    expect((screen.getByRole('button', { name: 'Grant budget' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('sets the workspace’s own budget as text and keeps its other limits', async () => {
    serve([plan()], budget(), limitsList([limitsRow({ organizationId: ORG, version: 3, budgetUsd: null, maxSpendUsd: '500', monthlyLimitUsd: '200', dailyLimitUsd: '20', perTurnLimitUsd: null })]));
    http.put.mockResolvedValue(ok(limitsList([])));
    await open();
    await userEvent.type(await screen.findByLabelText('Set this workspace’s own budget (USD)'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Save budget' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith(`/admin/ai/credit-settings/workspace-limits/${ORG}`, { expectedVersion: 3, budgetUsd: '100', maxSpendUsd: '500', monthlyLimitUsd: '200', dailyLimitUsd: '20', perTurnLimitUsd: null }));
  });

  it('refuses a bad budget before asking the API', async () => {
    await open();
    await userEvent.type(await screen.findByLabelText('Set this workspace’s own budget (USD)'), '-1');
    await userEvent.click(screen.getByRole('button', { name: 'Save budget' }));
    expect(await screen.findByText(/A positive USD amount/)).toBeTruthy();
    expect(http.put).not.toHaveBeenCalled();
  });

  it('goes back to the plan’s budget by removing a workspace record that held only the budget', async () => {
    serve([plan()], budget({ workspaceBudgetUsd: '100' }), limitsList([limitsRow({ organizationId: ORG, budgetUsd: '100', maxSpendUsd: null, monthlyLimitUsd: null, dailyLimitUsd: null, perTurnLimitUsd: null })]));
    http.delete.mockResolvedValue(ok({ organizationId: ORG, cleared: true }));
    await open();
    await userEvent.type(await screen.findByLabelText('Set this workspace’s own budget (USD)'), ' ');
    await userEvent.click(screen.getByRole('button', { name: 'Save budget' }));
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith(`/admin/ai/credit-settings/workspace-limits/${ORG}`));
  });

  it('grants the credits it showed, after confirming with a reason, with one key for the dialog', async () => {
    http.post.mockResolvedValue(ok({ replay: false, credits: '60000.00000000' }));
    await open();
    await userEvent.click(await screen.findByRole('button', { name: 'Grant 60,000 credits' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/\$50 × \(1 \+ 20%\) ÷ credit value = 60,000 credits/)).toBeTruthy();
    expect(http.post).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Grant credits' }));
    expect(await within(dialog).findByText('Say why, in at least 3 characters')).toBeTruthy();
    expect(http.post).not.toHaveBeenCalled();
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'first month');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Grant credits' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    expect(http.post).toHaveBeenCalledWith(`/admin/organizations/${ORG}/ai-credits/budget-grants`, { expectedCredits: '60000', reason: 'first month', idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(await screen.findByText('60,000 credits were granted.')).toBeTruthy();
  });

  it('says so when a grant was already made, and shows the API’s refusal when the budget changed', async () => {
    http.post.mockResolvedValueOnce(ok({ replay: true, credits: '60000' })).mockRejectedValueOnce(apiFailure(409, 'The budget is now worth 72000 credits, not 60000: it changed since you looked. Reload and check it again.'));
    await open();
    await userEvent.click(await screen.findByRole('button', { name: 'Grant 60,000 credits' }));
    await userEvent.type(within(await screen.findByRole('alertdialog')).getByLabelText('Reason'), 'again');
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Grant credits' }));
    expect(await screen.findByText('That grant was already made: nothing was added again.')).toBeTruthy();
    await userEvent.click(await screen.findByRole('button', { name: 'Grant 60,000 credits' }));
    await userEvent.type(within(await screen.findByRole('alertdialog')).getByLabelText('Reason'), 'second');
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Grant credits' }));
    expect(await screen.findByText(/now worth 72000 credits/)).toBeTruthy();
  });

  it('lists what was granted, from the API', async () => {
    serve([plan()], budget({ grants: [{ id: 'g1', source: 'plan', usdBudget: '50.000000', markupPercent: '20.0000', creditValueUsd: '0.001', settingsVersion: 1, credits: '60000.00000000', grantedBy: 'a1', reason: 'first month', createdAt: '2026-11-20T09:00:00.000Z' }] }));
    await open();
    const row = (await screen.findByText('first month')).closest('tr')!;
    expect(within(row).getByText('$50')).toBeTruthy();
    expect(within(row).getByText('20%')).toBeTruthy();
    expect(within(row).getByText('60,000')).toBeTruthy();
  });

  it('can be read but not changed without the permission to', async () => {
    await open(false);
    await screen.findByText('Budget in force');
    expect(screen.queryByRole('button', { name: /Grant/ })).toBeNull();
    expect(screen.queryByLabelText('Set this workspace’s own budget (USD)')).toBeNull();
  });
});
