import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthorityHintsService } from '@/client/services/AuthorityHintsService';

export const useAuthorityHints = () => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['authorityHints'],
    queryFn: () => AuthorityHintsService.getAuthorityHints(),
  });
  
  const addHint = useMutation({
    mutationFn: (entityId: string) => AuthorityHintsService.createAuthorityHint({ entity_id: entityId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorityHints'] });
    }
  });

  const deleteHint = useMutation({
    mutationFn: (id: string) => AuthorityHintsService.deleteAuthorityHint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorityHints'] });
    }
  });

  return { 
    hints: query.data, 
    isLoading: query.isLoading, 
    addHint,
    deleteHint
  };
}
