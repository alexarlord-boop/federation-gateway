/**
 * Hook: General Metadata Policies
 *
 * Wraps GeneralMetadataPoliciesService for managing metadata policies
 * that apply to all subordinate entity statements.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GeneralMetadataPoliciesService } from '@/client/services/GeneralMetadataPoliciesService';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useGeneralMetadataPolicies = () => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['general-metadata-policies', instanceId] });

  // Full policies structure
  const query = useQuery({
    queryKey: ['general-metadata-policies', instanceId],
    queryFn: () => GeneralMetadataPoliciesService.getGeneralMetadataPolicies(),
    enabled: !!instanceId,
  });

  const updateAll = useMutation({
    mutationFn: (data: Record<string, any>) =>
      GeneralMetadataPoliciesService.updateGeneralMetadataPolicies(data),
    onSuccess: invalidate,
  });

  // Entity-type scoped
  const updateEntityTypePolicy = useMutation({
    mutationFn: ({ entityType, data }: { entityType: string; data: Record<string, any> }) =>
      GeneralMetadataPoliciesService.changeGeneralEntityTypedMetadataPolicy(entityType, data),
    onSuccess: invalidate,
  });

  const deleteEntityTypePolicy = useMutation({
    mutationFn: (entityType: string) =>
      GeneralMetadataPoliciesService.deleteGeneralEntityTypedMetadataPolicy(entityType),
    onSuccess: invalidate,
  });

  // Claim-level
  const updateClaimPolicy = useMutation({
    mutationFn: ({ entityType, claim, data }: { entityType: string; claim: string; data: Record<string, any> }) =>
      GeneralMetadataPoliciesService.changeGeneralMetadataPolicyClaim(entityType, claim, data),
    onSuccess: invalidate,
  });

  const deleteClaimPolicy = useMutation({
    mutationFn: ({ entityType, claim }: { entityType: string; claim: string }) =>
      GeneralMetadataPoliciesService.deleteGeneralMetadataPolicyClaim(entityType, claim),
    onSuccess: invalidate,
  });

  // Operator-level
  const updateOperator = useMutation({
    mutationFn: ({ entityType, claim, operator, value }: { entityType: string; claim: string; operator: string; value: any }) =>
      GeneralMetadataPoliciesService.changeGeneralMetadataPolicyOperator(entityType, claim, operator as any, value),
    onSuccess: invalidate,
  });

  const deleteOperator = useMutation({
    mutationFn: ({ entityType, claim, operator }: { entityType: string; claim: string; operator: string }) =>
      GeneralMetadataPoliciesService.deleteGeneralMetadataPolicyOperator(entityType, claim, operator as any),
    onSuccess: invalidate,
  });

  return {
    policies: query.data ?? {},
    isLoading: query.isLoading,
    error: query.error,
    updateAll,
    updateEntityTypePolicy,
    deleteEntityTypePolicy,
    updateClaimPolicy,
    deleteClaimPolicy,
    updateOperator,
    deleteOperator,
  };
};
