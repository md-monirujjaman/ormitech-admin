import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { apiFailure, ok } from '@/features/ai-catalog/__tests__/testUtils';
import { aiCreditsApi } from '../aiCreditsApi';
import { ORG, overview, policy } from './fixtures';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch', Mock>;

describe('aiCreditsApi', () => {
  beforeEach(() => {
    for (const method of ['get', 'post', 'put', 'patch'] as const) http[method].mockResolvedValue(ok({}));
  });

  it('reads a workspace’s credits from the API and unwraps the envelope', async () => {
    http.get.mockResolvedValueOnce(ok(overview()));
    await expect(aiCreditsApi.overview(ORG)).resolves.toEqual(overview());
    expect(http.get).toHaveBeenCalledWith(`/admin/organizations/${ORG}/ai-credits`);
    await aiCreditsApi.reservations(ORG);
    expect(http.get).toHaveBeenLastCalledWith(`/admin/organizations/${ORG}/ai-credits/reservations`);
  });

  it('pages the ledger and the costs with the cursor the API gave', async () => {
    await aiCreditsApi.ledger(ORG);
    expect(http.get).toHaveBeenLastCalledWith(`/admin/organizations/${ORG}/ai-credits/ledger`, { params: { limit: 25 } });
    await aiCreditsApi.ledger(ORG, 'abc');
    expect(http.get).toHaveBeenLastCalledWith(`/admin/organizations/${ORG}/ai-credits/ledger`, { params: { cursor: 'abc', limit: 25 } });
    await aiCreditsApi.usageCosts(ORG, 'xyz');
    expect(http.get).toHaveBeenLastCalledWith(`/admin/organizations/${ORG}/ai-usage-costs`, { params: { cursor: 'xyz', limit: 25 } });
  });

  it('sends each change with its idempotency key, as text amounts', async () => {
    await aiCreditsApi.grant(ORG, { source: 'admin_grant', amount: '0.00000001', reason: 'goodwill', idempotencyKey: 'key-1' });
    expect(http.post).toHaveBeenLastCalledWith(`/admin/organizations/${ORG}/ai-credits/grants`, { source: 'admin_grant', amount: '0.00000001', reason: 'goodwill', idempotencyKey: 'key-1' });
    await aiCreditsApi.adjust(ORG, { bucketId: 'b', amount: '-5.5', reason: 'correction', idempotencyKey: 'key-2' });
    expect(http.post).toHaveBeenLastCalledWith(`/admin/organizations/${ORG}/ai-credits/adjustments`, { bucketId: 'b', amount: '-5.5', reason: 'correction', idempotencyKey: 'key-2' });
    await aiCreditsApi.reverse(ORG, { ledgerEntryId: 'e', reason: 'mistake', idempotencyKey: 'key-3' });
    expect(http.post).toHaveBeenLastCalledWith(`/admin/organizations/${ORG}/ai-credits/reversals`, { ledgerEntryId: 'e', reason: 'mistake', idempotencyKey: 'key-3' });
  });

  it('calls the maintenance, mode and policy endpoints', async () => {
    await aiCreditsApi.setMode(ORG, 'observe');
    expect(http.put).toHaveBeenLastCalledWith(`/admin/organizations/${ORG}/ai-credits/mode`, { mode: 'observe' });
    await aiCreditsApi.setMode(ORG, null);
    expect(http.put).toHaveBeenLastCalledWith(`/admin/organizations/${ORG}/ai-credits/mode`, { mode: null });
    await aiCreditsApi.expire(ORG);
    expect(http.post).toHaveBeenLastCalledWith(`/admin/organizations/${ORG}/ai-credits/expire`);
    await aiCreditsApi.backfill(ORG);
    expect(http.post).toHaveBeenLastCalledWith(`/admin/organizations/${ORG}/ai-usage-costs/backfill`);
    http.get.mockResolvedValueOnce(ok(policy()));
    await expect(aiCreditsApi.policy()).resolves.toEqual(policy());
    expect(http.get).toHaveBeenLastCalledWith('/admin/ai/credit-policy');
    await aiCreditsApi.updatePolicy({ mode: 'observe', creditsPerCostUnit: '1000', costCurrency: 'USD', markupPercent: '0' });
    expect(http.patch).toHaveBeenLastCalledWith('/admin/ai/credit-policy', { mode: 'observe', creditsPerCostUnit: '1000', costCurrency: 'USD', markupPercent: '0' });
    await aiCreditsApi.reconciliation();
    expect(http.get).toHaveBeenLastCalledWith('/admin/ai/credits/reconciliation');
  });

  it.each([[401], [403], [409], [400]])('lets a %i from the API reach the caller untouched', async (status) => {
    http.get.mockRejectedValueOnce(apiFailure(status, 'Refused'));
    await expect(aiCreditsApi.overview(ORG)).rejects.toMatchObject({ response: { status } });
  });
});
