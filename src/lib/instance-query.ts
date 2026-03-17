/**
 * Instance-scoped query helpers.
 *
 * Eliminates the 3-liner boilerplate that appears in every proxy-backed hook:
 *   const { activeTrustAnchor } = useTrustAnchor()
 *   const instanceId = activeTrustAnchor?.id
 *   const queryClient = useQueryClient()
 *
 * Built on TanStack Query v5 primitives: `queryOptions` + `skipToken`.
 *
 * Usage
 * ─────
 *   const instanceId = useInstanceId();
 *
 *   // Typed query, auto-disabled when no instance is active:
 *   const q = useQuery(instanceQuery(['trust-mark-types', instanceId], () => Service.list()));
 *
 *   // Mutation with auto-invalidation:
 *   const create = useInstanceMutation(
 *     (data: AddTrustMarkType) => Service.create(data),
 *     () => [['trust-mark-types', instanceId]],
 *   );
 *
 * The `instanceQuery` options object is reusable with
 * `queryClient.prefetchQuery()` — useful for the BFF phase.
 */

import { queryOptions, skipToken, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

// ---------------------------------------------------------------------------
// useInstanceId
// ---------------------------------------------------------------------------

/** Returns the active instance ID, or `undefined` when none is selected. */
export function useInstanceId(): string | undefined {
  const { activeTrustAnchor } = useTrustAnchor();
  return activeTrustAnchor?.id;
}

// ---------------------------------------------------------------------------
// instanceQuery
// ---------------------------------------------------------------------------

type QueryKey = readonly (string | number | undefined)[];

/**
 * Typed `queryOptions` factory for instance-scoped queries.
 *
 * Uses TQ v5's `skipToken` (the idiomatic disabled-query mechanism) whenever
 * any key segment is `undefined` — which happens when no instance is active
 * **or** when a required sub-resource ID is absent.
 *
 * Replaces the `enabled: !!instanceId` pattern entirely.
 */
export function instanceQuery<T>(key: QueryKey, fn: () => Promise<T>) {
  const disabled = key.some((k) => k === undefined);
  return queryOptions<T>({
    queryKey: key as readonly (string | number)[],
    queryFn: disabled ? skipToken : fn,
  });
}

// ---------------------------------------------------------------------------
// useInstanceMutation
// ---------------------------------------------------------------------------

/**
 * `useMutation` wrapper with automatic cache invalidation on success.
 *
 * @param mutationFn        The async mutation function.
 * @param getInvalidateKeys Zero-arg factory returning an array of query keys
 *                          to invalidate. Called at success time so it captures
 *                          the current `instanceId` correctly.
 * @param options           Additional `UseMutationOptions` (merged; any caller
 *                          `onSuccess` is appended after invalidation).
 */
export function useInstanceMutation<TData, TVar>(
  mutationFn: (variables: TVar) => Promise<TData>,
  getInvalidateKeys: () => readonly (readonly unknown[])[],
  options?: Omit<UseMutationOptions<TData, Error, TVar>, 'mutationFn' | 'onSuccess'>,
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVar>({
    ...options,
    mutationFn,
    onSuccess: (data, variables, context) => {
      for (const key of getInvalidateKeys()) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      options?.onSuccess?.(data, variables, context);
    },
  });
}
