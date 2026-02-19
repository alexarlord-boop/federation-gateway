import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinatesService } from '@/client/services/SubordinatesService';
import { Subordinate } from '@/client/models/Subordinate';
import { SubordinateDetails } from '@/client/models/SubordinateDetails';
import { AddSubordinate } from '@/client/models/AddSubordinate';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useSubordinates = (entityType?: string, status?: string) => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  return useQuery({
    queryKey: ['subordinates', instanceId, entityType, status],
    queryFn: () => SubordinatesService.listSubordinates(entityType, status),
    enabled: !!instanceId,
  });
};

export const useSubordinate = (id: string) => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  return useQuery({
    queryKey: ['subordinate', instanceId, id],
    queryFn: () => SubordinatesService.getSubordinateDetails(id),
    enabled: !!id && !!instanceId,
  });
};

export const useCreateSubordinate = () => {
    const { activeTrustAnchor } = useTrustAnchor();
    const instanceId = activeTrustAnchor?.id;
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: AddSubordinate) => SubordinatesService.createSubordinate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subordinates', instanceId] });
        }
    });
}

export const useDeleteSubordinate = () => {
    const { activeTrustAnchor } = useTrustAnchor();
    const instanceId = activeTrustAnchor?.id;
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => SubordinatesService.deleteSubordinate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subordinates', instanceId] });
        }
    });
}
