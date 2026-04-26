/**
 * API Configuration Helpers
 *
 * Two base URLs coexist:
 *
 * 1. GATEWAY_BASE – the Auth Gateway's own origin (login, trust-anchor CRUD,
 *    users, RBAC feature toggles, capabilities).  Consumers that talk to the
 *    gateway itself always use this.
 *
 * 2. Proxy URL – `${GATEWAY_BASE}/api/v1/proxy/${instanceId}`.
 *    The generated OpenAPI client reads `OpenAPI.BASE` at **request time**
 *    via a getter that resolves to the proxy URL for the currently active
 *    instance — no global singleton mutation required.
 *
 * ── No-Instance Behavior (Task 4: Explicit Selection) ──────────────────────
 *
 * When no instance is selected (_activeInstanceId is null), `OpenAPI.BASE`
 * falls back to GATEWAY_BASE.  This supports gateway-scoped APIs (auth,
 * trust-anchor CRUD, RBAC, capabilities) while preventing instance-scoped
 * UI surfaces (Entities, Dashboard, Approvals, etc.) from issuing spurious
 * requests without an active instance context.  Pages that require an instance
 * guard with a no-instance fallback UI, ensuring users explicitly select a
 * deployment before performing instance-scoped operations.
 */

import { OpenAPI } from '@/client';

/** Resolve the gateway's own base URL (same logic as BackendContext default) */
export const GATEWAY_BASE: string =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '' : 'http://localhost:8765');

// ---------------------------------------------------------------------------
// Active-instance state  (module-level, NOT a global mutation)
// ---------------------------------------------------------------------------

let _activeInstanceId: string | null = null;

/**
 * Install a getter on `OpenAPI.BASE` so the generated client resolves the
 * correct proxy URL at **request time** — no more global singleton mutation.
 *
 * The generated `request.ts` reads `config.BASE` inside each request call,
 * so whichever instance is active at that moment determines the target URL.
 */
Object.defineProperty(OpenAPI, 'BASE', {
  get: () =>
    _activeInstanceId
      ? `${GATEWAY_BASE}/api/v1/proxy/${encodeURIComponent(_activeInstanceId)}`
      : GATEWAY_BASE,
  // Silently ignore direct writes — all routing goes through setActiveInstance.
  set: () => {},
  configurable: true,
  enumerable: true,
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Read the active instance ID (for query-key scoping). */
export function getActiveInstanceId(): string | null {
  return _activeInstanceId;
}

/**
 * Build the proxy base URL for a given Admin API instance.
 *
 * Example: `getProxyBase('ta-1')` → `http://localhost:8765/api/v1/proxy/ta-1`
 */
export function getProxyBase(instanceId: string): string {
  return `${GATEWAY_BASE}/api/v1/proxy/${encodeURIComponent(instanceId)}`;
}

/**
 * Point the generated OpenAPI client at a specific Admin API instance
 * (through the gateway proxy).  Pass `null` to reset to the gateway's own base.
 *
 * This updates the module-level variable read by the `OpenAPI.BASE` getter.
 * No global object mutation occurs.
 */
export function setActiveInstance(instanceId: string | null): void {
  _activeInstanceId = instanceId;
}
