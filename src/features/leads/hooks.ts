import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { crmApi } from '@/api/crmApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminLeadListParams } from '@/types/crm';

export function useLeads(params: AdminLeadListParams) {
  return useQuery({
    queryKey: queryKeys.leads.list(params),
    queryFn: () => crmApi.listLeads(params),
    placeholderData: keepPreviousData,
  });
}

export function useLead(organizationId: string | undefined, leadId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leads.detail(organizationId ?? '', leadId ?? ''),
    queryFn: () => crmApi.getLead(organizationId!, leadId!),
    enabled: Boolean(organizationId && leadId),
  });
}
