
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function AuthCallback() {
  const ranRef = useRef(false);
  const { refreshContext } = useAuth();
  const [msg, setMsg] = useState("Validando tu cuenta...");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const url = new URL(window.location.href);
    const hasCode = url.searchParams.has("code") || url.searchParams.has("token") || url.searchParams.has("token_hash");

    console.info("[AUTH_CALLBACK] href:", window.location.href);
    console.info("[AUTH_CALLBACK] hasCode:", hasCode);

    if (!hasCode) {
      setErr("Enlace inválido o incompleto. Vuelve a solicitar el correo de verificación.");
      setMsg("No se pudo validar.");
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        console.info("[AUTH_CALLBACK] result:", { userId: data?.user?.id, email: data?.user?.email, error });

        if (error) {
          setErr(error.message);
          setMsg("No se pudo validar.");
          return;
        }

        setMsg("Creando tu infraestructura clínica...");
        await ensureBusinessRows();

        setMsg("Sincronizando perfiles...");
        await refreshContext();

        setMsg("Listo. Redirigiendo...");
        // Redirección limpia compatible con BrowserRouter
        window.location.replace("/dashboard");
      } catch (e: any) {
        console.error("[AUTH_CALLBACK] fatal:", e);
        setErr(e?.message ?? String(e));
        setMsg("No se pudo validar.");
      }
    })();
  }, [refreshContext]);

  async function ensureBusinessRows() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session?.user?.id) throw new Error("No hay sesión activa tras el intercambio del código.");

    const authUserId = session.user.id;
    const meta = session.user.user_metadata || {};
    const clinicName = meta.clinic_name || "Mi Clínica MediClinic";
    const fullName = meta.full_name || "Administrador";
    const phone = meta.phone || "";
    const email = session.user.email || "";

    // 1. Asegurar Clínica
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

    // 2. Asegurar Perfil de Usuario Público
    const { error: upsertUserErr } = await supabase
      .from("users")
      .upsert({
        id: authUserId,
        clinic_id: clinicId,
        full_name: fullName,
        phone: phone,
        role: 'admin',
        is_active: true,
        username: email ? email.split('@')[0] : `user_${authUserId.substring(0, 5)}`
      });

    if (upsertUserErr) throw upsertUserErr;

    // 3. Asegurar Configuración del Tenant (tenant_settings)
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
        phone: phone,
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
            <h2 className="text-3xl font-display font-black uppercase tracking-tight mb-2">Mediclinic Cloud</h2>
            <p className="text-primary font-bold text-xs uppercase tracking-widest mb-4 animate-pulse">{msg}</p>
          </>
        ) : (
          <>
            <div className="size-24 bg-rose-500 text-white rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-6xl">error</span>
            </div>
            <h2 className="text-3xl font-display font-black uppercase tracking-tight mb-4">Fallo de Validación</h2>
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
