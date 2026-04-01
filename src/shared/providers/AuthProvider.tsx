/**
 * AUTH PROVIDER
 * Wraps the app and provides auth state + actions to all children.
 * Screens use: const { state, actions } = useAuth();
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthViewModel } from '../../features/auth/presentation/useAuthViewModel';
import { Client } from '../types/models';

interface AuthContextType {
  state: {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: Client | null;
    error: string | null;
  };
  actions: {
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    clearError: () => void;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const viewModel = useAuthViewModel();
  return (
    <AuthContext.Provider value={viewModel}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
