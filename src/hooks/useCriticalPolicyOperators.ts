/**
 * Hook: Critical Metadata Policy Operators
 *
 * Wraps CriticalMetadataPolicyOperatorsService for managing the list
 * of metadata_policy_crit operators.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CriticalMetadataPolicyOperatorsService } from '@/client/services/CriticalMetadataPolicyOperatorsService';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useCriticalPolicyOperators = () => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['critical-policy-operators', instanceId] });

  const query = useQuery<string[]>({
    queryKey: ['critical-policy-operators', instanceId],
    queryFn: () => CriticalMetadataPolicyOperatorsService.getCriticalMetadataPolicyOperators(),
    enabled: !!instanceId,
  });

  const setAll = useMutation({
    mutationFn: (operators: string[]) =>
      CriticalMetadataPolicyOperatorsService.setCriticalMetadataPolicyOperators(operators as any),
    onSuccess: invalidate,
  });

  const add = useMutation({
    mutationFn: (operator: string) =>
      CriticalMetadataPolicyOperatorsService.createCriticalMetadataPolicyOperator(operator as any),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (operator: string) =>
      CriticalMetadataPolicyOperatorsService.deleteCriticalMetadataPolicyOperator(operator as any),
    onSuccess: invalidate,
  });

  return {
    operators: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    setAll,
    add,
    remove,
  };
};
