/**
 * Hook: Trust Mark Types (§1.4 — Federation Trust Marks)
 *
 * Wraps FederationTrustMarksService for listing, creating, updating,
 * and deleting trust mark *types* — the top-level definitions that
 * describe what kinds of trust marks exist in the federation.
 */
import { useQuery } from '@tanstack/react-query';
import { FederationTrustMarksService } from '@/client/services/FederationTrustMarksService';
import type { TrustMarkType } from '@/client/models/TrustMarkType';
import type { AddTrustMarkType } from '@/client/models/AddTrustMarkType';
import { useInstanceId, instanceQuery, useInstanceMutation } from '@/lib/instance-query';

export const useTrustMarkType = (typeId: number) => {
  const instanceId = useInstanceId();
  return useQuery(
    instanceQuery(
      ['trust-mark-type', instanceId, typeId > 0 ? typeId : undefined],
      () => FederationTrustMarksService.getTrustMarkType(typeId),
    ),
  );
};

export const useTrustMarkTypes = () => {
  const instanceId = useInstanceId();
  const key = ['trust-mark-types', instanceId] as const;

  const query = useQuery(instanceQuery(key, () => FederationTrustMarksService.getTrustMarkTypes()));

  const create = useInstanceMutation(
    (data: AddTrustMarkType) => FederationTrustMarksService.createTrustMarkType(data),
    () => [key],
  );

  const update = useInstanceMutation(
    ({ id, data }: { id: number; data: AddTrustMarkType }) =>
      FederationTrustMarksService.updateTrustMarkType(id, data),
    () => [key],
  );

  const remove = useInstanceMutation(
    (id: number) => FederationTrustMarksService.deleteTrustMarkType(id),
    () => [key],
  );

  return {
    trustMarkTypes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    create,
    update,
    remove,
  };
};
