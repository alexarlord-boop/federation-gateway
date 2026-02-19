/**
 * Hook: RBAC feature management.
 *
 * Feature toggles are a **gateway-only** concept — the Admin API OAS does not
 * define `/rbac/features`.  These hooks call `GATEWAY_BASE/api/v1/rbac/features`.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gatewayFetch } from '@/lib/gateway-fetch';
import { capabilityKeys } from '@/contexts/CapabilityContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeatureConfig {
  feature_name: string;
  enabled: boolean;
  reason?: string | null;
  operations: string[];
}

export interface FeatureTogglePayload {
  enabled: boolean;
  reason?: string | null;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const rbacFeatureKeys = {
  all: ['gateway', 'rbac-features'] as const,
  list: () => [...rbacFeatureKeys.all, 'list'] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** List all RBAC feature configs from the gateway. */
export function useRBACFeatures() {
  const queryClient = useQueryClient();

  const query = useQuery<FeatureConfig[]>({
    queryKey: rbacFeatureKeys.list(),
    queryFn: async () => {
      const data = await gatewayFetch<FeatureConfig[]>({
        path: '/api/v1/rbac/features',
        softFail: [403, 404],
      });
      return data ?? [];
    },
  });

  const toggleFeature = useMutation({
    mutationFn: ({
      featureName,
      ...payload
    }: FeatureTogglePayload & { featureName: string }) =>
      gatewayFetch<FeatureConfig>({
        path: `/api/v1/rbac/features/${featureName}`,
        method: 'PATCH',
        body: { enabled: payload.enabled, reason: payload.reason },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbacFeatureKeys.all });
      // Invalidate capabilities so CapabilityGuard picks up the change immediately
      queryClient.invalidateQueries({ queryKey: capabilityKeys.all });
    },
  });

  return {
    features: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    toggleFeature,
  };
}
