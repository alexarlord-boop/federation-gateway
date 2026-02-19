import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinatesService } from '@/client/services/SubordinatesService';
import { SubordinateMetadataService } from '@/client/services/SubordinateMetadataService';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useEntityDetail = (id: string) => {
    const { activeTrustAnchor } = useTrustAnchor();
    const instanceId = activeTrustAnchor?.id;
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['subordinate', instanceId, id],
        queryFn: () => SubordinatesService.getSubordinateDetails(id),
        enabled: !!id && !!instanceId,
        retry: 1
    });

    const updateStatus = useMutation({
        mutationFn: (status: string) => SubordinatesService.changeSubordinateStatus(id, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subordinate', instanceId, id] });
            queryClient.invalidateQueries({ queryKey: ['subordinates', instanceId] });
        }
    });

    const updateMetadata = useMutation({
        mutationFn: (metadata: any) => SubordinateMetadataService.updateSubordinateMetadata(id, metadata),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['subordinate', instanceId, id] });
        }
    });
    
    const deleteSubordinate = useMutation({
        mutationFn: () => SubordinatesService.deleteSubordinate(id),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['subordinates', instanceId] });
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
