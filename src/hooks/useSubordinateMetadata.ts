/**
 * Hook: Subordinate Metadata (per-entity)
 *
 * Wraps SubordinateMetadataService for managing subordinate-specific
 * metadata at three levels: full metadata, entity-type scoped, and
 * individual claim-level.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinateMetadataService } from '@/client/services/SubordinateMetadataService';
import type { Metadata } from '@/client/models/Metadata';
import type { EntityTypedMetadata } from '@/client/models/EntityTypedMetadata';
import type { AnyValue } from '@/client/models/AnyValue';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useSubordinateMetadata = (subordinateId: string) => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['subordinate-metadata', instanceId, subordinateId],
    });

  // ── Full metadata ──────────────────────────────────────

  const query = useQuery<Metadata>({
    queryKey: ['subordinate-metadata', instanceId, subordinateId],
    queryFn: () => SubordinateMetadataService.getSubordinateMetadata(subordinateId),
    enabled: !!subordinateId && !!instanceId,
  });

  const updateAll = useMutation({
    mutationFn: (data: Metadata) =>
      SubordinateMetadataService.updateSubordinateMetadata(subordinateId, data),
    onSuccess: invalidate,
  });

  // ── Entity-type scoped ─────────────────────────────────

  const getEntityTypedMetadata = (entityType: string) =>
    SubordinateMetadataService.getSubordinateEntityTypedMetadata(subordinateId, entityType);

  const updateEntityTypedMetadata = useMutation({
    mutationFn: ({ entityType, data }: { entityType: string; data: EntityTypedMetadata }) =>
      SubordinateMetadataService.changeSubordinateEntityTypedMetadata(subordinateId, entityType, data),
    onSuccess: invalidate,
  });

  const addMetadataClaims = useMutation({
    mutationFn: ({ entityType, data }: { entityType: string; data: EntityTypedMetadata }) =>
      SubordinateMetadataService.addSubordinateMetadataClaims(subordinateId, entityType, data),
    onSuccess: invalidate,
  });

  const deleteEntityTypedMetadata = useMutation({
    mutationFn: (entityType: string) =>
      SubordinateMetadataService.deleteSubordinateEntityTypedMetadata(subordinateId, entityType),
    onSuccess: invalidate,
  });

  // ── Claim-level ────────────────────────────────────────

  const getMetadataClaim = (entityType: string, claim: string) =>
    SubordinateMetadataService.getSubordinateMetadataClaim(subordinateId, entityType, claim);

  const updateMetadataClaim = useMutation({
    mutationFn: ({ entityType, claim, value }: { entityType: string; claim: string; value: AnyValue }) =>
      SubordinateMetadataService.changeSubordinateMetadataClaim(subordinateId, entityType, claim, value),
    onSuccess: invalidate,
  });

  const deleteMetadataClaim = useMutation({
    mutationFn: ({ entityType, claim }: { entityType: string; claim: string }) =>
      SubordinateMetadataService.deleteSubordinateMetadataClaim(subordinateId, entityType, claim),
    onSuccess: invalidate,
  });

  return {
    metadata: query.data ?? {},
    isLoading: query.isLoading,
    error: query.error,
    updateAll,
    // Entity-type level
    getEntityTypedMetadata,
    updateEntityTypedMetadata,
    addMetadataClaims,
    deleteEntityTypedMetadata,
    // Claim level
    getMetadataClaim,
    updateMetadataClaim,
    deleteMetadataClaim,
  };
};
