/**
 * Hook: Trust Mark Type Owner (per-type)
 *
 * Wraps FederationTrustMarksService for managing the owner
 * associated with a specific TrustMarkType.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FederationTrustMarksService } from '@/client/services/FederationTrustMarksService';
import type { TrustMarkOwner } from '@/client/models/TrustMarkOwner';
import type { AddTrustMarkOwner } from '@/client/models/AddTrustMarkOwner';
import type { AddTrustMarkOwnerCreate } from '@/client/models/AddTrustMarkOwnerCreate';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useTrustMarkTypeOwner = (trustMarkTypeId: number) => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['trust-mark-type-owner', instanceId, trustMarkTypeId],
    });

  const query = useQuery<TrustMarkOwner>({
    queryKey: ['trust-mark-type-owner', instanceId, trustMarkTypeId],
    queryFn: () => FederationTrustMarksService.getTrustMarkOwner(trustMarkTypeId),
    enabled: !!instanceId && !!trustMarkTypeId,
    retry: (failureCount, error: any) => {
      // 404 means no owner assigned — not a real error
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });

  const create = useMutation({
    mutationFn: (data: AddTrustMarkOwner) =>
      FederationTrustMarksService.createTrustMarkOwner(trustMarkTypeId, data),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: (data: AddTrustMarkOwnerCreate) =>
      FederationTrustMarksService.updateTrustMarkOwner(trustMarkTypeId, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: () =>
      FederationTrustMarksService.deleteTrustMarkOwner(trustMarkTypeId),
    onSuccess: invalidate,
  });

  return {
    owner: query.data,
    isLoading: query.isLoading,
    error: query.error,
    create,
    update,
    remove,
  };
};
