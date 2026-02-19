/**
 * Hook: General Additional Claims
 *
 * Wraps SubordinatesService general additional-claims endpoints.
 * These claims apply as defaults to all subordinate entity statements.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinatesService } from '@/client/services/SubordinatesService';
import type { AdditionalClaims } from '@/client/models/AdditionalClaims';
import type { AdditionalClaim } from '@/client/models/AdditionalClaim';
import type { AddAdditionalClaim } from '@/client/models/AddAdditionalClaim';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useGeneralAdditionalClaims = () => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['general-additional-claims', instanceId],
    });

  const query = useQuery<AdditionalClaims>({
    queryKey: ['general-additional-claims', instanceId],
    queryFn: () => SubordinatesService.getGeneralAdditionalClaims(),
    enabled: !!instanceId,
  });

  const updateAll = useMutation({
    mutationFn: (data: AdditionalClaims) =>
      SubordinatesService.updateGeneralAdditionalClaims(data),
    onSuccess: invalidate,
  });

  const add = useMutation({
    mutationFn: (data: AdditionalClaims) =>
      SubordinatesService.addGeneralAdditionalClaims(data),
    onSuccess: invalidate,
  });

  const get = (claimId: number) =>
    SubordinatesService.getGeneralAdditionalClaim(claimId);

  const update = useMutation({
    mutationFn: ({ claimId, data }: { claimId: number; data: AddAdditionalClaim }) =>
      SubordinatesService.updateGeneralAdditionalClaim(claimId, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (claimId: number) =>
      SubordinatesService.deleteGeneralAdditionalClaim(claimId),
    onSuccess: invalidate,
  });

  return {
    claims: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateAll,
    add,
    get,
    update,
    remove,
  };
};
