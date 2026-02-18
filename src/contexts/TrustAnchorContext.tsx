import { createContext, useContext, useState, ReactNode } from 'react';
import type { TrustAnchorDisplay } from '@/hooks/useTrustAnchors';

interface TrustAnchorContextType {
  activeTrustAnchor: TrustAnchorDisplay | null;
  setActiveTrustAnchor: (ta: TrustAnchorDisplay | null) => void;
  trustAnchors: TrustAnchorDisplay[];
  setTrustAnchors: (tas: TrustAnchorDisplay[]) => void;
}

const TrustAnchorContext = createContext<TrustAnchorContextType | undefined>(undefined);

export function TrustAnchorProvider({ children }: { children: ReactNode }) {
  const [trustAnchors, setTrustAnchors] = useState<TrustAnchorDisplay[]>([]);
  const [activeTrustAnchor, setActiveTrustAnchor] = useState<TrustAnchorDisplay | null>(null);

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
