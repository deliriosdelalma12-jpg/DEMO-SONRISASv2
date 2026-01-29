
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

// BLOQUEO DE MÓDULO: Fuera del componente para que persista entre re-renders de React
let isExchanging = false;

export default function AuthCallback() {
  const { refreshContext } = useAuth();
  const [error, setError] = useState<{title: string, msg: string, detail?: string} | null>(null);
  const [status, setStatus] = useState("Iniciando depuración...");

  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`%c[AUTH_CALLBACK][${timestamp}] Componente Montado.`, "color: #3b82f6; font-weight: bold;");

    if (isExchanging) {
      console.warn(`[AUTH_CALLBACK][${timestamp}] El proceso ya está en curso. Ignorando este montaje para evitar duplicidad.`);
      return;
    }

    async function handleProcess() {
      isExchanging = true;
      console.log(`[AUTH_CALLBACK][${timestamp}] --- INICIO DEL FLUJO DE CANJE ---`);
      
      try {
        const url = new URL(window.location.href);
        console.log(`[AUTH_CALLBACK] URL Completa detectada:`, url.toString());
        
        let code = url.searchParams.get("code");
        
        if (!code && url.hash) {
          console.log(`[AUTH_CALLBACK] No hay code en query params. Revisando fragmento (hash)...`);
          const hashParams = new URLSearchParams(url.hash.substring(1));
          code = hashParams.get("code") || hashParams.get("access_token");
        }

        if (!code) {
          console.error("[AUTH_CALLBACK] ERROR: No se encontró ningún código en la URL.");
          // Intento de rescate: ¿Ya tenemos sesión?
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          if (existingSession) {
            console.log("[AUTH_CALLBACK] Rescate: Sesión ya presente en cookies. Saltando exchange.");
            await triggerRailway(existingSession);
            return;
          }
          throw { title: "URL de activación corrupta", msg: "No hemos encontrado el código de seguridad en el enlace.", detail: "Query: " + url.search + " Hash: " + url.hash };
        }

        setStatus("Canjeando código con Supabase...");
        console.log(`[AUTH_CALLBACK] Solicitando exchangeCodeForSession con código: ${code.substring(0, 10)}...`);
        
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("[AUTH_CALLBACK] ERROR SUPABASE EXCHANGE:", exchangeError);
          // Caso común: El código ya se usó (quizás por un re-render previo o pre-fetch del correo)
          if (exchangeError.message.includes("both code_verifier and code are required") || exchangeError.message.includes("already used")) {
             console.log("[AUTH_CALLBACK] El código parece haber sido usado. Verificando si existe sesión activa...");
             const { data: { session: retrySession } } = await supabase.auth.getSession();
             if (retrySession) {
                console.log("[AUTH_CALLBACK] Sesión recuperada tras fallo de exchange. Continuando.");
                await triggerRailway(retrySession);
                return;
             }
          }
          throw { title: "Error de Supabase", msg: exchangeError.message, detail: JSON.stringify(exchangeError) };
        }

        if (data.session) {
          console.log(`%c[AUTH_CALLBACK] Sesión obtenida para: ${data.session.user.email}`, "color: #10b981; font-weight: bold;");
          await triggerRailway(data.session);
        } else {
          console.error("[AUTH_CALLBACK] No se devolvió sesión tras el exchange.");
          throw new Error("Exchange completado pero sin datos de sesión.");
        }

      } catch (e: any) {
        console.error(`%c[AUTH_CALLBACK] FALLO CRÍTICO EN PROCESO:`, "color: #ef4444; font-weight: bold;", e);
        
        // No mostramos error si es un aborto intencionado (aunque aquí ya no debería haberlos)
        if (e.name === 'AbortError' || e.message?.includes('aborted')) {
            console.warn("[AUTH_CALLBACK] Petición abortada detectada. No se muestra error al usuario.");
            return;
        }

        setError({ 
          title: e.title || "Fallo de Activación", 
          msg: e.msg || "Hubo un error al procesar tu entrada.",
          detail: e.detail || e.message || "Sin detalles técnicos adicionales."
        });
      }
    }

    async function triggerRailway(session: any) {
        const t = new Date().toLocaleTimeString();
        console.log(`[AUTH_CALLBACK][${t}] --- FASE 2: SINCRONIZACIÓN RAILWAY ---`);
        setStatus("Railway: Asegurando infraestructura...");

        try {
            console.log(`[AUTH_CALLBACK] Llamando a Railway: POST /api/onboarding/ensure`);
            const response = await fetch('/api/onboarding/ensure', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            console.log(`[AUTH_CALLBACK] Railway respondió con Status: ${response.status}`);
            
            if (!response.ok) {
                const errJson = await response.json();
                console.error("[AUTH_CALLBACK] ERROR RAILWAY:", errJson);
                throw new Error(errJson.error || `Error del servidor Railway (${response.status})`);
            }

            const result = await response.json();
            console.log(`%c[AUTH_CALLBACK] Railway Sincronizado:`, "color: #10b981; font-weight: bold;", result);
            
            setStatus("Finalizando y redirigiendo...");
            await refreshContext();
            
            console.log("[AUTH_CALLBACK] Redirigiendo al Dashboard...");
            window.location.replace("/dashboard");
            
        } catch (err: any) {
            console.error(`[AUTH_CALLBACK] ERROR EN FASE RAILWAY:`, err);
            setError({ 
                title: "Error de Servidor (Railway)", 
                msg: "Tu sesión es válida pero no pudimos preparar tu clínica.",
                detail: err.message
            });
        }
    }

    handleProcess();

    return () => {
       console.log("[AUTH_CALLBACK] Cleanup de useEffect. (React intentó desmontar)");
    };
  }, [refreshContext]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-body">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] p-12 shadow-2xl">
        {!error ? (
          <div className="text-center">
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-2">Procesando Credenciales</h2>
            <p className="text-primary font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse mb-8">{status}</p>
            <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-left">
                <p className="text-[9px] text-slate-500 font-mono uppercase mb-2">Monitor de Consola Activo</p>
                <p className="text-[10px] text-slate-400 italic leading-relaxed">Estamos realizando un canje de seguridad PKCE y sincronizando tu ID con el servidor central de Railway.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-6 mb-8 border-b border-rose-500/20 pb-8">
                <div className="size-20 bg-rose-500/20 text-rose-500 rounded-[2rem] flex items-center justify-center border-2 border-rose-500/20 shrink-0">
                    <span className="material-symbols-outlined text-5xl">bug_report</span>
                </div>
                <div>
                    <h2 className="text-2xl font-display font-black uppercase tracking-tight text-rose-500">{error.title}</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{error.msg}</p>
                </div>
            </div>

            <div className="p-6 bg-black/50 rounded-2xl border border-white/5 font-mono text-[10px] text-rose-400 overflow-x-auto">
                <p className="font-black mb-2 uppercase text-slate-500 border-b border-white/5 pb-1">Detalles Técnicos (Informe para Soporte):</p>
                <pre className="whitespace-pre-wrap">{error.detail}</pre>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  onClick={() => window.location.reload()} 
                  className="h-14 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
                >
                  Reintentar Proceso
                </button>
                <button 
                  onClick={() => window.location.replace('/login')} 
                  className="h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl"
                >
                  Ir al Login
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
