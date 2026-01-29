import React, { createContext, useContext, useEffect, useRef, useState } from "react";
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

  // Evita ejecuciones simultáneas de fetchTenantContext
  const tenantFetchInFlight = useRef<Promise<void> | null>(null);
  const lastTenantUserId = useRef<string | null>(null);

  const fetchTenantContext = async (sessionUser: any) => {
    const userId = sessionUser?.id;
    if (!userId) return;

    // Si ya estamos trayendo contexto para el mismo usuario, no repitas
    if (tenantFetchInFlight.current && lastTenantUserId.current === userId) {
      await tenantFetchInFlight.current;
      return;
    }

    lastTenantUserId.current = userId;

    tenantFetchInFlight.current = (async () => {
      try {
        const { data: profile, error: pErr } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (pErr) throw pErr;

        if (profile) {
          setTenantUser(profile);

          const { data: sData, error: sErr } = await supabase
            .from("tenant_settings")
            .select("settings")
            .eq("clinic_id", profile.clinic_id)
            .maybeSingle();

          if (sErr) throw sErr;

          setSettings(sData?.settings ?? null);
        } else {
          // Si no hay perfil aún, limpia (evita estados inconsistentes)
          setTenantUser(null);
          setSettings(null);
        }
      } catch (e) {
        console.error("[AUTH_CONTEXT] fetchTenantContext error:", e);
      } finally {
        tenantFetchInFlight.current = null;
      }
    })();

    await tenantFetchInFlight.current;
  };

  useEffect(() => {
    const url = new URL(window.location.href);

    // ✅ CLAVE: Si estamos en el callback con ?code=..., NO llamamos a getSession aquí.
    const isAuthCallbackRoute =
      url.pathname.startsWith("/auth/callback") && url.searchParams.has("code");

    const initAuth = async () => {
      try {
        if (isAuthCallbackRoute) {
          // En callback: esperamos a que AuthCallback haga exchange y dispare SIGNED_IN.
          setLoading(true);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error("[AUTH_CONTEXT] getSession error:", error);

        const u = session?.user ?? null;
        setUser(u);

        if (u) await fetchTenantContext(u);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        const u = session?.user ?? null;
        setUser(u);

        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          if (u) {
            setLoading(true);
            await fetchTenantContext(u);
          }
        }

        if (event === "SIGNED_OUT") {
          setTenantUser(null);
          setSettings(null);
        }
      } catch (e) {
        console.error("[AUTH_CONTEXT] onAuthStateChange error:", e);
      } finally {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshContext = async () => {
    // Evita getUser (network) si no hace falta. getSession suele ser suficiente.
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) console.error("[AUTH_CONTEXT] refresh getSession error:", error);

    const u = session?.user ?? null;
    setUser(u);

    if (u) await fetchTenantContext(u);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.replace("/login");
  };

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
