import type { CreditSettings, Dashboard, LimitsList, Operation, PilotWorkspace } from '../types';

/** The shipped state: nothing decided. Every figure in the tests is a fixture; none is a business value. */
export const settings = (overrides: Partial<CreditSettings> = {}): CreditSettings => ({
  version: 0,
  financial: { creditValueUsd: null, roundingMode: null, decimalPlaces: null, complete: false, missing: ['creditValueUsd', 'roundingMode', 'decimalPlaces'] },
  costUnit: { unit: null, usdFactor: null, verifiedAt: null, verifiedBy: null, evidence: null, verified: false },
  hold: { turnHoldCredits: null },
  mode: {
    platform: 'off',
    recoveryConfirmed: false,
    explanation: {
      off: 'No enforcement: nothing is blocked because of credit.',
      observe: 'Usage and credits are calculated and recorded, but nothing is deducted.',
      enforce: 'Credit is reserved before an AI request and settled after it.',
    },
  },
  pilot: { restricted: false, workspaces: 0, max: 500 },
  enforceReadiness: {
    ready: false,
    checks: [
      { key: 'financial_settings', required: true, ok: false, detail: 'Not set: creditValueUsd, markupPercentage, roundingMode, decimalPlaces.' },
      { key: 'hold_decided', required: true, ok: false, detail: 'The fixed hold per turn is not decided.' },
      { key: 'model_verified', required: true, ok: false, detail: 'No model has its provider cost verified as USD, so no cost can be billed.' },
      { key: 'recovery_confirmed', required: true, ok: false, detail: 'Credit recovery has not been confirmed.' },
      { key: 'pilot_restricted', required: false, ok: false, detail: 'Not restricted to a pilot.' },
    ],
  },
  legacyConversion: { decided: false, creditsPerCostUnit: null, costCurrency: null, markupPercent: null, rounding: 'half_up', consistency: { status: 'not_comparable', detail: 'Compared only when both are set.' } },
  observedCostUnits: ['openrouter_credits'],
  bounds: { markupMax: '10000', decimalPlaces: { min: 0, max: 8 }, roundingModes: ['ceil', 'floor', 'half_up', 'half_even'] },
  updatedAt: '2026-11-21T10:00:00.000Z',
  updatedBy: null,
  ...overrides,
});

export const decided = (overrides: Partial<CreditSettings> = {}): CreditSettings =>
  settings({
    version: 3,
    financial: { creditValueUsd: '0.0001', roundingMode: 'ceil', decimalPlaces: 2, complete: true, missing: [] },
    updatedBy: '018f0000-0000-7000-8000-0000000000aa',
    ...overrides,
  });

export const verifiedUnit = { unit: 'fixture_unit', usdFactor: '0.5', verifiedAt: '2026-11-20T09:00:00.000Z', verifiedBy: '018f0000-0000-7000-8000-0000000000aa', evidence: 'Compared with a recorded response in a test.', verified: true };

export const pilotRow = (overrides: Partial<PilotWorkspace> = {}): PilotWorkspace => ({
  organizationId: '018f0000-0000-7000-8000-000000000001',
  name: 'Fixture Shop',
  slug: 'fixture-shop',
  addedBy: '018f0000-0000-7000-8000-0000000000aa',
  addedAt: '2026-11-20T09:00:00.000Z',
  note: 'first pilot',
  ...overrides,
});

export const limitsList = (items: LimitsList['items'] = [], spendAvailable = false): LimitsList => ({ enforced: false, note: 'Limits are recorded and shown.', spendAvailable, items });

export const limitsRow = (overrides: Partial<LimitsList['items'][number]> = {}): LimitsList['items'][number] => ({
  organizationId: '018f0000-0000-7000-8000-000000000001',
  name: 'Fixture Shop',
  slug: 'fixture-shop',
  budgetUsd: '2',
  maxSpendUsd: '10',
  monthlyLimitUsd: '5',
  dailyLimitUsd: '1',
  perTurnLimitUsd: null,
  version: 1,
  updatedBy: '018f0000-0000-7000-8000-0000000000aa',
  updatedAt: '2026-11-20T09:00:00.000Z',
  spend: null,
  ...overrides,
});

