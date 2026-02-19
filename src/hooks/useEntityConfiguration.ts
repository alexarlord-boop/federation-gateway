/**
 * Hook: Entity Configuration (§1.2)
 *
 * Wraps EntityConfigurationService for:
 * - Fetching the full entity-configuration statement
 * - Managing additional claims (CRUD)
 * - Managing entity-configuration lifetime
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityConfigurationService } from '@/client/services/EntityConfigurationService';
import type { AdditionalClaim } from '@/client/models/AdditionalClaim';
import type { AddAdditionalClaim } from '@/client/models/AddAdditionalClaim';
import type { LifetimeSeconds } from '@/client/models/LifetimeSeconds';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useEntityConfiguration = () => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  // Full entity-configuration JSON (the signed statement)
  const configQuery = useQuery({
    queryKey: ['entity-configuration', instanceId],
    queryFn: () => EntityConfigurationService.getEntityConfiguration(),
    enabled: !!instanceId,
  });

  // Additional claims
  const claimsQuery = useQuery<{ claims: AdditionalClaim[] }>({
    queryKey: ['entity-configuration-claims', instanceId],
    queryFn: () => EntityConfigurationService.getAdditionalClaims(),
    enabled: !!instanceId,
  });

  const addClaim = useMutation({
    mutationFn: (data: AddAdditionalClaim) =>
      EntityConfigurationService.addAdditionalClaims(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-configuration-claims', instanceId] });
    },
  });

  const updateClaim = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AddAdditionalClaim }) =>
      EntityConfigurationService.updateAdditionalClaim(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-configuration-claims', instanceId] });
    },
  });

  const deleteClaim = useMutation({
    mutationFn: (id: number) =>
      EntityConfigurationService.deleteAdditionalClaim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-configuration-claims', instanceId] });
    },
  });

  // Lifetime
  const lifetimeQuery = useQuery<LifetimeSeconds>({
    queryKey: ['entity-configuration-lifetime', instanceId],
    queryFn: () => EntityConfigurationService.getEntityConfigurationLifetime(),
    enabled: !!instanceId,
  });

  const updateLifetime = useMutation({
    mutationFn: (seconds: LifetimeSeconds) =>
      EntityConfigurationService.updateEntityConfigurationLifetime(seconds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-configuration-lifetime', instanceId] });
    },
  });

  return {
    // Entity config
    entityConfiguration: configQuery.data,
    configLoading: configQuery.isLoading,
    configError: configQuery.error,

    // Additional claims
    claims: (claimsQuery.data as any)?.claims ?? (Array.isArray(claimsQuery.data) ? claimsQuery.data : []),
    claimsLoading: claimsQuery.isLoading,
    addClaim,
    updateClaim,
    deleteClaim,

    // Lifetime
    lifetime: lifetimeQuery.data,
    lifetimeLoading: lifetimeQuery.isLoading,
    updateLifetime,
  };
};
