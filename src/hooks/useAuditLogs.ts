import { useInfiniteQuery } from '@tanstack/react-query';
import { gatewayFetch } from '@/lib/gateway-fetch';

export interface AuditLogEntry {
  id: string;
  tenant_id: string | null;
  user_id: string;
  user_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: string | null;
  created_at: string;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
}

export interface AuditLogFilters {
  tenant_id?: string;
  action?: string;
  resource_type?: string;
  user_id?: string;
}

function buildAuditLogPath(filters: AuditLogFilters, page: number, pageSize: number): string {
  const params = new URLSearchParams();
  if (filters.tenant_id) params.set('tenant_id', filters.tenant_id);
  if (filters.action) params.set('action', filters.action);
  if (filters.resource_type) params.set('resource_type', filters.resource_type);
  if (filters.user_id) params.set('user_id', filters.user_id);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  return `/api/v1/audit-logs?${params.toString()}`;
}

/**
 * Changing any filter value changes the query key, so React Query starts
 * a fresh accumulation from page 1 automatically — it does not append onto
 * results fetched under the old filter.
 */
export function useInfiniteAuditLogs(filters: AuditLogFilters = {}, pageSize = 20) {
  return useInfiniteQuery({
    queryKey: ['audit-logs-infinite', filters, pageSize],
    queryFn: ({ pageParam }) =>
      gatewayFetch<AuditLogPage>({ path: buildAuditLogPath(filters, pageParam, pageSize) }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      const fetchedSoFar = lastPage.page * lastPage.page_size;
      return fetchedSoFar < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });
}
