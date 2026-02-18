import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { TrustAnchorDisplay } from '@/hooks/useTrustAnchors';
import { setActiveInstance } from '@/lib/api-config';

interface TrustAnchorContextType {
  activeTrustAnchor: TrustAnchorDisplay | null;
  setActiveTrustAnchor: (ta: TrustAnchorDisplay | null) => void;
  trustAnchors: TrustAnchorDisplay[];
  setTrustAnchors: (tas: TrustAnchorDisplay[]) => void;
}

const TrustAnchorContext = createContext<TrustAnchorContextType | undefined>(undefined);

export function TrustAnchorProvider({ children }: { children: ReactNode }) {
  const [trustAnchors, setTrustAnchors] = useState<TrustAnchorDisplay[]>([]);
  const [activeTrustAnchor, setActiveTrustAnchorState] = useState<TrustAnchorDisplay | null>(null);

  // When the active instance changes, point the generated OpenAPI client
  // at /api/v1/proxy/{instanceId} so every Admin API call routes through
  // the gateway proxy automatically.
  const setActiveTrustAnchor = useCallback((ta: TrustAnchorDisplay | null) => {
    setActiveTrustAnchorState(ta);
    setActiveInstance(ta?.id ?? null);
  }, []);

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
