import { useQuery } from '@tanstack/react-query';
import { mockTrustAnchors } from '@/data/mockData';

export interface TrustAnchorDisplay {
    id: string;
    entityId: string;
    name: string;
    type: string;
    status: string;
    description?: string;
    subordinateCount?: number;
}

export const useTrustAnchors = () => {
    // Current requirement: "Status Quo" view of available instances regardless of active context
    // We mix the static mock data (simulating registry configuration) with dynamic status if needed.
    
    // We use a query to allow invalidation if we ever add dynamic TAs, but for now it returns static data
    // to ensure visibility even when logged in as a leaf-node context.
    const { data, isLoading } = useQuery({
        queryKey: ['trust-anchors-list'],
        queryFn: async () => {
             // In a real app this would call an endpoint like /api/admin/system/tenants 
             // that is available to the system operator.
             // For now, we return our mock set.
             return mockTrustAnchors;
        }
    });

    const trustAnchors: TrustAnchorDisplay[] = data?.map(ta => ({
        id: ta.id,
        entityId: ta.entityId,
        name: ta.name,
        type: ta.type,
        status: ta.status,
        description: ta.description,
        subordinateCount: ta.subordinateCount
    })) || [];

    return { trustAnchors, isLoading, error: null };
};
