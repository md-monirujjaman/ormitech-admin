import { axiosClient } from '@/api/axiosClient';
import type {
  Branding,
  BrandingInput,
  DeliveryPage,
  DeliveryQuery,
  EmailPreview,
  PreviewRequest,
  TemplateDetail,
  TemplateSource,
  TemplateSummary,
  TestSendResult,
  VersionDetail,
  VersionInfo,
} from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);
const base = '/admin/email';
const template = (key: string) => `${base}/templates/${encodeURIComponent(key)}`;

/** `/admin/email` on ormitech-api. Super admins only: the API refuses everyone else, whatever this UI shows. */
export const emailApi = {
  list: () => unwrap<TemplateSummary[]>(axiosClient.get(`${base}/templates`)),
  get: (key: string) => unwrap<TemplateDetail>(axiosClient.get(template(key))),
  saveDraft: (key: string, source: TemplateSource) => unwrap<{ warnings: string[] }>(axiosClient.put(`${template(key)}/draft`, source)),
  discardDraft: (key: string) => unwrap<null>(axiosClient.delete(`${template(key)}/draft`)),
  publish: (key: string, note?: string) => unwrap<{ version: number }>(axiosClient.post(`${template(key)}/publish`, note ? { note } : {})),
  setEnabled: (key: string, enabled: boolean) => unwrap<null>(axiosClient.put(`${template(key)}/enabled`, { enabled })),
  versions: (key: string) => unwrap<VersionInfo[]>(axiosClient.get(`${template(key)}/versions`)),
  version: (key: string, version: number) => unwrap<VersionDetail>(axiosClient.get(`${template(key)}/versions/${version}`)),
  restore: (key: string, version: number, note?: string) => unwrap<{ version: number }>(axiosClient.post(`${template(key)}/restore/${version}`, note ? { note } : {})),
  preview: (key: string, request: PreviewRequest) => unwrap<EmailPreview>(axiosClient.post(`${template(key)}/preview`, request)),
  sendTest: (key: string, to: string, useDraft: boolean) => unwrap<TestSendResult>(axiosClient.post(`${template(key)}/test`, { to, useDraft })),
  branding: () => unwrap<Branding>(axiosClient.get(`${base}/branding`)),
  saveBranding: (input: BrandingInput) => unwrap<null>(axiosClient.put(`${base}/branding`, input)),
  logs: (query: DeliveryQuery, before?: string) =>
    unwrap<DeliveryPage>(axiosClient.get(`${base}/logs`, { params: { ...query, limit: 25, ...(before ? { before } : {}) } })),
  retry: (id: string) => unwrap<null>(axiosClient.post(`${base}/logs/${id}/retry`)),
};
