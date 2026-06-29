import { useQuery } from '@tanstack/react-query';
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
  page?: number;
  page_size?: number;
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  const params = new URLSearchParams();
  if (filters.tenant_id) params.set('tenant_id', filters.tenant_id);
  if (filters.action) params.set('action', filters.action);
  if (filters.resource_type) params.set('resource_type', filters.resource_type);
  if (filters.user_id) params.set('user_id', filters.user_id);
  params.set('page', String(filters.page ?? 1));
  params.set('page_size', String(filters.page_size ?? 20));

  const path = `/api/v1/audit-logs?${params.toString()}`;

  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => gatewayFetch<AuditLogPage>({ path }),
  });
}
