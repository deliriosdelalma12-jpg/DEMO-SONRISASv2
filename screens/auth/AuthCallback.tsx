
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
        // 1. EXTRACCIÓN ROBUSTA (Query + Hash)
        const fullUrl = window.location.href;
        const urlObj = new URL(fullUrl);
        
        // Intentamos obtener el code de la query ?code=...
        let code = urlObj.searchParams.get("code");
        
        // Si no está en la query, buscamos en el hash #code=... (Común en algunos clientes de correo)
        if (!code && urlObj.hash) {
          const hashParams = new URLSearchParams(urlObj.hash.substring(1));
          code = hashParams.get("code") || hashParams.get("access_token");
        }

        // Diagnóstico mejorado
        console.log("[AUTH_CALLBACK] Diagnostic:");
        console.log(" - Full URL:", fullUrl);
        console.log(" - Code extracted:", code ? "YES (hidden for security)" : "NO");
        console.log(" - Has Hash:", !!urlObj.hash);

        if (!code) {
          // Si llegamos aquí y no hay code, pero hay una sesión activa, quizá Supabase ya lo canjeó automáticamente
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log("[AUTH_CALLBACK] No code found but session active. Proceeding...");
            await completeOnboarding(session.user);
            return;
          }
          throw { title: "Código ausente", msg: "No se encontró el token de activación en la URL (search ni hash). Por favor, solicita un nuevo enlace." };
        }

        // 2. EXCHANGE CON TIMEOUT Y GESTIÓN DE ABORTERROR
        setStatus("Canjeando código de activación...");
        
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          // Si el error es que el verifier no existe, explicar que debe abrirse en el mismo navegador
          if (exchangeError.message?.includes("verifier") || exchangeError.name === "AuthPKCEVerifierNotFoundError") {
             throw {
               title: "Fallo de Verificación PKCE",
               msg: "Para tu seguridad, debes abrir el enlace del correo en el MISMO navegador donde iniciaste el registro."
             };
          }
          throw exchangeError;
        }

        if (data.session) {
          await completeOnboarding(data.session.user);
        } else {
          throw new Error("No se pudo establecer la sesión tras el canje.");
        }

      } catch (e: any) {
        // Ignorar AbortError si es provocado por el navegador/Supabase internal locks
        if (e.name === 'AbortError' || e.message?.includes('aborted')) {
          console.warn("[AUTH_CALLBACK] Exchange aborted, checking if session was still established...");
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await completeOnboarding(session.user);
            return;
          }
        }

        console.error("[AUTH_CALLBACK] Fatal error:", e);
        setError({ 
          title: e.title || "Fallo de Activación", 
          msg: e.msg || e.message || "Error inesperado durante la verificación.",
          code: e.code 
        });
      }
    }

    async function completeOnboarding(user: any) {
        try {
            setStatus("Configurando infraestructura clínica...");
            await ensureClinicInfrastructure(user);
            setStatus("Sincronizando acceso...");
            await refreshContext();
            window.location.replace("/dashboard");
        } catch (err: any) {
            console.error("[AUTH_CALLBACK] Onboarding error:", err);
            setError({ title: "Error de Configuración", msg: "Tu cuenta está activa pero hubo un fallo al crear tu clínica. Contacta con soporte." });
        }
    }

    handleAuth();
  }, [refreshContext]);

  async function ensureClinicInfrastructure(user: any) {
    const meta = user.user_metadata || {};
    const clinicName = meta.clinic_name || "Mi Clínica MediClinic";
    
    // Verificar si ya existe (Idempotencia)
    const { data: clinic } = await supabase.from('clinics').select('id').eq('owner_id', user.id).maybeSingle();
    
    if (!clinic) {
      console.log("[ONBOARDING] Creando nueva clínica para:", user.id);
      const { data: newC, error: cErr } = await supabase.from('clinics').insert({ name: clinicName, owner_id: user.id }).select('id').single();
      if (cErr) throw cErr;
      
      await supabase.from('users').upsert({
        id: user.id, clinic_id: newC.id, full_name: meta.full_name || user.email,
        role: 'admin', is_active: true, username: user.email.split('@')[0]
      });

      const defaultSettings = { 
        id: newC.id, name: clinicName, businessName: clinicName, region: "ES", currency: "€", language: "es-ES", scheduleType: "split", 
        roles: [{ id: 'admin', name: 'Admin', permissions: ['view_dashboard', 'view_all_data', 'can_edit'] }], 
        labels: { dashboardTitle: "Panel", agendaTitle: "Agenda" }, visuals: { titleFontSize: 32, bodyFontSize: 16 }, 
        laborSettings: { vacationDaysPerYear: 30, allowCarryOver: false, incidentTypes: [] }, 
        appointmentPolicy: { confirmationWindow: 24, leadTimeThreshold: 2, autoConfirmShortNotice: true }, 
        services: [{ id: 'S1', name: 'Consulta Gral', price: 50, duration: 30 }], 
        aiPhoneSettings: { assistantName: "Sara", clinicDisplayName: clinicName, language: "es-ES", tone: "formal", voiceName: "Zephyr", core_version: "1.0.1", active: true, systemPrompt: "Asistente de " + clinicName, aiEmotion: "Empática", aiStyle: "Concisa", aiRelation: "Formal", aiFocus: "Resolutiva", configVersion: Date.now() } 
      };

      await supabase.from('tenant_settings').upsert({ clinic_id: newC.id, settings: defaultSettings });
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-body">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-12 text-center shadow-2xl">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-lg shadow-primary/20"></div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-2">Validando Credenciales</h2>
            <p className="text-primary font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">{status}</p>
          </>
        ) : (
          <>
            <div className="size-24 bg-rose-500/20 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border-2 border-rose-500/20">
              <span className="material-symbols-outlined text-6xl">gpp_maybe</span>
            </div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-4 text-rose-500">{error.title}</h2>
            <div className="bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10 text-slate-400 text-xs font-medium leading-relaxed mb-10 whitespace-pre-wrap text-center">
              {error.msg}
            </div>
            <button 
              onClick={() => window.location.replace('/login')} 
              className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl"
            >
              Volver al Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
