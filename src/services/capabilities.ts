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
  permissions?: string[];
}

/**
 * Singleton service for managing capability information
 */
class CapabilityService {
  private manifests: Record<string, CapabilityManifest> = {};
  private fetchPromises: Record<string, Promise<CapabilityManifest>> = {};

  /**
   * Fetch capabilities from the backend
   */
  async fetchCapabilities(baseUrl: string = OpenAPI.BASE): Promise<CapabilityManifest> {
    const cacheKey = baseUrl || '__default__';

    // Return cached promise if already fetching
    if (this.fetchPromises[cacheKey]) {
      return this.fetchPromises[cacheKey];
    }

    // Return cached manifest if already fetched
    if (this.manifests[cacheKey]) {
      return this.manifests[cacheKey];
    }

    // Fetch from backend using OpenAPI BASE
    const url = `${baseUrl}/api/v1/capabilities`;
    
    this.fetchPromises[cacheKey] = fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch capabilities: ${response.statusText}`);
        }
        const manifest = await response.json();
        this.manifests[cacheKey] = manifest;
        return manifest;
      })
      .finally(() => {
        delete this.fetchPromises[cacheKey];
      });

    return this.fetchPromises[cacheKey];
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(featureName: string, baseUrl: string = OpenAPI.BASE): boolean {
    const cacheKey = baseUrl || '__default__';
    return this.manifests[cacheKey]?.features[featureName]?.enabled ?? false;
  }

  /**
   * Check if a feature supports a specific operation
   */
  hasOperation(featureName: string, operation: string, baseUrl: string = OpenAPI.BASE): boolean {
    const cacheKey = baseUrl || '__default__';
    const feature = this.manifests[cacheKey]?.features[featureName];
    if (!feature?.enabled) return false;
    return feature.operations?.includes(operation) ?? false;
  }

  /**
   * Get all enabled features
   */
  getEnabledFeatures(baseUrl: string = OpenAPI.BASE): string[] {
    const cacheKey = baseUrl || '__default__';
    const manifest = this.manifests[cacheKey];
    if (!manifest) return [];
    return Object.entries(manifest.features)
      .filter(([_, capability]) => capability.enabled)
      .map(([name, _]) => name);
  }

  /**
   * Get disabled features with reasons
   */
  getDisabledFeatures(baseUrl: string = OpenAPI.BASE): Array<{ name: string; reason: string }> {
    const cacheKey = baseUrl || '__default__';
    const manifest = this.manifests[cacheKey];
    if (!manifest) return [];
    return Object.entries(manifest.features)
      .filter(([_, capability]) => !capability.enabled)
      .map(([name, capability]) => ({
        name,
        reason: capability.reason || 'Not available',
      }));
  }

  /**
   * Get available roles for RBAC
   */
  getAvailableRoles(baseUrl: string = OpenAPI.BASE): RoleDefinition[] {
    const cacheKey = baseUrl || '__default__';
    return this.manifests[cacheKey]?.rbac.roles ?? [];
  }

  /**
   * Check if RBAC is supported
   */
  supportsRBAC(baseUrl: string = OpenAPI.BASE): boolean {
    const cacheKey = baseUrl || '__default__';
    return this.manifests[cacheKey]?.rbac.supported ?? false;
  }

  /**
   * Get the current manifest (may be null if not fetched)
   */
  getManifest(baseUrl: string = OpenAPI.BASE): CapabilityManifest | null {
    const cacheKey = baseUrl || '__default__';
    return this.manifests[cacheKey] ?? null;
  }

  /**
   * Clear cached manifest (useful for testing or re-fetching)
   */
  clearCache(baseUrl?: string): void {
    if (!baseUrl) {
      this.manifests = {};
      this.fetchPromises = {};
      return;
    }

    const cacheKey = baseUrl || '__default__';
    delete this.manifests[cacheKey];
    delete this.fetchPromises[cacheKey];
  }
}

// Export singleton instance
export const capabilityService = new CapabilityService();
