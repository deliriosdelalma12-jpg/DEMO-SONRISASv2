
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
    
    console.log('🔄 [AUTH_INIT] Cargando contexto para:', sessionUser.id);
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

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
      console.error("❌ Error al cargar contexto SaaS:", e);
    }
  };

  useEffect(() => {
    // 1. Carga inicial
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchTenantContext(session.user);
      }
      setLoading(false);
    };
    init();

    // 2. Escucha de cambios de estado (Login, Logout, Token Refreshed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 [AUTH_EVENT]:', event);
      
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const u = session?.user ?? null;
        setUser(u);
        if (u) await fetchTenantContext(u);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setTenantUser(null);
        setSettings(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshContext = async () => {
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (sessionUser) await fetchTenantContext(sessionUser);
  };

  const signOut = async () => {
    console.log('🚪 [LOGOUT_INIT]');
    await supabase.auth.signOut();
    window.location.href = '/#/login';
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
