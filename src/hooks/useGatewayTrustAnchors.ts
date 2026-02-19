/**
 * Hook: gateway trust-anchor CRUD.
 *
 * Trust anchors are a **gateway-only** concept (not part of the Admin API
 * OpenAPI spec), so we call `GATEWAY_BASE/api/v1/admin/trust-anchors`
 * directly via `gatewayFetch`.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
}

export interface TrustAnchorCreate {
  name: string;
  entity_id: string;
  description?: string;
  type: string;
  status?: string;
  admin_api_base_url?: string;
}

export interface TrustAnchorConfig {
  organization_name?: string;
  homepage_uri?: string;
  contacts?: string[];
  admin_api_base_url?: string;
  jwks?: unknown;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const trustAnchorKeys = {
  all: ['gateway', 'trust-anchors'] as const,
  list: () => [...trustAnchorKeys.all, 'list'] as const,
  config: (id: string) => [...trustAnchorKeys.all, 'config', id] as const,
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
  };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** List all trust anchors registered in the gateway. */
export function useGatewayTrustAnchors() {
  const queryClient = useQueryClient();

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

  const createTrustAnchor = useMutation({
    mutationFn: (payload: TrustAnchorCreate) =>
      gatewayFetch({
        path: '/api/v1/admin/trust-anchors',
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trustAnchorKeys.all });
    },
  });

  const deleteTrustAnchor = useMutation({
    mutationFn: (id: string) =>
      gatewayFetch({
        path: `/api/v1/admin/trust-anchors/${id}`,
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trustAnchorKeys.all });
    },
  });

  return {
    trustAnchors: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createTrustAnchor,
    deleteTrustAnchor,
  };
}

/** Read / write per-TA configuration (org name, contacts, JWKS …). */
export function useGatewayTrustAnchorConfig(
  id: string | null,
  /** The base URL of the backend that owns this TA (may differ from GATEWAY_BASE). */
  backendBaseUrl?: string,
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: trustAnchorKeys.config(id ?? ''),
    enabled: !!id,
    queryFn: () =>
      gatewayFetch<TrustAnchorConfig>({
        path: `/api/v1/admin/trust-anchors/${id}/config`,
        baseUrl: backendBaseUrl,
      }),
  });

  const updateConfig = useMutation({
    mutationFn: (payload: TrustAnchorConfig) =>
      gatewayFetch({
        path: `/api/v1/admin/trust-anchors/${id}/config`,
        method: 'PUT',
        body: payload,
        baseUrl: backendBaseUrl,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trustAnchorKeys.config(id ?? '') });
      queryClient.invalidateQueries({ queryKey: trustAnchorKeys.list() });
    },
  });

  return {
    config: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    updateConfig,
  };
}
