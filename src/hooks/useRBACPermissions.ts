/**
 * Hook: RBAC permission listing.
 *
 * Permissions are a **gateway-only** concept.
 * Calls `GATEWAY_BASE/api/v1/rbac/permissions`.
 */

import { useQuery } from '@tanstack/react-query';
import { gatewayFetch } from '@/lib/gateway-fetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RBACPermission {
  id: number;
  feature: string;
  operation: string;
  description?: string | null;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const rbacPermissionKeys = {
  all: ['gateway', 'rbac-permissions'] as const,
  list: () => [...rbacPermissionKeys.all, 'list'] as const,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** List all RBAC permissions registered in the gateway. */
export function useRBACPermissions() {
  const query = useQuery<RBACPermission[]>({
    queryKey: rbacPermissionKeys.list(),
    queryFn: async () => {
      const data = await gatewayFetch<RBACPermission[]>({
        path: '/api/v1/rbac/permissions',
        softFail: [403, 404],
      });
      return data ?? [];
    },
  });

  return {
    permissions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
