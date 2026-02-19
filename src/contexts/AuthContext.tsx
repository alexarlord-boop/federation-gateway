import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
  organizationName?: string;
  createdAt: string;
}
import { OpenAPI } from '@/client';
import { useBackend } from '@/contexts/BackendContext';
import {
  initTokenManager,
  storeTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isAccessTokenExpired,
  refreshAccessToken,
} from '@/lib/token-manager';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { selectedBackend } = useBackend();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const backendScopeKey = selectedBackend.baseUrl || '__same_origin__';
  const tokenKey = `auth_token:${backendScopeKey}`;
  const userKey = `auth_user:${backendScopeKey}`;

  // Stable logout — clears all tokens + state
  const logout = useCallback(() => {
    setUser(null);
    clearTokens();
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // Schedule a proactive refresh ~60s before access token expiry
  const scheduleProactiveRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const token = getAccessToken();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp as number;
      // Refresh 90s before expiry (TokenManager itself uses 60s buffer,
      // but we want the proactive timer to fire a bit earlier)
      const msUntilRefresh = (exp - 90) * 1000 - Date.now();

      if (msUntilRefresh <= 0) {
        // Already expired or about to — refresh immediately
        refreshAccessToken();
        return;
      }

      refreshTimerRef.current = setTimeout(async () => {
        const pair = await refreshAccessToken();
        if (pair) {
          // Schedule again for the next cycle
          scheduleProactiveRefresh();
        }
        // If pair is null, force-logout was already called by TokenManager
      }, msUntilRefresh);
    } catch {
      // Malformed token — don't schedule
    }
  }, []);

  // Initialise TokenManager whenever the backend changes
  useEffect(() => {
    initTokenManager(selectedBackend.baseUrl, logout);

    const storedUser = localStorage.getItem(userKey);
    const storedToken = getAccessToken();
    const storedRefresh = getRefreshToken();

    // Strict session restore: require user + access token + refresh token
    if (storedUser && storedToken && storedRefresh) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      // If the access token is already expired but we have a refresh token,
      // attempt a silent refresh immediately
      if (isAccessTokenExpired()) {
        refreshAccessToken().then((pair) => {
          if (!pair) {
            // Refresh failed — clear stale session
            setUser(null);
            clearTokens();
          } else {
            scheduleProactiveRefresh();
          }
        });
      } else {
        scheduleProactiveRefresh();
      }
    } else {
      // Incomplete session — wipe everything
      setUser(null);
      clearTokens();
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [selectedBackend.baseUrl, userKey, logout, scheduleProactiveRefresh]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${selectedBackend.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid email or password');
      }

      const data = await response.json();
      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        organizationId: data.user.organization_id,
        organizationName: data.user.organization_name,
        createdAt: data.user.created_at || new Date().toISOString(),
      };

      setUser(userData);
      localStorage.setItem(userKey, JSON.stringify(userData));
      storeTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });

      scheduleProactiveRefresh();
    } finally {
      setIsLoading(false);
    }
  }, [selectedBackend.baseUrl, userKey, scheduleProactiveRefresh]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
