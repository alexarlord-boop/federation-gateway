/**
 * Capability Context
 *
 * Provides capability information throughout the React component tree.
 * Components can use this to check if features are enabled and adapt the UI accordingly.
 *
 * The manifest is fetched via React Query so that:
 *   1. `queryClient.invalidateQueries({ queryKey: capabilityKeys.all })` triggers
 *      a real re-fetch (fixing the stale-after-RBAC-toggle bug).
 *   2. There is a single source of truth — no dual cache between a service
 *      singleton and React state.
 */

import { createContext, useContext, useCallback, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CapabilityManifest, FeatureCapability } from '@/services/capabilities';
import { useBackend } from '@/contexts/BackendContext';

// ---------------------------------------------------------------------------
// Query keys — exported so useRBACFeatures (and anything else) can invalidate
// ---------------------------------------------------------------------------
export const capabilityKeys = {
  all: ['capabilities'] as const,
  manifest: (baseUrl: string) => ['capabilities', baseUrl] as const,
};

// ---------------------------------------------------------------------------
// Fallback manifest (graceful degradation — all features enabled)
// ---------------------------------------------------------------------------
const FALLBACK_MANIFEST: CapabilityManifest = {
  version: '1.0.0',
  implementation: { name: 'Fallback Mode', version: '0.0.0' },
  features: {
    subordinates: { enabled: true, operations: ['list', 'create', 'read', 'update', 'delete', 'approve'] },
    trust_anchors: { enabled: true, operations: ['list', 'create', 'read', 'update'] },
    trust_marks: { enabled: true, operations: ['list', 'create', 'read'] },
    federation_trust_marks: { enabled: true, operations: ['list', 'create', 'read', 'update', 'delete'] },
    trust_mark_issuance: { enabled: true, operations: ['list', 'create', 'read', 'update', 'delete'] },
    jwks_management: { enabled: true, operations: ['list_keys', 'add_key', 'delete_key'] },
    entity_configuration: { enabled: true, operations: ['view', 'update'] },
    authority_hints: { enabled: true, operations: ['list', 'create', 'delete'] },
    keys: { enabled: true, operations: ['list', 'create', 'delete', 'rotate'] },
    general_constraints: { enabled: true, operations: ['view', 'update', 'delete'] },
    general_metadata_policies: { enabled: true, operations: ['view', 'update'] },
    entity_configuration_trust_marks: { enabled: true, operations: ['list', 'create', 'delete'] },
    entity_configuration_metadata: { enabled: true, operations: ['view', 'update'] },
  },
  rbac: { supported: false },
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------
async function fetchManifest(baseUrl: string): Promise<CapabilityManifest> {
  const res = await fetch(`${baseUrl}/api/v1/capabilities`);
  if (!res.ok) throw new Error(`Failed to fetch capabilities: ${res.statusText}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------
interface CapabilityContextType {
  capabilities: CapabilityManifest | null;
  isLoading: boolean;
  error: Error | null;
  isFeatureEnabled: (feature: string) => boolean;
  hasOperation: (feature: string, operation: string) => boolean;
  getEnabledFeatures: () => string[];
  refetch: () => Promise<void>;
}

const CapabilityContext = createContext<CapabilityContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
interface CapabilityProviderProps {
  children: ReactNode;
}

export function CapabilityProvider({ children }: CapabilityProviderProps) {
  const { selectedBackend } = useBackend();
  const queryClient = useQueryClient();

  const { data: manifest, isLoading, error: rawError } = useQuery<CapabilityManifest>({
    queryKey: capabilityKeys.manifest(selectedBackend.baseUrl),
    queryFn: () => fetchManifest(selectedBackend.baseUrl),
    staleTime: 5 * 60_000, // 5 min — re-fetched on invalidation anyway
    retry: 1,
    // On error React Query keeps data undefined; we supply fallback below
  });

  // Resolved manifest: real data, or fallback on error / first load
  const capabilities = manifest ?? (rawError ? FALLBACK_MANIFEST : null);

  const isFeatureEnabled = useCallback(
    (feature: string): boolean => {
      return capabilities?.features[feature]?.enabled ?? false;
    },
    [capabilities],
  );

  const hasOperation = useCallback(
    (feature: string, operation: string): boolean => {
      const f: FeatureCapability | undefined = capabilities?.features[feature];
      if (!f?.enabled) return false;
      return f.operations?.includes(operation) ?? false;
    },
    [capabilities],
  );

  const getEnabledFeatures = useCallback((): string[] => {
    if (!capabilities) return [];
    return Object.entries(capabilities.features)
      .filter(([, cap]) => cap.enabled)
      .map(([name]) => name);
  }, [capabilities]);

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: capabilityKeys.all });
  }, [queryClient]);

  const value: CapabilityContextType = {
    capabilities,
    isLoading,
    error: rawError instanceof Error ? rawError : rawError ? new Error(String(rawError)) : null,
    isFeatureEnabled,
    hasOperation,
    getEnabledFeatures,
    refetch,
  };

  return (
    <CapabilityContext.Provider value={value}>
      {children}
    </CapabilityContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Full capability context */
export function useCapabilities() {
  const context = useContext(CapabilityContext);
  if (!context) {
    throw new Error('useCapabilities must be used within CapabilityProvider');
  }
  return context;
}

/** Convenience hook for a single feature */
export function useFeature(featureName: string) {
  const { isFeatureEnabled, hasOperation } = useCapabilities();

  return {
    isEnabled: isFeatureEnabled(featureName),
    hasOperation: (operation: string) => hasOperation(featureName, operation),
  };
}
