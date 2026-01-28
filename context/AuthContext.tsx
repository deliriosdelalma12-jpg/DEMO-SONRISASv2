
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
      console.log("🔍 [AUTH] Cargando contexto para:", sessionUser.id);
      
      const { data: profile, error: pErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();
      
      if (pErr) throw pErr;

      if (profile) {
        setTenantUser(profile);
        const { data: sData } = await supabase
          .from('tenant_settings')
          .select('settings')
          .eq('clinic_id', profile.clinic_id)
          .maybeSingle();
          
        if (sData) setSettings(sData.settings);
      }
    } catch (e) {
      console.error("❌ [AUTH] Error contexto:", e);
    }
  };

  useEffect(() => {
    // Si estamos en callback, dejamos que la pantalla de callback maneje la sesión
    const isCallback = window.location.pathname === '/auth/callback';
    
    if (!isCallback) {
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          const u = session?.user ?? null;
          setUser(u);
          if (u) fetchTenantContext(u);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 [AUTH_EVENT]:', event);
      const u = session?.user ?? null;
      setUser(u);
      
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (u) await fetchTenantContext(u);
      } else if (event === 'SIGNED_OUT') {
        setTenantUser(null);
        setSettings(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshContext = async () => {
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (sessionUser) await fetchTenantContext(sessionUser);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.replace('/login');
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
