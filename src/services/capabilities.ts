/**
 * Capability Discovery Service
 * 
 * This service fetches and manages backend capability information.
 * It allows the UI to adapt dynamically to different backend implementations
 * that may support different subsets of features.
 */

import { OpenAPI } from '../client/core/OpenAPI';

export interface CapabilityManifest {
  version: string;
  implementation: {
    name: string;
    version: string;
    vendor?: string;
  };
  features: Record<string, FeatureCapability>;
  rbac: {
    supported: boolean;
    roles?: RoleDefinition[];
    permissions_model?: 'feature-based' | 'endpoint-based' | 'custom';
  };
  extensions?: Record<string, boolean>;
}

export interface FeatureCapability {
  enabled: boolean;
  operations?: string[];
  endpoints?: string[];
  reason?: string;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description?: string;
  builtin?: boolean;
}

/**
 * Singleton service for managing capability information
 */
class CapabilityService {
  private manifest: CapabilityManifest | null = null;
  private fetchPromise: Promise<CapabilityManifest> | null = null;

  /**
   * Fetch capabilities from the backend
   */
  async fetchCapabilities(): Promise<CapabilityManifest> {
    // Return cached promise if already fetching
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Return cached manifest if already fetched
    if (this.manifest) {
      return this.manifest;
    }

    // Fetch from backend using OpenAPI BASE
    const url = `${OpenAPI.BASE}/api/v1/capabilities`;
    
    this.fetchPromise = fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch capabilities: ${response.statusText}`);
        }
        const manifest = await response.json();
        this.manifest = manifest;
        return manifest;
      })
      .finally(() => {
        this.fetchPromise = null;
      });

    return this.fetchPromise;
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(featureName: string): boolean {
    return this.manifest?.features[featureName]?.enabled ?? false;
  }

  /**
   * Check if a feature supports a specific operation
   */
  hasOperation(featureName: string, operation: string): boolean {
    const feature = this.manifest?.features[featureName];
    if (!feature?.enabled) return false;
    return feature.operations?.includes(operation) ?? false;
  }

  /**
   * Get all enabled features
   */
  getEnabledFeatures(): string[] {
    if (!this.manifest) return [];
    return Object.entries(this.manifest.features)
      .filter(([_, capability]) => capability.enabled)
      .map(([name, _]) => name);
  }

  /**
   * Get disabled features with reasons
   */
  getDisabledFeatures(): Array<{ name: string; reason: string }> {
    if (!this.manifest) return [];
    return Object.entries(this.manifest.features)
      .filter(([_, capability]) => !capability.enabled)
      .map(([name, capability]) => ({
        name,
        reason: capability.reason || 'Not available',
      }));
  }

  /**
   * Get available roles for RBAC
   */
  getAvailableRoles(): RoleDefinition[] {
    return this.manifest?.rbac.roles ?? [];
  }

  /**
   * Check if RBAC is supported
   */
  supportsRBAC(): boolean {
    return this.manifest?.rbac.supported ?? false;
  }

  /**
   * Get the current manifest (may be null if not fetched)
   */
  getManifest(): CapabilityManifest | null {
    return this.manifest;
  }

  /**
   * Clear cached manifest (useful for testing or re-fetching)
   */
  clearCache(): void {
    this.manifest = null;
    this.fetchPromise = null;
  }
}

// Export singleton instance
export const capabilityService = new CapabilityService();
