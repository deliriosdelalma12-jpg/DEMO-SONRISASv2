
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      console.log("[AUTH_CALLBACK] start", window.location.href);
      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);

        console.log("[AUTH_CALLBACK_RESULT]", { data, error: exchangeError });

        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }

        // Bloque 3: Sesión establecida -> ir a dashboard
        // Usamos window.location para asegurar limpieza total de parámetros de URL
        window.location.href = "/#/dashboard";
      } catch (err: any) {
        console.error("[AUTH_CALLBACK_EXCEPTION]", err);
        setError("Fallo crítico en el intercambio de sesión.");
      }
    };

    run();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-12 shadow-2xl">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-4">Validando sesión</h1>
            <p className="text-slate-400 font-medium italic">Espera un momento mientras activamos tu cuenta...</p>
          </>
        ) : (
          <>
            <div className="size-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-5xl">error</span>
            </div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-4">Error de Activación</h1>
            <p className="text-rose-500 font-bold mb-8 leading-relaxed">{error}</p>
            <button onClick={() => navigate('/login')} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-lg">Volver al Login</button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
