
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
    
    console.log('🔄 Fetching Tenant Context for:', sessionUser.id);
    try {
      // 1. Obtener perfil de usuario ligado a clínica
      const { data: profile, error: pError } = await supabase
        .from('users')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (profile) {
        setTenantUser(profile);
        console.log('✅ Tenant User Profile loaded.');
        
        // 2. Obtener ajustes de la clínica
        const { data: sData, error: sError } = await supabase
          .from('tenant_settings')
          .select('settings')
          .eq('clinic_id', profile.clinic_id)
          .maybeSingle();

        if (sData) {
          setSettings(sData.settings);
          console.log('✅ Clinic Settings loaded.');
        } else {
          console.warn('⚠️ Settings not found for clinic:', profile.clinic_id);
        }
      } else {
        console.warn('⚠️ No profile found for user in public.users table.');
        setTenantUser(null);
        setSettings(null);
      }
    } catch (e) {
      console.error("❌ Error fetching context:", e);
    }
  };

  const initializeAuth = async () => {
    try {
      console.log('🎬 Initializing Auth...');
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      setUser(u);
      
      if (u) {
        await fetchTenantContext(u);
      }
    } catch (err) {
      console.error('❌ Failed to initialize auth session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeAuth();

    // Listener global de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 AUTH_EVENT:', event);
      const u = session?.user ?? null;
      
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
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
    if (sessionUser) {
      await fetchTenantContext(sessionUser);
    }
  };

  const signOut = async () => {
    console.log('🚪 Signing out...');
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
