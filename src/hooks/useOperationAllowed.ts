/**
 * Hook: Per-operation capability check.
 *
 * Returns `true` when the active backend supports the given
 * feature + operation combination.  Use this to conditionally
 * render write controls (buttons, forms) so users see data in
 * read-only mode when the backend (or their role) lacks write
 * permissions for that operation.
 *
 * @example
 *   const canCreate = useOperationAllowed('subordinates', 'create');
 *   const canDelete = useOperationAllowed('subordinates', 'delete');
 *   // …
 *   {canCreate && <Button>Register Entity</Button>}
 */
import { useCapabilities } from '@/contexts/CapabilityContext';

export function useOperationAllowed(feature: string, operation: string): boolean {
  const { hasOperation, isLoading } = useCapabilities();
  if (isLoading) return false;
  return hasOperation(feature, operation);
}
