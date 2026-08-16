/**
 * Hook: Trust Marked Entities Listing (OIDF Federation 1.0 §8.5)
 *
 * Wraps the public `/trust_mark/list` federation endpoint — not part of
 * LightHouse's admin API (Federation Admin OpenAPI.yaml only covers that),
 * so there's no generated service for it. Uses the same raw-request escape
 * hatch as useTrustMarkIssuance.ts's changeStatus mutation. Confirmed live
 * (mesh-tests/test_trust_marked_entities_listing.py): returns a plain JSON
 * array of entity IDs currently holding a still-valid mark of the given
 * type — no JWT wrapper, unlike most other federation responses.
 */
import { useQuery } from '@tanstack/react-query';
import { OpenAPI } from '@/client';
import { request as __request } from '@/client/core/request';
import { useInstanceId, instanceQuery } from '@/lib/instance-query';

export const useTrustMarkListing = (trustMarkType: string | undefined) => {
  const instanceId = useInstanceId();
  const key = ['trust-mark-listing', instanceId, trustMarkType] as const;

  const query = useQuery(
    instanceQuery(key, () =>
      __request<string[]>(OpenAPI, {
        method: 'GET',
        url: '/trust_mark/list',
        query: { trust_mark_type: trustMarkType },
      }),
    ),
  );

  return {
    holders: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};
