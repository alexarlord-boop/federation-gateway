import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { OpenAPI } from '@/client';

export interface BackendTarget {
  id: string;
  name: string;
  baseUrl: string;
}

interface BackendContextValue {
  backends: BackendTarget[];
  selectedBackend: BackendTarget;
  setSelectedBackend: (backendId: string) => void;
}

const DEFAULT_BACKENDS: BackendTarget[] = [
  {
    id: 'default',
    name: 'Default Admin API',
    baseUrl: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost:8765'),
  },
];

function parseBackends(): BackendTarget[] {
  const raw = import.meta.env.VITE_BACKENDS_JSON;
  if (!raw) return DEFAULT_BACKENDS;

  try {
    const parsed = JSON.parse(raw) as BackendTarget[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_BACKENDS;

    return parsed.filter((b) => !!b.id && !!b.name && typeof b.baseUrl === 'string');
  } catch {
    return DEFAULT_BACKENDS;
  }
}

const BackendContext = createContext<BackendContextValue | undefined>(undefined);

export function BackendProvider({ children }: { children: React.ReactNode }) {
  const backends = useMemo(() => parseBackends(), []);

  const [selectedBackendId, setSelectedBackendId] = useState<string>(() => {
    const stored = localStorage.getItem('selected_backend_id');
    return stored || backends[0].id;
  });

  const selectedBackend = useMemo(() => {
    return backends.find((b) => b.id === selectedBackendId) || backends[0];
  }, [backends, selectedBackendId]);

  useEffect(() => {
    localStorage.setItem('selected_backend_id', selectedBackend.id);
    OpenAPI.BASE = selectedBackend.baseUrl;
    // Reset bearer token. Auth context will restore backend-scoped token after switch.
    OpenAPI.TOKEN = undefined;
  }, [selectedBackend]);

  const value: BackendContextValue = {
    backends,
    selectedBackend,
    setSelectedBackend: setSelectedBackendId,
  };

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}

export function useBackend() {
  const context = useContext(BackendContext);
  if (!context) {
    throw new Error('useBackend must be used within BackendProvider');
  }
  return context;
}
