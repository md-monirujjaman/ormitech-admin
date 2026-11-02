import { axiosClient } from '@/api/axiosClient';
import type { Allocation, Consistency, CreateInvoiceInput, InvoiceRecord, PlanAllowance, RecordPaymentInput, SetAllowanceInput, SubscriptionRecord } from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

/** Billing writes against `/admin/...` on ormitech-api (super admins only). The API is the authority: nothing is computed here. */
export const billingOpsApi = {
  allowance: (planId: string) => unwrap<PlanAllowance>(axiosClient.get(`/admin/plans/${planId}/ai-credits`)),
  setAllowance: (planId: string, input: SetAllowanceInput) => unwrap<PlanAllowance>(axiosClient.put(`/admin/plans/${planId}/ai-credits`, input)),
  clearAllowance: (planId: string) => unwrap<PlanAllowance>(axiosClient.delete(`/admin/plans/${planId}/ai-credits`)),
  allocate: (subscriptionId: string, reason: string) => unwrap<Allocation>(axiosClient.post(`/admin/subscriptions/${subscriptionId}/ai-credits/allocate`, { reason })),
  changePlan: (subscriptionId: string, planId: string, reason: string) => unwrap<SubscriptionRecord>(axiosClient.post(`/admin/subscriptions/${subscriptionId}/plan`, { planId, reason })),
  createInvoice: (input: CreateInvoiceInput) => unwrap<InvoiceRecord>(axiosClient.post('/admin/invoices', input)),
  issueInvoice: (invoiceId: string, dueAt?: string) => unwrap<InvoiceRecord>(axiosClient.post(`/admin/invoices/${invoiceId}/issue`, dueAt ? { dueAt } : {})),
  recordPayment: (invoiceId: string, input: RecordPaymentInput) => unwrap<InvoiceRecord>(axiosClient.post(`/admin/invoices/${invoiceId}/payments`, input)),
  consistency: () => unwrap<Consistency>(axiosClient.get('/admin/billing/consistency')),
};
