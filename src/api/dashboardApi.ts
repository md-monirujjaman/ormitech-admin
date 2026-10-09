import { axiosClient } from './axiosClient';

/** Platform-wide counts from ormitech-api's `GET /admin/dashboard/stats`, counted across every tenant. */
export interface DashboardStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  totalConversations: number;
  totalCustomers: number;
}

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const dashboardApi = {
  stats: () => unwrap<DashboardStats>(axiosClient.get('/admin/dashboard/stats')),
};
