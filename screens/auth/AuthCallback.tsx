
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const processingRef = useRef(false);

  const addLog = (msg: string) => {
    console.log(`[AUTH_CALLBACK_LOG]: ${msg}`);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    const processAuth = async () => {
      if (processingRef.current) return;
      processingRef.current = true;

      addLog("Iniciando proceso de validación...");

      try {
        // 1. Verificar si ya tenemos sesión (a veces Supabase la pilla solo)
        const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (existingSession) {
            addLog("¡Sesión activa detectada! Procediendo a sincronizar...");
            await ensureOnboarding(existingSession.access_token);
            return;
        }

        // 2. Si no hay sesión, buscamos el código
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (!code) {
          addLog("No hay código en la URL.");
          setError("El enlace no contiene el código de validación.");
          return;
        }

        addLog("Intercambiando código por sesión...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          // Si el error es sobre el código ya usado, volvemos a mirar si hay sesión
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            addLog("Código ya validado en segundo plano. Éxito.");
            await ensureOnboarding(retrySession.access_token);
            return;
          }
          throw exchangeError;
        }

        if (data.session) {
          addLog("Intercambio manual exitoso.");
          await ensureOnboarding(data.session.access_token);
        } else {
          throw new Error("No se pudo obtener la sesión tras el intercambio.");
        }

      } catch (err: any) {
        if (err.name === 'AbortError') {
            addLog("Petición abortada por el sistema. Reintentando lectura de sesión...");
            const { data: { session: lastChance } } = await supabase.auth.getSession();
            if (lastChance) {
                await ensureOnboarding(lastChance.access_token);
                return;
            }
        }
        addLog(`Error crítico: ${err.message}`);
        setError(err.message);
      }
    };

    const ensureOnboarding = async (token: string) => {
      try {
        addLog("Sincronizando entorno clínico...");
        
        const response = await fetch('/api/onboarding/ensure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const result = await response.json();
          addLog(`Error onboarding: ${result.error}`);
          setError(`Fallo al configurar la clínica: ${result.error}`);
          return;
        }

        addLog("¡Sincronización completa! Redirigiendo...");
        setTimeout(() => navigate('/dashboard'), 1000);

      } catch (e: any) {
        addLog(`Error red onboarding: ${e.message}`);
        setError("Error de comunicación con el servidor de la clínica.");
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-4">Sincronizando...</h1>
            <p className="text-slate-400 font-medium italic mb-10">Validando identidad en la red MediClinic...</p>
            
            <div className="bg-black/40 rounded-2xl p-6 text-left font-mono text-[10px] text-emerald-500 space-y-1 h-40 overflow-y-auto border border-white/5">
                <p className="text-slate-500 font-bold mb-2 uppercase tracking-widest border-b border-white/5 pb-2">Consola de Estado:</p>
                {debugInfo.map((log, i) => <p key={i} className="animate-in fade-in slide-in-from-left-2">{log}</p>)}
            </div>
          </>
        ) : (
          <>
            <div className="size-24 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-6xl">error</span>
            </div>
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-4">Fallo de Activación</h1>
            <div className="text-rose-500 font-bold mb-10 leading-relaxed bg-rose-500/10 p-6 rounded-2xl border border-rose-500/20 text-sm">
              {error}
            </div>
            <button onClick={() => navigate('/login')} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20">Ir al Login</button>
          </>
        )}
      </div>
      <p className="mt-8 text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">MediClinic Cloud v3.0 SaaS Architecture</p>
    </div>
  );
};

export default AuthCallback;
