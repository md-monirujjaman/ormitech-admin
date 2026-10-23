import { axiosClient } from './axiosClient';
import type { DocAsset, DocPage, DocSection, PageInput, SectionInput } from '@/types/docs';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

/** The documentation endpoints on ormitech-api (super admin only). Real HTTP; nothing here is fixture data. */
export const docsApi = {
  tree: () => unwrap<DocSection[]>(axiosClient.get('/admin/docs/tree')),
  page: (id: string) => unwrap<DocPage>(axiosClient.get(`/admin/docs/pages/${id}`)),

  createSection: (input: SectionInput & { title: string }) => unwrap<{ id: string }>(axiosClient.post('/admin/docs/sections', input)),
  updateSection: (id: string, input: Partial<SectionInput>) => unwrap<{ id: string }>(axiosClient.patch(`/admin/docs/sections/${id}`, input)),
  deleteSection: (id: string) => unwrap<null>(axiosClient.delete(`/admin/docs/sections/${id}`)),

  createPage: (input: PageInput & { sectionId: string; title: string }) => unwrap<DocPage>(axiosClient.post('/admin/docs/pages', input)),
  updatePage: (id: string, input: PageInput) => unwrap<DocPage>(axiosClient.patch(`/admin/docs/pages/${id}`, input)),
  deletePage: (id: string) => unwrap<null>(axiosClient.delete(`/admin/docs/pages/${id}`)),

  reorder: (kind: 'section' | 'page', parentId: string | null, ids: string[]) => unwrap<null>(axiosClient.post('/admin/docs/reorder', { kind, parentId, ids })),

  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('file', file, file.name);
    return unwrap<DocAsset>(axiosClient.post('/admin/docs/assets', form, { headers: { 'Content-Type': undefined }, timeout: 120_000 }));
  },
};
