/**
 * Hook: Entity Configuration — Metadata
 *
 * Wraps EntityConfigurationMetadataService for managing metadata
 * published in the entity configuration statement.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityConfigurationMetadataService } from '@/client/services/EntityConfigurationMetadataService';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useEntityConfigMetadata = () => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  // Full metadata structure
  const query = useQuery({
    queryKey: ['entity-config-metadata', instanceId],
    queryFn: () => EntityConfigurationMetadataService.getEntityConfigurationMetadata(),
    enabled: !!instanceId,
  });

  // Update full metadata structure
  const updateAll = useMutation({
    mutationFn: (data: Record<string, any>) =>
      EntityConfigurationMetadataService.updateEntityConfigurationMetadata(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-config-metadata', instanceId] });
    },
  });

  // Entity-type scoped operations
  const getEntityTypeMetadata = (entityType: string) =>
    EntityConfigurationMetadataService.getEntityTypedMetadata(entityType);

  const updateEntityTypeMetadata = useMutation({
    mutationFn: ({ entityType, data }: { entityType: string; data: Record<string, any> }) =>
      EntityConfigurationMetadataService.changeEntityTypedMetadata(entityType, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-config-metadata', instanceId] });
    },
  });

  const deleteEntityTypeMetadata = useMutation({
    mutationFn: (entityType: string) =>
      EntityConfigurationMetadataService.deleteEntityTypedMetadata(entityType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-config-metadata', instanceId] });
    },
  });

  // Claim-level operations
  const updateClaim = useMutation({
    mutationFn: ({ entityType, claim, value }: { entityType: string; claim: string; value: any }) =>
      EntityConfigurationMetadataService.changeMetadataClaim(entityType, claim, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-config-metadata', instanceId] });
    },
  });

  const deleteClaim = useMutation({
    mutationFn: ({ entityType, claim }: { entityType: string; claim: string }) =>
      EntityConfigurationMetadataService.deleteMetadataClaim(entityType, claim),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-config-metadata', instanceId] });
    },
  });

  return {
    metadata: query.data ?? {},
    isLoading: query.isLoading,
    error: query.error,
    updateAll,
    getEntityTypeMetadata,
    updateEntityTypeMetadata,
    deleteEntityTypeMetadata,
    updateClaim,
    deleteClaim,
  };
};
