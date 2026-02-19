/**
 * Hook: Trust Mark Issuers (top-level)
 *
 * Wraps FederationTrustMarksService for CRUD on top-level trust mark
 * issuers and their type-link associations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FederationTrustMarksService } from '@/client/services/FederationTrustMarksService';
import type { TrustMarkIssuer } from '@/client/models/TrustMarkIssuer';
import type { TrustMarkType } from '@/client/models/TrustMarkType';
import type { AddTrustMarkIssuerCreate } from '@/client/models/AddTrustMarkIssuerCreate';
import type { InternalID } from '@/client/models/InternalID';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useTrustMarkIssuers = () => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['trust-mark-issuers', instanceId],
    });

  // ── Issuer CRUD ────────────────────────────────────────

  const query = useQuery<TrustMarkIssuer[]>({
    queryKey: ['trust-mark-issuers', instanceId],
    queryFn: () => FederationTrustMarksService.getApiV1AdminTrustMarksIssuers(),
    enabled: !!instanceId,
  });

  const create = useMutation({
    mutationFn: (data: AddTrustMarkIssuerCreate) =>
      FederationTrustMarksService.postApiV1AdminTrustMarksIssuers(data),
    onSuccess: invalidate,
  });

  const get = (issuerId: InternalID) =>
    FederationTrustMarksService.getApiV1AdminTrustMarksIssuers1(issuerId);

  const update = useMutation({
    mutationFn: ({ issuerId, data }: { issuerId: InternalID; data: AddTrustMarkIssuerCreate }) =>
      FederationTrustMarksService.putApiV1AdminTrustMarksIssuers(issuerId, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (issuerId: InternalID) =>
      FederationTrustMarksService.deleteApiV1AdminTrustMarksIssuers(issuerId),
    onSuccess: invalidate,
  });

  return {
    issuers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    create,
    get,
    update,
    remove,
  };
};

// ── Issuer Type Links (per-issuer) ────────────────────────

export const useTrustMarkIssuerTypes = (issuerId: number) => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['trust-mark-issuer-types', instanceId, issuerId],
    });

  const query = useQuery<TrustMarkType[]>({
    queryKey: ['trust-mark-issuer-types', instanceId, issuerId],
    queryFn: () => FederationTrustMarksService.listIssuerTypes(issuerId),
    enabled: !!instanceId && !!issuerId,
  });

  const setAll = useMutation({
    mutationFn: (typeIds: Array<InternalID>) =>
      FederationTrustMarksService.setIssuerTypes(issuerId, typeIds),
    onSuccess: invalidate,
  });

  const add = useMutation({
    mutationFn: (typeId: InternalID) =>
      FederationTrustMarksService.addIssuerType(issuerId, typeId),
    onSuccess: invalidate,
  });

  const unlink = useMutation({
    mutationFn: (trustMarkTypeId: InternalID) =>
      FederationTrustMarksService.unlinkIssuerType(issuerId, trustMarkTypeId),
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
