
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function AuthCallback() {
  const { refreshContext } = useAuth();
  const ran = useRef(false);
  const [error, setError] = useState<{title: string, msg: string, code?: string} | null>(null);
  const [status, setStatus] = useState("Iniciando validación de seguridad...");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function handleAuth() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        
        // 1. DIAGNÓSTICO DE STORAGE (Buscando PKCE Verifier)
        const storageKeys = Object.keys(localStorage);
        const verifierKeys = storageKeys.filter(k => 
          k.toLowerCase().includes("verifier") || 
          k.toLowerCase().includes("pkce") ||
          (k.startsWith("sb-") && k.endsWith("-auth-token-code-verifier"))
        );

        console.log("[AUTH_CALLBACK] Diagnostic:");
        console.log(" - Origin:", window.location.origin);
        console.log(" - PKCE Keys found:", verifierKeys);
        console.log(" - Code present:", !!code);

        if (!code) {
          throw { title: "Código ausente", msg: "No se encontró el token de activación en la URL." };
        }

        // 2. DETECCIÓN PREVENTIVA DE NAVEGADOR DISTINTO
        if (verifierKeys.length === 0) {
          console.warn("[AUTH_CALLBACK] PKCE Verifier missing in this browser context.");
          setError({
            title: "Mismo navegador requerido",
            msg: "Este enlace se abrió en un navegador distinto o se perdió la sesión del registro. Por seguridad, no podemos activar tu cuenta aquí.\n\nSolución: vuelve a la pestaña donde te registraste y pulsa 'Reenviar activación'. Luego abre el email en ese MISMO navegador."
          });
          return;
        }

        // 3. EXCHANGE CON TIMEOUT (Sin AbortController para evitar Signal Aborted interno)
        setStatus("Canjeando código de activación...");
        console.time("exchange_time");
        
        const exchangePromise = supabase.auth.exchangeCodeForSession(code);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("TIMEOUT_ERROR")), 12000)
        );

        const result: any = await Promise.race([exchangePromise, timeoutPromise]);
        console.timeEnd("exchange_time");

        if (result.error) throw result.error;
        if (!result.data?.session) throw new Error("NO_SESSION_RETURNED");

        // 4. ONBOARDING Y SINCRONIZACIÓN
        setStatus("Configurando infraestructura clínica...");
        await ensureClinicInfrastructure(result.data.session.user);
        
        setStatus("Sincronizando acceso...");
        await refreshContext();

        // REDIRECCIÓN FINAL
        window.location.replace("/dashboard");

      } catch (e: any) {
        console.error("[AUTH_CALLBACK] Fatal error:", e);
        if (e.message === "TIMEOUT_ERROR") {
          setError({ title: "Error de red", msg: "La verificación está tardando demasiado. Reintenta en unos momentos." });
        } else if (e.message?.includes("verifier") || e.name === "AuthPKCEVerifierNotFoundError") {
          setError({
            title: "Fallo de Verificación PKCE",
            msg: "Navegador no reconocido. Por favor, asegúrate de abrir el enlace del email en el mismo navegador donde iniciaste el registro."
          });
        } else {
          setError({ 
            title: "Fallo de Activación", 
            msg: e.message || "Error inesperado durante la verificación técnica.",
            code: e.code 
          });
        }
      }
    }

    handleAuth();
  }, [refreshContext]);

  async function ensureClinicInfrastructure(user: any) {
    const meta = user.user_metadata || {};
    const clinicName = meta.clinic_name || "Mi Clínica MediClinic";
    
    const { data: clinic } = await supabase.from('clinics').select('id').eq('owner_id', user.id).maybeSingle();
    if (!clinic) {
      const { data: newC, error: cErr } = await supabase.from('clinics').insert({ name: clinicName, owner_id: user.id }).select('id').single();
      if (cErr) throw cErr;
      
      await supabase.from('users').upsert({
        id: user.id, clinic_id: newC.id, full_name: meta.full_name || user.email,
        role: 'admin', is_active: true, username: user.email.split('@')[0]
      });

      await supabase.from('tenant_settings').upsert({
        clinic_id: newC.id,
        settings: { id: newC.id, name: clinicName, businessName: clinicName, region: "ES", currency: "€", language: "es-ES", scheduleType: "split", roles: [{ id: 'admin', name: 'Admin', permissions: ['view_dashboard', 'view_all_data', 'can_edit'] }], labels: { dashboardTitle: "Panel", agendaTitle: "Agenda" }, visuals: { titleFontSize: 32, bodyFontSize: 16 }, laborSettings: { vacationDaysPerYear: 30, allowCarryOver: false, incidentTypes: [] }, appointmentPolicy: { confirmationWindow: 24, leadTimeThreshold: 2, autoConfirmShortNotice: true }, services: [{ id: 'S1', name: 'Consulta Gral', price: 50, duration: 30 }], aiPhoneSettings: { assistantName: "Sara", clinicDisplayName: clinicName, language: "es-ES", tone: "formal", voiceName: "Zephyr", core_version: "1.0.1", active: true, systemPrompt: "Asistente de " + clinicName, aiEmotion: "Empática", aiStyle: "Concisa", aiRelation: "Formal", aiFocus: "Resolutiva", configVersion: Date.now() } }
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-body">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-12 text-center shadow-2xl animate-in fade-in zoom-in duration-500">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-lg shadow-primary/20"></div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-2">Activando Cuenta</h2>
            <p className="text-primary font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">{status}</p>
          </>
        ) : (
          <>
            <div className="size-24 bg-rose-500/20 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border-2 border-rose-500/20">
              <span className="material-symbols-outlined text-6xl">gpp_maybe</span>
            </div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-4 text-rose-500">{error.title}</h2>
            <div className="bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10 text-slate-400 text-xs font-medium leading-relaxed mb-10 whitespace-pre-wrap">
              {error.msg}
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.replace('/login')} 
                className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl"
              >
                Volver al Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
