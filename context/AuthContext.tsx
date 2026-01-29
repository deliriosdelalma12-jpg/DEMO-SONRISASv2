
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

  const tenantFetchInFlight = useRef<Promise<void> | null>(null);
  const lastTenantUserId = useRef<string | null>(null);

  const fetchTenantContext = async (sessionUser: any) => {
    const userId = sessionUser?.id;
    if (!userId) return;

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
    // CRÍTICO: Si hay un código en la URL, el contexto NO debe tocar el getSession
    // para no abortar el intercambio de código en AuthCallback.tsx
    const isAuthCallbackRoute = url.pathname.includes("/auth/callback") && (url.searchParams.has("code") || url.hash.includes("code="));

    const initAuth = async () => {
      if (isAuthCallbackRoute) {
        console.log("[AUTH_CONTEXT] Callback detectado. Cediendo control a AuthCallback.");
        setLoading(true); // Mantener en loading hasta que el callback termine
        return;
      }

      try {
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
      const u = session?.user ?? null;
      setUser(u);
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        if (u) await fetchTenantContext(u);
        setLoading(false);
      }
      if (event === "SIGNED_OUT") {
        setTenantUser(null);
        setSettings(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshContext = async () => {
    const { data: { session } } = await supabase.auth.getSession();
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
