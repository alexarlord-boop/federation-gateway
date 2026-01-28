import { useSubordinates } from './useSubordinates';
import { Subordinate } from '@/client/models/Subordinate';

export interface TrustAnchorDisplay {
    id: string;
    entityId: string;
    name: string; // derived from description or metadata
    type: string;
    status: string;
    description?: string;
    subordinateCount?: number;
}

export const useTrustAnchors = () => {
    // Filter by federation_entity to get Trust Anchors
    const { data: subordinates, isLoading, error } = useSubordinates('federation_entity');

    const trustAnchors: TrustAnchorDisplay[] = subordinates?.map((sub: Subordinate) => {
        // Simple heuristic to determine "type" from metadata or registered_entity_types
        // For now, assume 'federation' if it has federation_entity
        const type = 'federation'; 
        
        return {
            id: sub.id.toString(), // InternalID could be number or string
            entityId: sub.entity_id,
            name: sub.description || sub.entity_id, // Fallback
            type,
            status: sub.status,
            description: sub.description,
            subordinateCount: 0 // Not available in OAS list response yet
        };
    }) || [];

    return { trustAnchors, isLoading, error };
};
