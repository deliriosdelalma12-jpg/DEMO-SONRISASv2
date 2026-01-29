
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("Validando credenciales...");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const url = new URL(window.location.href);
        console.log("[AUTH_CALLBACK] URL:", url.href);

        const code = url.searchParams.get("code");
        if (!code) throw new Error("No se encontró el código de activación en la URL.");

        // Candado por code (anti reintentos / remounts)
        const key = `authcb_done_${code}`;
        if (sessionStorage.getItem(key)) {
          window.location.replace("/dashboard");
          return;
        }
        sessionStorage.setItem(key, "1");

        // 1) Exchange canónico (SIN getSession antes)
        setMsg("Canjeando código por sesión activa...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) throw exchangeError;
        if (!data.session?.user) throw new Error("Supabase no devolvió una sesión válida.");

        // 2) Onboarding de negocio (DB)
        setMsg("Configurando entorno clínico...");
        await ensureClinicInfrastructure(data.session.user);

        // 3) Redirección (NO refreshContext aquí)
        setMsg("Acceso concedido. Redirigiendo...");
        window.location.replace("/dashboard");
      } catch (e: any) {
        console.error("[AUTH_CALLBACK] ERROR:", e);
        setError(e?.message || "Error inesperado durante la activación.");
      }
    })();
  }, []);

  async function ensureClinicInfrastructure(user: any) {
    const meta = user.user_metadata || {};
    const clinicName = meta.clinic_name || "Mi Clínica MediClinic";

    // Buscar clínica
    const { data: clinic, error: clinicSelErr } = await supabase
      .from("clinics")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (clinicSelErr) throw clinicSelErr;

    let clinicId = clinic?.id;

    // Crear clínica si no existe
    if (!clinicId) {
      const { data: newClinic, error: cErr } = await supabase
        .from("clinics")
        .insert({ name: clinicName, owner_id: user.id })
        .select("id")
        .single();

      if (cErr) throw cErr;
      clinicId = newClinic.id;
    }

    // Asegurar perfil usuario SIEMPRE
    const { error: uErr } = await supabase.from("users").upsert({
      id: user.id,
      clinic_id: clinicId,
      full_name: meta.full_name || user.email,
      role: "admin",
      is_active: true,
      username: user.email.split("@")[0],
    });
    if (uErr) throw uErr;

    // Asegurar tenant_settings SIEMPRE
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
        roles: [{ id: "admin", name: "Admin", permissions: ["view_dashboard", "view_all_data", "can_edit"] }],
        labels: { dashboardTitle: "Panel de Control", agendaTitle: "Agenda Médica" },
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
          testSpeechText: "Prueba de voz del sistema.",
          instructions: "Ayuda a agendar citas.",
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
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-body">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[3rem] p-12 text-center shadow-2xl">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8" />
            <h2 className="text-3xl font-black uppercase mb-2">Activando Cuenta</h2>
            <p className="text-primary font-bold text-xs uppercase tracking-widest animate-pulse">{msg}</p>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-black uppercase mb-4">Fallo de Validación</h2>
            <pre className="text-rose-400 text-xs whitespace-pre-wrap">{error}</pre>
            <button
              onClick={() => window.location.replace("/login")}
              className="w-full h-16 mt-6 bg-primary rounded-2xl font-black uppercase text-xs"
            >
              Volver al Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
