/**
 * Hook: Subordinate Metadata Policies (per-entity)
 *
 * Wraps SubordinateMetadataPoliciesService for managing metadata policies
 * on individual subordinate entity statements.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinateMetadataPoliciesService } from '@/client/services/SubordinateMetadataPoliciesService';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useSubordinateMetadataPolicies = (subordinateId: string) => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();
  const idNum = Number(subordinateId);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['subordinate-metadata-policies', instanceId, subordinateId] });

  // Full policies
  const query = useQuery({
    queryKey: ['subordinate-metadata-policies', instanceId, subordinateId],
    queryFn: () => SubordinateMetadataPoliciesService.getSubordinateMetadataPolicies(idNum),
    enabled: !!subordinateId && !!instanceId,
  });

  const updateAll = useMutation({
    mutationFn: (data: Record<string, any>) =>
      SubordinateMetadataPoliciesService.updateSubordinateMetadataPolicies(idNum, data),
    onSuccess: invalidate,
  });

  const copyFromGeneral = useMutation({
    mutationFn: () =>
      SubordinateMetadataPoliciesService.copyGeneralMetadataPoliciesToSubordinate(idNum),
    onSuccess: invalidate,
  });

  const deleteAll = useMutation({
    mutationFn: () =>
      SubordinateMetadataPoliciesService.deleteSubordinateMetadataPolicies(idNum),
    onSuccess: invalidate,
  });

  // Entity-type scoped
  const updateEntityTypePolicy = useMutation({
    mutationFn: ({ entityType, data }: { entityType: string; data: Record<string, any> }) =>
      SubordinateMetadataPoliciesService.changeSubordinateEntityTypedMetadataPolicy(idNum, entityType, data),
    onSuccess: invalidate,
  });

  const deleteEntityTypePolicy = useMutation({
    mutationFn: (entityType: string) =>
      SubordinateMetadataPoliciesService.deleteSubordinateEntityTypedMetadataPolicy(idNum, entityType),
    onSuccess: invalidate,
  });

  // Claim-level
  const updateClaimPolicy = useMutation({
    mutationFn: ({ entityType, claim, data }: { entityType: string; claim: string; data: Record<string, any> }) =>
      SubordinateMetadataPoliciesService.changeSubordinateMetadataPolicyClaim(idNum, entityType, claim, data),
    onSuccess: invalidate,
  });

  const deleteClaimPolicy = useMutation({
    mutationFn: ({ entityType, claim }: { entityType: string; claim: string }) =>
      SubordinateMetadataPoliciesService.deleteSubordinateMetadataPolicyClaim(idNum, entityType, claim),
    onSuccess: invalidate,
  });

  // Operator-level
  const updateOperator = useMutation({
    mutationFn: ({ entityType, claim, operator, value }: { entityType: string; claim: string; operator: string; value: any }) =>
      SubordinateMetadataPoliciesService.changeSubordinateMetadataPolicyOperator(idNum, entityType, claim, operator as any, value),
    onSuccess: invalidate,
  });

  const deleteOperator = useMutation({
    mutationFn: ({ entityType, claim, operator }: { entityType: string; claim: string; operator: string }) =>
      SubordinateMetadataPoliciesService.deleteSubordinateMetadataPolicyOperator(idNum, entityType, claim, operator as any),
    onSuccess: invalidate,
  });

  return {
    policies: query.data ?? {},
    isLoading: query.isLoading,
    error: query.error,
    updateAll,
    copyFromGeneral,
    deleteAll,
    updateEntityTypePolicy,
    deleteEntityTypePolicy,
    updateClaimPolicy,
    deleteClaimPolicy,
    updateOperator,
    deleteOperator,
  };
};
