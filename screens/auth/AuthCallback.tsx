
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(`[AUTH_CALLBACK_LOG]: ${msg}`);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    const processAuth = async () => {
      addLog("Iniciando proceso de validación...");
      addLog(`URL detectada: ${window.location.href}`);
      
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const errorMsg = params.get('error_description');

      if (errorMsg) {
          addLog(`Error detectado en URL: ${errorMsg}`);
          setError(errorMsg);
          return;
      }

      if (!code) {
        addLog("No se encontró código de intercambio. Comprobando sesión existente...");
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            addLog("Sesión activa. Procediendo a inicialización...");
            await ensureOnboarding(session.access_token);
            return;
        }
        setError("Falta el código de validación. El enlace podría haber caducado.");
        return;
      }

      addLog(`Código PKCE encontrado: ${code.substring(0, 8)}...`);

      try {
        addLog("Solicitando intercambio de código...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          addLog(`Fallo en intercambio: ${exchangeError.message}`);
          setError(exchangeError.message);
          return;
        }

        if (data.session) {
          addLog("¡Sesión obtenida! Iniciando aprovisionamiento de clínica...");
          await ensureOnboarding(data.session.access_token);
        } else {
          setError("No se pudo establecer la sesión tras el intercambio.");
        }

      } catch (err: any) {
        addLog(`Excepción crítica: ${err.message}`);
        setError("Fallo técnico en la activación. Intenta loguear manualmente.");
      }
    };

    const ensureOnboarding = async (token: string) => {
      try {
        addLog("Sincronizando con el servidor de provisionamiento...");
        
        // Llamada al servidor Express para asegurar que las tablas public.users y tenant_settings existen
        const response = await fetch('/api/onboarding/ensure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const result = await response.json();

        if (!response.ok) {
          addLog(`Error en aprovisionamiento: ${result.error || 'Unknown error'}`);
          setError(`Error al configurar tu clínica: ${result.error}`);
          return;
        }

        addLog("¡Entorno clínico configurado correctamente!");
        addLog("Redirigiendo al Dashboard...");
        
        // Esperamos un segundo para asegurar que Supabase refleje los cambios en las tablas
        setTimeout(() => {
            navigate('/dashboard');
        }, 1500);

      } catch (e: any) {
        addLog(`Error de red en onboarding: ${e.message}`);
        setError("El servidor de configuración no responde. Contacta con soporte.");
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[3rem] p-12 shadow-2xl overflow-hidden relative">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-4">Configurando tu Entorno</h1>
            <p className="text-slate-400 font-medium italic mb-10">Estamos preparando tu base de datos y asistente de IA...</p>
            
            <div className="bg-black/40 rounded-2xl p-6 text-left font-mono text-[10px] text-emerald-500 space-y-1 h-40 overflow-y-auto border border-white/5">
                <p className="text-slate-500 font-bold mb-2 uppercase tracking-widest border-b border-white/5 pb-2">Status Log:</p>
                {debugInfo.map((log, i) => <p key={i} className="animate-in fade-in slide-in-from-left-2">{log}</p>)}
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
            <button onClick={() => navigate('/login')} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20">Ir al Login</button>
          </>
        )}
      </div>
      <p className="mt-8 text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">MediClinic Cloud v3.0 SaaS Architecture</p>
    </div>
  );
};

export default AuthCallback;
