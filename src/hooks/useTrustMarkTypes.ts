/**
 * Hook: Trust Mark Types (§1.4 — Federation Trust Marks)
 *
 * Wraps FederationTrustMarksService for listing, creating, updating,
 * and deleting trust mark *types* — the top-level definitions that
 * describe what kinds of trust marks exist in the federation.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FederationTrustMarksService } from '@/client/services/FederationTrustMarksService';
import type { TrustMarkType } from '@/client/models/TrustMarkType';
import type { AddTrustMarkType } from '@/client/models/AddTrustMarkType';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useTrustMarkTypes = () => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const query = useQuery<TrustMarkType[]>({
    queryKey: ['trust-mark-types', instanceId],
    queryFn: () => FederationTrustMarksService.getTrustMarkTypes(),
    enabled: !!instanceId,
  });

  const create = useMutation({
    mutationFn: (data: AddTrustMarkType) =>
      FederationTrustMarksService.createTrustMarkType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-mark-types', instanceId] });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AddTrustMarkType }) =>
      FederationTrustMarksService.updateTrustMarkType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-mark-types', instanceId] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      FederationTrustMarksService.deleteTrustMarkType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-mark-types', instanceId] });
    },
  });

  return {
    trustMarkTypes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    create,
    update,
    remove,
  };
};
