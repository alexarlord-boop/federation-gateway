/**
 * Hook: gateway trust-anchor listing.
 *
 * Trust anchors are a **gateway-only** concept (not part of the Admin API
 * OpenAPI spec), so we call `GATEWAY_BASE/api/v1/admin/trust-anchors`
 * directly via `gatewayFetch`.
 *
 * Trust anchors are deployment-managed; this hook is read-only.
 */

import { useQuery } from '@tanstack/react-query';
import { gatewayFetch } from '@/lib/gateway-fetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrustAnchorDisplay {
  id: string;
  entityId: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  subordinateCount?: number;
  adminApiBaseUrl?: string;
  deploymentManaged?: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const trustAnchorKeys = {
  all: ['gateway', 'trust-anchors'] as const,
  list: () => [...trustAnchorKeys.all, 'list'] as const,
};

// ---------------------------------------------------------------------------
// Raw-data → display mapper
// ---------------------------------------------------------------------------

function toDisplay(ta: any): TrustAnchorDisplay {
  return {
    id: ta.id,
    entityId: ta.entity_id ?? ta.entityId,
    name: ta.name,
    type: ta.type,
    status: ta.status,
    description: ta.description,
    subordinateCount: ta.subordinate_count ?? ta.subordinateCount,
    adminApiBaseUrl: ta.admin_api_base_url ?? ta.adminApiBaseUrl,
    deploymentManaged: ta.deployment_managed ?? ta.deploymentManaged ?? false,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** List all trust anchors registered in the gateway (read-only). */
export function useGatewayTrustAnchors() {
  const query = useQuery({
    queryKey: trustAnchorKeys.list(),
    queryFn: async () => {
      const data = await gatewayFetch<any[]>({
        path: '/api/v1/admin/trust-anchors',
        softFail: [403],
      });
      return (data ?? []).map(toDisplay);
    },
  });

  return {
    trustAnchors: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
