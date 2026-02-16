import { useSubordinates } from './useSubordinates';
import { Subordinate } from '@/client/models/Subordinate';

export interface EntityDisplay {
  id: string;
  entityId: string;
  displayName: string;
  organizationName: string;
  entityTypes: string[];
  status: string;
  trustAnchorId?: string; // Not in OAS subordinate list, might need metadata
  trustAnchorName?: string;
  description?: string;
}

export const useEntities = () => {
  const { data: subordinates, isLoading, error } = useSubordinates(); // Fetch all

  const entities: EntityDisplay[] = subordinates
    ?.filter((sub: Subordinate) => (sub.metadata as any)?.federation_entity?.entity_role !== 'intermediate')
    .map((sub: Subordinate) => ({
      id: sub.id as string,
      entityId: sub.entity_id,
      displayName: sub.description || 'Unknown Name', // Map description to name
      // Organization name is deep in metadata, might not be available in simple list
      organizationName: '', 
      entityTypes: sub.registered_entity_types || [],
      status: sub.status,
      description: sub.description
    })) || [];

  return { entities, isLoading, error };
};
