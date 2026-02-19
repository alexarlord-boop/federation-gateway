/**
 * Hook: General Constraints
 *
 * Wraps GeneralConstraintsService for managing federation-wide constraints
 * that apply to all subordinate entity statements.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GeneralConstraintsService } from '@/client/services/GeneralConstraintsService';
import type { Constraints } from '@/client/models/Constraints';
import type { NamingConstraints } from '@/client/models/NamingConstraints';
import type { AllowedEntityTypes } from '@/client/models/AllowedEntityTypes';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useGeneralConstraints = () => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['general-constraints', instanceId] });

  const query = useQuery<Constraints>({
    queryKey: ['general-constraints', instanceId],
    queryFn: () => GeneralConstraintsService.getGeneralConstraints(),
    enabled: !!instanceId,
  });

  const updateAll = useMutation({
    mutationFn: (data: Constraints) =>
      GeneralConstraintsService.updateGeneralConstraints(data),
    onSuccess: invalidate,
  });

  // max_path_length
  const setMaxPathLength = useMutation({
    mutationFn: (val: number) =>
      GeneralConstraintsService.setGeneralMaxPathLength(val),
    onSuccess: invalidate,
  });

  const deleteMaxPathLength = useMutation({
    mutationFn: () => GeneralConstraintsService.deleteGeneralMaxPathLength(),
    onSuccess: invalidate,
  });

  // naming_constraints
  const setNamingConstraints = useMutation({
    mutationFn: (data: NamingConstraints) =>
      GeneralConstraintsService.setGeneralNamingConstraints(data),
    onSuccess: invalidate,
  });

  const deleteNamingConstraints = useMutation({
    mutationFn: () => GeneralConstraintsService.deleteGeneralNamingConstraints(),
    onSuccess: invalidate,
  });

  // allowed_entity_types
  const setAllowedEntityTypes = useMutation({
    mutationFn: (data: AllowedEntityTypes) =>
      GeneralConstraintsService.setGeneralAllowedEntityTypes(data),
    onSuccess: invalidate,
  });

  const addAllowedEntityType = useMutation({
    mutationFn: (entityType: string) =>
      GeneralConstraintsService.addGeneralAllowedEntityType({ entity_type: entityType }),
    onSuccess: invalidate,
  });

  const deleteAllowedEntityType = useMutation({
    mutationFn: (entityType: string) =>
      GeneralConstraintsService.deleteGeneralAllowedEntityType(entityType),
    onSuccess: invalidate,
  });

  return {
    constraints: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateAll,
    setMaxPathLength,
    deleteMaxPathLength,
    setNamingConstraints,
    deleteNamingConstraints,
    setAllowedEntityTypes,
    addAllowedEntityType,
    deleteAllowedEntityType,
  };
};
