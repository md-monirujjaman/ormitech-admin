import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { apiFailure, ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import { CreditPolicyTab } from '../components/CreditPolicyTab';
import { policy } from './fixtures';

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
    serve(policy({ ...decided, mode: 'observe' }));
    http.patch.mockResolvedValue(ok(policy({ ...decided, mode: 'enforce' })));
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

  it('says plainly when the API refuses with 403', async () => {
    http.get.mockRejectedValue(apiFailure(403, 'Forbidden'));
    mount();
    expect(await screen.findByText(/don’t have permission/)).toBeTruthy();
  });
});
