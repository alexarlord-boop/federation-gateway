/**
 * Hook: Entity Configuration — Trust Marks
 *
 * Wraps EntityConfigurationTrustMarksService for managing trust marks
 * that appear inside the entity's own configuration statement.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityConfigurationTrustMarksService } from '@/client/services/EntityConfigurationTrustMarksService';
import type { TrustMark } from '@/client/models/TrustMark';
import type { AddTrustMark } from '@/client/models/AddTrustMark';
import type { UpdateTrustMark } from '@/client/models/UpdateTrustMark';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useEntityConfigTrustMarks = () => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const query = useQuery<TrustMark[]>({
    queryKey: ['entity-config-trust-marks', instanceId],
    queryFn: () => EntityConfigurationTrustMarksService.listEntityConfigurationTrustMarks(),
    enabled: !!instanceId,
  });

  const create = useMutation({
    mutationFn: (data: AddTrustMark) =>
      EntityConfigurationTrustMarksService.createEntityConfigurationTrustMark(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-config-trust-marks', instanceId] });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTrustMark }) =>
      EntityConfigurationTrustMarksService.updateEntityConfigurationTrustMark(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-config-trust-marks', instanceId] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      EntityConfigurationTrustMarksService.deleteEntityConfigurationTrustMark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-config-trust-marks', instanceId] });
    },
  });

  return {
    trustMarks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    create,
    update,
    remove,
  };
};
