/**
 * Hook: Subordinate Constraints (per-entity)
 *
 * Wraps SubordinateConstraintsService for managing constraints
 * on individual subordinate entity statements.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinateConstraintsService } from '@/client/services/SubordinateConstraintsService';
import type { Constraints } from '@/client/models/Constraints';
import type { NamingConstraints } from '@/client/models/NamingConstraints';
import type { AllowedEntityTypes } from '@/client/models/AllowedEntityTypes';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useSubordinateConstraints = (subordinateId: string) => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();
  const idNum = Number(subordinateId);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['subordinate-constraints', instanceId, subordinateId] });

  const query = useQuery<Constraints>({
    queryKey: ['subordinate-constraints', instanceId, subordinateId],
    queryFn: () => SubordinateConstraintsService.getSubordinateConstraints(idNum),
    enabled: !!subordinateId && !!instanceId,
  });

  const updateAll = useMutation({
    mutationFn: (data: Constraints) =>
      SubordinateConstraintsService.updateSubordinateConstraints(idNum, data),
    onSuccess: invalidate,
  });

  const copyFromGeneral = useMutation({
    mutationFn: () =>
      SubordinateConstraintsService.copyGeneralConstraintsToSubordinate(idNum),
    onSuccess: invalidate,
  });

  const deleteAll = useMutation({
    mutationFn: () =>
      SubordinateConstraintsService.deleteSubordinateConstraints(idNum),
    onSuccess: invalidate,
  });

  const setMaxPathLength = useMutation({
    mutationFn: (val: number) =>
      SubordinateConstraintsService.setSubordinateMaxPathLength(idNum, val),
    onSuccess: invalidate,
  });

  const deleteMaxPathLength = useMutation({
    mutationFn: () =>
      SubordinateConstraintsService.deleteSubordinateMaxPathLength(idNum),
    onSuccess: invalidate,
  });

  const setNamingConstraints = useMutation({
    mutationFn: (data: NamingConstraints) =>
      SubordinateConstraintsService.setSubordinateNamingConstraints(idNum, data),
    onSuccess: invalidate,
  });

  const deleteNamingConstraints = useMutation({
    mutationFn: () =>
      SubordinateConstraintsService.deleteSubordinateNamingConstraints(idNum),
    onSuccess: invalidate,
  });

  const setAllowedEntityTypes = useMutation({
    mutationFn: (data: AllowedEntityTypes) =>
      SubordinateConstraintsService.setSubordinateAllowedEntityTypes(idNum, data),
    onSuccess: invalidate,
  });

  const addAllowedEntityType = useMutation({
    mutationFn: (entityType: string) =>
      SubordinateConstraintsService.addSubordinateAllowedEntityType(idNum, { entity_type: entityType }),
    onSuccess: invalidate,
  });

  const deleteAllowedEntityType = useMutation({
    mutationFn: (entityType: string) =>
      SubordinateConstraintsService.deleteSubordinateAllowedEntityType(idNum, entityType),
    onSuccess: invalidate,
  });

  return {
    constraints: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateAll,
    copyFromGeneral,
    deleteAll,
    setMaxPathLength,
    deleteMaxPathLength,
    setNamingConstraints,
    deleteNamingConstraints,
    setAllowedEntityTypes,
    addAllowedEntityType,
    deleteAllowedEntityType,
  };
};
