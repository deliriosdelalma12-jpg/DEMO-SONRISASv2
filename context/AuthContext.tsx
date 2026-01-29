
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { User, ClinicSettings } from "../types";

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

  const fetchTenantContext = useCallback(async (userId: string) => {
    try {
      const { data: profile, error: pErr } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profile) {
        setTenantUser(profile);
        const { data: sData } = await supabase
          .from("tenant_settings")
          .select("settings")
          .eq("clinic_id", profile.clinic_id)
          .maybeSingle();
        setSettings(sData?.settings ?? null);
      }
    } catch (e) {
      console.error("[AUTH_CONTEXT] Error:", e);
    }
  }, []);

  useEffect(() => {
    const isCallback = window.location.pathname.includes("/auth/callback");

    const initAuth = async () => {
      // Si estamos en el callback, no molestamos al flujo de activación
      if (isCallback) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchTenantContext(session.user.id);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isCallback) return;
      
      const u = session?.user ?? null;
      setUser(u);
      if (u && event !== "SIGNED_OUT") {
        await fetchTenantContext(u.id);
      } else {
        setTenantUser(null);
        setSettings(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchTenantContext]);

  const refreshContext = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await fetchTenantContext(session.user.id);
    }
  }, [fetchTenantContext]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }, []);

  return (
    <AuthContext.Provider value={{ user, tenantUser, settings, loading, setSettings, refreshContext, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
