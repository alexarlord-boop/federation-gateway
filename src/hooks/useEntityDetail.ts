import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinatesService } from '@/client/services/SubordinatesService';
import { SubordinateMetadataService } from '@/client/services/SubordinateMetadataService';

export const useEntityDetail = (id: string) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['subordinate', id],
        queryFn: () => SubordinatesService.getSubordinateDetails(id),
        enabled: !!id,
        retry: 1
    });

    const updateStatus = useMutation({
        // Status is { status: string } according to model, but generated client might take string if simple, let's allow string and wrap it
        mutationFn: (status: string) => SubordinatesService.changeSubordinateStatus(id, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subordinate', id] });
            queryClient.invalidateQueries({ queryKey: ['subordinates'] });
        }
    });

    const updateMetadata = useMutation({
        mutationFn: (metadata: any) => SubordinateMetadataService.updateSubordinateMetadata(id, metadata),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['subordinate', id] });
        }
    });
    
    const deleteSubordinate = useMutation({
        mutationFn: () => SubordinatesService.deleteSubordinate(id),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['subordinates'] });
        }
    });

    return { 
        entity: query.data, 
        isLoading: query.isLoading, 
        error: query.error,
        updateStatus,
        updateMetadata,
        deleteSubordinate
    };
}
