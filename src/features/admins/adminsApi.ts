import { axiosClient } from '@/api/axiosClient';
import type { AdminAccount, AdminListParams, CreateAdminInput, UpdateAdminInput } from '@/types/auth';

/**
 * Administrator management, against the real `ormitech-api` endpoints.
 *
 * Not routed through `AdminDataSource`: that seam exists for the screens whose endpoints do not exist yet and
 * are served from fixtures meanwhile. These do exist, and an administrator account is the last thing that
 * should ever be shown from a fixture — a list that is not the real list is worse than an error.
 *
 * Every call here is refused by the API without the `super_admin` role. The UI hides the screen too, but that
 * is courtesy: the enforcement is `AdminRoleGuard` on the server.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export interface AdminPage {
  items: AdminAccount[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminRoleOption {
  name: string;
  description: string;
}

export const adminsApi = {
  list: (params: AdminListParams) => unwrap<AdminPage>(axiosClient.get('/admin/admins', { params })),

  roles: () => unwrap<AdminRoleOption[]>(axiosClient.get('/admin/admins/roles')),

  create: (input: CreateAdminInput) => unwrap<AdminAccount>(axiosClient.post('/admin/admins', input)),

  update: (id: string, input: UpdateAdminInput) => unwrap<AdminAccount>(axiosClient.patch(`/admin/admins/${id}`, input)),
};
