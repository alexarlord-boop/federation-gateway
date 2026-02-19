/**
 * Hook: Trust Mark Issuance
 *
 * Wraps TrustMarkIssuanceService for managing trust mark issuance specs
 * and the subjects within each spec.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrustMarkIssuanceService } from '@/client/services/TrustMarkIssuanceService';
import type { TrustMarkSpec } from '@/client/models/TrustMarkSpec';
import type { AddTrustMarkSpec } from '@/client/models/AddTrustMarkSpec';
import type { TrustMarkSubject } from '@/client/models/TrustMarkSubject';
import type { AddTrustMarkSubject } from '@/client/models/AddTrustMarkSubject';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

// ── Spec-level ──────────────────────────────────────────

export const useTrustMarkSpecs = () => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const query = useQuery<TrustMarkSpec[]>({
    queryKey: ['trust-mark-specs', instanceId],
    queryFn: () => TrustMarkIssuanceService.getTrustMarkIssuanceSpecs(),
    enabled: !!instanceId,
  });

  const create = useMutation({
    mutationFn: (data: AddTrustMarkSpec) =>
      TrustMarkIssuanceService.createTrustMarkIssuanceSpec(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-mark-specs', instanceId] });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AddTrustMarkSpec }) =>
      TrustMarkIssuanceService.updateTrustMarkIssuanceSpec(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-mark-specs', instanceId] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      TrustMarkIssuanceService.deleteTrustMarkIssuanceSpec(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-mark-specs', instanceId] });
    },
  });

  return {
    specs: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    create,
    update,
    remove,
  };
};

// ── Subject-level (per spec) ────────────────────────────

export const useTrustMarkSubjects = (specId: number) => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;
  const queryClient = useQueryClient();

  const query = useQuery<TrustMarkSubject[]>({
    queryKey: ['trust-mark-subjects', instanceId, specId],
    queryFn: () => TrustMarkIssuanceService.listTrustMarkSubjects(specId),
    enabled: !!instanceId && !!specId,
  });

  const create = useMutation({
    mutationFn: (data: AddTrustMarkSubject) =>
      TrustMarkIssuanceService.createTrustMarkSubject(specId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-mark-subjects', instanceId, specId] });
    },
  });

  const update = useMutation({
    mutationFn: ({ subjectId, data }: { subjectId: number; data: AddTrustMarkSubject }) =>
      TrustMarkIssuanceService.updateTrustMarkSubject(specId, subjectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-mark-subjects', instanceId, specId] });
    },
  });

  const remove = useMutation({
    mutationFn: (subjectId: number) =>
      TrustMarkIssuanceService.deleteTrustMarkSubject(specId, subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-mark-subjects', instanceId, specId] });
    },
  });

  const changeStatus = useMutation({
    mutationFn: ({ subjectId, status }: { subjectId: number; status: string }) =>
      TrustMarkIssuanceService.changeTrustMarkSubjectStatus(specId, subjectId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-mark-subjects', instanceId, specId] });
    },
  });

  return {
    subjects: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    create,
    update,
    remove,
    changeStatus,
  };
};
