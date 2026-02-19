/**
 * Capability Context
 * 
 * Provides capability information throughout the React component tree.
 * Components can use this to check if features are enabled and adapt the UI accordingly.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CapabilityManifest, capabilityService } from '@/services/capabilities';
import { useBackend } from '@/contexts/BackendContext';

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

interface CapabilityProviderProps {
  children: ReactNode;
}

export function CapabilityProvider({ children }: CapabilityProviderProps) {
  const { selectedBackend } = useBackend();
  const [capabilities, setCapabilities] = useState<CapabilityManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCapabilities = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const manifest = await capabilityService.fetchCapabilities(selectedBackend.baseUrl);
      setCapabilities(manifest);
    } catch (err) {
      console.error('Failed to fetch capabilities:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Set default capabilities on error (all features ENABLED for graceful degradation)
      setCapabilities({
        version: '1.0.0',
        implementation: {
          name: 'Fallback Mode',
          version: '0.0.0',
        },
        features: {
          subordinates: { enabled: true, operations: ['list', 'create', 'read', 'update', 'delete', 'approve'] },
          trust_anchors: { enabled: true, operations: ['list', 'create', 'read', 'update'] },
          trust_marks: { enabled: true, operations: ['list', 'create', 'read'] },
          jwks_management: { enabled: true, operations: ['list_keys', 'add_key', 'delete_key'] },
          // Settings-relevant features (graceful degradation — show all tabs)
          entity_configuration: { enabled: true, operations: ['view', 'update'] },
          authority_hints: { enabled: true, operations: ['list', 'create', 'delete'] },
          keys: { enabled: true, operations: ['list', 'create', 'delete', 'rotate'] },
          general_constraints: { enabled: true, operations: ['view', 'update', 'delete'] },
          general_metadata_policies: { enabled: true, operations: ['view', 'update'] },
          entity_configuration_trust_marks: { enabled: true, operations: ['list', 'create', 'delete'] },
          entity_configuration_metadata: { enabled: true, operations: ['view', 'update'] },
        },
        rbac: {
          supported: false,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    capabilityService.clearCache(selectedBackend.baseUrl);
    fetchCapabilities();
  }, [selectedBackend.baseUrl]);

  const value: CapabilityContextType = {
    capabilities,
    isLoading,
    error,
    isFeatureEnabled: (feature: string) => capabilityService.isFeatureEnabled(feature, selectedBackend.baseUrl),
    hasOperation: (feature: string, operation: string) => capabilityService.hasOperation(feature, operation, selectedBackend.baseUrl),
    getEnabledFeatures: () => capabilityService.getEnabledFeatures(selectedBackend.baseUrl),
    refetch: fetchCapabilities,
  };

  return (
    <CapabilityContext.Provider value={value}>
      {children}
    </CapabilityContext.Provider>
  );
}

/**
 * Hook to access capability information
 */
export function useCapabilities() {
  const context = useContext(CapabilityContext);
  if (!context) {
    throw new Error('useCapabilities must be used within CapabilityProvider');
  }
  return context;
}

/**
 * Hook to check if a feature is enabled
 */
export function useFeature(featureName: string) {
  const { isFeatureEnabled, hasOperation } = useCapabilities();
  
  return {
    isEnabled: isFeatureEnabled(featureName),
    hasOperation: (operation: string) => hasOperation(featureName, operation),
  };
}

/**
 * Component to conditionally render based on feature availability
 */
interface FeatureGateProps {
  feature: string;
  operation?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, operation, children, fallback = null }: FeatureGateProps) {
  const { isFeatureEnabled, hasOperation } = useCapabilities();
  
  const isAvailable = operation
    ? hasOperation(feature, operation)
    : isFeatureEnabled(feature);
  
  return isAvailable ? <>{children}</> : <>{fallback}</>;
}
