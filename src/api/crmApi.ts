import { axiosClient } from './axiosClient';
import type {
  AdminConversation,
  AdminConversationListParams,
  AdminLead,
  AdminLeadDetail,
  AdminLeadListParams,
  AdminMemberActivity,
  AdminMemberSession,
  AdminMessage,
  AdminPage,
} from '@/types/crm';

/**
 * The read-only views of a customer's own work: leads, conversations, message threads, and one team member's
 * activity and sign-in history.
 *
 * Not part of `AdminDataSource`. That interface exists for the screens that still have a fixture source
 * behind them; these have an endpoint and nothing else, so going through a second implementation would only
 * add a place for fixtures to appear. Every call here is real HTTP or an error.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const crmApi = {
  /** Leads across every organization — the platform-wide list. */
  listLeads: (params: AdminLeadListParams) => unwrap<AdminPage<AdminLead>>(axiosClient.get('/admin/leads', { params })),

  listOrganizationLeads: (organizationId: string, params: AdminLeadListParams) =>
    unwrap<AdminPage<AdminLead>>(axiosClient.get(`/admin/organizations/${organizationId}/leads`, { params })),

  getLead: (organizationId: string, leadId: string) =>
    unwrap<AdminLeadDetail>(axiosClient.get(`/admin/organizations/${organizationId}/leads/${leadId}`)),

  listConversations: (organizationId: string, params: AdminConversationListParams) =>
    unwrap<AdminPage<AdminConversation>>(axiosClient.get(`/admin/organizations/${organizationId}/conversations`, { params })),

  getConversation: (organizationId: string, conversationId: string) =>
    unwrap<AdminConversation>(axiosClient.get(`/admin/organizations/${organizationId}/conversations/${conversationId}`)),

  listMessages: (organizationId: string, conversationId: string, params: { page?: number; limit?: number; order?: 'asc' | 'desc' }) =>
    unwrap<AdminPage<AdminMessage>>(
      axiosClient.get(`/admin/organizations/${organizationId}/conversations/${conversationId}/messages`, { params }),
    ),

  listMemberActivity: (organizationId: string, memberId: string, params: { page?: number; limit?: number }) =>
    unwrap<AdminPage<AdminMemberActivity>>(
      axiosClient.get(`/admin/organizations/${organizationId}/users/${memberId}/activity`, { params }),
    ),

  listMemberSessions: (organizationId: string, memberId: string, params: { page?: number; limit?: number }) =>
    unwrap<AdminPage<AdminMemberSession>>(
      axiosClient.get(`/admin/organizations/${organizationId}/users/${memberId}/sessions`, { params }),
    ),
};
