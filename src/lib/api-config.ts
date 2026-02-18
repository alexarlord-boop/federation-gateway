/**
 * API Configuration Helpers
 *
 * Two base URLs coexist:
 *
 * 1. GATEWAY_BASE – the Auth Gateway's own origin (login, trust-anchor CRUD,
 *    users, RBAC feature toggles, capabilities).  Consumers that talk to the
 *    gateway itself always use this.
 *
 * 2. PROXY_BASE – `${GATEWAY_BASE}/api/v1/proxy/${instanceId}`.
 *    The generated OpenAPI client (SubordinatesService, EntityConfigurationService, …)
 *    sets `OpenAPI.BASE = PROXY_BASE` so that every `url: '/api/v1/admin/…'`
 *    automatically routes through the gateway proxy to the right Admin API instance.
 */

import { OpenAPI } from '@/client';

/** Resolve the gateway's own base URL (same logic as BackendContext default) */
export const GATEWAY_BASE: string =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '' : 'http://localhost:8765');

/**
 * Build the proxy base URL for a given Admin API instance.
 *
 * Example: `getProxyBase('ta-1')` → `http://localhost:8765/api/v1/proxy/ta-1`
 *
 * The generated client then appends its own path, e.g.
 * `http://localhost:8765/api/v1/proxy/ta-1/api/v1/admin/subordinates`
 */
export function getProxyBase(instanceId: string): string {
  return `${GATEWAY_BASE}/api/v1/proxy/${encodeURIComponent(instanceId)}`;
}

/**
 * Point the generated OpenAPI client at a specific Admin API instance
 * (through the gateway proxy).  Pass `null` to reset to the gateway's own base.
 */
export function setActiveInstance(instanceId: string | null): void {
  OpenAPI.BASE = instanceId ? getProxyBase(instanceId) : GATEWAY_BASE;
}
