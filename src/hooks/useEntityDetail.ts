import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinatesService } from '@/client/services/SubordinatesService';
import { SubordinateMetadataService } from '@/client/services/SubordinateMetadataService';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';
import { gatewayFetch } from '@/lib/gateway-fetch';

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
        mutationFn: async (status: string) => {
            // The lighthouse API expects Content-Type: text/plain with a bare string body,
            // not a JSON object — the generated client sends the wrong format.
            const token = (await import('@/lib/token-manager')).getAccessToken();
            const { GATEWAY_BASE } = await import('@/lib/api-config');
            const proxyBase = instanceId
                ? `${GATEWAY_BASE}/api/v1/proxy/${encodeURIComponent(instanceId)}`
                : GATEWAY_BASE;
            const res = await fetch(
                `${proxyBase}/api/v1/admin/subordinates/${id}/status`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'text/plain',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: status,
                },
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw Object.assign(new Error('Status update failed'), { body });
            }
            return res.json();
        },
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
