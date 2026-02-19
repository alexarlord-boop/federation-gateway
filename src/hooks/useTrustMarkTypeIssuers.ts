/**
 * Hook: Trust Mark Type Issuers (per-type)
 *
 * Wraps FederationTrustMarksService for managing the list of issuers
 * associated with a specific TrustMarkType.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FederationTrustMarksService } from '@/client/services/FederationTrustMarksService';
import type { TrustMarkIssuer } from '@/client/models/TrustMarkIssuer';
import type { AddTrustMarkIssuer } from '@/client/models/AddTrustMarkIssuer';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useTrustMarkTypeIssuers = (trustMarkTypeId: number) => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['trust-mark-type-issuers', instanceId, trustMarkTypeId],
    });

  const query = useQuery<TrustMarkIssuer[]>({
    queryKey: ['trust-mark-type-issuers', instanceId, trustMarkTypeId],
    queryFn: () => FederationTrustMarksService.getTrustMarkTypeIssuers(trustMarkTypeId),
    enabled: !!instanceId && !!trustMarkTypeId,
  });

  const setAll = useMutation({
    mutationFn: (data: Array<AddTrustMarkIssuer>) =>
      FederationTrustMarksService.setTrustMarkTypeIssuers(trustMarkTypeId, data),
    onSuccess: invalidate,
  });

  const add = useMutation({
    mutationFn: (data: AddTrustMarkIssuer) =>
      FederationTrustMarksService.addTrustMarkTypeIssuer(trustMarkTypeId, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (issuerId: number) =>
      FederationTrustMarksService.deleteTrustMarkTypeIssuer(trustMarkTypeId, issuerId),
    onSuccess: invalidate,
  });

  return {
    issuers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    setAll,
    add,
    remove,
  };
};
