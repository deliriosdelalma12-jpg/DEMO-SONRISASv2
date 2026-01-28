
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verificando credenciales...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      console.group('🔄 AUTH_CALLBACK_FLOW');
      
      try {
        // En flujos PKCE el código viene en ?code=
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');

        if (code) {
          console.log('Code detected, exchanging for session...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        // Verificar si ahora tenemos una sesión activa
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session) {
          console.log('✅ Session established successfully.');
          setStatus('Sincronización completa. Entrando...');
          setTimeout(() => navigate('/', { replace: true }), 1000);
        } else {
          console.warn('⚠️ No session found after exchange.');
          navigate('/login', { state: { message: 'Correo verificado. Por favor, inicia sesión.' } });
        }

      } catch (err: any) {
        console.error('❌ CALLBACK_ERROR:', err.message);
        setError(err.message || 'Error desconocido al validar el acceso.');
      } finally {
        console.groupEnd();
      }
    };

    processCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-12 text-center">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-tighter mb-4">Sincronizando</h1>
            <p className="text-slate-400 font-medium">{status}</p>
          </>
        ) : (
          <>
            <div className="size-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-4xl">error</span>
            </div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-tighter mb-4">Error de Acceso</h1>
            <p className="text-rose-500 font-bold mb-8">{error}</p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest"
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
