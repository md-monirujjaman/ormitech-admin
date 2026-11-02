import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { apiFailure, ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import { CreditPolicyTab } from '../components/CreditPolicyTab';
import { policy } from './fixtures';

const result = (overrides: Record<string, unknown> = {}) => ({
  startedAt: '2026-11-02T10:00:00.000Z',
  finishedAt: '2026-11-02T10:00:01.000Z',
  organizations: 2,
  failedOrganizations: 0,
  holdsReleased: 1,
  holdsSettled: 3,
  lateCharges: 1,
  snapshotsMade: 4,
  creditsCharged: '405.00000000',
  creditsShortfall: '0.00000000',
  remaining: { expiredHolds: 0, heldWithUsage: 0, unpaidUsage: 0, uncostedUsage: 0, total: 0 },
  ...overrides,
});
const confirmed = { scheduled: true, lastRunAt: '2026-11-02T10:00:01.000Z', lastResult: result(), confirmedAt: '2026-11-02T10:00:02.000Z', confirmedBy: 'a1', enforceAllowed: true };

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch', Mock>;

function serve(current = policy(), books: { ok: boolean; mismatches: unknown[] } = { ok: true, mismatches: [] }) {
  http.get.mockImplementation(async (path: string) => {
    if (path === '/admin/ai/credit-policy') return ok(current);
    if (path === '/admin/ai/credits/reconciliation') return ok(books);
    throw new Error(`unexpected GET ${path}`);
  });
}
const mount = (canWrite = true) => renderWithClient(<CreditPolicyTab canWrite={canWrite} />);
const decided = { creditsPerCostUnit: '1000.00000000', costCurrency: 'USD', markupPercent: '0.0000', conversionDecided: true };

describe('CreditPolicyTab', () => {
  beforeEach(() => serve());

  it('shows the shipped state: nothing decided, mode off, and that the books agree', async () => {
    mount();
    expect(await screen.findByText('Conversion not decided')).toBeTruthy();
    expect((screen.getByLabelText('Credits per 1 unit of currency') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Currency of the cost') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Markup (percent)') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Characters per token (estimate)') as HTMLInputElement).value).toBe('3');
    expect(await screen.findByText('All buckets reconcile')).toBeTruthy();
  });

  it('shows a decided conversion without the database padding', async () => {
    serve(policy({ ...decided, mode: 'observe' }));
    mount();
    expect(await screen.findByText('Conversion decided')).toBeTruthy();
    expect((screen.getByLabelText('Credits per 1 unit of currency') as HTMLInputElement).value).toBe('1000');
    expect((screen.getByLabelText('Markup (percent)') as HTMLInputElement).value).toBe('0');
    expect((screen.getByLabelText('Currency of the cost') as HTMLInputElement).value).toBe('USD');
  });

  it('will not review a mode that has nothing to convert with, or half a conversion, and asks the API nothing', async () => {
    mount();
    await screen.findByText('Conversion not decided');
    await userEvent.click(screen.getByRole('combobox', { name: 'Platform mode' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Observe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    expect(await screen.findByText(/Set the conversion before turning credits on/)).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Credits per 1 unit of currency'), '1000');
    await userEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    expect(await screen.findByText(/together, or leave all three empty/)).toBeTruthy();
    expect(http.patch).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('shows exactly what changes, asks, and sends the values as text', async () => {
    http.patch.mockResolvedValue(ok(policy({ ...decided })));
    mount();
    await screen.findByText('Conversion not decided');
    await userEvent.type(screen.getByLabelText('Credits per 1 unit of currency'), '1000');
    await userEvent.type(screen.getByLabelText('Currency of the cost'), 'USD');
    await userEvent.type(screen.getByLabelText('Markup (percent)'), '12.5');
    await userEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('rate not set → 1,000')).toBeTruthy();
    expect(within(confirm).getByText('currency not set → USD')).toBeTruthy();
    expect(within(confirm).getByText('markup not set → 12.5%')).toBeTruthy();
    expect(http.patch).not.toHaveBeenCalled();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Save policy' }));
    await waitFor(() => expect(http.patch).toHaveBeenCalledTimes(1));
    expect(http.patch).toHaveBeenCalledWith('/admin/ai/credit-policy', { mode: 'off', creditsPerCostUnit: '1000', costCurrency: 'USD', markupPercent: '12.5', rounding: 'half_up', estimateCharsPerToken: '3', reservationTtlSeconds: 300 });
    expect(await screen.findByText('The credit policy was saved.')).toBeTruthy();
  });

  it('warns strongly before enforcement is turned on for the whole platform', async () => {
    serve(policy({ ...decided, mode: 'observe', recovery: confirmed }));
    http.patch.mockResolvedValue(ok(policy({ ...decided, mode: 'enforce', recovery: confirmed })));
    mount();
    await screen.findByText('Conversion decided');
    await userEvent.click(screen.getByRole('combobox', { name: 'Platform mode' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Enforce' }));
    await userEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('Enforce credits across the platform?')).toBeTruthy();
    expect(within(confirm).getByText(/handed to a person/)).toBeTruthy();
    expect(within(confirm).getByText(/one at a time/)).toBeTruthy();
    expect(within(confirm).getByText('mode Observe → Enforce')).toBeTruthy();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(http.patch).not.toHaveBeenCalled();
  });

  it('shows the API’s refusal inside the confirmation, which stays open', async () => {
    http.patch.mockRejectedValue(apiFailure(409, 'A mode other than off needs the credit conversion (rate, currency and markup) to be set first'));
    serve(policy({ ...decided, mode: 'off' }));
    mount();
    await screen.findByText('Conversion decided');
    await userEvent.clear(screen.getByLabelText('Markup (percent)'));
    await userEvent.type(screen.getByLabelText('Markup (percent)'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Save policy' }));
    expect(await screen.findByText(/needs the credit conversion/)).toBeTruthy();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.queryByText('The credit policy was saved.')).toBeNull();
  });

  it('is read-only for someone who may not write', async () => {
    mount(false);
    await screen.findByText('Conversion not decided');
    expect(screen.queryByRole('button', { name: 'Review changes' })).toBeNull();
    expect((screen.getByLabelText('Currency of the cost') as HTMLInputElement).disabled).toBe(true);
  });

  it('reports a mismatch in the books by bucket, and can check again', async () => {
    serve(policy(), { ok: false, mismatches: [{ organizationId: 'aaaaaaaa-0000-4000-8000-000000000000', bucketId: 'bbbbbbbb-0000-4000-8000-000000000000', check: 'ledger_balance', stored: '11.00000000', expected: '10.00000000' }] });
    mount();
    const alert = await screen.findByText(/do not match their ledger/);
    expect(alert).toBeTruthy();
    expect(screen.getByText(/stored 11, ledger 10/)).toBeTruthy();
    serve();
    await userEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByText('All buckets reconcile')).toBeTruthy();
  });

  describe('crash recovery', () => {
    it('keeps enforce unavailable, and says why, until recovery is confirmed', async () => {
      mount();
      expect(await screen.findByText('Not confirmed: enforce is unavailable')).toBeTruthy();
      expect(screen.getByText(/does not run recovery by itself/)).toBeTruthy();
      expect(screen.getByText(/It has not run yet\./)).toBeTruthy();
      await userEvent.click(screen.getByRole('combobox', { name: 'Platform mode' }));
      const enforce = await screen.findByRole('option', { name: /Enforce/ });
      expect(enforce.getAttribute('aria-disabled')).toBe('true');
      expect(enforce.textContent).toMatch(/needs recovery confirmed/);
    });

    it('allows enforce once recovery is confirmed, and shows what the last run did', async () => {
      serve(policy({ ...decided, recovery: confirmed }));
      mount();
      expect(await screen.findByText('Confirmed: enforce may be used')).toBeTruthy();
      expect(screen.getByText('Nothing is left unfinished')).toBeTruthy();
      expect(screen.getByText('405')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Confirm recovery' })).toBeNull();
      await userEvent.click(screen.getByRole('combobox', { name: 'Platform mode' }));
      expect((await screen.findByRole('option', { name: 'Enforce' })).getAttribute('aria-disabled')).not.toBe('true');
    });

    it('runs recovery on request and shows the outcome from the API', async () => {
      http.post.mockResolvedValue(ok(result({ holdsSettled: 7 })));
      mount();
      await userEvent.click(await screen.findByRole('button', { name: 'Run recovery now' }));
      expect(await screen.findByText('Holds settled from their requests')).toBeTruthy();
      expect(http.post).toHaveBeenCalledWith('/admin/ai/credits/recovery/run');
      expect(within(screen.getByTestId('recovery-result')).getByText('7')).toBeTruthy();
    });

    it('confirms through the API, and shows the refusal inside the dialog when recovery is not clean', async () => {
      http.post.mockRejectedValue(apiFailure(409, 'Recovery is not clean yet: 1 workspace(s) failed, 2 item(s) unfinished, 0 bucket(s) out of balance'));
      mount();
      await userEvent.click(await screen.findByRole('button', { name: 'Confirm recovery' }));
      await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Run and confirm' }));
      expect(await within(screen.getByRole('alertdialog')).findByText(/Recovery is not clean yet/)).toBeTruthy();
      expect(http.post).toHaveBeenCalledWith('/admin/ai/credits/recovery/confirm');

      http.post.mockResolvedValue(ok({ confirmed: true, result: result() }));
      serve(policy({ recovery: confirmed }));
      await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Run and confirm' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(await screen.findByText('Confirmed: enforce may be used')).toBeTruthy();
    });

    it('offers no recovery buttons to someone who may not write', async () => {
      mount(false);
      await screen.findByText('Not confirmed: enforce is unavailable');
      expect(screen.queryByRole('button', { name: 'Run recovery now' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Confirm recovery' })).toBeNull();
    });
  });

  it('says plainly when the API refuses with 403', async () => {
    http.get.mockRejectedValue(apiFailure(403, 'Forbidden'));
    mount();
    expect(await screen.findByText(/don’t have permission/)).toBeTruthy();
  });
});
