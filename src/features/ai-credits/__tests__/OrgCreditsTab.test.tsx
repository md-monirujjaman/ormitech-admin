import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { apiFailure, ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import { OrgCreditsTab } from '../components/OrgCreditsTab';
import { bucket, entry, ORG, overview, reservation, usageCost } from './fixtures';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch', Mock>;
const BASE = `/admin/organizations/${ORG}`;

interface Served {
  overview?: ReturnType<typeof overview>;
  ledger?: Array<{ items: ReturnType<typeof entry>[]; nextCursor: string | null }>;
  costs?: Array<{ items: ReturnType<typeof usageCost>[]; nextCursor: string | null }>;
  reservations?: ReturnType<typeof reservation>[];
}

function serve(served: Served = {}) {
  const ledgerPages = served.ledger ?? [{ items: [entry()], nextCursor: null }];
  const costPages = served.costs ?? [{ items: [], nextCursor: null }];
  http.get.mockImplementation(async (path: string, config?: { params?: { cursor?: string } }) => {
    if (path === `${BASE}/ai-credits`) return ok(served.overview ?? overview());
    if (path === `${BASE}/ai-credits/ledger`) return ok(ledgerPages[config?.params?.cursor ? 1 : 0] ?? ledgerPages[0]);
    if (path === `${BASE}/ai-usage-costs`) return ok(costPages[config?.params?.cursor ? 1 : 0] ?? costPages[0]);
    if (path === `${BASE}/ai-credits/reservations`) return ok(served.reservations ?? []);
    throw new Error(`unexpected GET ${path}`);
  });
}

const mount = (canWrite = true) => renderWithClient(<OrgCreditsTab organizationId={ORG} canWrite={canWrite} />);

describe('OrgCreditsTab', () => {
  beforeEach(() => serve());

  it('shows the wallet by source, what is free and held, the mode and that the books reconcile', async () => {
    serve({ overview: overview({ wallet: { ...overview().wallet, reserved: '120.50000000', available: '879.50000000' } }) });
    mount();
    expect(await screen.findByText('Available now')).toBeTruthy();
    expect(screen.getByText('879.5')).toBeTruthy();
    expect(screen.getByText('120.5')).toBeTruthy();
    expect(screen.getByText('Reconciled')).toBeTruthy();
    expect(screen.getAllByText('Admin grant').length).toBeGreaterThan(0);
    expect(screen.getByText('Plan-included')).toBeTruthy();
    expect(screen.getByText('Purchased')).toBeTruthy();
    expect(screen.getByText(/Following the platform \(Off\)/)).toBeTruthy();
  });

  it('says what a mismatch is and tells the administrator not to fix it by hand', async () => {
    serve({ overview: overview({ reconciliation: { ok: false, mismatches: [{ organizationId: ORG, bucketId: 'abcdef12-0000-4000-8000-000000000000', check: 'ledger_balance', stored: '11.00000000', expected: '10.00000000' }] } }) });
    mount();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/does not match its ledger/);
    expect(alert.textContent).toMatch(/stored 11, ledger says 10/);
    expect(screen.getByText('1 mismatch')).toBeTruthy();
  });

  it('marks credit that has expired and has not been written off', async () => {
    serve({ overview: overview({ wallet: { ...overview().wallet, expiredUnswept: '40.00000000', buckets: [bucket({ expiresAt: '2026-10-01T00:00:00.000Z', expired: true, balance: '40.00000000', available: '40.00000000' })] } }) });
    mount();
    expect(await screen.findByText(/\(expired\)/)).toBeTruthy();
    expect(screen.getByText('Expired, not yet written off')).toBeTruthy();
  });

  it('shows an empty state for a workspace with no credit, no usage and no holds', async () => {
    serve({ overview: overview({ wallet: { ...overview().wallet, buckets: [] } }), ledger: [{ items: [], nextCursor: null }] });
    mount();
    expect(await screen.findByText('No credit yet')).toBeTruthy();
    expect(await screen.findByText('Nothing in the ledger')).toBeTruthy();
    expect(await screen.findByText('No AI usage yet')).toBeTruthy();
    expect(await screen.findByText('No reservations')).toBeTruthy();
  });

  it('explains a refusal for lack of permission plainly', async () => {
    http.get.mockRejectedValue(apiFailure(403, 'Forbidden'));
    mount();
    expect(await screen.findByText('Super admins only')).toBeTruthy();
  });

  it('shows the API’s message and a retry for any other failure', async () => {
    http.get.mockRejectedValueOnce(apiFailure(500, 'The books are busy'));
    mount();
    expect(await screen.findByText('The books are busy')).toBeTruthy();
    serve();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Available now')).toBeTruthy();
  });

  it('offers no change to someone who may only read', async () => {
    mount(false);
    await screen.findByText('Available now');
    expect(screen.queryByRole('button', { name: /Grant credits|Run expiry|Backfill|Adjust|Reverse/ })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Workspace mode' })).toBeNull();
  });

  describe('the ledger', () => {
    it('lists entries, pages with the cursor the API gave, and marks an entry that was reversed', async () => {
      const first = entry({ id: 'e2', entryType: 'reversal', deltaBalance: '-1000.00000000', reversesId: 'e1', reason: 'mistake', balanceAfter: '0.00000000' });
      const second = entry({ id: 'e1' });
      serve({ ledger: [{ items: [first], nextCursor: 'next-page' }, { items: [second], nextCursor: null }] });
      mount();
      expect(await screen.findByText('mistake')).toBeTruthy();
      expect(screen.getByText('-1,000')).toBeTruthy();
      await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
      expect(await screen.findByText('fixture credit')).toBeTruthy();
      expect(http.get).toHaveBeenCalledWith(`${BASE}/ai-credits/ledger`, { params: { cursor: 'next-page', limit: 25 } });
      expect(screen.getByText('Reversed')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    });

    it('reverses an entry only with a reason, with one key, once, and shows the refresh', async () => {
      http.post.mockResolvedValue(ok({ bucketId: 'b', ledgerId: 'l', replay: false, idempotencyKey: 'k' }));
      mount();
      await screen.findByText('fixture credit');
      await userEvent.click(screen.getByRole('button', { name: /Reverse the Credit of 1,000/ }));
      const dialog = await screen.findByRole('alertdialog');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Reverse entry' }));
      expect(within(dialog).getByText(/at least 3 characters/)).toBeTruthy();
      expect(http.post).not.toHaveBeenCalled();
      await userEvent.type(within(dialog).getByLabelText('Reason'), 'granted by mistake');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Reverse entry' }));
      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      const [path, body] = http.post.mock.calls[0] as [string, { ledgerEntryId: string; reason: string; idempotencyKey: string }];
      expect(path).toBe(`${BASE}/ai-credits/reversals`);
      expect(body).toMatchObject({ ledgerEntryId: 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1', reason: 'granted by mistake' });
      expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
      expect(await screen.findByText('The entry was reversed.')).toBeTruthy();
      // The screen reads the books again from the API.
      await waitFor(() => expect(http.get.mock.calls.filter((call) => call[0] === `${BASE}/ai-credits`).length).toBeGreaterThan(1));
    });

    it('shows the API’s refusal when a reversal cannot be made, and keeps the question open', async () => {
      http.post.mockRejectedValue(apiFailure(409, 'There is not enough credit for that'));
      mount();
      await screen.findByText('fixture credit');
      await userEvent.click(screen.getByRole('button', { name: /Reverse the Credit/ }));
      const dialog = await screen.findByRole('alertdialog');
      await userEvent.type(within(dialog).getByLabelText('Reason'), 'granted by mistake');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Reverse entry' }));
      expect(await within(dialog).findByText('There is not enough credit for that')).toBeTruthy();
      expect(screen.getByRole('alertdialog')).toBeTruthy();
    });

    it('offers a reversal only for entries that can be reversed', async () => {
      serve({ ledger: [{ items: [entry({ id: 'h', entryType: 'reserve', deltaBalance: '0.00000000', deltaReserved: '50.00000000' }), entry({ id: 'r', entryType: 'release', deltaBalance: '0.00000000', deltaReserved: '-50.00000000' }), entry({ id: 'd', entryType: 'debit', deltaBalance: '-12.00000000' })], nextCursor: null }] });
      mount();
      await screen.findByText('Hold');
      expect(screen.getAllByRole('button', { name: /^Reverse/ })).toHaveLength(1);
    });
  });

  describe('granting credits', () => {
    const open = async () => {
      mount();
      await screen.findByText('Available now');
      await userEvent.click(screen.getByRole('button', { name: 'Grant credits' }));
      return screen.findByRole('dialog');
    };

    it('checks the form, shows what will be added, and only then sends it with one key', async () => {
      http.post.mockResolvedValue(ok({ bucketId: 'b', ledgerId: 'l', replay: false, idempotencyKey: 'k' }));
      const dialog = await open();
      await userEvent.type(within(dialog).getByLabelText('Credits'), '0');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Review' }));
      expect(within(dialog).getByText('The amount must be more than zero')).toBeTruthy();
      expect(within(dialog).getByText(/at least 3 characters/)).toBeTruthy();
      expect(http.post).not.toHaveBeenCalled();

      await userEvent.clear(within(dialog).getByLabelText('Credits'));
      await userEvent.type(within(dialog).getByLabelText('Credits'), '250.5');
      await userEvent.type(within(dialog).getByLabelText('Reason'), 'goodwill after outage');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Review' }));
      expect(within(dialog).getByText(/Add 250.5 credits \(Admin grant\)\?/)).toBeTruthy();
      expect(http.post).not.toHaveBeenCalled();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Grant credits' }));

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      const [path, body] = http.post.mock.calls[0] as [string, Record<string, string>];
      expect(path).toBe(`${BASE}/ai-credits/grants`);
      expect(body).toMatchObject({ source: 'admin_grant', amount: '250.5', reason: 'goodwill after outage' });
      expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
      expect(await screen.findByText('250.5 credits were granted.')).toBeTruthy();
    });

    it('refuses an expiry in the past, and sends a future one as a time', async () => {
      const dialog = await open();
      await userEvent.type(within(dialog).getByLabelText('Credits'), '5');
      await userEvent.type(within(dialog).getByLabelText('Reason'), 'testing expiry');
      const expires = within(dialog).getByLabelText('Expires (optional)') as HTMLInputElement;
      await userEvent.type(expires, '2020-01-01T10:00');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Review' }));
      expect(within(dialog).getByText('The expiry must be in the future')).toBeTruthy();
      expect(http.post).not.toHaveBeenCalled();
    });

    it('shows the API’s refusal inside the dialog', async () => {
      http.post.mockRejectedValue(apiFailure(400, 'Validation failed', [{ field: 'amount', messages: ['amount must be a decimal with up to 8 places'] }]));
      const dialog = await open();
      await userEvent.type(within(dialog).getByLabelText('Credits'), '5');
      await userEvent.type(within(dialog).getByLabelText('Reason'), 'testing refusal');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Review' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Grant credits' }));
      expect(await within(dialog).findByText('amount must be a decimal with up to 8 places')).toBeTruthy();
    });

    it('goes back from the review to change a figure', async () => {
      const dialog = await open();
      await userEvent.type(within(dialog).getByLabelText('Credits'), '5');
      await userEvent.type(within(dialog).getByLabelText('Reason'), 'testing back');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Review' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Back' }));
      expect((within(dialog).getByLabelText('Credits') as HTMLInputElement).value).toBe('5');
      expect(http.post).not.toHaveBeenCalled();
    });
  });

  describe('adjusting a bucket', () => {
    const open = async () => {
      mount();
      await screen.findByText('Available now');
      await userEvent.click(screen.getByRole('button', { name: /Adjust Admin grant bucket/ }));
      return screen.findByRole('dialog');
    };

    it('takes credit away only after a review that says so, and sends the signed amount as text', async () => {
      http.post.mockResolvedValue(ok({ bucketId: 'b', ledgerId: 'l', replay: false, idempotencyKey: 'k' }));
      const dialog = await open();
      await userEvent.type(within(dialog).getByLabelText(/Credits/), '-30.25');
      await userEvent.type(within(dialog).getByLabelText('Reason'), 'correction after review');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Review' }));
      expect(within(dialog).getByText(/Take 30.25 credits from this bucket\?/)).toBeTruthy();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Make the adjustment' }));
      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      const [path, body] = http.post.mock.calls[0] as [string, Record<string, string>];
      expect(path).toBe(`${BASE}/ai-credits/adjustments`);
      expect(body).toMatchObject({ bucketId: 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1', amount: '-30.25', reason: 'correction after review' });
      expect(await screen.findByText('The adjustment was recorded in the ledger.')).toBeTruthy();
    });

    it('refuses zero and a missing reason without asking the API', async () => {
      const dialog = await open();
      await userEvent.type(within(dialog).getByLabelText(/Credits/), '0');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Review' }));
      expect(within(dialog).getByText('The amount cannot be zero')).toBeTruthy();
      expect(within(dialog).getByText(/at least 3 characters/)).toBeTruthy();
      expect(http.post).not.toHaveBeenCalled();
    });

    it('shows that there is not enough credit when the API refuses, and does not claim success', async () => {
      http.post.mockRejectedValue(apiFailure(409, 'There is not enough credit for that'));
      const dialog = await open();
      await userEvent.type(within(dialog).getByLabelText(/Credits/), '-99999');
      await userEvent.type(within(dialog).getByLabelText('Reason'), 'too much on purpose');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Review' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Make the adjustment' }));
      expect(await within(dialog).findByText('There is not enough credit for that')).toBeTruthy();
      expect(screen.queryByText('The adjustment was recorded in the ledger.')).toBeNull();
    });
  });

  describe('usage and cost', () => {
    it('shows the exact prices in force at the call, the cost and the credits, and why a request could not be priced', async () => {
      serve({
        costs: [
          {
            items: [
              usageCost({ conversion: { creditsPerCostUnit: '1000000', markupPercent: '0', rounding: 'half_up' }, credits: '135.00000000', creditsState: 'shadow' }),
              usageCost({ id: 'c2', status: 'no_usage', reason: 'provider_reported_no_usage', cost: null, pricing: { priceHistoryId: null, inputPerMillion: null, outputPerMillion: null, cachedInputPerMillion: null, currency: null }, tokens: { input: null, output: null, cached: null } }),
              usageCost({ id: 'c3', status: 'unpriced', reason: 'fallback_endpoint', cost: null, pricing: { priceHistoryId: null, inputPerMillion: null, outputPerMillion: null, cachedInputPerMillion: null, currency: null } }),
            ],
            nextCursor: null,
          },
        ],
      });
      mount();
      expect(await screen.findByText(/in 1.5 · out 6 USD/)).toBeTruthy();
      expect(screen.getByText('0.000135 USD')).toBeTruthy();
      expect(screen.getByText('counted, not charged')).toBeTruthy();
      expect(screen.getByText('no usage')).toBeTruthy();
      expect(screen.getAllByText(/The provider did not report token usage/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Answered by the fallback endpoint/).length).toBeGreaterThan(0);
      expect(screen.getAllByText('50 / 10 / —').length).toBe(2);
    });

    it('pages the usage', async () => {
      serve({ costs: [{ items: [usageCost()], nextCursor: 'more' }, { items: [usageCost({ id: 'c9', model: 'second-page-model' })], nextCursor: null }] });
      mount();
      await screen.findByText('fixture-model');
      await userEvent.click(screen.getAllByRole('button', { name: 'Load more' })[0]!);
      expect(await screen.findByText('second-page-model')).toBeTruthy();
      expect(http.get).toHaveBeenCalledWith(`${BASE}/ai-usage-costs`, { params: { cursor: 'more', limit: 25 } });
    });
  });

  describe('reservations', () => {
    it('shows how each hold ended', async () => {
      serve({ reservations: [reservation(), reservation({ id: 'r2', status: 'expired', chargedCredits: null, settledAt: '2026-11-01T10:06:00.000Z', releaseReason: 'expired without being settled' }), reservation({ id: 'r3', status: 'held', chargedCredits: null, settledAt: null }), reservation({ id: 'r4', shortfallCredits: '82.00000000' })] });
      mount();
      expect(await screen.findByText('expired')).toBeTruthy();
      expect(screen.getByText('held')).toBeTruthy();
      expect(screen.getAllByText('finalized')).toHaveLength(2);
      expect(screen.getByText(/expired without being settled/)).toBeTruthy();
      expect(screen.getByText('82')).toBeTruthy();
    });
  });

  describe('mode, expiry and backfill', () => {
    it('asks first when a workspace is set to enforce, says what it means, and sends only on confirmation', async () => {
      http.put.mockResolvedValue(ok({ organizationId: ORG, mode: 'enforce' }));
      mount();
      await screen.findByText('Available now');
      await userEvent.click(screen.getByRole('combobox', { name: 'Workspace mode' }));
      await userEvent.click(await screen.findByRole('option', { name: 'Enforce' }));
      const confirm = await screen.findByRole('alertdialog');
      expect(within(confirm).getByText('Enforce credits for this workspace?')).toBeTruthy();
      expect(within(confirm).getByText(/handed to a person/)).toBeTruthy();
      expect(http.put).not.toHaveBeenCalled();
      await userEvent.click(within(confirm).getByRole('button', { name: 'Enforce credits' }));
      await waitFor(() => expect(http.put).toHaveBeenCalledWith(`${BASE}/ai-credits/mode`, { mode: 'enforce' }));
      expect(await screen.findByText('The workspace’s credit mode was saved.')).toBeTruthy();
    });

    it('shows the API’s refusal for a mode inside the confirmation, which stays open', async () => {
      http.put.mockRejectedValue(apiFailure(500, 'The mode could not be stored'));
      mount();
      await screen.findByText('Available now');
      await userEvent.click(screen.getByRole('combobox', { name: 'Workspace mode' }));
      await userEvent.click(await screen.findByRole('option', { name: 'Observe' }));
      await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Change mode' }));
      const confirm = await screen.findByRole('alertdialog');
      expect(await within(confirm).findByText('The mode could not be stored')).toBeTruthy();
    });

    it('runs the expiry after a confirmation and reports what it did', async () => {
      http.post.mockResolvedValue(ok({ expired: '40.00000000', buckets: 1, released: 2 }));
      mount();
      await screen.findByText('Available now');
      await userEvent.click(screen.getByRole('button', { name: 'Run expiry' }));
      expect(http.post).not.toHaveBeenCalled();
      await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Run expiry' }));
      await waitFor(() => expect(http.post).toHaveBeenCalledWith(`${BASE}/ai-credits/expire`));
      expect(await screen.findByText('40 credits expired in 1 bucket(s); 2 stale hold(s) released.')).toBeTruthy();
    });

    it('backfills cost snapshots after a confirmation, and says they are not charged', async () => {
      http.post.mockResolvedValue(ok({ snapshots: 3 }));
      mount();
      await screen.findByText('Available now');
      await userEvent.click(screen.getByRole('button', { name: 'Backfill cost snapshots' }));
      const confirm = await screen.findByRole('alertdialog');
      expect(within(confirm).getByText(/counted and never charged/)).toBeTruthy();
      await userEvent.click(within(confirm).getByRole('button', { name: 'Backfill' }));
      expect(await screen.findByText('3 cost snapshot(s) made.')).toBeTruthy();
      expect(http.post).toHaveBeenCalledWith(`${BASE}/ai-usage-costs/backfill`);
    });
  });
});
