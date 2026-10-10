import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { auditApi } from '@/api/auditApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AuditLogQuery } from '@/types/audit';

export function useAuditLogs(params: AuditLogQuery) {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(params),
    queryFn: () => auditApi.list(params),
    placeholderData: keepPreviousData,
    // The trail grows while it is being read; a stale page is misleading in a way a stale plan list is not.
    staleTime: 0,
  });
}
