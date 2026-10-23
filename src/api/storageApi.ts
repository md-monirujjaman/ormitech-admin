import { axiosClient } from './axiosClient';
import type {
  StorageFailedSource,
  StorageOrganizationsPage,
  StorageOrganizationsParams,
  StorageOverview,
  StoragePolicy,
  StorageRecentFile,
} from '@/types/storage';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

/** Super-admin storage endpoints on ormitech-api. Metadata only — nothing here returns a file's contents. */
export const storageApi = {
  overview: () => unwrap<StorageOverview>(axiosClient.get('/admin/storage/overview')),
  organizations: (params: StorageOrganizationsParams) =>
    unwrap<StorageOrganizationsPage>(axiosClient.get('/admin/storage/organizations', { params: { ...params, nearLimit: params.nearLimit || undefined } })),
  recentFiles: () => unwrap<StorageRecentFile[]>(axiosClient.get('/admin/storage/recent-files')),
  failedProcessing: () => unwrap<StorageFailedSource[]>(axiosClient.get('/admin/storage/failed-processing')),
  policy: () => unwrap<StoragePolicy>(axiosClient.get('/admin/storage/policy')),
};