const byStatus = { reserved: 1, settled: 1, released: 1, pending_reconciliation: 1, failed: 1, unknown_cost: 1, recorded: 2 };

export const dashboard = (overrides: Partial<Dashboard> = {}): Dashboard => ({
  period: { from: '2026-10-22T00:00:00.000Z', to: '2026-11-22T00:00:00.000Z' },
  filters: { organizationId: null, kind: null, model: null, status: null },
  statusDefinitions: {
    reserved: 'Credit is held for the request and not settled yet.',
    settled: 'A credit charge was made for the request.',
    released: 'The reservation was released without a charge.',
    pending_reconciliation: 'The provider’s cost was not reported: nothing was charged or estimated.',
    failed: 'The request got no usable answer.',
    unknown_cost: 'Recorded before cost capture existed.',
    recorded: 'Recorded; no credit was held or charged.',
  },
  costUnit: { verified: false, unit: null, usdFactor: null },
  requests: { total: 7, failed: 1, turns: 3, byStatus },
  cost: { verifiedUsd: null, settledUsd: null, verifiedRequests: null, unverified: [{ unit: 'fixture_unit', cost: '1.90000000000000', requests: 4 }], pendingReconciliation: 1, failedRequests: 1, unknown: 1 },
  wallet: {
    issued: '100.00000000',
    adjustmentsNet: '0',
    expired: '0',
    consumed: '5.50000000',
    debits: 2,
    outstandingBalance: '94.50000000',
    reservedNow: '10.00000000',
    reservedNowCount: 1,
    reservations: { byStatus: {}, settledCredits: '5.00000000', releasedCredits: '7.00000000' },
  },
  workspaces: {
    truncated: false,
    items: [{ organizationId: '018f0000-0000-7000-8000-000000000001', name: 'Fixture Shop', slug: 'fixture-shop', requests: 6, turns: 2, failed: 1, pendingReconciliation: 1, unknownCost: 1, verifiedUsd: null, unverifiedCost: '1.90000000000000', creditsConsumed: '5.5', balance: '94.5', reserved: '0' }],
  },
  byKind: [{ name: 'reply', requests: 6, pendingReconciliation: 1, failed: 1, verifiedUsd: null, unverifiedCost: '1.9' }],
  byModel: [{ name: 'vendor/model-a', requests: 6, pendingReconciliation: 1, failed: 1, verifiedUsd: null, unverifiedCost: '1.9' }],
  notes: { walletFilters: 'The wallet figures follow the period and the workspace.', outstandingIsNow: 'Outstanding balance is as of now.' },
  ...overrides,
});

export const operation = (overrides: Partial<Operation> = {}): Operation => ({
  id: '018f0000-0000-7000-8000-000000000a01',
  source: 'usage',
  organizationId: '018f0000-0000-7000-8000-000000000001',
  organizationName: 'Fixture Shop',
  turnId: '018f0000-0000-7000-8000-000000000b01',
  attemptId: '018f0000-0000-7000-8000-000000000c01',
  generationId: 'gen-abc',
  kind: 'reply',
  model: 'vendor/model-a',
  modelRole: 'slot1',
  status: 'settled',
  costVerification: 'unit_unverified',
  providerCost: '0.50000000000000',
  providerCostUnit: 'fixture_unit',
  costReason: null,
  verifiedUsd: null,
  reservationId: '018f0000-0000-7000-8000-000000000d01',
  reservationStatus: 'finalized',
  reservedCredits: '8.00000000',
  settledCredits: '5.00000000',
  releasedCredits: null,
  createdAt: '2026-11-18T12:00:00.000Z',
  ...overrides,
});
