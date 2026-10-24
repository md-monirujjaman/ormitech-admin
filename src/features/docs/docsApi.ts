import { axiosClient } from '@/api/axiosClient';
import type {
  CreatePageInput,
  CreateSectionInput,
  DocAsset,
  DocPage,
  DocSectionNode,
  ReorderInput,
  UpdatePageInput,
  UpdateSectionInput,
} from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

/**
 * The documentation editor's calls to `ormitech-api` (`/admin/docs/*`). Super admins and content admins only;
 * the API enforces it. Images go to the platform's own storage under `docs/`, apart from any customer's files.
 */
export const docsApi = {
  tree: () => unwrap<DocSectionNode[]>(axiosClient.get('/admin/docs/tree')),
  icons: () => unwrap<string[]>(axiosClient.get('/admin/docs/icons')),

  createSection: (input: CreateSectionInput) => unwrap<unknown>(axiosClient.post('/admin/docs/sections', input)),
  updateSection: (id: string, input: UpdateSectionInput) => unwrap<unknown>(axiosClient.patch(`/admin/docs/sections/${id}`, input)),
  deleteSection: (id: string) => unwrap<null>(axiosClient.delete(`/admin/docs/sections/${id}`)),

  page: (id: string) => unwrap<DocPage>(axiosClient.get(`/admin/docs/pages/${id}`)),
  createPage: (input: CreatePageInput) => unwrap<DocPage>(axiosClient.post('/admin/docs/pages', input)),
  updatePage: (id: string, input: UpdatePageInput) => unwrap<DocPage>(axiosClient.patch(`/admin/docs/pages/${id}`, input)),
  deletePage: (id: string) => unwrap<null>(axiosClient.delete(`/admin/docs/pages/${id}`)),

  reorder: (input: ReorderInput) => unwrap<null>(axiosClient.post('/admin/docs/reorder', input)),

  uploadImage: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return unwrap<DocAsset>(axiosClient.post('/admin/docs/assets', body));
  },
};
