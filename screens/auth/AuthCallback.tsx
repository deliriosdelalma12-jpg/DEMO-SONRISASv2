
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { refreshContext } = useAuth();
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

      addLog("Iniciando proceso de validación final...");

      try {
        // 1. Obtener la sesión (Supabase suele validarla automáticamente desde el hash)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session) {
          addLog(`Sesión detectada para: ${session.user.email}`);
          await ensureOnboarding(session.access_token);
          return;
        }

        // 2. Si no hay sesión, buscamos el código en la URL (PKCE)
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (!code) {
          addLog("Error: No se ha detectado el código de acceso en la URL.");
          setError("El enlace de validación es incorrecto o ha caducado.");
          return;
        }

        addLog("Intercambiando código de seguridad por sesión activa...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          // Si el código ya se usó, comprobamos si tenemos sesión igualmente
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            addLog("Identidad ya validada. Sincronizando datos...");
            await ensureOnboarding(retrySession.access_token);
            return;
          }
          throw exchangeError;
        }

        if (data.session) {
          addLog("Identidad verificada con éxito. Preparando entorno clínico...");
          await ensureOnboarding(data.session.access_token);
        } else {
          throw new Error("No se pudo establecer la sesión segura.");
        }

      } catch (err: any) {
        if (err.name === 'AbortError') {
            addLog("Petición abortada. Reintentando sincronización de sesión...");
            const { data: { session: lastChance } } = await supabase.auth.getSession();
            if (lastChance) {
                await ensureOnboarding(lastChance.access_token);
                return;
            }
        }
        addLog(`ERROR CRÍTICO: ${err.message}`);
        setError(err.message);
      }
    };

    const ensureOnboarding = async (token: string) => {
      try {
        addLog("Conectando con el servidor de la nube MediClinic...");
        
        const response = await fetch('/api/onboarding/ensure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const result = await response.json();

        if (!response.ok) {
          addLog(`Error en servidor: ${result.error || 'Respuesta no válida'}`);
          setError(`Fallo al configurar la clínica: ${result.error}`);
          return;
        }

        addLog("¡Entorno configurado correctamente!");
        
        // CRITICAL: Refrescar el contexto global antes de navegar
        addLog("Actualizando perfiles globales...");
        await refreshContext();
        
        addLog("Redirigiendo a panel de control...");
        setTimeout(() => navigate('/dashboard'), 800);

      } catch (e: any) {
        addLog(`Fallo de red: ${e.message}`);
        setError("Error de comunicación con el servidor. Reintenta en unos instantes.");
      }
    };

    processAuth();
  }, [navigate, refreshContext]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-4">Sincronizando...</h1>
            <p className="text-slate-400 font-medium italic mb-10">Validando identidad en la red MediClinic...</p>
            
            <div className="bg-black/40 rounded-2xl p-6 text-left font-mono text-[10px] text-emerald-500 space-y-1 h-40 overflow-y-auto border border-white/5 custom-scrollbar">
                <p className="text-slate-500 font-bold mb-2 uppercase tracking-widest border-b border-white/5 pb-2 text-[8px]">Consola de Estado del Sistema:</p>
                {debugInfo.map((log, i) => <p key={i} className="animate-in fade-in slide-in-from-left-2">{log}</p>)}
                <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })}></div>
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
            <div className="space-y-4">
                <button onClick={() => window.location.reload()} className="w-full h-16 bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/20 transition-all">Reintentar Sincronización</button>
                <button onClick={() => navigate('/login')} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20">Ir al Login</button>
            </div>
          </>
        )}
      </div>
      <p className="mt-8 text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">MediClinic Cloud v3.0 SaaS Architecture</p>
    </div>
  );
};

export default AuthCallback;
