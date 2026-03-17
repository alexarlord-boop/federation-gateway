/**
 * Hook: Trust Mark Issuers (top-level)
 *
 * Wraps FederationTrustMarksService for CRUD on top-level trust mark
 * issuers and their type-link associations.
 */
import { useQuery } from '@tanstack/react-query';
import { FederationTrustMarksService } from '@/client/services/FederationTrustMarksService';
import type { TrustMarkIssuer } from '@/client/models/TrustMarkIssuer';
import type { TrustMarkType } from '@/client/models/TrustMarkType';
import type { AddTrustMarkIssuerCreate } from '@/client/models/AddTrustMarkIssuerCreate';
import type { InternalID } from '@/client/models/InternalID';
import { useInstanceId, instanceQuery, useInstanceMutation } from '@/lib/instance-query';

export const useTrustMarkIssuers = () => {
  const instanceId = useInstanceId();
  const key = ['trust-mark-issuers', instanceId] as const;

  const query = useQuery(
    instanceQuery(key, () => FederationTrustMarksService.getApiV1AdminTrustMarksIssuers()),
  );

  const create = useInstanceMutation(
    (data: AddTrustMarkIssuerCreate) =>
      FederationTrustMarksService.postApiV1AdminTrustMarksIssuers(data),
    () => [key],
  );

  const get = (issuerId: InternalID) =>
    FederationTrustMarksService.getApiV1AdminTrustMarksIssuers1(issuerId);

  const update = useInstanceMutation(
    ({ issuerId, data }: { issuerId: InternalID; data: AddTrustMarkIssuerCreate }) =>
      FederationTrustMarksService.putApiV1AdminTrustMarksIssuers(issuerId, data),
    () => [key],
  );

  const remove = useInstanceMutation(
    (issuerId: InternalID) =>
      FederationTrustMarksService.deleteApiV1AdminTrustMarksIssuers(issuerId),
    () => [key],
  );

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
  const instanceId = useInstanceId();
  const effectiveIssuerId = issuerId > 0 ? issuerId : undefined;
  const key = ['trust-mark-issuer-types', instanceId, effectiveIssuerId] as const;

  const query = useQuery(
    instanceQuery(key, () => FederationTrustMarksService.listIssuerTypes(issuerId)),
  );

  const setAll = useInstanceMutation(
    (typeIds: Array<InternalID>) => FederationTrustMarksService.setIssuerTypes(issuerId, typeIds),
    () => [key],
  );

  const add = useInstanceMutation(
    (typeId: InternalID) => FederationTrustMarksService.addIssuerType(issuerId, typeId),
    () => [key],
  );

  const unlink = useInstanceMutation(
    (trustMarkTypeId: InternalID) =>
      FederationTrustMarksService.unlinkIssuerType(issuerId, trustMarkTypeId),
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
