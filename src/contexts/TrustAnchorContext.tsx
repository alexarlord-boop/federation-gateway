import { createContext, useContext, useState, ReactNode } from 'react';
import { mockTrustAnchors } from '@/data/mockData';
import type { TrustAnchor } from '@/types/registry';

interface TrustAnchorContextType {
  activeTrustAnchor: TrustAnchor | null;
  setActiveTrustAnchor: (ta: TrustAnchor | null) => void;
  trustAnchors: TrustAnchor[];
}

const TrustAnchorContext = createContext<TrustAnchorContextType | undefined>(undefined);

export function TrustAnchorProvider({ children }: { children: ReactNode }) {
  const [activeTrustAnchor, setActiveTrustAnchor] = useState<TrustAnchor | null>(
    mockTrustAnchors.find(ta => ta.type === 'federation') || null
  );

  return (
    <TrustAnchorContext.Provider 
      value={{ 
        activeTrustAnchor, 
        setActiveTrustAnchor, 
        trustAnchors: mockTrustAnchors 
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
