/**
 * Hook: Subordinate Keys (per-entity JWKS)
 *
 * Wraps SubordinateKeysService for managing the JWKS
 * published in a subordinate's entity statement.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinateKeysService } from '@/client/services/SubordinateKeysService';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useSubordinateKeys = (subordinateId: string) => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();
  const idNum = Number(subordinateId);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['subordinate-keys', instanceId, subordinateId] });

  const query = useQuery({
    queryKey: ['subordinate-keys', instanceId, subordinateId],
    queryFn: () => SubordinateKeysService.getSubordinateJwks(idNum),
    enabled: !!subordinateId && !!instanceId,
  });

  const setJwks = useMutation({
    mutationFn: (jwks: any) =>
      SubordinateKeysService.setSubordinateJwks(idNum, jwks),
    onSuccess: invalidate,
  });

  const addJwk = useMutation({
    mutationFn: (jwk: any) =>
      SubordinateKeysService.addSubordinateJwk(idNum, jwk),
    onSuccess: invalidate,
  });

  const deleteJwk = useMutation({
    mutationFn: (kid: string) =>
      SubordinateKeysService.deleteSubordinateJwk(idNum, kid),
    onSuccess: invalidate,
  });

  return {
    jwks: query.data,
    isLoading: query.isLoading,
    error: query.error,
    setJwks,
    addJwk,
    deleteJwk,
  };
};
