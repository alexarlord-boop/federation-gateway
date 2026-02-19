/**
 * Hook: Trust Mark Owners (top-level)
 *
 * Wraps FederationTrustMarksService for CRUD on top-level trust mark
 * owners and their type-link associations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FederationTrustMarksService } from '@/client/services/FederationTrustMarksService';
import type { TrustMarkOwner } from '@/client/models/TrustMarkOwner';
import type { TrustMarkType } from '@/client/models/TrustMarkType';
import type { AddTrustMarkOwnerCreate } from '@/client/models/AddTrustMarkOwnerCreate';
import type { InternalID } from '@/client/models/InternalID';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useTrustMarkOwners = () => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['trust-mark-owners', instanceId],
    });

  // ── Owner CRUD ─────────────────────────────────────────

  const query = useQuery<TrustMarkOwner[]>({
    queryKey: ['trust-mark-owners', instanceId],
    queryFn: () => FederationTrustMarksService.getApiV1AdminTrustMarksOwners(),
    enabled: !!instanceId,
  });

  const create = useMutation({
    mutationFn: (data: AddTrustMarkOwnerCreate) =>
      FederationTrustMarksService.postApiV1AdminTrustMarksOwners(data),
    onSuccess: invalidate,
  });

  const get = (ownerId: InternalID) =>
    FederationTrustMarksService.getApiV1AdminTrustMarksOwners1(ownerId);

  const update = useMutation({
    mutationFn: ({ ownerId, data }: { ownerId: InternalID; data: AddTrustMarkOwnerCreate }) =>
      FederationTrustMarksService.putApiV1AdminTrustMarksOwners(ownerId, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (ownerId: InternalID) =>
      FederationTrustMarksService.deleteApiV1AdminTrustMarksOwners(ownerId),
    onSuccess: invalidate,
  });

  return {
    owners: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    create,
    get,
    update,
    remove,
  };
};

// ── Owner Type Links (per-owner) ──────────────────────────

export const useTrustMarkOwnerTypes = (ownerId: number) => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['trust-mark-owner-types', instanceId, ownerId],
    });

  const query = useQuery<TrustMarkType[]>({
    queryKey: ['trust-mark-owner-types', instanceId, ownerId],
    queryFn: () => FederationTrustMarksService.listOwnerTypes(ownerId),
    enabled: !!instanceId && !!ownerId,
  });

  const setAll = useMutation({
    mutationFn: (typeIds: Array<InternalID>) =>
      FederationTrustMarksService.setOwnerTypes(ownerId, typeIds),
    onSuccess: invalidate,
  });

  const add = useMutation({
    mutationFn: (typeId: InternalID) =>
      FederationTrustMarksService.addOwnerType(ownerId, typeId),
    onSuccess: invalidate,
  });

  const unlink = useMutation({
    mutationFn: (trustMarkTypeId: InternalID) =>
      FederationTrustMarksService.unlinkOwnerType(ownerId, trustMarkTypeId),
    onSuccess: invalidate,
  });

  return {
    types: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    setAll,
    add,
    unlink,
  };
};
