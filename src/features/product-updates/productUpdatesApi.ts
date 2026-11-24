import { axiosClient } from '@/api/axiosClient';
import type { ProductUpdate, ProductUpdateInput } from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

/** Product updates, against `/admin/product-updates` on ormitech-api. Super admins and content admins only. */
export const productUpdatesApi = {
  list: () => unwrap<ProductUpdate[]>(axiosClient.get('/admin/product-updates')),
  create: (input: ProductUpdateInput) => unwrap<ProductUpdate>(axiosClient.post('/admin/product-updates', input)),
  update: (id: string, input: Partial<ProductUpdateInput>) => unwrap<ProductUpdate>(axiosClient.patch(`/admin/product-updates/${id}`, input)),
  remove: (id: string) => unwrap<null>(axiosClient.delete(`/admin/product-updates/${id}`)),
};
