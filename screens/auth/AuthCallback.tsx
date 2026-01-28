
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const AuthCallback: React.FC = () => {
  const { refreshContext } = useAuth();
  const [msg, setMsg] = useState("Iniciando validación de seguridad...");
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (m: string) => {
    console.log(`[AUTH_CALLBACK] ${m}`);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString().split(' ')[0]} - ${m}`]);
  };

  useEffect(() => {
    let cancelled = false;

    const runAuthFlow = async () => {
      try {
        addLog("Detectando parámetros en URL...");
        const url = window.location.href;
        
        // BLOQUE 3: Intercambio manual de código por sesión
        setMsg("Validando identidad con la nube...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);

        if (cancelled) return;

        if (exchangeError) {
          addLog(`Error en intercambio: ${exchangeError.message}`);
          // Si ya hay sesión, ignoramos el error (doble ejecución)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            addLog("Sesión ya activa. Procediendo a sincronización...");
            await ensureOnboarding(session.access_token);
            return;
          }
          throw exchangeError;
        }

        if (data?.session) {
          addLog("Sesión establecida correctamente.");
          await ensureOnboarding(data.session.access_token);
        } else {
          throw new Error("No se pudo recuperar la sesión de usuario.");
        }

      } catch (err: any) {
        if (cancelled) return;
        addLog(`FALLO CRÍTICO: ${err.message}`);
        setError(err.message);
      }
    };

    const ensureOnboarding = async (token: string) => {
      setMsg("Preparando tu entorno clínico...");
      addLog("Llamando a MediClinic Onboarding API...");
      
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
          throw new Error(res.error || "Error de comunicación con el servidor");
        }

        addLog("Onboarding finalizado con éxito.");
        setMsg("Sincronizando perfiles...");
        
        // Actualizar el contexto global antes de irse
        await refreshContext();
        
        addLog("Todo listo. Redirigiendo al Dashboard...");
        // Usamos path directo ya que server/index.js maneja SPA
        window.location.replace('/dashboard');
      } catch (e: any) {
        if (cancelled) return;
        addLog(`Error en Onboarding: ${e.message}`);
        setError(e.message);
      }
    };

    runAuthFlow();
    return () => { cancelled = true; };
  }, [refreshContext]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-2">Validando Acceso</h1>
            <p className="text-primary font-bold text-xs uppercase tracking-widest mb-10 animate-pulse">{msg}</p>
            
            <div className="bg-black/40 rounded-2xl p-6 text-left font-mono text-[10px] text-emerald-500 space-y-1 h-48 overflow-y-auto border border-white/5 custom-scrollbar">
                <p className="text-slate-500 font-bold mb-2 uppercase tracking-widest border-b border-white/5 pb-2">Diagnóstico de Sistema:</p>
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
      <p className="mt-8 text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">MediClinic Cloud Infrastructure</p>
    </div>
  );
};

export default AuthCallback;
