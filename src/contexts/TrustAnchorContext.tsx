import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TrustAnchorDisplay } from '@/hooks/useTrustAnchors';
import { setActiveInstance, getActiveInstanceId } from '@/lib/api-config';

interface TrustAnchorContextType {
  activeTrustAnchor: TrustAnchorDisplay | null;
  setActiveTrustAnchor: (ta: TrustAnchorDisplay | null) => void;
  trustAnchors: TrustAnchorDisplay[];
  setTrustAnchors: (tas: TrustAnchorDisplay[]) => void;
}

const TrustAnchorContext = createContext<TrustAnchorContextType | undefined>(undefined);

export function TrustAnchorProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [trustAnchors, setTrustAnchors] = useState<TrustAnchorDisplay[]>([]);
  const [activeTrustAnchor, setActiveTrustAnchorState] = useState<TrustAnchorDisplay | null>(null);

  // When the active instance changes, update the module-level variable read
  // by the OpenAPI.BASE getter and invalidate the query cache so active
  // queries refetch from the new instance.
  const setActiveTrustAnchor = useCallback((ta: TrustAnchorDisplay | null) => {
    const previousId = getActiveInstanceId();
    const nextId = ta?.id ?? null;

    setActiveTrustAnchorState(ta);
    setActiveInstance(nextId);

    // On instance switch: cancel in-flight requests targeting the old
    // instance and mark all queries stale so active ones refetch.
    if (previousId !== nextId) {
      queryClient.cancelQueries();
      queryClient.invalidateQueries();
    }
  }, [queryClient]);

  // On unmount (user logs out → TrustAnchorProvider unmounts), reset to
  // the gateway's own base so login / auth calls still work.
  useEffect(() => {
    return () => setActiveInstance(null);
  }, []);

  return (
    <TrustAnchorContext.Provider 
      value={{ 
        activeTrustAnchor, 
        setActiveTrustAnchor, 
        trustAnchors,
        setTrustAnchors,
      }}
    >
      {children}
    </TrustAnchorContext.Provider>
  );
}

export function useTrustAnchor() {
  const context = useContext(TrustAnchorContext);
  if (!context) {
    throw new Error('useTrustAnchor must be used within a TrustAnchorProvider');
  }
  return context;
}
