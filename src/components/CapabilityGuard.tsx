/**
 * CapabilityGuard
 *
 * A wrapper component that conditionally renders its children based on whether
 * the backend supports a given capability (feature + optional operation).
 *
 * Usage:
 *   <CapabilityGuard capability="trust_marks">
 *     <TrustMarksPage />
 *   </CapabilityGuard>
 *
 *   <CapabilityGuard capability="subordinates" operation="create">
 *     <EntityRegisterPage />
 *   </CapabilityGuard>
 *
 *   <CapabilityGuard capability="trust_marks" fallback={<NotSupportedBanner />}>
 *     ...
 *   </CapabilityGuard>
 */
import { ReactNode } from 'react';
import { useCapabilities } from '@/contexts/CapabilityContext';
import { ShieldOff } from 'lucide-react';

interface CapabilityGuardProps {
  /** The feature name to check (e.g. "subordinates", "trust_marks") */
  capability: string;
  /** Optional operation within the feature (e.g. "create", "delete") */
  operation?: string;
  /** Content to render when the capability is available */
  children: ReactNode;
  /**
   * What to render when the capability is NOT available.
   * - `"hidden"` (default): render nothing
   * - `"placeholder"`: render a "Not Supported" card
   * - ReactNode: render custom fallback
   */
  fallback?: 'hidden' | 'placeholder' | ReactNode;
}

function NotSupportedPlaceholder({ capability }: { capability: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <ShieldOff className="w-12 h-12 mb-4 opacity-30" />
      <h2 className="text-lg font-semibold mb-1">Feature Not Available</h2>
      <p className="text-sm">
        The <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">{capability}</code> capability is not supported by the current backend.
      </p>
    </div>
  );
}

export function CapabilityGuard({
  capability,
  operation,
  children,
  fallback = 'hidden',
}: CapabilityGuardProps) {
  const { isFeatureEnabled, hasOperation, isLoading } = useCapabilities();

  // While capabilities are loading, render nothing to avoid flash
  if (isLoading) return null;

  const allowed = operation
    ? hasOperation(capability, operation)
    : isFeatureEnabled(capability);

  if (allowed) return <>{children}</>;

  // Render fallback
  if (fallback === 'hidden') return null;
  if (fallback === 'placeholder') return <NotSupportedPlaceholder capability={capability} />;
  return <>{fallback}</>;
}
