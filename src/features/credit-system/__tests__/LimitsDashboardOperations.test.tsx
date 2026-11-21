import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { apiFailure, ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import { DashboardTab } from '../components/DashboardTab';
import { FilterBar } from '../components/FilterBar';
import { defaultPeriod, periodToFilters } from '../period';
import { LimitsTab } from '../components/LimitsTab';
import { OperationsTab } from '../components/OperationsTab';
import { dashboard, limitsList, limitsRow, operation } from './fixtures';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', Mock>;
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

describe('LimitsTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('says it is recorded and not enforced, and that usage is not available until the cost unit is verified', async () => {
    http.get.mockResolvedValue(ok(limitsList([limitsRow()])));
    renderWithClient(<LimitsTab canWrite />);
    expect(await screen.findByText('Recorded, not enforced')).toBeTruthy();
    expect(screen.getByText(/Usage Not available/)).toBeTruthy();
    const row = screen.getByText('Fixture Shop').closest('tr')!;
    expect(within(row).getByText('$2')).toBeTruthy();
    expect(within(row).getByText('$10')).toBeTruthy();
    // An unset limit is said to be not set, never zero.
    expect(within(row).getByText('Not set')).toBeTruthy();
    expect(within(row).getByText('Not available')).toBeTruthy();
  });

  it('shows what a workspace has used, in verified USD, once the cost unit is verified', async () => {
    http.get.mockResolvedValue(ok(limitsList([limitsRow({ spend: { today: '0.2', month: '1.5', total: '3.25' } })], true)));
    renderWithClient(<LimitsTab canWrite />);
    expect(await screen.findByText('$0.2 / $1.5 / $3.25')).toBeTruthy();
    expect(screen.queryByText(/Usage Not available/)).toBeNull();
  });

  it('says so when no workspace has limits', async () => {
    http.get.mockResolvedValue(ok(limitsList([])));
    renderWithClient(<LimitsTab canWrite />);
    expect(await screen.findByText('No workspace has limits.')).toBeTruthy();
  });

  it('refuses limits that are out of order, and asks the API nothing', async () => {
    http.get.mockResolvedValue(ok(limitsList([])));
    renderWithClient(<LimitsTab canWrite />);
    await userEvent.click(await screen.findByRole('button', { name: /Set limits/ }));
    await userEvent.type(input('Workspace ID'), '018f0000-0000-7000-8000-000000000001');
    await userEvent.type(input('Daily limit (USD)'), '6');
    await userEvent.type(input('Monthly limit (USD)'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Save limits' }));
    expect(await screen.findByText('The daily limit cannot be more than the monthly limit')).toBeTruthy();
    expect(http.put).not.toHaveBeenCalled();
  });

  it('refuses a bad workspace ID, and an empty set', async () => {
    http.get.mockResolvedValue(ok(limitsList([])));
    renderWithClient(<LimitsTab canWrite />);
    await userEvent.click(await screen.findByRole('button', { name: /Set limits/ }));
    await userEvent.type(input('Workspace ID'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Save limits' }));
    expect(await screen.findByText(/A workspace ID looks like/)).toBeTruthy();
    expect(screen.getByText(/Set at least one limit/)).toBeTruthy();
    expect(http.put).not.toHaveBeenCalled();
  });

  it('saves new limits as text, with no version, and shows the API’s refusal when it has one', async () => {
    http.get.mockResolvedValue(ok(limitsList([])));
    http.put.mockResolvedValueOnce(ok(limitsList([limitsRow()]))).mockRejectedValueOnce(apiFailure(404, 'Workspace not found'));
    renderWithClient(<LimitsTab canWrite />);
    await userEvent.click(await screen.findByRole('button', { name: /Set limits/ }));
    await userEvent.type(input('Workspace ID'), '018F0000-0000-7000-8000-000000000001');
    await userEvent.type(input('AI budget (USD)'), '2');
    await userEvent.type(input('Maximum spend (USD)'), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Save limits' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/ai/credit-settings/workspace-limits/018f0000-0000-7000-8000-000000000001', { expectedVersion: null, budgetUsd: '2', maxSpendUsd: '10', monthlyLimitUsd: null, dailyLimitUsd: null, perTurnLimitUsd: null }));
    expect(await screen.findByText('The limits were saved.')).toBeTruthy();
  });

  it('edits against the version it read and removes limits only after confirming', async () => {
    http.get.mockResolvedValue(ok(limitsList([limitsRow({ version: 4 })])));
    http.put.mockResolvedValue(ok(limitsList([limitsRow()])));
    http.delete.mockResolvedValue(ok({ organizationId: 'x', cleared: true }));
    renderWithClient(<LimitsTab canWrite />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit the limits of Fixture Shop' }));
    expect(input('AI budget (USD)').value).toBe('2');
    expect(input('Workspace ID').disabled).toBe(true);
    await userEvent.clear(input('Daily limit (USD)'));
    await userEvent.type(input('Daily limit (USD)'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Save limits' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith(expect.stringContaining('/workspace-limits/'), expect.objectContaining({ expectedVersion: 4, dailyLimitUsd: '2' })));
    await userEvent.click(await screen.findByRole('button', { name: 'Remove the limits of Fixture Shop' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(http.delete).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove limits' }));
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/admin/ai/credit-settings/workspace-limits/018f0000-0000-7000-8000-000000000001'));
  });

  it('has no controls for someone who cannot write', async () => {
    http.get.mockResolvedValue(ok(limitsList([limitsRow()])));
    renderWithClient(<LimitsTab canWrite={false} />);
    await screen.findByText('Fixture Shop');
    expect(screen.queryByRole('button', { name: /Set limits/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit the limits/ })).toBeNull();
  });
});

describe('DashboardTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows Not available, not zero, for verified USD while the cost unit is not verified, and the unverified cost in its own unit', async () => {
    http.get.mockResolvedValue(ok(dashboard()));
    renderWithClient(<DashboardTab filters={{}} />);
    expect(await screen.findByText(/has not been verified as USD/)).toBeTruthy();
    const verifiedStat = screen.getByText('Verified AI API cost (USD)').closest('div')!.parentElement!;
    expect(within(verifiedStat).getByText('Not available')).toBeTruthy();
    expect(within(verifiedStat).queryByText('$0')).toBeNull();
    expect(screen.getByText('1.9 fixture_unit (4)')).toBeTruthy();
    expect(within(screen.getByText('Settled cost (USD)').closest('div')!.parentElement!).getByText('Not available')).toBeTruthy();
  });

  it('shows real counts and credit figures from the API, with every status and what it means', async () => {
    http.get.mockResolvedValue(ok(dashboard()));
    renderWithClient(<DashboardTab filters={{}} />);
    await screen.findByText('Credits issued');
    expect(screen.getByText('100').closest('div')!.textContent).toMatch(/Credits issued/);
    expect(screen.getByText('Outstanding balance').closest('div')!.textContent).toMatch(/94.5/);
    expect(screen.getByText('Reserved now').closest('div')!.textContent).toMatch(/10/);
    for (const label of ['Reserved', 'Settled', 'Released', 'Pending reconciliation', 'Failed', 'Unknown cost']) expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(screen.getByText('Credit is held for the request and not settled yet.')).toBeTruthy();
  });

  it('shows verified USD and the unit it was counted in once the cost unit is verified, and the other costs apart', async () => {
    http.get.mockResolvedValue(
      ok(
        dashboard({
          costUnit: { verified: true, unit: 'fixture_unit', usdFactor: '0.5' },
          cost: { verifiedUsd: '0.95000000000000', settledUsd: '0.25', verifiedRequests: 4, unverified: [{ unit: 'some_other_unit', cost: '9', requests: 1 }], pendingReconciliation: 1, failedRequests: 1, unknown: 1 },
        }),
      ),
    );
    renderWithClient(<DashboardTab filters={{}} />);
    expect(await screen.findByText(/counted as USD at 0.5 USD per unit/)).toBeTruthy();
    expect(screen.getByText('$0.95')).toBeTruthy();
    expect(screen.getByText('$0.25')).toBeTruthy();
    expect(screen.getByText('9 some_other_unit (1)')).toBeTruthy();
  });

  it('lists the workspaces that had requests, and says so when none did', async () => {
    http.get.mockResolvedValue(ok(dashboard()));
    const { unmount } = renderWithClient(<DashboardTab filters={{}} />);
    expect(await screen.findByRole('cell', { name: 'Fixture Shop' })).toBeTruthy();
    unmount();
    http.get.mockResolvedValue(ok(dashboard({ requests: { total: 0, failed: 0, turns: 0, byStatus: { reserved: 0, settled: 0, released: 0, pending_reconciliation: 0, failed: 0, unknown_cost: 0, recorded: 0 } }, workspaces: { truncated: false, items: [] }, byKind: [], byModel: [] })));
    renderWithClient(<DashboardTab filters={{}} />);
    expect(await screen.findByText('No workspace had an AI request in this period.')).toBeTruthy();
    // Nothing happened, so there is nothing to total: it is not shown as a zero cost either.
    expect(screen.getByText('1.9 fixture_unit (4)')).toBeTruthy();
  });

  it('asks the API with the filters it was given, and nothing else', async () => {
    http.get.mockResolvedValue(ok(dashboard()));
    renderWithClient(<DashboardTab filters={{ from: '2026-11-01T00:00:00.000Z', to: '2026-11-08T00:00:00.000Z', organizationId: '018f0000-0000-7000-8000-000000000001', kind: 'reply', status: 'failed' }} />);
    await screen.findByText('Credits issued');
    expect(http.get).toHaveBeenCalledWith('/admin/ai/credit-dashboard', { params: { from: '2026-11-01T00:00:00.000Z', to: '2026-11-08T00:00:00.000Z', organizationId: '018f0000-0000-7000-8000-000000000001', kind: 'reply', status: 'failed' } });
  });

  it('shows an API failure and a refusal, and does not invent figures', async () => {
    http.get.mockRejectedValue(apiFailure(500, 'boom'));
    renderWithClient(<DashboardTab filters={{}} />);
    expect(await screen.findByText(/Couldn’t load the credit dashboard/)).toBeTruthy();
    expect(screen.queryByText('Credits issued')).toBeNull();
  });
});

describe('OperationsTab', () => {
  beforeEach(() => vi.clearAllMocks());

  const page = (items: ReturnType<typeof operation>[], nextCursor: string | null = null) => ok({ costUnit: { verified: false, unit: null }, items, nextCursor });

  it('shows each attempt with its turn, attempt, workspace, feature, model, cost, verification, reservation amounts and status', async () => {
    http.get.mockResolvedValue(page([operation()]));
    renderWithClient(<OperationsTab filters={{}} />);
    expect(await screen.findByText('Settled')).toBeTruthy();
    const row = screen.getByText('Settled').closest('tr')!;
    expect(within(row).getByText('Fixture Shop')).toBeTruthy();
    expect(within(row).getByText('reply')).toBeTruthy();
    expect(within(row).getByText('vendor/model-a')).toBeTruthy();
    expect(within(row).getByText('0.5 fixture_unit')).toBeTruthy();
    expect(within(row).getByText('Unit not verified')).toBeTruthy();
    expect(within(row).getByText('8')).toBeTruthy();
    expect(within(row).getByText('5')).toBeTruthy();
    // No verified USD cost: Not available, not zero.
    expect(within(row).getByText('Not available')).toBeTruthy();
  });

  it('shows an unknown cost as Not available, with why, and never as zero or as a charge', async () => {
    http.get.mockResolvedValue(page([operation({ status: 'pending_reconciliation', costVerification: 'pending_reconciliation', providerCost: null, providerCostUnit: null, costReason: 'cost_absent', reservationId: null, reservationStatus: null, reservedCredits: null, settledCredits: null })]));
    renderWithClient(<OperationsTab filters={{}} />);
    const row = (await screen.findAllByText('Pending reconciliation'))[0]!.closest('tr')!;
    expect(within(row).getAllByText('Not available').length).toBeGreaterThanOrEqual(2);
    expect(within(row).getByText('The provider sent no cost')).toBeTruthy();
    expect(row.textContent).not.toMatch(/\$0\b/);
  });

  it('shows a failed request with no cost', async () => {
    http.get.mockResolvedValue(page([operation({ id: '018f0000-0000-7000-8000-000000000a02', source: 'failure', status: 'failed', costVerification: 'pending_reconciliation', providerCost: null, providerCostUnit: null, costReason: 'outcome_unknown', generationId: null, reservationId: null, reservationStatus: null, reservedCredits: null, settledCredits: null })]));
    renderWithClient(<OperationsTab filters={{}} />);
    expect(await screen.findByText('Failed')).toBeTruthy();
    expect(screen.getByText('No answer: the outcome is unknown')).toBeTruthy();
  });

  it('says so when nothing matches, and pages with a cursor', async () => {
    http.get.mockResolvedValueOnce(page([operation()], 'cursor-1')).mockResolvedValueOnce(page([operation({ id: '018f0000-0000-7000-8000-000000000a03', status: 'released', reservedCredits: '4.00000000', settledCredits: null, releasedCredits: '4.00000000' })]));
    renderWithClient(<OperationsTab filters={{ status: 'settled' }} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(http.get).toHaveBeenCalledWith('/admin/ai/credit-operations', { params: { status: 'settled', cursor: 'cursor-1', limit: 25 } }));
    expect(await screen.findByText('Released')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('opens a logical turn with every attempt and what is unresolved', async () => {
    http.get.mockImplementation(async (path: string) => {
      if (path === '/admin/ai/credit-operations') return page([operation()]);
      if (path.startsWith('/admin/ai/credit-operations/turns/')) return ok({ turnId: '018f0000-0000-7000-8000-000000000b01', organizationId: 'x', attempts: 3, failedAttempts: 1, verifiedAttempts: 1, unresolvedAttempts: 1, verifiedUsd: null, items: [operation(), operation({ id: '018f0000-0000-7000-8000-000000000a09', status: 'failed', source: 'failure', providerCost: null, providerCostUnit: null, costVerification: 'pending_reconciliation', costReason: 'outcome_unknown' })] });
      throw new Error(`unexpected GET ${path}`);
    });
    renderWithClient(<OperationsTab filters={{}} />);
    await userEvent.click(await screen.findByRole('button', { name: /Open turn/ }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Unresolved cost')).toBeTruthy();
    expect(within(dialog).getByText(/never charged and never counted as zero/)).toBeTruthy();
    expect(within(dialog).getAllByRole('row').length).toBe(3);
  });
});

describe('FilterBar', () => {
  it('opens on the last 30 days up to today, and turns a day range into an exclusive end', () => {
    const period = defaultPeriod(new Date(2026, 10, 21, 15, 0, 0));
    expect(period).toEqual({ from: '2026-10-23', to: '2026-11-21' });
    const filters = periodToFilters(period);
    expect(new Date(filters.to).getTime() - new Date(filters.from).getTime()).toBe(30 * 86_400_000);
  });

  it('refuses a workspace that is not an ID and a reversed range, before anything is asked', async () => {
    const apply = vi.fn();
    const draft = { from: '2026-11-10', to: '2026-11-01', organizationId: '', kind: '', model: '', status: '' as const };
    renderWithClient(<FilterBar initial={draft} onApply={apply} />);
    await userEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(await screen.findByText('The start must not be after the end')).toBeTruthy();
    await userEvent.clear(input('From'));
    await userEvent.type(input('From'), '2026-10-01');
    await userEvent.type(input('Workspace ID'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(await screen.findByText(/A workspace ID looks like/)).toBeTruthy();
    expect(apply).not.toHaveBeenCalled();
  });

  it('applies only the filters that were filled in', async () => {
    const apply = vi.fn();
    renderWithClient(<FilterBar initial={{ from: '2026-11-01', to: '2026-11-07', organizationId: '', kind: '', model: '', status: '' }} onApply={apply} />);
    await userEvent.type(input('AI feature'), 'tagging');
    await userEvent.type(input('Model'), 'vendor/model-b');
    await userEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(apply).toHaveBeenCalledTimes(1);
    expect(Object.keys(apply.mock.calls[0]![0]).sort()).toEqual(['from', 'kind', 'model', 'to']);
    expect(apply.mock.calls[0]![0]).toMatchObject({ kind: 'tagging', model: 'vendor/model-b' });
  });
});
