/**
 * Hook: OIDC provider administration (super_admin only — `oidc_providers:manage`).
 *
 * Mirrors useRBACRoles.ts's shape: one query + mutations, each invalidating
 * the shared query key on success. Calls the gateway-only
 * `/api/v1/oidc/providers` endpoints (not part of the Admin API OAS).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gatewayFetch } from '@/lib/gateway-fetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OidcProvider {
  id: string;
  name: string;
  issuer_url: string;
  client_id: string;
  scopes: string;
  enabled: boolean;
  created_at?: string | null;
}

export interface CreateOidcProviderPayload {
  name: string;
  issuer_url: string;
  client_id: string;
  client_secret: string;
  scopes?: string;
  enabled?: boolean;
}

export interface UpdateOidcProviderPayload {
  name?: string;
  issuer_url?: string;
  client_id?: string;
  /** Blank/omitted = leave the stored secret unchanged. */
  client_secret?: string;
  scopes?: string;
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const oidcProviderKeys = {
  all: ['gateway', 'oidc-providers', 'admin'] as const,
  list: () => [...oidcProviderKeys.all, 'list'] as const,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOidcProviderAdmin() {
  const queryClient = useQueryClient();

  const query = useQuery<OidcProvider[]>({
    queryKey: oidcProviderKeys.list(),
    queryFn: async () => {
      const data = await gatewayFetch<OidcProvider[]>({
        path: '/api/v1/oidc/providers',
        softFail: [403, 404],
      });
      return data ?? [];
    },
  });

  const createProvider = useMutation({
    mutationFn: (payload: CreateOidcProviderPayload) =>
      gatewayFetch<OidcProvider>({
        path: '/api/v1/oidc/providers',
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oidcProviderKeys.all });
    },
  });

  const updateProvider = useMutation({
    mutationFn: ({ providerId, ...payload }: UpdateOidcProviderPayload & { providerId: string }) =>
      gatewayFetch<OidcProvider>({
        path: `/api/v1/oidc/providers/${providerId}`,
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oidcProviderKeys.all });
    },
  });

  const deleteProvider = useMutation({
    mutationFn: (providerId: string) =>
      gatewayFetch<null>({
        path: `/api/v1/oidc/providers/${providerId}`,
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oidcProviderKeys.all });
    },
  });

  return {
    providers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createProvider,
    updateProvider,
    deleteProvider,
  };
}
