import type { CreditBucket, CreditPolicy, CreditsOverview, LedgerEntry, Reservation, UsageCost } from '../types';

export const ORG = '99999999-9999-4999-8999-999999999999';

export const bucket = (overrides: Partial<CreditBucket> = {}): CreditBucket => ({
  id: 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1',
  source: 'admin_grant',
  label: 'Goodwill',
  expiresAt: null,
  expired: false,
  balance: '1000.00000000',
  reserved: '0.00000000',
  available: '1000.00000000',
  createdAt: '2026-11-01T09:00:00.000Z',
  ...overrides,
});

export const overview = (overrides: Partial<CreditsOverview> = {}): CreditsOverview => ({
  mode: { workspace: null, platform: 'off', effective: 'off', enforceAllowed: false },
  wallet: {
    available: '1000.00000000',
    reserved: '0.00000000',
    expiredUnswept: '0.00000000',
    bySource: [
      { source: 'plan_included', balance: '0.00000000', reserved: '0.00000000', available: '0.00000000' },
      { source: 'purchased', balance: '0.00000000', reserved: '0.00000000', available: '0.00000000' },
      { source: 'admin_grant', balance: '1000.00000000', reserved: '0.00000000', available: '1000.00000000' },
    ],
    buckets: [bucket()],
  },
  reconciliation: { ok: true, mismatches: [] },
  hasReservations: false,
  ...overrides,
});

export const entry = (overrides: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1',
  bucketId: 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1',
  entryType: 'credit',
  deltaBalance: '1000.00000000',
  deltaReserved: '0.00000000',
  balanceAfter: '1000.00000000',
  reservedAfter: '0.00000000',
  reservationId: null,
  usageCostId: null,
  reversesId: null,
  actorType: 'admin',
  actorId: 'a1',
  reason: 'fixture credit',
  createdAt: '2026-11-01T09:00:00.000Z',
  ...overrides,
});

export const usageCost = (overrides: Partial<UsageCost> = {}): UsageCost => ({
  id: 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1',
  usageRecordId: 'u1u1u1u1-u1u1-4u1u-8u1u-u1u1u1u1u1u1',
  kind: 'reply',
  provider: 'catalogue.provider-test.dev',
  model: 'fixture-model',
  endpoint: 'primary',
  status: 'final',
  reason: null,
  tokens: { input: '50', output: '10', cached: null },
  pricing: { priceHistoryId: 'h1', inputPerMillion: '1.50000000', outputPerMillion: '6.00000000', cachedInputPerMillion: null, currency: 'USD' },
  cost: '0.00013500000000',
  conversion: null,
  credits: null,
  creditsState: 'none',
  calculatedAt: '2026-11-01T10:00:00.000Z',
  finalizedAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});

export const reservation = (overrides: Partial<Reservation> = {}): Reservation => ({
  id: 'r1r1r1r1-r1r1-4r1r-8r1r-r1r1r1r1r1r1',
  status: 'finalized',
  kind: 'ai_reply',
  conversationId: null,
  messageId: null,
  estimatedCredits: '12000.00000000',
  chargedCredits: '135.00000000',
  shortfallCredits: '0.00000000',
  expiresAt: '2026-11-01T10:05:00.000Z',
  settledAt: '2026-11-01T10:00:05.000Z',
  releaseReason: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});

export const policy = (overrides: Partial<CreditPolicy> = {}): CreditPolicy => ({
  mode: 'off',
  creditsPerCostUnit: null,
  costCurrency: null,
  markupPercent: null,
  rounding: 'half_up',
  estimateCharsPerToken: '3.00',
  reservationTtlSeconds: 300,
  conversionDecided: false,
  updatedAt: '2026-11-01T08:00:00.000Z',
  updatedBy: null,
  recovery: { scheduled: false, lastRunAt: null, lastResult: null, confirmedAt: null, confirmedBy: null, enforceAllowed: false },
  ...overrides,
});
