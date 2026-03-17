/**
 * Hook: Trust Mark Owners (top-level)
 *
 * Wraps FederationTrustMarksService for CRUD on top-level trust mark
 * owners and their type-link associations.
 */
import { useQuery } from '@tanstack/react-query';
import { FederationTrustMarksService } from '@/client/services/FederationTrustMarksService';
import type { TrustMarkOwner } from '@/client/models/TrustMarkOwner';
import type { TrustMarkType } from '@/client/models/TrustMarkType';
import type { AddTrustMarkOwnerCreate } from '@/client/models/AddTrustMarkOwnerCreate';
import type { InternalID } from '@/client/models/InternalID';
import { useInstanceId, instanceQuery, useInstanceMutation } from '@/lib/instance-query';

export const useTrustMarkOwners = () => {
  const instanceId = useInstanceId();
  const key = ['trust-mark-owners', instanceId] as const;

  const query = useQuery(
    instanceQuery(key, () => FederationTrustMarksService.getApiV1AdminTrustMarksOwners()),
  );

  const create = useInstanceMutation(
    (data: AddTrustMarkOwnerCreate) =>
      FederationTrustMarksService.postApiV1AdminTrustMarksOwners(data),
    () => [key],
  );

  const get = (ownerId: InternalID) =>
    FederationTrustMarksService.getApiV1AdminTrustMarksOwners1(ownerId);

  const update = useInstanceMutation(
    ({ ownerId, data }: { ownerId: InternalID; data: AddTrustMarkOwnerCreate }) =>
      FederationTrustMarksService.putApiV1AdminTrustMarksOwners(ownerId, data),
    () => [key],
  );

  const remove = useInstanceMutation(
    (ownerId: InternalID) =>
      FederationTrustMarksService.deleteApiV1AdminTrustMarksOwners(ownerId),
    () => [key],
  );

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
  const instanceId = useInstanceId();
  const effectiveOwnerId = ownerId > 0 ? ownerId : undefined;
  const key = ['trust-mark-owner-types', instanceId, effectiveOwnerId] as const;

  const query = useQuery(
    instanceQuery(key, () => FederationTrustMarksService.listOwnerTypes(ownerId)),
  );

  const setAll = useInstanceMutation(
    (typeIds: Array<InternalID>) => FederationTrustMarksService.setOwnerTypes(ownerId, typeIds),
    () => [key],
  );

  const add = useInstanceMutation(
    (typeId: InternalID) => FederationTrustMarksService.addOwnerType(ownerId, typeId),
    () => [key],
  );

  const unlink = useInstanceMutation(
    (trustMarkTypeId: InternalID) =>
      FederationTrustMarksService.unlinkOwnerType(ownerId, trustMarkTypeId),
    () => [key],
  );

  return {
    types: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    setAll,
    add,
    unlink,
  };
};
