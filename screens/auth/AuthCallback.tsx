
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function AuthCallback() {
  const { refreshContext } = useAuth();
  const [error, setError] = useState<{title: string, msg: string} | null>(null);
  const [status, setStatus] = useState("Sincronizando con Railway...");
  const processing = useRef(false);

  useEffect(() => {
    if (processing.current) return;
    processing.current = true;

    async function handleExchange() {
      try {
        const url = new URL(window.location.href);
        let code = url.searchParams.get("code");
        
        if (!code && url.hash) {
          const params = new URLSearchParams(url.hash.substring(1));
          code = params.get("code") || params.get("access_token");
        }

        if (!code) {
          // Si no hay código, quizás la sesión ya se activó por cookies
          const { data: { session } } = await supabase.auth.getSession();
          if (session) return await triggerRailwayOnboarding(session);
          throw { title: "Enlace Inválido", msg: "No se ha detectado el código de activación en la URL." };
        }

        setStatus("Validando sesión segura...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          // Si falla, verificamos si de todos modos se activó la sesión
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) return await triggerRailwayOnboarding(retrySession);
          throw exchangeError;
        }

        if (data.session) {
          await triggerRailwayOnboarding(data.session);
        }

      } catch (e: any) {
        console.error("[CALLBACK_FRONTEND_ERROR]", e);
        if (e.name === 'AbortError') return;
        setError({ 
          title: e.title || "Fallo de Activación", 
          msg: e.msg || "Hubo un problema al canjear tu código de acceso." 
        });
      }
    }

    async function triggerRailwayOnboarding(session: any) {
        try {
            setStatus("Railway: Construyendo tu clínica...");
            
            // Llamada directa al SERVIDOR (Railway side) para que ÉL haga los cálculos
            const response = await fetch('/api/onboarding/ensure', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "El servidor de Railway ha rechazado la solicitud.");
            }

            setStatus("Redirigiendo al panel...");
            await refreshContext();
            
            // Redirección definitiva al Dashboard
            setTimeout(() => window.location.replace("/dashboard"), 800);
            
        } catch (err: any) {
            console.error("[RAILWAY_SYNC_ERROR]", err);
            setError({ 
                title: "Error de Servidor", 
                msg: "La sesión es válida pero Railway no pudo inicializar tu clínica. Contacta con soporte." 
            });
        }
    }

    handleExchange();
  }, [refreshContext]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-body">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-12 text-center shadow-2xl">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-lg shadow-primary/20"></div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-2">Activación SaaS</h2>
            <p className="text-primary font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">{status}</p>
          </>
        ) : (
          <>
            <div className="size-24 bg-rose-500/20 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border-2 border-rose-500/20">
              <span className="material-symbols-outlined text-6xl">cloud_off</span>
            </div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-4 text-rose-500">{error.title}</h2>
            <p className="text-slate-400 text-xs font-medium leading-relaxed mb-10">{error.msg}</p>
            <button onClick={() => window.location.replace('/login')} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Volver al Login</button>
          </>
        )}
      </div>
    </div>
  );
}
