import { axiosClient } from '@/api/axiosClient';
import type { CostUnitInput, CreditMode, CreditSettings, Dashboard, FinancialInput, Filters, LimitsInput, LimitsList, OperationsPage, PilotWorkspace, Preview, TurnDetail } from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);
const BASE = '/admin/ai/credit-settings';

const params = (filters: Filters, extra: Record<string, string | number> = {}): { params: Record<string, string | number> } => {
  const out: Record<string, string | number> = { ...extra };
  for (const [key, value] of Object.entries(filters)) if (value) out[key] = value;
  return { params: out };
};

/** The credit system against `/admin/ai/...` on ormitech-api (super admins only). The API is the authority on every value: nothing here is defaulted. */
export const creditSystemApi = {
  settings: () => unwrap<CreditSettings>(axiosClient.get(BASE)),
  saveFinancial: (input: FinancialInput) => unwrap<CreditSettings>(axiosClient.put(`${BASE}/financial`, input)),
  saveCostUnit: (input: CostUnitInput) => unwrap<CreditSettings>(axiosClient.put(`${BASE}/cost-unit`, input)),
  preview: (verifiedCostUsd: string) => unwrap<Preview>(axiosClient.post(`${BASE}/preview`, { verifiedCostUsd })),
  setPilotRestriction: (expectedVersion: number, enabled: boolean) => unwrap<CreditSettings>(axiosClient.put(`${BASE}/pilot-restriction`, { expectedVersion, enabled })),

  pilotWorkspaces: () => unwrap<PilotWorkspace[]>(axiosClient.get(`${BASE}/pilot-workspaces`)),
  addPilotWorkspace: (organizationId: string, note: string) => unwrap<PilotWorkspace[]>(axiosClient.post(`${BASE}/pilot-workspaces`, note ? { organizationId, note } : { organizationId })),
  removePilotWorkspace: (organizationId: string) => unwrap<PilotWorkspace[]>(axiosClient.delete(`${BASE}/pilot-workspaces/${organizationId}`)),

  limits: () => unwrap<LimitsList>(axiosClient.get(`${BASE}/workspace-limits`)),
  saveLimits: (organizationId: string, input: LimitsInput) => unwrap<LimitsList>(axiosClient.put(`${BASE}/workspace-limits/${organizationId}`, input)),
  removeLimits: (organizationId: string) => unwrap<{ organizationId: string; cleared: boolean }>(axiosClient.delete(`${BASE}/workspace-limits/${organizationId}`)),

  dashboard: (filters: Filters) => unwrap<Dashboard>(axiosClient.get('/admin/ai/credit-dashboard', params(filters))),
  operations: (filters: Filters, cursor?: string) => unwrap<OperationsPage>(axiosClient.get('/admin/ai/credit-operations', params(filters, cursor ? { cursor, limit: 25 } : { limit: 25 }))),
  turn: (turnId: string) => unwrap<TurnDetail>(axiosClient.get(`/admin/ai/credit-operations/turns/${turnId}`)),

  /** The mode is the existing credit policy's: the same endpoint, the same audit, the same recovery rule. */
  setMode: (mode: CreditMode) => unwrap<unknown>(axiosClient.patch('/admin/ai/credit-policy', { mode })),
};
