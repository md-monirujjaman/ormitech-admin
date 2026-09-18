import { axiosClient } from './axiosClient';
import type { Paginated } from '@/types/api';
import type { Invoice, InvoiceListParams } from '@/types/billing';

/**
 * Invoice records on ormitech-api. These endpoints do not exist yet.
 *
 * `downloadUrl` is the seam for future PDF generation: the server renders and signs a URL, the Admin only
 * follows it. Nothing is generated in the browser.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const invoiceApi = {
  list: (params: InvoiceListParams) => unwrap<Paginated<Invoice>>(axiosClient.get('/admin/invoices', { params })),

  get: (id: string) => unwrap<Invoice>(axiosClient.get(`/admin/invoices/${id}`)),

  void: (id: string) => unwrap<Invoice>(axiosClient.patch(`/admin/invoices/${id}/void`)),

  /** Future PDF endpoint — returns a short-lived download URL the server generates. */
  downloadUrl: (id: string) => unwrap<{ url: string }>(axiosClient.get(`/admin/invoices/${id}/pdf`)),
};
