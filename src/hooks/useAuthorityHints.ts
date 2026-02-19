import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthorityHintsService } from '@/client/services/AuthorityHintsService';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useAuthorityHints = () => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['authorityHints', instanceId],
    queryFn: () => AuthorityHintsService.getAuthorityHints(),
    enabled: !!instanceId,
  });
  
  const addHint = useMutation({
    mutationFn: (data: { entity_id: string, description?: string }) => 
      AuthorityHintsService.createAuthorityHint(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorityHints', instanceId] });
    }
  });

  const deleteHint = useMutation({
    mutationFn: (id: string) => AuthorityHintsService.deleteAuthorityHint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorityHints', instanceId] });
    }
  });

  return { 
    hints: query.data, 
    isLoading: query.isLoading, 
    addHint,
    deleteHint
  };
}
