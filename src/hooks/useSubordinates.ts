import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinatesService } from '@/client/services/SubordinatesService';
import { Subordinate } from '@/client/models/Subordinate';
import { SubordinateDetails } from '@/client/models/SubordinateDetails';
import { AddSubordinate } from '@/client/models/AddSubordinate';

export const useSubordinates = (entityType?: string, status?: string) => {
  return useQuery({
    queryKey: ['subordinates', entityType, status],
    queryFn: () => SubordinatesService.listSubordinates(entityType, status),
  });
};

export const useSubordinate = (id: string) => {
  return useQuery({
    queryKey: ['subordinate', id],
    queryFn: () => SubordinatesService.getSubordinateDetails(id),
    enabled: !!id,
  });
};

export const useCreateSubordinate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: AddSubordinate) => SubordinatesService.createSubordinate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subordinates'] });
        }
    });
}

export const useDeleteSubordinate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => SubordinatesService.deleteSubordinate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subordinates'] });
        }
    });
}
