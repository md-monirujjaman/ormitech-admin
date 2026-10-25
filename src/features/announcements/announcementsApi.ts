import { axiosClient } from '@/api/axiosClient';
import type { Announcement, AnnouncementInput } from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

/** Announcements, against `/admin/announcements` on ormitech-api. Super admins and content admins only. */
export const announcementsApi = {
  list: () => unwrap<Announcement[]>(axiosClient.get('/admin/announcements')),
  create: (input: AnnouncementInput) => unwrap<Announcement>(axiosClient.post('/admin/announcements', input)),
  update: (id: string, input: Partial<AnnouncementInput>) => unwrap<Announcement>(axiosClient.patch(`/admin/announcements/${id}`, input)),
  remove: (id: string) => unwrap<null>(axiosClient.delete(`/admin/announcements/${id}`)),
};
