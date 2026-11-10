import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { monitoringApi } from '@/api/monitoringApi';
import { queryKeys } from '@/lib/queryKeys';

/** How often the panel asks again while it is open. */
export const MONITORING_REFRESH_MS = 30_000;

/** The API refuses a signed-in administrator who is not a super admin with 403 (and an expired session with 401). */
export const refusalStatus = (error: unknown): 401 | 403 | null => {
  if (!axios.isAxiosError(error)) return null;
  const status = error.response?.status;
  return status === 401 || status === 403 ? status : null;
};

/**
 * The monitoring snapshot, refreshed every 30 seconds while the tab is visible.
 *
 * `enabled` is false for anyone the UI already knows is not a super admin, so a plain administrator who opens the page does
 * not make a request the API would refuse (and record as a denied attempt) every 30 seconds. After a refusal it stops asking:
 * the answer will not change until their role does.
 */
export function useMonitoring(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.monitoring.snapshot,
    queryFn: monitoringApi.snapshot,
    enabled,
    staleTime: 0,
    refetchInterval: (query) => (refusalStatus(query.state.error) ? false : MONITORING_REFRESH_MS),
    retry: (failures, error) => !refusalStatus(error) && failures < 1,
  });
}
