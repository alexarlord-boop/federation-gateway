/**
 * Hook: debug context.
 *
 * The `/api/debug/context` endpoint returns the currently active context ID
 * for a given backend.  This is useful for determining which trust anchor
 * is "active" and showing the correct operational state on the UI.
 */

import { useQuery } from '@tanstack/react-query';
import { gatewayFetch } from '@/lib/gateway-fetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DebugContext {
  contextId?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const debugKeys = {
  all: ['gateway', 'debug'] as const,
  context: (backendId: string) => [...debugKeys.all, 'context', backendId] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the debug context for a given backend.
 *
 * @param backendId   Stable identifier for the backend (used as cache key)
 * @param backendBaseUrl  The base URL of the backend to query
 */
export function useDebugContext(backendId: string, backendBaseUrl: string) {
  const query = useQuery<DebugContext | null>({
    queryKey: debugKeys.context(backendId),
    queryFn: () =>
      gatewayFetch<DebugContext>({
        path: '/api/debug/context',
        baseUrl: backendBaseUrl,
        softFail: [404],
      }),
  });

  return {
    context: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
