
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, ClinicSettings } from '../types';

interface AuthContextType {
  user: any;
  tenantUser: User | null;
  settings: ClinicSettings | null;
  loading: boolean;
  setSettings: React.Dispatch<React.SetStateAction<ClinicSettings | null>>;
  refreshContext: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [tenantUser, setTenantUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTenantContext = async (sessionUser: any) => {
    if (!sessionUser) return;
    try {
      console.log("🔍 [AUTH_CONTEXT] Buscando perfil para:", sessionUser.id);
      const { data: profile, error: pErr } = await supabase.from('users').select('*').eq('id', sessionUser.id).maybeSingle();
      
      if (pErr) throw pErr;

      if (profile) {
        setTenantUser(profile);
        const { data: sData, error: sErr } = await supabase.from('tenant_settings').select('settings').eq('clinic_id', profile.clinic_id).maybeSingle();
        if (sErr) throw sErr;
        if (sData) {
          setSettings(sData.settings);
          console.log("✅ [AUTH_CONTEXT] Contexto cargado con éxito.");
        }
      }
    } catch (e) {
      console.error("❌ Error contexto SaaS:", e);
    }
  };

  useEffect(() => {
    // Si estamos en el callback, no hacemos nada aquí para evitar AbortError
    if (window.location.pathname === '/auth/callback') {
      setLoading(false);
    } else {
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          const u = session?.user ?? null;
          setUser(u);
          if (u) fetchTenantContext(u);
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error("Error obteniendo sesión:", err);
        })
        .finally(() => setLoading(false));
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 [AUTH_EVENT]:', event);
      const u = session?.user ?? null;
      setUser(u);
      
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (u) await fetchTenantContext(u);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setTenantUser(null);
        setSettings(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshContext = async () => {
    try {
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (sessionUser) await fetchTenantContext(sessionUser);
    } catch (e) {
      console.error("Error refrescando contexto:", e);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, tenantUser, settings, loading, setSettings, refreshContext, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
