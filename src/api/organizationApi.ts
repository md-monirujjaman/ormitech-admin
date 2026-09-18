import { axiosClient } from './axiosClient';
import type { Paginated } from '@/types/api';
import type { Organization, OrganizationInput, OrganizationListParams, TenantStatus } from '@/types/organization';

/**
 * Real HTTP calls for organization management against `ormitech-api`.
 *
 * None of these endpoints exist yet. This module defines the contract the Admin expects; it is only reachable
 * when `VITE_ADMIN_DATA_SOURCE=api`, which is not the default. Nothing here fabricates a response.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const organizationApi = {
  list: (params: OrganizationListParams) =>
    unwrap<Paginated<Organization>>(axiosClient.get('/admin/organizations', { params })),

  get: (id: string) => unwrap<Organization>(axiosClient.get(`/admin/organizations/${id}`)),

  create: (input: OrganizationInput) => unwrap<Organization>(axiosClient.post('/admin/organizations', input)),

  update: (id: string, input: OrganizationInput) => unwrap<Organization>(axiosClient.patch(`/admin/organizations/${id}`, input)),

  setStatus: (id: string, status: TenantStatus) => unwrap<Organization>(axiosClient.patch(`/admin/organizations/${id}/status`, { status })),
};
