
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

// Variable fuera del componente para persistir entre re-renders de React (Strict Mode)
let isExchanging = false;

export default function AuthCallback() {
  const { refreshContext } = useAuth();
  const [error, setError] = useState<{title: string, msg: string} | null>(null);
  const [status, setStatus] = useState("Iniciando protocolo de seguridad...");
  const initialized = useRef(false);

  useEffect(() => {
    // Evitar doble ejecución en la misma instancia del componente
    if (initialized.current) return;
    initialized.current = true;

    async function handleAuth() {
      // 1. Si ya hay una operación en curso en otra instancia (Strict Mode), ignorar esta
      if (isExchanging) {
        console.log("[AUTH_CALLBACK] Operación ya en curso. Standby...");
        return;
      }

      try {
        isExchanging = true;
        
        // 2. ¿Ya tenemos sesión? (A veces Supabase la recupera por cookies antes del canje)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          console.log("[AUTH_CALLBACK] Sesión detectada. Finalizando onboarding...");
          await completeOnboarding(existingSession.user);
          return;
        }

        // 3. Extraer el código de la URL (Query o Hash)
        const url = new URL(window.location.href);
        let code = url.searchParams.get("code");
        if (!code && url.hash) {
          const hashParams = new URLSearchParams(url.hash.substring(1));
          code = hashParams.get("code") || hashParams.get("access_token");
        }

        console.log("[AUTH_CALLBACK] Procesando código:", code ? "PRESENTE" : "AUSENTE");

        if (!code) {
          throw { title: "Enlace caducado", msg: "No se ha detectado el código de validación. Es posible que el enlace ya haya sido usado o sea inválido." };
        }

        // 4. Intercambio del "Cheque" (Código) por la "Llave" (Sesión)
        setStatus("Validando credenciales con el servidor...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          // Si el error es técnico por duplicidad, verificamos si de todos modos se creó la sesión
          console.error("[AUTH_CALLBACK] Error en intercambio:", exchangeError);
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            await completeOnboarding(retrySession.user);
            return;
          }
          throw exchangeError;
        }

        if (data.session) {
          await completeOnboarding(data.session.user);
        } else {
          throw new Error("No se pudo establecer una conexión segura.");
        }

      } catch (e: any) {
        console.error("[AUTH_CALLBACK] Error fatal:", e);
        
        // Ignorar errores de "Signal Aborted" que son ruidos del SDK
        if (e.name === 'AbortError' || e.message?.includes('aborted')) return;

        setError({ 
          title: e.title || "Fallo de Verificación", 
          msg: e.msg || e.message || "No hemos podido validar tu cuenta. Por favor, solicita un nuevo enlace de acceso." 
        });
      } finally {
        // No reseteamos isExchanging para evitar que el segundo render de StrictMode intente nada
      }
    }

    async function completeOnboarding(user: any) {
        try {
            setStatus("Sincronizando base de datos clínica...");
            
            // Verificamos si la clínica ya existe para evitar duplicados
            const { data: clinic } = await supabase.from('clinics').select('id').eq('owner_id', user.id).maybeSingle();
            
            if (!clinic) {
                const meta = user.user_metadata || {};
                const clinicName = meta.clinic_name || "Mi Clínica";
                
                const { data: newC, error: cErr } = await supabase.from('clinics').insert({ 
                    name: clinicName, 
                    owner_id: user.id 
                }).select('id').single();
                
                if (cErr) throw cErr;

                // Crear perfil de usuario vinculado
                await supabase.from('users').upsert({
                    id: user.id,
                    clinic_id: newC.id,
                    full_name: meta.full_name || user.email,
                    role: 'admin',
                    is_active: true,
                    username: user.email.split('@')[0]
                });

                // Configuración por defecto
                const defaultSettings = {
                    id: newC.id, name: clinicName, businessName: clinicName, region: "ES", currency: "€", language: "es-ES",
                    scheduleType: "split", roles: [{ id: 'admin', name: 'Admin', permissions: ['view_dashboard', 'view_all_data', 'can_edit'] }],
                    labels: { dashboardTitle: "Panel", agendaTitle: "Agenda" }, visuals: { titleFontSize: 32, bodyFontSize: 16 },
                    laborSettings: { vacationDaysPerYear: 30, allowCarryOver: false, incidentTypes: [] },
                    appointmentPolicy: { confirmationWindow: 24, leadTimeThreshold: 2, autoConfirmShortNotice: true },
                    services: [{ id: 'S1', name: 'Consulta Gral', price: 50, duration: 30 }],
                    aiPhoneSettings: { assistantName: "Sara", clinicDisplayName: clinicName, language: "es-ES", tone: "formal", voiceName: "Zephyr", active: true, systemPrompt: "Asistente de " + clinicName, configVersion: Date.now() }
                };
                await supabase.from('tenant_settings').upsert({ clinic_id: newC.id, settings: defaultSettings });
            }

            setStatus("Acceso concedido. Redirigiendo...");
            await refreshContext();
            
            // Uso de replace para limpiar el historial de navegación del código sensible
            window.location.replace("/dashboard");
        } catch (err: any) {
            console.error("[ONBOARDING_ERROR]", err);
            setError({ title: "Error de Configuración", msg: "Tu cuenta es válida pero hubo un fallo al inicializar tu clínica. Contacta con soporte." });
        }
    }

    handleAuth();
  }, [refreshContext]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-body">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-12 text-center shadow-2xl">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-lg shadow-primary/20"></div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-2">Verificando Cuenta</h2>
            <p className="text-primary font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">{status}</p>
          </>
        ) : (
          <>
            <div className="size-24 bg-rose-500/20 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border-2 border-rose-500/20">
              <span className="material-symbols-outlined text-6xl">gpp_maybe</span>
            </div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-4 text-rose-500">{error.title}</h2>
            <p className="text-slate-400 text-xs font-medium leading-relaxed mb-10">{error.msg}</p>
            <button 
              onClick={() => window.location.replace('/login')} 
              className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl"
            >
              Volver al Inicio
            </button>
          </>
        )}
      </div>
    </div>
  );
}
