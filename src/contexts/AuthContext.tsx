import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "master_admin"|"direccion_sgi"|"sgi_leader"|"seguridad_higiene"|"operaciones"|"rrhh"|"compras_approver"|"compras_executor";

export interface Profile {
  id: string; user_id: string; full_name: string; email: string;
  avatar_url?: string; position?: string; department?: string;
}

interface AuthContextType {
  user: User | null; session: Session | null; profile: Profile | null;
  roles: AppRole[]; isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isAdmin: boolean; isMasterAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadProfile(userId: string) {
    const [{ data: prof }, { data: userRoles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (prof) setProfile(prof);
    if (userRoles) setRoles(userRoles.map((r: any) => r.role as AppRole));
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id).finally(() => setIsLoading(false));
      else setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session); setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else { setProfile(null); setRoles([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };
  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    return { error };
  };
  const signOut = async () => { await supabase.auth.signOut(); setProfile(null); setRoles([]); };
  const hasRole = (r: AppRole) => roles.includes(r);
  const hasAnyRole = (r: AppRole[]) => r.some(role => roles.includes(role));

  return (
    <AuthContext.Provider value={{
      user, session, profile, roles, isLoading, signIn, signUp, signOut,
      hasRole, hasAnyRole,
      isAdmin: hasAnyRole(["sgi_leader","direccion_sgi","master_admin"]),
      isMasterAdmin: hasRole("master_admin"),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be within AuthProvider");
  return ctx;
}
