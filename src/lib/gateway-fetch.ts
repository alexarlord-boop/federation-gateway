/**
 * Gateway-scoped fetch helper.
 *
 * All gateway-only endpoints (trust-anchors, users, RBAC features, debug)
 * live on GATEWAY_BASE and need the same auth token that AuthContext puts
 * into `OpenAPI.TOKEN`.  This thin wrapper avoids duplicating the
 * "read token → build headers → check status" boilerplate in every hook.
 */

import { OpenAPI } from '@/client';
import { GATEWAY_BASE } from '@/lib/api-config';

function getToken(): string | undefined {
  return typeof OpenAPI.TOKEN === 'string' ? OpenAPI.TOKEN : undefined;
}

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface GatewayFetchOptions {
  /** Relative path appended to GATEWAY_BASE, e.g. `/api/v1/users` */
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Override the base URL (e.g. a specific backend baseUrl for debug/config) */
  baseUrl?: string;
  /** Status codes that should resolve to `null` instead of throwing */
  softFail?: number[];
}

/**
 * Perform a fetch against the gateway (or a supplied base URL).
 *
 * - Automatically injects the current Bearer token.
 * - Returns parsed JSON on success.
 * - Returns `null` for any status listed in `softFail`.
 * - Throws on any other non-2xx response.
 */
export async function gatewayFetch<T = unknown>(
  opts: GatewayFetchOptions,
): Promise<T | null> {
  const { path, method = 'GET', body, baseUrl, softFail = [] } = opts;
  const token = getToken();
  const url = `${baseUrl ?? GATEWAY_BASE}${path}`;

  const headers: Record<string, string> = {
    ...authHeaders(token),
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (softFail.includes(res.status)) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Gateway ${method} ${path} failed (${res.status}): ${text}`);
  }

  // 204 No Content
  if (res.status === 204) {
    return null;
  }

  return res.json() as Promise<T>;
}
