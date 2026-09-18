import { axiosClient } from './axiosClient';
import type { Paginated } from '@/types/api';
import type { Payment, PaymentListParams } from '@/types/billing';

/**
 * Payment records on ormitech-api. These endpoints do not exist yet.
 *
 * The Admin reads payment records; it never talks to a payment gateway. Gateway credentials and secret keys
 * live on ormitech-api and must never reach this bundle.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const paymentApi = {
  list: (params: PaymentListParams) => unwrap<Paginated<Payment>>(axiosClient.get('/admin/payments', { params })),
  get: (id: string) => unwrap<Payment>(axiosClient.get(`/admin/payments/${id}`)),
};
