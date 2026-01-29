
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function AuthCallback() {
  const { refreshContext } = useAuth();
  const ran = useRef(false);
  const [error, setError] = useState<{title: string, msg: string, code?: string} | null>(null);
  const [status, setStatus] = useState("Iniciando validación de seguridad...");

  useEffect(() => {
    // Protección estricta contra doble ejecución
    if (ran.current) return;
    ran.current = true;

    async function handleAuth() {
      try {
        const url = new URL(window.location.href);
        let code = url.searchParams.get("code");
        
        // Búsqueda omnicanal (Query y Hash)
        if (!code && url.hash) {
          const hashParams = new URLSearchParams(url.hash.substring(1));
          code = hashParams.get("code") || hashParams.get("access_token");
        }

        // --- VALIDACIÓN DE PKCE VERIFIER ---
        const storageKeys = Object.keys(localStorage);
        const hasVerifier = storageKeys.some(k => k.includes("-auth-token-code-verifier"));
        
        console.log("[AUTH_CALLBACK] Diagnóstico:", {
          hasCode: !!code,
          hasVerifier,
          origin: window.location.origin
        });

        if (!code) {
          // Si no hay código pero ya hay sesión, es que Supabase ya lo hizo (cookie persistente)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await finalizeAuth(session.user);
            return;
          }
          throw { title: "Enlace Inválido", msg: "No se encontró el código de activación. Por favor, solicita un nuevo email de registro." };
        }

        if (!hasVerifier) {
          throw { 
            title: "Navegador no reconocido", 
            msg: "Por seguridad, debes abrir el enlace de confirmación en el MISMO navegador donde te registraste (Chrome, Safari, etc). Si abres el link en una app de correo distinta, el proceso fallará." 
          };
        }

        // --- INTERCAMBIO CON TIMEOUT ---
        setStatus("Verificando identidad con la nube...");
        
        // Usamos Promise.race para no quedar colgados si Supabase no responde
        const exchangePromise = supabase.auth.exchangeCodeForSession(code);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 15000));

        const result: any = await Promise.race([exchangePromise, timeoutPromise]);

        if (result.error) throw result.error;
        if (!result.data?.session) throw new Error("No se pudo establecer la sesión.");

        await finalizeAuth(result.data.session.user);

      } catch (e: any) {
        // Silenciar AbortError si de todos modos tenemos sesión
        if (e.name === 'AbortError' || e.message === 'signal is aborted') {
           const { data: { session } } = await supabase.auth.getSession();
           if (session) {
             await finalizeAuth(session.user);
             return;
           }
        }

        console.error("[AUTH_CALLBACK] Error fatal:", e);
        setError({ 
          title: e.title || "Fallo de Activación", 
          msg: e.msg || e.message || "Error inesperado al validar el token de acceso.",
          code: e.code 
        });
      }
    }

    async function finalizeAuth(user: any) {
        try {
            setStatus("Creando infraestructura de tu clínica...");
            await ensureClinicInfrastructure(user);
            
            setStatus("Sincronizando acceso final...");
            await refreshContext();
            
            // Redirección limpia
            window.location.replace("/dashboard");
        } catch (err: any) {
            console.error("[AUTH_CALLBACK] Onboarding error:", err);
            setError({ 
              title: "Error de Configuración", 
              msg: "Tu cuenta está activa pero no pudimos inicializar tu base de datos clínica. Contacta con soporte técnico." 
            });
        }
    }

    handleAuth();
  }, [refreshContext]);

  async function ensureClinicInfrastructure(user: any) {
    const meta = user.user_metadata || {};
    const email = user.email;
    const clinicName = meta.clinic_name || `Clínica de ${email}`;
    
    // 1. Verificar si la clínica ya existe para este dueño (Idempotencia)
    const { data: existingClinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    let clinicId = existingClinic?.id;

    if (!clinicId) {
      // 2. Crear Clínica
      const { data: newClinic, error: cErr } = await supabase
        .from('clinics')
        .insert({ name: clinicName, owner_id: user.id })
        .select('id')
        .single();
      
      if (cErr) throw cErr;
      clinicId = newClinic.id;

      // 3. Crear Perfil de Usuario Tenant
      await supabase.from('users').upsert({
        id: user.id,
        clinic_id: clinicId,
        full_name: meta.full_name || email,
        role: 'admin',
        is_active: true,
        username: email.split('@')[0]
      });

      // 4. Crear Ajustes por Defecto
      const defaultSettings = {
        id: clinicId,
        name: clinicName,
        businessName: clinicName,
        region: "ES",
        currency: "€",
        language: "es-ES",
        scheduleType: "split",
        branchCount: 1,
        colorTemplate: "ocean",
        roles: [{ id: 'admin', name: 'Admin', permissions: ['view_dashboard', 'view_all_data', 'can_edit'] }],
        labels: { dashboardTitle: "Panel", agendaTitle: "Agenda" },
        visuals: { titleFontSize: 32, bodyFontSize: 16 },
        laborSettings: { vacationDaysPerYear: 30, allowCarryOver: false, incidentTypes: [] },
        appointmentPolicy: { confirmationWindow: 24, leadTimeThreshold: 2, autoConfirmShortNotice: true },
        services: [{ id: 'S1', name: 'Consulta Gral', price: 50, duration: 30 }],
        aiPhoneSettings: { 
          assistantName: "Sara", clinicDisplayName: clinicName, language: "es-ES", tone: "formal", 
          voiceName: "Zephyr", core_version: "1.0.1", active: true, 
          systemPrompt: "Asistente de " + clinicName, configVersion: Date.now() 
        },
        globalSchedule: {
          'Lunes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
          'Martes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
          'Miércoles': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
          'Jueves': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
          'Viernes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
          'Sábado': { morning: { start: '09:00', end: '13:00', active: true }, afternoon: { start: '00:00', end: '00:00', active: false } },
          'Domingo': { morning: { start: '00:00', end: '00:00', active: false }, afternoon: { start: '00:00', end: '00:00', active: false } }
        }
      };

      await supabase.from('tenant_settings').upsert({ clinic_id: clinicId, settings: defaultSettings });
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-body">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-12 text-center shadow-2xl">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-lg shadow-primary/20"></div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-2">Activando Clínica</h2>
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
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.replace('/login')} 
                className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl"
              >
                Ir al Login
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="w-full h-12 bg-white/5 text-slate-400 rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-white/10 transition-all"
              >
                Reintentar validación
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
