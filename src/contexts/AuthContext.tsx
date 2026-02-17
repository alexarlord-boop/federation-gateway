import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User } from '@/types/registry';
import { OpenAPI } from '@/client';
import { useBackend } from '@/contexts/BackendContext';

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

  const tokenKey = `auth_token:${selectedBackend.id}`;
  const userKey = `auth_user:${selectedBackend.id}`;

  useEffect(() => {
    const storedUser = localStorage.getItem(userKey);
    const storedToken = localStorage.getItem(tokenKey);
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;

    setUser(parsedUser);
    OpenAPI.TOKEN = storedToken || undefined;
  }, [tokenKey, userKey]);

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
      localStorage.setItem(tokenKey, data.access_token);
      OpenAPI.TOKEN = data.access_token;
    } finally {
      setIsLoading(false);
    }
  }, [selectedBackend.baseUrl, tokenKey, userKey]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(userKey);
    localStorage.removeItem(tokenKey);
    OpenAPI.TOKEN = undefined;
  }, [tokenKey, userKey]);

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
