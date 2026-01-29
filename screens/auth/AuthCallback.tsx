
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function AuthCallback() {
  const { refreshContext } = useAuth();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("Validando credenciales...");

  useEffect(() => {
    // Evitar doble ejecución en React Strict Mode
    if (ran.current) return;
    ran.current = true;

    async function handleAuth() {
      try {
        const url = new URL(window.location.href);
        console.log("[AUTH_CALLBACK] Procesando URL:", url.href);

        const code = url.searchParams.get("code");
        if (!code) {
          throw new Error("No se encontró el código de activación en la URL.");
        }

        // PASO 1: Intercambio canónico (Esto crea la sesión y la guarda en Storage)
        setMsg("Canjeando código por sesión activa...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (exchangeError) {
          console.error("[AUTH_CALLBACK] Error en exchange:", exchangeError);
          throw exchangeError;
        }

        if (!data.session) {
          throw new Error("Supabase no devolvió una sesión válida.");
        }

        // PASO 2: Onboarding de negocio (Asegurar que la clínica existe)
        setMsg("Configurando entorno clínico...");
        await ensureClinicInfrastructure(data.session.user);

        // PASO 3: Sincronizar el contexto global de la aplicación
        await refreshContext();

        // PASO 4: Redirección limpia (window.location.replace para limpiar el historial de auth)
        setMsg("Acceso concedido. Redirigiendo...");
        window.location.replace("/dashboard");

      } catch (e: any) {
        console.error("[AUTH_CALLBACK] Fallo crítico:", e);
        setError(e.message || "Error inesperado durante la activación.");
      }
    }

    handleAuth();
  }, [refreshContext]);

  async function ensureClinicInfrastructure(user: any) {
    const meta = user.user_metadata || {};
    const clinicName = meta.clinic_name || "Mi Clínica MediClinic";
    
    // 1. Buscar o Crear Clínica
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    let clinicId = clinic?.id;

    if (!clinicId) {
      const { data: newClinic, error: cErr } = await supabase
        .from('clinics')
        .insert({ name: clinicName, owner_id: user.id })
        .select('id')
        .single();
      
      if (cErr) throw cErr;
      clinicId = newClinic.id;

      // 2. Crear Perfil de Usuario
      await supabase.from('users').upsert({
        id: user.id,
        clinic_id: clinicId,
        full_name: meta.full_name || user.email,
        role: 'admin',
        is_active: true,
        username: user.email.split('@')[0]
      });

      // 3. Configuración del Tenant (tenant_settings)
      await supabase.from('tenant_settings').upsert({
        clinic_id: clinicId,
        settings: {
          id: clinicId,
          name: clinicName,
          businessName: clinicName,
          region: "ES",
          currency: "€",
          language: "es-ES",
          scheduleType: "split",
          roles: [{ id: 'admin', name: 'Admin', permissions: ['view_dashboard', 'view_all_data', 'can_edit'] }],
          labels: { dashboardTitle: "Panel de Control", agendaTitle: "Agenda Médica" },
          visuals: { titleFontSize: 32, bodyFontSize: 16 },
          laborSettings: { vacationDaysPerYear: 30, allowCarryOver: false, incidentTypes: [] },
          appointmentPolicy: { confirmationWindow: 24, leadTimeThreshold: 2, autoConfirmShortNotice: true },
          services: [{ id: 'S1', name: 'Consulta General', price: 50, duration: 30 }],
          aiPhoneSettings: {
            assistantName: "Sara",
            clinicDisplayName: clinicName,
            language: "es-ES",
            tone: "formal",
            voiceName: "Zephyr",
            core_version: "1.0.1",
            active: true,
            systemPrompt: `Eres la asistente virtual de ${clinicName}. Responde siempre de forma profesional y breve.`,
            testSpeechText: "Prueba de voz del sistema.",
            instructions: "Ayuda a agendar citas.",
            model: "gemini-3-flash-preview",
            escalation_rules: { transfer_number: "", escalate_on_frustration: true },
            policy_texts: { cancel_policy: "", privacy_notice: "" },
            aiEmotion: "Empática",
            aiStyle: "Concisa",
            aiRelation: "Formal",
            aiFocus: "Resolutiva",
            configVersion: Date.now()
          }
        }
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-body">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[3rem] p-12 text-center shadow-2xl">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-[0_0_20px_rgba(59,130,246,0.3)]"></div>
            <h2 className="text-3xl font-display font-black uppercase tracking-tight mb-2">Activando Cuenta</h2>
            <p className="text-primary font-bold text-xs uppercase tracking-widest animate-pulse">{msg}</p>
          </>
        ) : (
          <>
            <div className="size-24 bg-rose-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
              <span className="material-symbols-outlined text-6xl">error</span>
            </div>
            <h2 className="text-3xl font-display font-black uppercase tracking-tight mb-4">Fallo de Validación</h2>
            <div className="text-rose-500 font-bold mb-10 leading-relaxed bg-rose-500/10 p-6 rounded-2xl border border-rose-500/20 text-sm">
              <pre className="whitespace-pre-wrap font-mono text-xs">{error}</pre>
            </div>
            <button 
              onClick={() => window.location.replace('/login')} 
              className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl"
            >
              Volver al Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
