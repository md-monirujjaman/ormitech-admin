import { axiosClient } from '@/api/axiosClient';
import type { AdjustInput, CreditMode, CreditPolicy, CreditsOverview, GrantInput, LedgerEntry, LedgerResult, Mismatch, Page, Reservation, ReverseInput, UpdatePolicyInput, UsageCost } from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);
const org = (organizationId: string) => `/admin/organizations/${organizationId}`;
const cursor = (value?: string): { params: Record<string, string | number> } => ({ params: value ? { cursor: value, limit: 25 } : { limit: 25 } });

/** AI credits against `/admin/...` on ormitech-api (super admins only). The API is the authority: every change here is a ledger entry it records. */
export const aiCreditsApi = {
  overview: (organizationId: string) => unwrap<CreditsOverview>(axiosClient.get(`${org(organizationId)}/ai-credits`)),
  ledger: (organizationId: string, after?: string) => unwrap<Page<LedgerEntry>>(axiosClient.get(`${org(organizationId)}/ai-credits/ledger`, cursor(after))),
  usageCosts: (organizationId: string, after?: string) => unwrap<Page<UsageCost>>(axiosClient.get(`${org(organizationId)}/ai-usage-costs`, cursor(after))),
  reservations: (organizationId: string) => unwrap<Reservation[]>(axiosClient.get(`${org(organizationId)}/ai-credits/reservations`)),

  setMode: (organizationId: string, mode: CreditMode | null) => unwrap<{ organizationId: string; mode: CreditMode | null }>(axiosClient.put(`${org(organizationId)}/ai-credits/mode`, { mode })),
  grant: (organizationId: string, input: GrantInput) => unwrap<LedgerResult>(axiosClient.post(`${org(organizationId)}/ai-credits/grants`, input)),
  adjust: (organizationId: string, input: AdjustInput) => unwrap<LedgerResult>(axiosClient.post(`${org(organizationId)}/ai-credits/adjustments`, input)),
  reverse: (organizationId: string, input: ReverseInput) => unwrap<LedgerResult>(axiosClient.post(`${org(organizationId)}/ai-credits/reversals`, input)),
  expire: (organizationId: string) => unwrap<{ expired: string; buckets: number; released: number }>(axiosClient.post(`${org(organizationId)}/ai-credits/expire`)),
  backfill: (organizationId: string) => unwrap<{ snapshots: number }>(axiosClient.post(`${org(organizationId)}/ai-usage-costs/backfill`)),

  policy: () => unwrap<CreditPolicy>(axiosClient.get('/admin/ai/credit-policy')),
  updatePolicy: (input: UpdatePolicyInput) => unwrap<CreditPolicy>(axiosClient.patch('/admin/ai/credit-policy', input)),
  reconciliation: () => unwrap<{ ok: boolean; mismatches: Mismatch[] }>(axiosClient.get('/admin/ai/credits/reconciliation')),
};
