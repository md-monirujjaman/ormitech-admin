import { axiosClient } from '@/api/axiosClient';
import type { CreateModeratorInput, Moderator, ModeratorActivity, SessionDetail, SessionList, SupportMe, SupportMessage, SupportNotifications, SupportOverview, SupportScope, SupportStatus, SupportPermission } from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);
const BASE = '/admin/support';

/** Fast Support against `/admin/support` on ormitech-api. Every route checks the exact support permission on the server. */
export const fastSupportApi = {
  me: () => unwrap<SupportMe>(axiosClient.get(`${BASE}/me`)),
  overview: () => unwrap<SupportOverview>(axiosClient.get(`${BASE}/overview`)),
  list: (params: { scope: SupportScope; search?: string; limit?: number; offset?: number }) => unwrap<SessionList>(axiosClient.get(`${BASE}/sessions`, { params })),
  detail: (id: string) => unwrap<SessionDetail>(axiosClient.get(`${BASE}/sessions/${id}`)),
  accept: (id: string) => unwrap<{ id: string; status: SupportStatus; moderatorName: string }>(axiosClient.post(`${BASE}/sessions/${id}/accept`)),
  reply: (id: string, body: string, file?: File | null) => {
    const form = new FormData();
    form.append('body', body);
    if (file) form.append('file', file, file.name);
    // Left for the browser to set, so the multipart boundary is included.
    return unwrap<SupportMessage>(axiosClient.post(`${BASE}/sessions/${id}/messages`, form, { headers: { 'Content-Type': undefined } }));
  },
  setAi: (id: string, enabled: boolean) => unwrap<{ sessionId: string; aiEnabled: boolean; status: SupportStatus }>(axiosClient.post(`${BASE}/sessions/${id}/ai`, { enabled })),
  addNote: (id: string, body: string) => unwrap<{ id: string; createdAt: string }>(axiosClient.post(`${BASE}/sessions/${id}/notes`, { body })),
  setStatus: (id: string, status: 'waiting_for_customer' | 'human_active' | 'ai_troubleshooting') => unwrap<{ sessionId: string; status: SupportStatus }>(axiosClient.post(`${BASE}/sessions/${id}/status`, { status })),
  resolve: (id: string) => unwrap<{ sessionId: string; status: SupportStatus }>(axiosClient.post(`${BASE}/sessions/${id}/resolve`)),
  reopen: (id: string) => unwrap<{ sessionId: string; status: SupportStatus }>(axiosClient.post(`${BASE}/sessions/${id}/reopen`)),
  reassign: (id: string, moderatorId: string) => unwrap<{ sessionId: string; moderatorId: string; moderatorName: string }>(axiosClient.post(`${BASE}/sessions/${id}/reassign`, { moderatorId })),
  attachment: async (id: string, attachmentId: string) => (await axiosClient.get<Blob>(`${BASE}/sessions/${id}/attachments/${attachmentId}`, { responseType: 'blob' })).data,
  notifications: () => unwrap<SupportNotifications>(axiosClient.get(`${BASE}/notifications`)),
  markNotificationsRead: () => unwrap<null>(axiosClient.post(`${BASE}/notifications/read`)),
  moderators: () => unwrap<Moderator[]>(axiosClient.get(`${BASE}/moderators`)),
  createModerator: (input: CreateModeratorInput) => unwrap<Moderator>(axiosClient.post(`${BASE}/moderators`, input)),
  updateModerator: (id: string, input: { name?: string; active?: boolean; permissions?: SupportPermission[] }) => unwrap<Moderator>(axiosClient.patch(`${BASE}/moderators/${id}`, input)),
  moderatorActivity: (id: string) => unwrap<ModeratorActivity>(axiosClient.get(`${BASE}/moderators/${id}/activity`)),
};
