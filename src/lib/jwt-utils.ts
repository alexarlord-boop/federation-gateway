/**
 * JWT utility functions for Trust Mark handling.
 *
 * Parses and analyses Trust Mark JWTs WITHOUT signature validation.
 * Validation is the responsibility of the federation server itself — see
 * `useTrustMarkVerification.ts` for the spec-defined *status* check
 * (OIDF §8.3: ask the issuer's own `trust_mark_status_endpoint`).
 *
 * The trust mark type identifier claim name varies across real
 * implementations — confirmed by decoding live marks from both LightHouse
 * and the eduGAIN OIDFed testbed (testbed.oidf.lab.surf.nl):
 *   - `trust_mark_id`    — used by real eduGAIN-issued marks on the testbed
 *   - `trust_mark_type`  — used by LightHouse 0.20/0.21
 *   - `id`               — an older/draft spec claim name, seen in some tooling
 * `getTrustMarkTypeId` below reads whichever is present.
 *
 *   iss   — issuer entity identifier
 *   sub   — subject entity identifier (the entity holding the mark)
 *   iat   — issued-at UNIX timestamp
 *   exp   — optional expiry UNIX timestamp
 *   ref   — optional URL reference
 */

export type TrustMarkPayload = {
  /** Trust mark issuer entity ID */
  iss?: string;
  /** Subject (entity that holds the mark) */
  sub?: string;
  /** Trust mark type identifier URI — real-world claim name, eduGAIN testbed */
  trust_mark_id?: string;
  /** Trust mark type identifier URI — LightHouse's claim name */
  trust_mark_type?: string;
  /** Trust mark type identifier URI — older/draft claim name */
  id?: string;
  /** Issued-at */
  iat?: number;
  /** Expiry */
  exp?: number;
  /** Reference URL */
  ref?: string;
  /** Logo URI */
  logo_uri?: string;
  /** Delegation JWT if delegated issuance */
  delegation?: string;
  [key: string]: unknown;
};

/** Read the trust mark type identifier regardless of which claim name the
 * issuer used (`trust_mark_id`, `trust_mark_type`, or the older `id`). */
export function getTrustMarkTypeId(payload: TrustMarkPayload | null | undefined): string | undefined {
  return payload?.trust_mark_id ?? payload?.trust_mark_type ?? payload?.id;
}

export type ValidityStatus = 'valid' | 'expired' | 'expiring-soon' | 'unknown';

/** Decode the Base64url-encoded payload part of a JWT (no signature verification). */
export function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    // Base64url → standard Base64
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Pad to multiple of 4
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Decode a trust mark JWT and return the typed payload. Returns null on any error. */
export function decodeTrustMarkJwt(jwt: string): TrustMarkPayload | null {
  if (!jwt || !jwt.includes('.')) return null;
  return decodeJwtPayload(jwt) as TrustMarkPayload | null;
}

/** Determine the current validity status based on the `exp` claim. */
export function getTrustMarkValidity(payload: TrustMarkPayload | null): ValidityStatus {
  if (!payload?.exp) return 'unknown';
  const nowSec = Date.now() / 1000;
  if (payload.exp < nowSec) return 'expired';
  // Warn when less than 7 days remain
  if (payload.exp < nowSec + 7 * 24 * 3600) return 'expiring-soon';
  return 'valid';
}

/** Human-readable countdown to (or since) expiry. */
export function formatExpiryRelative(exp: number): string {
  const diffMs = exp * 1000 - Date.now();
  if (diffMs < 0) {
    const ago = Math.abs(diffMs);
    const days = Math.floor(ago / (1000 * 3600 * 24));
    if (days > 0) return `Expired ${days}d ago`;
    const hours = Math.floor(ago / (1000 * 3600));
    return `Expired ${hours}h ago`;
  }
  const days = Math.floor(diffMs / (1000 * 3600 * 24));
  if (days > 0) return `Expires in ${days}d`;
  const hours = Math.floor(diffMs / (1000 * 3600));
  if (hours > 0) return `Expires in ${hours}h`;
  const mins = Math.floor(diffMs / (1000 * 60));
  return `Expires in ${mins}m`;
}

/** Format a UNIX timestamp as a localised date/time string. */
export function formatUnixTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Extract the JWT header (alg, kid, typ) without verifying. */
export function decodeJwtHeader(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 1) return null;
    const b64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}
