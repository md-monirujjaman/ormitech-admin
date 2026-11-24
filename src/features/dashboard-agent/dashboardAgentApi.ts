import { axiosClient } from '@/api/axiosClient';
import type { AgentFeedbackPage, AgentOverview, AgentSlot } from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

/** The client dashboard's AI Agent, against `/admin/dashboard-agent` on ormitech-api. Super admins only. */
export const dashboardAgentApi = {
  overview: () => unwrap<AgentOverview>(axiosClient.get('/admin/dashboard-agent')),
  saveModels: (input: { primaryRole: AgentSlot | null; backupRole: AgentSlot | null }) => unwrap<AgentOverview>(axiosClient.put('/admin/dashboard-agent/models', input)),
  feedback: (before?: string) => unwrap<AgentFeedbackPage>(axiosClient.get('/admin/dashboard-agent/feedback', { params: before ? { before } : undefined })),
};
