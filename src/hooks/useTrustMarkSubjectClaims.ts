/**
 * Hook: Trust Mark Subject Additional Claims (per-subject)
 *
 * Wraps TrustMarkIssuanceService for managing additional claims
 * attached to individual trust mark subjects.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrustMarkIssuanceService } from '@/client/services/TrustMarkIssuanceService';
import type { AdditionalClaims } from '@/client/models/AdditionalClaims';
import type { AddAdditionalClaim } from '@/client/models/AddAdditionalClaim';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useTrustMarkSubjectClaims = (specId: number, subjectId: number) => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['trust-mark-subject-claims', instanceId, specId, subjectId],
    });

  const query = useQuery<AdditionalClaims>({
    queryKey: ['trust-mark-subject-claims', instanceId, specId, subjectId],
    queryFn: () =>
      TrustMarkIssuanceService.getTrustMarkSubjectAdditionalClaims(specId, subjectId),
    enabled: !!instanceId && !!specId && !!subjectId,
  });

  const updateAll = useMutation({
    mutationFn: (data: AdditionalClaims) =>
      TrustMarkIssuanceService.updateTrustMarkSubjectAdditionalClaims(specId, subjectId, data),
    onSuccess: invalidate,
  });

  const get = (claimId: number) =>
    TrustMarkIssuanceService.getTrustMarkSubjectAdditionalClaim(specId, subjectId, claimId);

  const update = useMutation({
    mutationFn: ({ claimId, data }: { claimId: number; data: AddAdditionalClaim }) =>
      TrustMarkIssuanceService.updateTrustMarkSubjectAdditionalClaim(
        specId,
        subjectId,
        claimId,
        data,
      ),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (claimId: number) =>
      TrustMarkIssuanceService.deleteTrustMarkSubjectAdditionalClaim(specId, subjectId, claimId),
    onSuccess: invalidate,
  });

  return {
    claims: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateAll,
    get,
    update,
    remove,
  };
};
