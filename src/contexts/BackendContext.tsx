import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  registerBackends: (targets: BackendTarget[]) => void;
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
  const initialBackends = useMemo(() => parseBackends(), []);
  const [backends, setBackends] = useState<BackendTarget[]>(initialBackends);

  const [selectedBackendId, setSelectedBackendId] = useState<string>(() => {
    const stored = localStorage.getItem('selected_backend_id');
    return stored || initialBackends[0].id;
  });

  const selectedBackend = useMemo(() => {
    return backends.find((b) => b.id === selectedBackendId) || backends[0] || initialBackends[0];
  }, [backends, selectedBackendId, initialBackends]);

  useEffect(() => {
    localStorage.setItem('selected_backend_id', selectedBackend.id);
    OpenAPI.BASE = selectedBackend.baseUrl;
  }, [selectedBackend]);

  const registerBackends = useCallback((targets: BackendTarget[]) => {
    if (!targets.length) return;

    setBackends((prev) => {
      const map = new Map(prev.map((b) => [b.id, b]));
      let changed = false;

      for (const target of targets) {
        if (!target.id || !target.name) continue;
        const existing = map.get(target.id);
        if (!existing || existing.name != target.name || existing.baseUrl != target.baseUrl) {
          map.set(target.id, target);
          changed = true;
        }
      }

      if (!changed) {
        return prev;
      }

      return Array.from(map.values());
    });
  }, []);

  const value: BackendContextValue = {
    backends,
    selectedBackend,
    setSelectedBackend: setSelectedBackendId,
    registerBackends,
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
