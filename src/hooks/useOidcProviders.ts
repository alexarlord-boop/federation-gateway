/**
 * Hook: public OIDC provider listing.
 *
 * Backs the login page's "Sign in with {provider}" buttons. Unauthenticated
 * by design (`GET /api/auth/oidc/providers` — a user isn't logged in yet)
 * — `gatewayFetch` already tolerates a missing token, so no special-casing
 * is needed here.
 */

import { useQuery } from '@tanstack/react-query';
import { gatewayFetch } from '@/lib/gateway-fetch';

export interface PublicOidcProvider {
  id: string;
  name: string;
}

export function useOidcProviders() {
  const query = useQuery<PublicOidcProvider[]>({
    queryKey: ['gateway', 'oidc-providers', 'public'],
    queryFn: async () => {
      const data = await gatewayFetch<PublicOidcProvider[]>({
        path: '/api/auth/oidc/providers',
        softFail: [403, 404],
      });
      return data ?? [];
    },
  });

  return {
    providers: query.data ?? [],
    isLoading: query.isLoading,
  };
}
