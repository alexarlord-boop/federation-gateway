/**
 * Hook: General Subordinate Lifetime
 *
 * Wraps SubordinatesService lifetime endpoints for reading and
 * updating the default lifetime applied to subordinate statements.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubordinatesService } from '@/client/services/SubordinatesService';
import type { LifetimeSeconds } from '@/client/models/LifetimeSeconds';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useSubordinateLifetime = () => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const query = useQuery<LifetimeSeconds>({
    queryKey: ['subordinate-lifetime', instanceId],
    queryFn: () => SubordinatesService.getGeneralSubordinateLifetime(),
    enabled: !!instanceId,
  });

  const update = useMutation({
    mutationFn: (data: LifetimeSeconds) =>
      SubordinatesService.updateGeneralSubordinateLifetime(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subordinate-lifetime', instanceId] });
    },
  });

  return {
    lifetime: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update,
  };
};
