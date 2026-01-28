
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const AuthCallback: React.FC = () => {
  const { refreshContext } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Iniciando validación...");
  const [logs, setLogs] = useState<string[]>([]);
  const hasProcessed = useRef(false);

  const addLog = (msg: string) => {
    console.log(`[CALLBACK]: ${msg}`);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString().split(' ')[0]} - ${msg}`]);
  };

  useEffect(() => {
    const runAuthFlow = async () => {
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      try {
        addLog("Buscando sesión existente...");
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession) {
          addLog("Sesión activa recuperada. Sincronizando...");
          await completeOnboarding(currentSession.access_token);
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (!code) {
          addLog("No se encontró código en la URL.");
          setError("El enlace de activación no es válido.");
          return;
        }

        setStatus("Validando identidad...");
        addLog("Intercambiando código por sesión...");
        
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          addLog(`Error de intercambio: ${exchangeError.message}`);
          // Re-chequeo por si el intercambio ocurrió en segundo plano
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            addLog("Sesión detectada tras error (concurrencia).");
            await completeOnboarding(retrySession.access_token);
            return;
          }
          throw exchangeError;
        }

        if (data.session) {
          addLog("Intercambio exitoso.");
          await completeOnboarding(data.session.access_token);
        } else {
          throw new Error("No se pudo establecer la sesión segura.");
        }

      } catch (err: any) {
        if (err.name === 'AbortError') {
          addLog("Petición interrumpida por el sistema. Reintentando sesión...");
          const { data: { session: lastTry } } = await supabase.auth.getSession();
          if (lastTry) {
            await completeOnboarding(lastTry.access_token);
            return;
          }
        }
        addLog(`Fallo: ${err.message}`);
        setError(err.message);
      }
    };

    const completeOnboarding = async (token: string) => {
      setStatus("Sincronizando clínica...");
      addLog("Llamando a API de Onboarding...");
      
      try {
        const response = await fetch('/api/onboarding/ensure', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const res = await response.json();
          throw new Error(res.error || "Error en servidor");
        }

        addLog("Onboarding completado.");
        setStatus("Actualizando perfiles...");
        await refreshContext();
        
        addLog("Todo listo. Redirigiendo...");
        // Redirección forzada para limpiar la URL
        window.location.replace('/dashboard');
      } catch (e: any) {
        addLog(`Error Onboarding: ${e.message}`);
        setError(e.message);
      }
    };

    runAuthFlow();
  }, [refreshContext]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-2">Sincronizando...</h1>
            <p className="text-primary font-bold text-xs uppercase tracking-widest mb-10">{status}</p>
            
            <div className="bg-black/40 rounded-2xl p-6 text-left font-mono text-[10px] text-emerald-500 space-y-1 h-48 overflow-y-auto border border-white/5 custom-scrollbar">
                <p className="text-slate-500 font-bold mb-2 uppercase tracking-widest border-b border-white/5 pb-2">Consola de Estado:</p>
                {logs.map((log, i) => <p key={i} className="animate-in fade-in slide-in-from-left-2">{log}</p>)}
                <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })}></div>
            </div>
          </>
        ) : (
          <>
            <div className="size-24 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-6xl">error</span>
            </div>
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-4">Error de Activación</h1>
            <div className="text-rose-500 font-bold mb-10 leading-relaxed bg-rose-500/10 p-6 rounded-2xl border border-rose-500/20 text-sm">
              {error}
            </div>
            <button onClick={() => window.location.replace('/login')} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl">Volver al Login</button>
          </>
        )}
      </div>
      <p className="mt-8 text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">MediClinic Cloud SaaS Infrastructure</p>
    </div>
  );
};

export default AuthCallback;
