import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { storageApi } from '@/api/storageApi';
import type { StorageOrganizationsParams } from '@/types/storage';

export function useStorageOverview() {
  return useQuery({ queryKey: ['storage', 'overview'], queryFn: storageApi.overview });
}

export function useStorageOrganizations(params: StorageOrganizationsParams) {
  return useQuery({ queryKey: ['storage', 'organizations', params], queryFn: () => storageApi.organizations(params), placeholderData: keepPreviousData });
}

export function useStorageRecentFiles() {
  return useQuery({ queryKey: ['storage', 'recent-files'], queryFn: storageApi.recentFiles });
}

export function useStorageFailedProcessing() {
  return useQuery({ queryKey: ['storage', 'failed-processing'], queryFn: storageApi.failedProcessing });
}

export function useStoragePolicy() {
  return useQuery({ queryKey: ['storage', 'policy'], queryFn: storageApi.policy });
}
