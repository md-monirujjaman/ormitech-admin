import { axiosClient } from '@/api/axiosClient';
import type { BlogAsset, BlogList, BlogPost, BlogPostInput } from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

/**
 * The blog editor's calls to `ormitech-api` (`/admin/blog/*`). Super admins and content admins only; the API
 * enforces it. Pictures go to the platform's own storage under `blog/`, apart from any customer's files.
 */
export const blogApi = {
  list: (params: { status?: string; q?: string } = {}) => unwrap<BlogList>(axiosClient.get('/admin/blog/posts', { params })),
  get: (id: string) => unwrap<BlogPost>(axiosClient.get(`/admin/blog/posts/${id}`)),
  create: (input: BlogPostInput & { title: string }) => unwrap<BlogPost>(axiosClient.post('/admin/blog/posts', input)),
  update: (id: string, input: BlogPostInput) => unwrap<BlogPost>(axiosClient.patch(`/admin/blog/posts/${id}`, input)),
  remove: (id: string) => unwrap<null>(axiosClient.delete(`/admin/blog/posts/${id}`)),
  uploadImage: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return unwrap<BlogAsset>(axiosClient.post('/admin/blog/assets', body));
  },
};
