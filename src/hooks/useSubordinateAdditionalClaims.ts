/**
 * Hook: Subordinate Additional Claims (per-entity)
 *
 * Wraps SubordinatesService additional-claims endpoints for managing
 * subordinate-specific additional claim rows.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinatesService } from '@/client/services/SubordinatesService';
import type { AdditionalClaims } from '@/client/models/AdditionalClaims';
import type { AdditionalClaim } from '@/client/models/AdditionalClaim';
import type { AddAdditionalClaim } from '@/client/models/AddAdditionalClaim';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useSubordinateAdditionalClaims = (subordinateId: string) => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['subordinate-additional-claims', instanceId, subordinateId],
    });

  const query = useQuery<AdditionalClaims>({
    queryKey: ['subordinate-additional-claims', instanceId, subordinateId],
    queryFn: () => SubordinatesService.getSubordinateAdditionalClaims(subordinateId),
    enabled: !!subordinateId && !!instanceId,
  });

  const updateAll = useMutation({
    mutationFn: (data: Array<AdditionalClaim>) =>
      SubordinatesService.updateSubordinateAdditionalClaims(subordinateId, data),
    onSuccess: invalidate,
  });

  const add = useMutation({
    mutationFn: (data: AddAdditionalClaim) =>
      SubordinatesService.addSubordinateAdditionalClaims(subordinateId, data),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ claimId, data }: { claimId: number; data: AddAdditionalClaim }) =>
      SubordinatesService.updateSubordinateAdditionalClaim(subordinateId, claimId, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (claimId: number) =>
      SubordinatesService.deleteSubordinateAdditionalClaim(subordinateId, claimId),
    onSuccess: invalidate,
  });

  return {
    claims: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateAll,
    add,
    update,
    remove,
  };
};
