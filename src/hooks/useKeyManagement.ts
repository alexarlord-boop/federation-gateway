/**
 * Hook: Key Management (KMS)
 *
 * Wraps KeyManagementService for:
 * - Listing / adding / deleting public keys
 * - Fetching KMS info (algorithm, RSA key length)
 * - Managing rotation options
 * - Triggering manual key rotation
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeysService } from '@/client/services/KeysService';
import type { PublicKeyEntry } from '@/client/models/PublicKeyEntry';
import type { AddPublicKeyEntry } from '@/client/models/AddPublicKeyEntry';
import type { KMSInfo } from '@/client/models/KMSInfo';
import type { KMSRotationOptions } from '@/client/models/KMSRotationOptions';
import type { SignatureAlgorithm } from '@/client/models/SignatureAlgorithm';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useKeyManagement = () => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  // Public keys
  const keysQuery = useQuery<PublicKeyEntry[]>({
    queryKey: ['public-keys', instanceId],
    queryFn: () => KeysService.listPublicKeys(),
    enabled: !!instanceId,
  });

  const addKey = useMutation({
    mutationFn: (data: AddPublicKeyEntry) =>
      KeysService.addPublicKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-keys', instanceId] });
    },
  });

  const deleteKey = useMutation({
    mutationFn: ({ kid, revoke, reason }: { kid: string; revoke?: boolean; reason?: string }) =>
      KeysService.deletePublicKey(kid, revoke, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-keys', instanceId] });
    },
  });

  const rotateKey = useMutation({
    mutationFn: ({ kid, data }: { kid: string; data: any }) =>
      KeysService.rotatePublicKey(kid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-keys', instanceId] });
    },
  });

  const updateKeyMetadata = useMutation({
    mutationFn: ({ kid, exp }: { kid: string; exp: number | null }) =>
      KeysService.updatePublicKeyMetadata(kid, { exp }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-keys', instanceId] });
    },
  });

  // KMS info
  const kmsInfoQuery = useQuery<KMSInfo>({
    queryKey: ['kms-info', instanceId],
    queryFn: () => KeysService.getKmsInfo(),
    enabled: !!instanceId,
  });

  const updateAlgorithm = useMutation({
    mutationFn: (alg: SignatureAlgorithm) =>
      KeysService.updateKmsAlg(alg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kms-info', instanceId] });
    },
  });

  // Rotation options
  const rotationQuery = useQuery<KMSRotationOptions>({
    queryKey: ['kms-rotation', instanceId],
    queryFn: () => KeysService.getKmsRotationOptions(),
    enabled: !!instanceId,
  });

  const updateRotation = useMutation({
    mutationFn: (opts: KMSRotationOptions) =>
      KeysService.updateKmsRotationOptions(opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kms-rotation', instanceId] });
    },
  });

  const triggerRotation = useMutation({
    mutationFn: ({ revoke, reason }: { revoke?: boolean; reason?: string } = {}) =>
      KeysService.triggerKmsRotation(revoke, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-keys', instanceId] });
      queryClient.invalidateQueries({ queryKey: ['kms-info', instanceId] });
    },
  });

  // Published JWKS
  const jwksQuery = useQuery({
    queryKey: ['published-jwks', instanceId],
    queryFn: () => KeysService.getPublishedJwks(),
    enabled: !!instanceId,
  });

  return {
    // Keys
    keys: keysQuery.data ?? [],
    keysLoading: keysQuery.isLoading,
    addKey,
    deleteKey,
    rotateKey,
    updateKeyMetadata,

    // KMS info
    kmsInfo: kmsInfoQuery.data,
    kmsInfoLoading: kmsInfoQuery.isLoading,
    updateAlgorithm,

    // Rotation
    rotationOptions: rotationQuery.data,
    rotationLoading: rotationQuery.isLoading,
    updateRotation,
    triggerRotation,

    // JWKS
    publishedJwks: jwksQuery.data,
    jwksLoading: jwksQuery.isLoading,
  };
};
