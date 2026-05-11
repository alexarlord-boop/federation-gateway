/**
 * Hook: Trust Mark Subject Additional Claims (per-subject)
 *
 * Wraps TrustMarkIssuanceService for managing additional claims
 * attached to individual trust mark subjects.
 *
 * Falls back to the last successfully fetched data while still
 * surfacing query errors so callers can show error indicators
 * without losing the previously displayed claim list.
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
    // Keep the last successful data visible while a background re-fetch fails.
    placeholderData: (previousData) => previousData,
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
