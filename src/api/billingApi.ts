import { axiosClient } from './axiosClient';
import type { BillingCharts, BillingSummary } from '@/types/billing';

/** Aggregate billing figures for the billing dashboard. These endpoints do not exist yet. */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const billingApi = {
  summary: () => unwrap<BillingSummary>(axiosClient.get('/admin/billing/summary')),
  charts: () => unwrap<BillingCharts>(axiosClient.get('/admin/billing/charts')),
};
