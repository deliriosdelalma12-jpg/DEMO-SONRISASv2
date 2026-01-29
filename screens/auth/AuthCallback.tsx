
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function AuthCallback() {
  const ranRef = useRef(false);
  const { refreshContext } = useAuth();
  const [msg, setMsg] = useState("Sincronizando sesión...");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const url = new URL(window.location.href);
    const hasCode = url.searchParams.has("code") || url.searchParams.has("token_hash");

    console.info("[AUTH_CALLBACK] Iniciando validación...", { hasCode });

    const handleAuth = async () => {
      try {
        // 1. Ver si la sesión ya fue intercambiada automáticamente por Supabase Client
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession) {
          console.info("[AUTH_CALLBACK] Sesión existente detectada automáticamente.");
          await finalizeOnboarding();
          return;
        }

        // 2. Si no hay sesión y tenemos código, intercambiamos manualmente
        if (hasCode) {
          setMsg("Validando credenciales de acceso...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          
          if (error) {
            // Si el error es 'invalid flow state', es probable que ya se haya intercambiado en otro hilo
            if (error.message.includes("flow state")) {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                await finalizeOnboarding();
                return;
              }
            }
            throw error;
          }

          if (data?.session) {
            console.info("[AUTH_CALLBACK] Intercambio manual exitoso.");
            await finalizeOnboarding();
          } else {
            throw new Error("No se pudo establecer la sesión.");
          }
        } else {
          throw new Error("No se detectó código de validación en la URL.");
        }

      } catch (e: any) {
        console.error("[AUTH_CALLBACK] Fallo en autenticación:", e);
        setErr(e?.message || "Error desconocido al validar la cuenta.");
      }
    };

    const finalizeOnboarding = async () => {
      setMsg("Preparando entorno clínico...");
      try {
        await ensureBusinessRows();
        await refreshContext();
        setMsg("Acceso concedido. Redirigiendo...");
        // Redirección directa al dashboard
        window.location.replace("/dashboard");
      } catch (e: any) {
        console.error("[AUTH_CALLBACK] Fallo en onboarding:", e);
        setErr("Error al configurar tu clínica: " + (e?.message || "Error de base de datos"));
      }
    };

    handleAuth();
  }, [refreshContext]);

  async function ensureBusinessRows() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session?.user?.id) throw new Error("Sesión no encontrada al crear infraestructura.");

    const authUserId = session.user.id;
    const meta = session.user.user_metadata || {};
    const clinicName = meta.clinic_name || "Mi Clínica MediClinic";
    const fullName = meta.full_name || "Administrador";
    const email = session.user.email || "";

    // 1. Asegurar Clínica (Usamos el UID como dueño)
    const { data: existingClinic, error: clinicFindErr } = await supabase
      .from("clinics")
      .select("id")
      .eq("owner_id", authUserId)
      .maybeSingle();

    if (clinicFindErr) throw clinicFindErr;

    let clinicId = existingClinic?.id;

    if (!clinicId) {
      const { data: createdClinic, error: clinicCreateErr } = await supabase
        .from("clinics")
        .insert({
          name: clinicName,
          owner_id: authUserId
        })
        .select("id")
        .single();

      if (clinicCreateErr) throw clinicCreateErr;
      clinicId = createdClinic.id;
    }

    // 2. Asegurar Perfil de Usuario de Negocio
    const { error: upsertUserErr } = await supabase
      .from("users")
      .upsert({
        id: authUserId,
        clinic_id: clinicId,
        full_name: fullName,
        role: 'admin',
        is_active: true,
        username: email ? email.split('@')[0] : `user_${authUserId.substring(0, 5)}`
      });

    if (upsertUserErr) throw upsertUserErr;

    // 3. Inicializar Configuración del Tenant si no existe
    const { data: existingSettings } = await supabase
      .from("tenant_settings")
      .select("clinic_id")
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (!existingSettings) {
      const defaultSettings = {
        id: clinicId,
        name: clinicName,
        businessName: clinicName,
        sector: "Salud / Clínica",
        region: "ES",
        logo: "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/hospital.svg",
        phone: "",
        email: email,
        currency: "€",
        language: "es-ES",
        scheduleType: "split",
        branchCount: 1,
        colorTemplate: "ocean",
        defaultTheme: "light",
        roles: [
          { id: 'admin', name: 'Administrador Global', permissions: ['view_dashboard', 'view_agenda', 'view_patients', 'view_doctors', 'view_branches', 'view_metrics', 'view_settings', 'view_all_data', 'can_edit'] }
        ],
        labels: { dashboardTitle: "Dashboard Directivo", agendaTitle: "Agenda Centralizada" },
        visuals: { titleFontSize: 32, bodyFontSize: 16 },
        laborSettings: { vacationDaysPerYear: 30, allowCarryOver: false, incidentTypes: [] },
        appointmentPolicy: { confirmationWindow: 24, leadTimeThreshold: 2, autoConfirmShortNotice: true },
        services: [{ id: 'S1', name: 'Consulta General', price: 50, duration: 30 }],
        globalSchedule: {
          'Lunes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
          'Martes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
          'Miércoles': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
          'Jueves': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
          'Viernes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
          'Sábado': { morning: { start: '09:00', end: '13:00', active: true }, afternoon: { start: '00:00', end: '00:00', active: false } },
          'Domingo': { morning: { start: '00:00', end: '00:00', active: false }, afternoon: { start: '00:00', end: '00:00', active: false } }
        },
        aiPhoneSettings: {
          assistantName: "Sara",
          clinicDisplayName: clinicName,
          language: "es-ES",
          tone: "formal",
          voiceName: "Zephyr",
          core_version: "1.0.1",
          active: true,
          systemPrompt: "Eres la asistente virtual de " + clinicName,
          initialGreeting: "Hola, bienvenida a " + clinicName + ". ¿En qué puedo ayudarte?",
          testSpeechText: "Prueba de voz del sistema SaaS.",
          instructions: "Ayuda a los pacientes a agendar citas.",
          voice: "default",
          phoneNumber: "",
          aiCompanyName: clinicName,
          voicePitch: 1.0,
          voiceSpeed: 1.0,
          temperature: 0.7,
          accent: "es-ES-Madrid",
          model: "gemini-3-flash-preview",
          escalation_rules: { transfer_number: "", escalate_on_frustration: true },
          policy_texts: { cancel_policy: "", privacy_notice: "" },
          prompt_overrides: {},
          aiEmotion: "Empática",
          aiStyle: "Concisa",
          aiRelation: "Formal (Usted)",
          aiFocus: "Resolutiva",
          configVersion: Date.now()
        }
      };

      await supabase.from('tenant_settings').insert({
        clinic_id: clinicId,
        settings: defaultSettings
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
        {!err ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
            <h2 className="text-3xl font-display font-black uppercase tracking-tight mb-2">Activación de Cuenta</h2>
            <p className="text-primary font-bold text-xs uppercase tracking-widest mb-4 animate-pulse">{msg}</p>
          </>
        ) : (
          <>
            <div className="size-24 bg-rose-500 text-white rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-6xl">error</span>
            </div>
            <h2 className="text-3xl font-display font-black uppercase tracking-tight mb-4">Error de Activación</h2>
            <div className="text-rose-500 font-bold mb-10 leading-relaxed bg-rose-500/10 p-6 rounded-2xl border border-rose-500/20 text-sm">
              <pre className="whitespace-pre-wrap font-mono text-xs">{err}</pre>
            </div>
            <button onClick={() => window.location.replace('/login')} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl">Volver al Login</button>
          </>
        )}
      </div>
    </div>
  );
}
