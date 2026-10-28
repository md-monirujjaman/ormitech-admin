import { axiosClient } from './axiosClient';

/** The platform's whole-workspace views: find a person or business, then read their workspace from A to Z. */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export interface IdentityMembership {
  organizationId: string;
  organizationName: string;
  organizationStatus: string;
  plan: string | null;
  role: string;
  memberStatus: string;
}
export interface IdentityPerson {
  id: string;
  name: string;
  email: string;
  status: string;
  lastActiveAt: string | null;
  createdAt: string;
  memberships: IdentityMembership[];
}
export interface IdentityWorkspace {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  status: string;
  plan: string | null;
  createdAt: string;
}
export interface IdentitySearchResult {
  query: string;
  people: IdentityPerson[];
  workspaces: IdentityWorkspace[];
}

export interface WorkspaceTotals {
  members: number;
  customers: number;
  conversations: number;
  messages: number;
  leads: number;
  orders: number;
  orderValue: number;
  products: number;
  channels: number;
  tickets: number;
  files: number;
  storageBytes: number;
  lastMessageAt: string | null;
}
export interface StatusCount {
  status: string;
  count: number;
  value?: number;
}
export interface WorkspaceTeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActiveAt: string | null;
  leads: number;
  conversations: number;
  openConversations: number;
}
export interface WorkspaceOverview {
  organization: { id: string; name: string; slug: string; email: string | null; phone: string | null; website: string | null; status: string; plan: string | null; createdAt: string };
  totals: WorkspaceTotals;
  leadsByStatus: StatusCount[];
  ordersByStatus: StatusCount[];
  conversationsByStatus: StatusCount[];
  channels: { id: string; type: string; name: string; status: string; createdAt: string }[];
  team: WorkspaceTeamMember[];
  unassigned: { leads: number; conversations: number };
  ai: { replies: number; tokens: number; cost: number };
  knowledge: { sources: number; failed: number };
  subscription: { status?: string; currentPeriodEnd?: string | null };
}

export interface WorkspacePage<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export interface WorkspaceOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  customerName: string;
  customerPhone: string | null;
  deliveryAddress: string | null;
  itemCount: number;
  createdAt: string;
}
export interface WorkspaceCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  conversations: number;
  orders: number;
  createdAt: string;
}

export const workspaceApi = {
  searchIdentities: (q: string) => unwrap<IdentitySearchResult>(axiosClient.get('/admin/identities', { params: { q } })),
  overview: (organizationId: string) => unwrap<WorkspaceOverview>(axiosClient.get(`/admin/organizations/${organizationId}/overview`)),
  orders: (organizationId: string, params: { page: number; search?: string; status?: string }) =>
    unwrap<WorkspacePage<WorkspaceOrder>>(axiosClient.get(`/admin/organizations/${organizationId}/orders`, { params })),
  customers: (organizationId: string, params: { page: number; search?: string }) =>
    unwrap<WorkspacePage<WorkspaceCustomer>>(axiosClient.get(`/admin/organizations/${organizationId}/customers`, { params })),
};
