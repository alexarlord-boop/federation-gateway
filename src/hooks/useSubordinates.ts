import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinatesService } from '@/client/services/SubordinatesService';
import { Subordinate } from '@/client/models/Subordinate';
import { SubordinateDetails } from '@/client/models/SubordinateDetails';
import { AddSubordinate } from '@/client/models/AddSubordinate';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import { OpenAPI } from '@/client';
import { request as __request } from '@/client/core/request';

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

/**
 * Approve or reject a subordinate by sending a plain-text status value.
 *
 * The LightHouse API expects `text/plain` for the status endpoint, not JSON.
 * The generated SubordinatesService wraps the value in a JSON object, which
 * causes a 400. This hook calls __request directly with the correct mediaType.
 */
export const useChangeSubordinateStatus = () => {
    const { activeTrustAnchor } = useTrustAnchor();
    const instanceId = activeTrustAnchor?.id;
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            __request(OpenAPI, {
                method: 'PUT',
                url: '/api/v1/admin/subordinates/{subordinateID}/status',
                path: { subordinateID: id },
                body: status,
                mediaType: 'text/plain',
                errors: {
                    400: `Invalid request parameters`,
                    404: `The requested resource was not found`,
                    500: `Internal server error`,
                },
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subordinates', instanceId] });
        },
    });
}
