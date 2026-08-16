/**
 * Hook: Federation Historical Keys (OIDF Federation 1.0 §8.7)
 *
 * Wraps the public `/historical_keys` federation endpoint — same rationale
 * as useTrustMarkListing.ts for using the raw-request escape hatch instead
 * of a generated service (this is a federation protocol endpoint, not part
 * of LightHouse's admin API). Unlike trust_mark/list, the response is a
 * signed JWT (`typ: jwk-set+jwt`) — decoded with the existing
 * decodeJwtPayload rather than a new utility.
 *
 * Not every instance has this endpoint enabled (it's an optional
 * config.yaml entry); 404 is treated as "no historical keys yet", the same
 * way useSubordinateMetadataPolicies.ts treats a missing policy.
 */
import { useQuery } from '@tanstack/react-query';
import { OpenAPI } from '@/client';
import { request as __request } from '@/client/core/request';
import { ApiError } from '@/client/core/ApiError';
import { decodeJwtPayload } from '@/lib/jwt-utils';
import { useInstanceId, instanceQuery } from '@/lib/instance-query';

export interface HistoricalJwk {
  kid: string;
  kty?: string;
  alg?: string;
  crv?: string;
  exp?: number;
  nbf?: number;
  [key: string]: unknown;
}

export const useHistoricalKeys = () => {
  const instanceId = useInstanceId();
  const key = ['historical-keys', instanceId] as const;

  const query = useQuery(
    instanceQuery(key, async () => {
      let jwt: string;
      try {
        jwt = await __request<string>(OpenAPI, {
          method: 'GET',
          url: '/historical_keys',
        });
      } catch (err) {
        // 404 = endpoint not enabled for this instance, or genuinely no
        // history yet — either way, treat as empty rather than an error.
        if (err instanceof ApiError && err.status === 404) return [] as HistoricalJwk[];
        throw err;
      }
      const payload = decodeJwtPayload(jwt);
      const keys = (payload?.keys as { keys?: HistoricalJwk[] } | undefined)?.keys;
      return keys ?? [];
    }),
  );

  return {
    historicalKeys: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
};
