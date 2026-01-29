
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshContext } = useAuth();
  const ran = useRef(false);
  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState("Iniciando validación de seguridad...");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const processAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        
        console.log("[AUTH_CALLBACK] Procesando URL:", window.location.href);

        // 1. Comprobar si ya tenemos sesión (el SDK lo hace a veces solo)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        let session = existingSession;

        if (!session && code) {
          setMessage("Canjeando código de activación...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
          session = data.session;
        }

        if (!session) {
          throw new Error("No se pudo establecer una sesión válida. El código podría haber expirado.");
        }

        // 2. Onboarding: Asegurar filas de negocio
        setMessage("Configurando tu infraestructura clínica...");
        await ensureClinicSetup(session.user);

        // 3. Sincronizar contexto global
        await refreshContext();

        setMessage("¡Activación completada con éxito!");
        setTimeout(() => navigate("/dashboard", { replace: true }), 1000);

      } catch (e: any) {
        console.error("[AUTH_CALLBACK] Error fatal:", e);
        setStatus("error");
        setMessage(e.message || "Error inesperado en la activación.");
      }
    };

    processAuth();
  }, [navigate, refreshContext]);

  async function ensureClinicSetup(user: any) {
    const meta = user.user_metadata || {};
    const clinicName = meta.clinic_name || "Mi Clínica MediClinic";
    
    // Buscar si ya tiene clínica
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    let clinicId = clinic?.id;

    if (!clinicId) {
      // Crear clínica
      const { data: newClinic, error: cErr } = await supabase
        .from('clinics')
        .insert({ name: clinicName, owner_id: user.id })
        .select('id')
        .single();
      
      if (cErr) throw cErr;
      clinicId = newClinic.id;

      // Crear perfil de usuario
      await supabase.from('users').upsert({
        id: user.id,
        clinic_id: clinicId,
        full_name: meta.full_name || user.email,
        role: 'admin',
        is_active: true,
        username: user.email.split('@')[0]
      });

      // Configuración por defecto
      const defaultSettings = {
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
          systemPrompt: `Eres la asistente virtual de ${clinicName}. Sé profesional y breve.`,
          testSpeechText: "Prueba de voz activada.",
          instructions: "Ayuda a agendar citas.",
          model: "gemini-3-flash-preview",
          escalation_rules: { transfer_number: "", escalate_on_frustration: true },
          policy_texts: { cancel_policy: "", privacy_notice: "" },
          prompt_overrides: {},
          aiEmotion: "Empática",
          aiStyle: "Concisa",
          aiRelation: "Formal",
          aiFocus: "Resolutiva",
          configVersion: Date.now()
        }
      };

      await supabase.from('tenant_settings').upsert({
        clinic_id: clinicId,
        settings: defaultSettings
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-12 text-center shadow-2xl animate-in fade-in zoom-in">
        {status === "working" ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-[0_0_20px_rgba(59,130,246,0.3)]"></div>
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-2">Verificando Cuenta</h2>
            <p className="text-slate-400 text-sm font-medium animate-pulse">{message}</p>
          </>
        ) : (
          <>
            <div className="size-20 bg-rose-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
              <span className="material-symbols-outlined text-5xl">error</span>
            </div>
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-4">Fallo de Activación</h2>
            <p className="text-rose-400 text-sm font-bold bg-rose-500/10 p-4 rounded-xl border border-rose-500/20 mb-8">{message}</p>
            <button onClick={() => navigate("/login")} className="w-full h-14 bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/20 transition-all border border-white/5">Volver al Login</button>
          </>
        )}
      </div>
    </div>
  );
}
