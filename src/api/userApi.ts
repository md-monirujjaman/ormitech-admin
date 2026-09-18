import { axiosClient } from './axiosClient';
import type { OrganizationUser, OrganizationUserInput, OrganizationUserStatus } from '@/types/organization';

/** Organization-scoped user management on ormitech-api. These endpoints do not exist yet — see `organizationApi`. */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const userApi = {
  list: (organizationId: string) => unwrap<OrganizationUser[]>(axiosClient.get(`/admin/organizations/${organizationId}/users`)),

  create: (organizationId: string, input: OrganizationUserInput) =>
    unwrap<OrganizationUser>(axiosClient.post(`/admin/organizations/${organizationId}/users`, input)),

  update: (organizationId: string, userId: string, input: OrganizationUserInput) =>
    unwrap<OrganizationUser>(axiosClient.patch(`/admin/organizations/${organizationId}/users/${userId}`, input)),

  setStatus: (organizationId: string, userId: string, status: OrganizationUserStatus) =>
    unwrap<OrganizationUser>(axiosClient.patch(`/admin/organizations/${organizationId}/users/${userId}/status`, { status })),
};
