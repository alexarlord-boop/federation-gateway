/**
 * Hook: Subordinate Statement & History
 *
 * Wraps SubordinatesService for fetching the generated subordinate
 * statement JSON and the event history log.
 */
import { useQuery } from '@tanstack/react-query';
import { SubordinatesService } from '@/client/services/SubordinatesService';
import type { AnyValue } from '@/client/models/AnyValue';
import type { SubordinateHistory } from '@/client/models/SubordinateHistory';
import { useTrustAnchor } from '@/contexts/TrustAnchorContext';

export const useSubordinateStatement = (subordinateId: string) => {
  const { activeTrustAnchor } = useTrustAnchor();
  const instanceId = activeTrustAnchor?.id;

  const statementQuery = useQuery<AnyValue>({
    queryKey: ['subordinate-statement', instanceId, subordinateId],
    queryFn: () => SubordinatesService.getSubordinateStatement(subordinateId),
    enabled: !!subordinateId && !!instanceId,
  });

  const historyQuery = useQuery<SubordinateHistory>({
    queryKey: ['subordinate-history', instanceId, subordinateId],
    queryFn: () => SubordinatesService.getSubordinateHistory(subordinateId),
    enabled: !!subordinateId && !!instanceId,
  });

  return {
    statement: statementQuery.data,
    statementLoading: statementQuery.isLoading,
    statementError: statementQuery.error,
    history: historyQuery.data,
    historyLoading: historyQuery.isLoading,
    historyError: historyQuery.error,
  };
};
