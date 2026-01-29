
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

  const fetchTenantContext = useCallback(async (userId: string, source: string) => {
    console.log(`[AUTH_CONTEXT][${source}] Iniciando carga de perfil para:`, userId);
    try {
      const { data: profile, error: pErr } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (pErr) {
        console.error(`[AUTH_CONTEXT][${source}] ERROR SQL PERFIL:`, pErr);
        return;
      }

      if (profile) {
        console.log(`[AUTH_CONTEXT][${source}] Perfil encontrado, cargando settings de clínica:`, profile.clinic_id);
        setTenantUser(profile);
        const { data: sData, error: sErr } = await supabase
          .from("tenant_settings")
          .select("settings")
          .eq("clinic_id", profile.clinic_id)
          .maybeSingle();
        
        if (sErr) console.error(`[AUTH_CONTEXT][${source}] ERROR SQL SETTINGS:`, sErr);
        setSettings(sData?.settings ?? null);
      } else {
        console.warn(`[AUTH_CONTEXT][${source}] El usuario no tiene perfil aún.`);
      }
    } catch (e) {
      console.error(`[AUTH_CONTEXT][${source}] EXCEPCIÓN:`, e);
    }
  }, []);

  useEffect(() => {
    const isCallback = window.location.pathname.includes("/auth/callback");
    
    // Si es callback, el contexto entra en modo pasivo total
    if (isCallback) {
      console.log("[AUTH_CONTEXT] Ruta de Callback detectada. Desactivando sincronización automática del contexto.");
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      console.log("[AUTH_CONTEXT] Inicializando estado de autenticación...");
      try {
        const { data: { session }, error: sErr } = await supabase.auth.getSession();
        if (sErr) console.error("[AUTH_CONTEXT] Error recuperando sesión inicial:", sErr);
        
        if (session?.user) {
          console.log("[AUTH_CONTEXT] Sesión activa detectada:", session.user.email);
          setUser(session.user);
          await fetchTenantContext(session.user.id, "INIT");
        } else {
          console.log("[AUTH_CONTEXT] No hay sesión activa.");
        }
      } catch (e) {
        console.error("[AUTH_CONTEXT] Excepción en initAuth:", e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH_CONTEXT] Evento AuthChange: ${event}`);
      if (isCallback) return; // Ignorar eventos durante el callback para evitar bucles
      
      const u = session?.user ?? null;
      setUser(u);
      
      if (u && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        await fetchTenantContext(u.id, "EVENT_CHANGE");
      } else if (event === "SIGNED_OUT") {
        setTenantUser(null);
        setSettings(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchTenantContext]);

  const refreshContext = useCallback(async () => {
    console.log("[AUTH_CONTEXT] Refresco manual solicitado");
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await fetchTenantContext(session.user.id, "MANUAL_REFRESH");
    }
  }, [fetchTenantContext]);

  const signOut = useCallback(async () => {
    console.log("[AUTH_CONTEXT] Cerrando sesión...");
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
