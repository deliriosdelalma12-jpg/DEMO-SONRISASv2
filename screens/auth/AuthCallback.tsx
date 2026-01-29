
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function AuthCallback() {
  const { refreshContext } = useAuth();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("Iniciando validación de seguridad...");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function handleAuth() {
      try {
        // DIAGNÓSTICO DE RED E INTERFAZ
        console.log("[AUTH_CALLBACK] INFO INICIAL:");
        console.log(" - Full URL:", window.location.href);
        console.log(" - Origin:", window.location.origin);
        console.log(" - Pathname:", window.location.pathname);
        console.log(" - SearchParams:", window.location.search);
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        
        // Revisión de localStorage para PKCE verifier
        const storageKeys = Object.keys(localStorage).filter(k => k.includes("supabase.auth.token-code-verifier"));
        console.log(" - PKCE Verifiers in storage:", storageKeys);

        if (!code) {
          throw new Error("Código de activación no encontrado en la URL. Solicita un nuevo enlace desde el login.");
        }

        // 1) EXCHANGE CON TIMEOUT (12 segundos)
        setMsg("Intercambiando código de activación...");
        console.time("exchange_request");
        
        const exchangePromise = supabase.auth.exchangeCodeForSession(code);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("La conexión con Supabase ha tardado demasiado (Timeout 12s). Reintenta la operación.")), 12000)
        );

        const { data, error: exchangeError } = await Promise.race([exchangePromise, timeoutPromise]) as any;
        console.timeEnd("exchange_request");

        if (exchangeError) {
          console.error("[AUTH_CALLBACK] Exchange Error Object:", exchangeError);
          
          // Detección de error común PKCE por cambio de dominio
          if (exchangeError.message?.includes("verifier") || storageKeys.length === 0) {
             throw new Error("ERROR DE SEGURIDAD PKCE: El enlace se está abriendo en un dominio o navegador distinto al de registro. Asegúrate de abrir el email en la misma ventana donde creaste la cuenta.");
          }
          throw exchangeError;
        }

        if (!data.session?.user) {
          throw new Error("No se ha podido establecer la sesión activa. El código podría haber expirado.");
        }

        console.log("[AUTH_CALLBACK] Session OK. User ID:", data.session.user.id);

        // 2) ONBOARDING DE NEGOCIO (Idempotente)
        setMsg("Sincronizando infraestructura clínica...");
        await ensureClinicInfrastructure(data.session.user);

        // 3) ACTUALIZACIÓN DE CONTEXTO
        setMsg("Finalizando configuración...");
        await refreshContext();

        // 4) REDIRECCIÓN LIMPIA
        console.log("[AUTH_CALLBACK] Redirigiendo a Dashboard...");
        window.location.replace("/dashboard");

      } catch (e: any) {
        console.error("[AUTH_CALLBACK] FATAL ERROR:", e);
        setError(e?.message || "Error desconocido durante la activación.");
      }
    }

    handleAuth();
  }, [refreshContext]);

  async function ensureClinicInfrastructure(user: any) {
    const meta = user.user_metadata || {};
    const clinicName = meta.clinic_name || "Clínica MediClinic";
    const fullName = meta.full_name || user.email;

    // 1. Verificar existencia de clínica
    console.log("[ONBOARDING] Buscando clínica para owner_id:", user.id);
    const { data: clinic, error: clinicSelErr } = await supabase
      .from("clinics")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (clinicSelErr) {
        console.error("[ONBOARDING] Error buscando clínica:", clinicSelErr);
        throw new Error(`Error de base de datos (RLS/Permissions): ${clinicSelErr.message}`);
    }

    let clinicId = clinic?.id;

    // 2. Crear clínica si no existe
    if (!clinicId) {
      console.log("[ONBOARDING] Creando nueva clínica:", clinicName);
      const { data: newClinic, error: cErr } = await supabase
        .from("clinics")
        .insert({ name: clinicName, owner_id: user.id })
        .select("id")
        .single();

      if (cErr) {
          console.error("[ONBOARDING] Error creando clínica:", cErr);
          throw cErr;
      }
      clinicId = newClinic.id;
    }

    // 3. Upsert Perfil Usuario
    console.log("[ONBOARDING] Sincronizando perfil de usuario...");
    const { error: uErr } = await supabase.from("users").upsert({
      id: user.id,
      clinic_id: clinicId,
      full_name: fullName,
      role: "admin",
      is_active: true,
      username: user.email?.split("@")[0] || `user_${Date.now()}`,
    });
    if (uErr) throw uErr;

    // 4. Upsert Tenant Settings
    console.log("[ONBOARDING] Sincronizando configuración del tenant...");
    const { error: tErr } = await supabase.from("tenant_settings").upsert({
      clinic_id: clinicId,
      settings: {
        id: clinicId,
        name: clinicName,
        businessName: clinicName,
        region: "ES",
        currency: "€",
        language: "es-ES",
        scheduleType: "split",
        roles: [{ id: "admin", name: "Admin Global", permissions: ["view_dashboard", "view_all_data", "can_edit"] }],
        labels: { dashboardTitle: "Panel Ejecutivo", agendaTitle: "Calendario Operativo" },
        visuals: { titleFontSize: 32, bodyFontSize: 16 },
        laborSettings: { vacationDaysPerYear: 30, allowCarryOver: false, incidentTypes: [] },
        appointmentPolicy: { confirmationWindow: 24, leadTimeThreshold: 2, autoConfirmShortNotice: true },
        services: [{ id: "S1", name: "Consulta General", price: 50, duration: 30 }],
        aiPhoneSettings: {
          assistantName: "Sara",
          clinicDisplayName: clinicName,
          language: "es-ES",
          tone: "formal",
          voiceName: "Zephyr",
          core_version: "1.0.1",
          active: true,
          systemPrompt: `Eres la asistente virtual de ${clinicName}. Responde siempre de forma profesional y breve.`,
          testSpeechText: "Prueba de voz MediClinic.",
          instructions: "Gestiona citas de pacientes.",
          model: "gemini-3-flash-preview",
          escalation_rules: { transfer_number: "", escalate_on_frustration: true },
          policy_texts: { cancel_policy: "", privacy_notice: "" },
          aiEmotion: "Empática",
          aiStyle: "Concisa",
          aiRelation: "Formal",
          aiFocus: "Resolutiva",
          configVersion: Date.now(),
        },
      },
    });
    if (tErr) throw tErr;
    console.log("[ONBOARDING] Infraestructura completada con éxito.");
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-body">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[3rem] p-12 text-center shadow-2xl">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-lg shadow-primary/20" />
            <h2 className="text-3xl font-display font-black uppercase tracking-tight mb-2">Validando Acceso</h2>
            <p className="text-primary font-bold text-xs uppercase tracking-widest animate-pulse">{msg}</p>
          </>
        ) : (
          <>
            <div className="size-20 bg-rose-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
              <span className="material-symbols-outlined text-5xl">gpp_maybe</span>
            </div>
            <h2 className="text-3xl font-display font-black uppercase tracking-tight mb-4">Fallo de Activación</h2>
            <div className="bg-rose-500/10 p-6 rounded-2xl border border-rose-500/20 text-rose-400 text-xs font-bold leading-relaxed mb-8">
              {error}
            </div>
            <button
              onClick={() => window.location.replace("/login")}
              className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all"
            >
              Volver al Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
