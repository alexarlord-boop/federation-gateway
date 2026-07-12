/**
 * BFF-proxied lookups against arbitrary external OpenID Federation entities.
 *
 * Both calls go through our backend (not directly from the browser) because:
 *   1. Real federation hosts generally don't set CORS headers for browser fetch.
 *   2. The backend applies an SSRF guard (https-only, private/loopback IPs blocked)
 *      before making the outbound request.
 *
 * See backend/app/routers/resolve.py for the server-side implementation.
 */
import { gatewayFetch } from '@/lib/gateway-fetch';

export interface ResolvedEntity {
  payload: Record<string, unknown>;
  raw_jwt: string;
}

/** Fetch and decode `${entityId}/.well-known/openid-federation`. Throws on failure. */
export async function resolveEntity(entityId: string): Promise<ResolvedEntity> {
  const result = await gatewayFetch<ResolvedEntity>({
    path: `/api/v1/admin/resolve?entity_id=${encodeURIComponent(entityId)}`,
  });
  if (result === null) throw new Error('Entity configuration not found');
  return result;
}

export interface TrustMarkStatusResult {
  active: boolean;
  [key: string]: unknown;
}

/**
 * Call a trust mark issuer's own `federation_trust_mark_status_endpoint`
 * (OIDF §8.3) to check whether a specific mark is still active.
 *
 * `trustMarkJwt` (the raw mark) is optional but strongly recommended — real
 * issuers disagree on the wire contract (confirmed against both a live
 * testbed and LightHouse): some accept GET + `sub`/`trust_mark_id` query
 * params returning plain JSON, others only accept POST with the raw JWT in
 * the body, returning a signed status-response JWT. The backend tries GET
 * first and falls back to POST using `trustMarkJwt` if that fails.
 */
export async function checkTrustMarkStatus(params: {
  statusEndpoint: string;
  sub: string;
  trustMarkId: string;
  trustMarkJwt?: string;
}): Promise<TrustMarkStatusResult> {
  const query = new URLSearchParams({
    status_endpoint: params.statusEndpoint,
    sub: params.sub,
    trust_mark_id: params.trustMarkId,
  });
  if (params.trustMarkJwt) query.set('trust_mark_jwt', params.trustMarkJwt);
  const result = await gatewayFetch<TrustMarkStatusResult>({
    path: `/api/v1/admin/trust-mark-status?${query.toString()}`,
  });
  if (result === null) throw new Error('Status endpoint returned no data');
  return result;
}

/**
 * Extract the `federation_trust_mark_status_endpoint` claim from a resolved
 * entity's metadata (federation_entity block), if published.
 */
export function getStatusEndpointFromEntity(payload: Record<string, unknown>): string | undefined {
  const metadata = payload.metadata as Record<string, unknown> | undefined;
  const fedEntity = metadata?.federation_entity as Record<string, unknown> | undefined;
  const endpoint = fedEntity?.federation_trust_mark_status_endpoint;
  return typeof endpoint === 'string' ? endpoint : undefined;
}
