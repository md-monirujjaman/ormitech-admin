import { axiosClient } from '@/api/axiosClient';
import type { CategoryInput, Tutorial, TutorialCategory, TutorialInput } from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

/** Tutorial categories and their YouTube videos, against `/admin/tutorials` on ormitech-api. Super admins and content admins only. */
export const tutorialsApi = {
  list: () => unwrap<TutorialCategory[]>(axiosClient.get('/admin/tutorials')),
  createCategory: (input: CategoryInput) => unwrap<TutorialCategory>(axiosClient.post('/admin/tutorials/categories', input)),
  updateCategory: (id: string, input: Partial<CategoryInput>) => unwrap<null>(axiosClient.patch(`/admin/tutorials/categories/${id}`, input)),
  removeCategory: (id: string) => unwrap<null>(axiosClient.delete(`/admin/tutorials/categories/${id}`)),
  create: (input: TutorialInput) => unwrap<Tutorial>(axiosClient.post('/admin/tutorials', input)),
  update: (id: string, input: Partial<TutorialInput>) => unwrap<Tutorial>(axiosClient.patch(`/admin/tutorials/${id}`, input)),
  remove: (id: string) => unwrap<null>(axiosClient.delete(`/admin/tutorials/${id}`)),
};
