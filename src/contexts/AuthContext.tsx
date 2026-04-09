import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type AppRole =
  | 'master_admin' | 'director' | 'sgi_leader'
  | 'seguridad_higiene' | 'operaciones' | 'rrhh'
  | 'compras_approver' | 'auditor_externo';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  position?: string;
  department?: string;
  avatar_url?: string;
  phone?: string;
  responsibilities?: string[];
  objectives?: string[];
  kpis?: string[];
}

interface AuthCtx {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  hasRole: (...roles: AppRole[]) => boolean;
  isAdmin: boolean;
  isMasterAdmin: boolean;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const ROLE_LABELS: Record<AppRole, string> = {
  master_admin:      'Master Admin',
  director:          'Director',
  sgi_leader:        'SGI Leader',
  seguridad_higiene: 'Seguridad e Higiene',
  operaciones:       'Operaciones',
  rrhh:              'RRHH',
  compras_approver:  'Aprobador de Compras',
  auditor_externo:   'Auditor Externo',
};

const ADMIN_ROLES: AppRole[] = ['master_admin', 'director', 'sgi_leader'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('dassa_token');
    if (!token) { setIsLoading(false); return; }
    api.get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => localStorage.removeItem('dassa_token'))
      .finally(() => setIsLoading(false));
  }, []);

  async function signIn(email: string, password: string) {
    const { token, user } = await api.post<{ token: string; user: AuthUser }>(
      '/auth/login', { email, password }
    );
    localStorage.setItem('dassa_token', token);
    setUser(user);
  }

  function signOut() {
    localStorage.removeItem('dassa_token');
    setUser(null);
  }

  const hasRole = (...roles: AppRole[]) => !!user && roles.includes(user.role);
  const isAdmin = !!user && ADMIN_ROLES.includes(user.role);
  const isMasterAdmin = user?.role === 'master_admin';

  return (
    <Ctx.Provider value={{ user, isLoading, signIn, signOut, hasRole, isAdmin, isMasterAdmin }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
