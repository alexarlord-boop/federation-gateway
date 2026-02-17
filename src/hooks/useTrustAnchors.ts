import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OpenAPI } from '@/client';

export interface TrustAnchorDisplay {
    id: string;
    entityId: string;
    name: string;
    type: string;
    status: string;
    description?: string;
    subordinateCount?: number;
    adminApiBaseUrl?: string;
}

export interface TrustAnchorCreate {
    name: string;
    entity_id: string;
    description?: string;
    type: string;
    status?: string;
    admin_api_base_url?: string;
}

export const useTrustAnchors = () => {
    // Current requirement: "Status Quo" view of available instances regardless of active context
    // We mix the static mock data (simulating registry configuration) with dynamic status if needed.
    
    // We use a query to allow invalidation if we ever add dynamic TAs, but for now it returns static data
    // to ensure visibility even when logged in as a leaf-node context.
    const token = typeof OpenAPI.TOKEN === 'string' ? OpenAPI.TOKEN : undefined;
    const { data, isLoading } = useQuery({
        queryKey: ['trust-anchors-list', OpenAPI.BASE, token],
        queryFn: async () => {
             if (!token) {
                 return [];
             }
             const res = await fetch(`${OpenAPI.BASE}/api/v1/admin/trust-anchors`, {
                 headers: { Authorization: `Bearer ${token}` },
             });
             if (res.status === 403) {
                 return [];
             }
             if (!res.ok) {
                 throw new Error('Failed to load trust anchors');
             }
             return res.json();
        }
    });

    const trustAnchors: TrustAnchorDisplay[] = data?.map((ta: any) => ({
        id: ta.id,
        entityId: ta.entity_id ?? ta.entityId,
        name: ta.name,
        type: ta.type,
        status: ta.status,
        description: ta.description,
        subordinateCount: ta.subordinate_count ?? ta.subordinateCount,
        adminApiBaseUrl: ta.admin_api_base_url ?? ta.adminApiBaseUrl,
    })) || [];

    const queryClient = useQueryClient();
    const createTrustAnchor = useMutation({
        mutationFn: async (payload: TrustAnchorCreate) => {
            const token = typeof OpenAPI.TOKEN === 'string' ? OpenAPI.TOKEN : undefined;
            const res = await fetch(`${OpenAPI.BASE}/api/v1/admin/trust-anchors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                throw new Error('Failed to create trust anchor');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trust-anchors-list'] });
        },
    });

    const deleteTrustAnchor = useMutation({
        mutationFn: async (id: string) => {
            const token = typeof OpenAPI.TOKEN === 'string' ? OpenAPI.TOKEN : undefined;
            const res = await fetch(`${OpenAPI.BASE}/api/v1/admin/trust-anchors/${id}`, {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) {
                throw new Error('Failed to delete trust anchor');
            }
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trust-anchors-list'] });
        },
    });

    return { trustAnchors, isLoading, error: null, createTrustAnchor, deleteTrustAnchor };
};
