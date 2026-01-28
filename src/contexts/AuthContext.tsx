import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, UserRole } from '@/types/registry';
import { OpenAPI } from '@/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const mockUsers: Record<string, User & { password: string }> = {
  'admin@oidfed.org': {
    id: '1',
    email: 'admin@oidfed.org',
    name: 'Federation Admin',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
    password: 'admin123',
  },
  'tech@example.org': {
    id: '2',
    email: 'tech@example.org',
    name: 'Technical Contact',
    role: 'user',
    organizationId: 'org-1',
    organizationName: 'Example University',
    createdAt: '2024-06-15T00:00:00Z',
    password: 'user123',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize from localStorage on mount
    const storedUser = localStorage.getItem('auth_user');
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    if (parsedUser) {
        OpenAPI.TOKEN = 'mock-jwt-token';
    }
    return parsedUser;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockUser = mockUsers[email];
    if (mockUser && mockUser.password === password) {
      const { password: _, ...userData } = mockUser;
      setUser(userData);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      OpenAPI.TOKEN = 'mock-jwt-token';
    } else {
      throw new Error('Invalid email or password');
    }
    
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('auth_user');
    OpenAPI.TOKEN = undefined;
  }, []);

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
