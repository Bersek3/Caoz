'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { accountHref } from '@/lib/accountNavigation';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  role: string;
  riotId?: string;
  steamId?: string;
  eaId?: string;
  discordTag?: string;
  epicGamesUsername?: string;
  psnId?: string;
  xboxGamertag?: string;
  bio?: string;
  birthDate?: string | null;
  age?: number | null;
  rut?: string;
  accountStatus?: string;
  parentalAuthorization?: any;
  teamName?: string;
  teamTag?: string;
  team?: {
    id: string;
    name: string;
    tag: string;
    logo_url?: string;
    invite_code?: string;
    captain_id?: string;
    is_captain?: boolean;
    members?: any[];
    memberCount?: number;
  } | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  openAuthModal: (mode?: 'login' | 'register') => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    email: string;
    password: string;
    username: string;
    fullName?: string;
    riotId?: string;
    discordTag?: string;
    birthDate?: string;
    swornDeclaration?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<AuthUser>) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Keep existing entry points while moving account access to its own pages.
  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    const returnTo = window.location.pathname + window.location.search + window.location.hash;
    router.push(accountHref(mode, returnTo));
  };

  const refreshUser = async () => {
    const savedToken = token || (typeof window !== 'undefined' ? localStorage.getItem('caoz_auth_token') : null);
    if (!savedToken) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser({
            ...data.user,
            teamName: data.user.team?.name || undefined,
            teamTag: data.user.team?.tag || undefined
          });
        }
      }
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('caoz_auth_token');
    if (savedToken) {
      setToken(savedToken);
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setUser({
              ...data.user,
              teamName: data.user.team?.name || undefined,
              teamTag: data.user.team?.tag || undefined
            });
          } else {
            localStorage.removeItem('caoz_auth_token');
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('caoz_auth_token');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Error al iniciar sesión' };
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('caoz_auth_token', data.token);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error de conexión' };
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    username: string;
    fullName?: string;
    riotId?: string;
    discordTag?: string;
    birthDate?: string;
    swornDeclaration?: boolean;
  }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Error al registrar usuario' };
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('caoz_auth_token', data.token);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error de conexión' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('caoz_auth_token');
      sessionStorage.clear();
      window.location.replace('/arena');
    }
  };

  const updateProfile = async (profileData: Partial<AuthUser>) => {
    if (!token) return { success: false, error: 'No autenticado' };

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Error al actualizar' };
      }

      setUser((prev) => (prev ? { ...prev, ...data.user } : data.user));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al actualizar' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        openAuthModal,
        login,
        register,
        logout,
        updateProfile,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
