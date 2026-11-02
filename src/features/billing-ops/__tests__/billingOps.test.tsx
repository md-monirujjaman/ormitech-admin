import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { apiFailure, ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import { ConsistencyCard } from '../components/ConsistencyCard';
import { InvoiceActions, NewInvoiceDialog } from '../components/InvoiceOps';
import { PlanAllowanceSection } from '../components/PlanAllowanceSection';
import { billingOpsApi } from '../billingOpsApi';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', Mock>;

const undecided = { decided: false, credits: null, expiresAfterDays: null, note: null, updatedAt: null };
const decided = { decided: true, credits: '5000.00000000', expiresAfterDays: 30, note: null, updatedAt: '2026-11-01T00:00:00.000Z' };

beforeEach(() => vi.clearAllMocks());

describe('billingOpsApi', () => {
  it('talks to the billing endpoints and unwraps the envelope', async () => {
    http.get.mockResolvedValue(ok(undecided));
    await expect(billingOpsApi.allowance('p1')).resolves.toEqual(undecided);
    expect(http.get).toHaveBeenCalledWith('/admin/plans/p1/ai-credits');
    http.post.mockResolvedValue(ok({}));
    await billingOpsApi.allocate('s1', 'first period');
    expect(http.post).toHaveBeenLastCalledWith('/admin/subscriptions/s1/ai-credits/allocate', { reason: 'first period' });
    await billingOpsApi.recordPayment('i1', { amount: '10.00', currency: 'USD', reference: 'bank-1', idempotencyKey: 'key-1' });
    expect(http.post).toHaveBeenLastCalledWith('/admin/invoices/i1/payments', { amount: '10.00', currency: 'USD', reference: 'bank-1', idempotencyKey: 'key-1' });
  });
});

describe('PlanAllowanceSection', () => {
  it('says nothing is decided, and saves credits as text with the expiry', async () => {
    http.get.mockResolvedValue(ok(undecided));
    http.put.mockResolvedValue(ok(decided));
    renderWithClient(<PlanAllowanceSection planId="p1" canWrite />);
    expect(await screen.findByText('Not decided')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Credits per period'), '5000');
    await userEvent.type(screen.getByLabelText('Expire after (days)'), '30');
    await userEvent.click(screen.getByRole('button', { name: 'Save allowance' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/plans/p1/ai-credits', { credits: '5000', expiresAfterDays: 30 }));
  });

  it('refuses a bad number before sending anything, and shows the API refusal', async () => {
    http.get.mockResolvedValue(ok(decided));
    renderWithClient(<PlanAllowanceSection planId="p1" canWrite />);
    expect(await screen.findByText('Decided')).toBeTruthy();
    expect((screen.getByLabelText('Credits per period') as HTMLInputElement).value).toBe('5000');
    await userEvent.clear(screen.getByLabelText('Credits per period'));
    await userEvent.type(screen.getByLabelText('Credits per period'), '-1');
    await userEvent.click(screen.getByRole('button', { name: 'Save allowance' }));
    expect(await screen.findByText(/number with up to 8 decimals/)).toBeTruthy();
    expect(http.put).not.toHaveBeenCalled();
    http.put.mockRejectedValue(apiFailure(409, 'nope'));
    await userEvent.clear(screen.getByLabelText('Credits per period'));
    await userEvent.type(screen.getByLabelText('Credits per period'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Save allowance' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('is read-only without write permission and offers to stop including credits only once decided', async () => {
    http.get.mockResolvedValue(ok(decided));
    renderWithClient(<PlanAllowanceSection planId="p1" canWrite={false} />);
    await screen.findByText('Decided');
    expect((screen.getByLabelText('Credits per period') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save allowance' })).toBeNull();
  });
});

describe('invoices', () => {
  it('validates a new invoice locally, then sends the lines as text and lets the server do the totals', async () => {
    http.post.mockResolvedValue(ok({ id: 'i1', number: 'INV-2026-000001', status: 'draft' }));
    const onClose = vi.fn();
    renderWithClient(<NewInvoiceDialog organizations={[{ id: 'o1', name: 'Northwind' }]} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    expect(await screen.findByText('Choose the workspace.')).toBeTruthy();
    await userEvent.click(screen.getByRole('combobox', { name: 'Workspace' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Northwind' }));
    await userEvent.type(screen.getByLabelText('Currency'), 'usd');
    await userEvent.type(screen.getByLabelText('Line 1 description'), 'Plan');
    await userEvent.type(screen.getByLabelText('Line 1 unit amount'), '9.999');
    await userEvent.type(screen.getByLabelText('Reason'), 'monthly fee');
    await userEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    expect(await screen.findByText(/amount with up to two decimals/)).toBeTruthy();
    await userEvent.clear(screen.getByLabelText('Line 1 unit amount'));
    await userEvent.type(screen.getByLabelText('Line 1 unit amount'), '9.99');
    await userEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/invoices', { organizationId: 'o1', currency: 'USD', lines: [{ description: 'Plan', quantity: 1, unitAmount: '9.99' }], reason: 'monthly fee' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('issues a draft, and records a payment against an open invoice with a reference and an idempotency key', async () => {
    http.post.mockResolvedValue(ok({ id: 'i1' }));
    const done = vi.fn();
    const { unmount } = renderWithClient(<InvoiceActions invoice={{ id: 'i1', status: 'DRAFT', currency: 'USD', number: 'INV-1' }} onDone={done} />);
    await userEvent.click(screen.getByRole('button', { name: 'Issue invoice' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/invoices/i1/issue', {}));
    unmount();

    renderWithClient(<InvoiceActions invoice={{ id: 'i1', status: 'OPEN', currency: 'USD', number: 'INV-1' }} onDone={done} />);
    await userEvent.click(screen.getByRole('button', { name: 'Record a payment' }));
    expect(screen.getByText(/Nothing is charged to anyone/)).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Amount (USD)'), '10.00');
    await userEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    expect(await screen.findByText(/where the money came from/)).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Reference'), 'bank-1');
    await userEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    await waitFor(() => expect(http.post).toHaveBeenLastCalledWith('/admin/invoices/i1/payments', expect.objectContaining({ amount: '10.00', currency: 'USD', reference: 'bank-1', idempotencyKey: expect.stringMatching(/.{8,}/) })));
  });

  it('offers nothing on a paid or void invoice', () => {
    const { container } = renderWithClient(<InvoiceActions invoice={{ id: 'i1', status: 'PAID', currency: 'USD', number: 'INV-1' }} onDone={() => undefined} />);
    expect(container.textContent).toBe('');
  });
});

describe('ConsistencyCard', () => {
  it('says everything agrees, or lists what does not, read only', async () => {
    http.get.mockResolvedValue(ok({ planMismatches: [], workspacesWithoutSubscription: 3, unbalancedInvoices: [] }));
    const { unmount } = renderWithClient(<ConsistencyCard />);
    expect(await screen.findByText('Everything agrees')).toBeTruthy();
    expect(screen.getByText(/3 workspace\(s\) have no subscription yet/)).toBeTruthy();
    unmount();
    http.get.mockResolvedValue(ok({ planMismatches: [{ organizationId: 'aaaaaaaa-0000-4000-8000-000000000000', organizationPlan: 'starter', subscriptionPlan: 'growth', subscriptionStatus: 'active' }], workspacesWithoutSubscription: 0, unbalancedInvoices: [{ invoiceId: 'i1', number: 'INV-9', status: 'paid', total: '20.00', paid: '10.00' }] }));
    renderWithClient(<ConsistencyCard />);
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/different plan than the workspace uses/)).toBeTruthy();
    expect(within(alert).getByText(/INV-9 · paid · total 20.00, paid 10.00/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
