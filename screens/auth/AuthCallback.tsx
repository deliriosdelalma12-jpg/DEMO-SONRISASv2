
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.group('🔄 AUTH_CALLBACK_ENGINE');
      
      try {
        // En flujos PKCE (Supabase v2 default), el código viene en ?code=
        const queryParams = new URLSearchParams(window.location.search);
        let code = queryParams.get('code');

        // Soporte para HashRouter: el code podría estar tras el #
        if (!code && window.location.hash.includes('code=')) {
          const hashQuery = window.location.hash.split('?')[1];
          if (hashQuery) {
            code = new URLSearchParams(hashQuery).get('code');
          }
        }

        if (code) {
          console.log('PKCE Code detected, exchanging...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          console.log('✅ Session created.');
        } else {
          // Intentar ver si la sesión ya existe por cookie/fragmento
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.warn('No code or session found.');
            throw new Error('No se pudo validar el enlace de confirmación. Intenta iniciar sesión manualmente.');
          }
        }

        console.log('Redirigiendo al dashboard...');
        navigate('/', { replace: true });

      } catch (err: any) {
        console.error('❌ CALLBACK_ERROR:', err.message);
        setError(err.message || 'Error desconocido al validar acceso.');
      } finally {
        console.groupEnd();
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-12 text-center shadow-2xl">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-4">Sincronizando Acceso</h1>
            <p className="text-slate-400 font-medium">Validando tu cuenta con Mediclinic Cloud...</p>
          </>
        ) : (
          <>
            <div className="size-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-rose-500/20">
              <span className="material-symbols-outlined text-5xl">error</span>
            </div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-4">Error de Validación</h1>
            <p className="text-rose-500 font-bold mb-8 leading-relaxed">{error}</p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all"
            >
              Volver al Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
