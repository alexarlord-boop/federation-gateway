/**
 * TokenManager – centralised JWT lifecycle management.
 *
 * Responsibilities:
 *  1. Store access + refresh tokens (localStorage, scoped per backend).
 *  2. Provide a token resolver for `OpenAPI.TOKEN` so the generated client
 *     always gets a fresh token.
 *  3. Silently refresh when an access token expires (401 → refresh → retry).
 *  4. Queue concurrent callers during a refresh so only ONE refresh request
 *     is in-flight at a time.
 *  5. Force logout when the refresh token itself expires.
 */

import { OpenAPI } from '@/client';
import { GATEWAY_BASE } from '@/lib/api-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

type LogoutCallback = () => void;

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

let _backendScopeKey = '__same_origin__';
let _onForceLogout: LogoutCallback = () => {};

/** In-flight refresh promise — guarantees at most one concurrent refresh. */
let _refreshPromise: Promise<TokenPair | null> | null = null;

// ---------------------------------------------------------------------------
// localStorage key helpers
// ---------------------------------------------------------------------------

function accessTokenKey(): string {
  return `auth_token:${_backendScopeKey}`;
}

function refreshTokenKey(): string {
  return `auth_refresh_token:${_backendScopeKey}`;
}

function userKey(): string {
  return `auth_user:${_backendScopeKey}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise (or re-initialise) the manager for a backend scope.
 * Called once from `AuthProvider` whenever `selectedBackend` changes.
 */
export function initTokenManager(
  backendBaseUrl: string,
  onForceLogout: LogoutCallback,
): void {
  _backendScopeKey = backendBaseUrl || '__same_origin__';
  _onForceLogout = onForceLogout;
  _refreshPromise = null;

  // Wire OpenAPI.TOKEN as a *resolver function* so the generated client
  // calls us on every request and always gets the current access token.
  OpenAPI.TOKEN = async () => getAccessToken() ?? '';
}

/** Persist a fresh token pair (e.g. after login). */
export function storeTokens(pair: TokenPair): void {
  localStorage.setItem(accessTokenKey(), pair.accessToken);
  localStorage.setItem(refreshTokenKey(), pair.refreshToken);
}

/** Clear everything (logout). */
export function clearTokens(): void {
  localStorage.removeItem(accessTokenKey());
  localStorage.removeItem(refreshTokenKey());
  localStorage.removeItem(userKey());
  OpenAPI.TOKEN = undefined;
}

/** Read the current access token (may be expired). */
export function getAccessToken(): string | undefined {
  return localStorage.getItem(accessTokenKey()) || undefined;
}

/** Read the current refresh token. */
export function getRefreshToken(): string | undefined {
  return localStorage.getItem(refreshTokenKey()) || undefined;
}

/**
 * Check if the access token is expired (or about to expire).
 * Returns `true` when the token should be refreshed proactively.
 */
export function isAccessTokenExpired(): boolean {
  const token = getAccessToken();
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp as number;
    // Refresh 60 seconds before actual expiry to avoid race conditions
    return Date.now() >= (exp - 60) * 1000;
  } catch {
    return true;
  }
}

/**
 * Attempt to refresh the access token.
 *
 * - If a refresh is already in-flight, returns the existing promise (dedup).
 * - On success, stores the new pair and returns it.
 * - On failure, calls the force-logout callback and returns `null`.
 */
export function refreshAccessToken(): Promise<TokenPair | null> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = _doRefresh().finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}

/**
 * High-level helper: ensure we have a valid (non-expired) access token.
 * If expired, transparently refresh first.  Returns the usable token or
 * `null` if refresh failed (caller should abort / redirect to login).
 */
export async function ensureValidToken(): Promise<string | null> {
  if (!isAccessTokenExpired()) {
    return getAccessToken()!;
  }

  const pair = await refreshAccessToken();
  return pair?.accessToken ?? null;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

async function _doRefresh(): Promise<TokenPair | null> {
  const refresh = getRefreshToken();
  if (!refresh) {
    _onForceLogout();
    return null;
  }

  try {
    const res = await fetch(`${GATEWAY_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!res.ok) {
      // Refresh token itself is invalid/expired → force full re-login
      _onForceLogout();
      return null;
    }

    const data = await res.json();
    const pair: TokenPair = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };

    storeTokens(pair);
    return pair;
  } catch {
    // Network error during refresh — don't immediately logout,
    // but signal failure so the caller can decide.
    return null;
  }
}
