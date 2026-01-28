
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.group('🔄 [CALLBACK_PROCESSING]');
      
      try {
        // En un entorno de SPA, el código puede estar en la URL real antes de que actúe el Router
        const currentUrl = window.location.href;
        console.log('🔗 URL de entrada:', currentUrl);

        const url = new URL(currentUrl);
        const code = url.searchParams.get('code');

        if (code) {
          console.log('📡 Código PKCE detectado. Intercambiando por sesión...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('❌ [EXCHANGE_ERROR]:', exchangeError.message);
            throw exchangeError;
          }

          console.log('✅ [SESSION_READY]: Sesión autenticada para:', data.user?.email);
          navigate('/', { replace: true });
        } else {
          // Si no hay código, verificamos si ya existe una sesión activa (por persistencia)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('✅ [SESSION_FOUND]: Sesión persistente detectada.');
            navigate('/', { replace: true });
          } else {
            console.warn('⚠️ [NO_CODE_FOUND]: La URL no contenía código de intercambio.');
            setError('No se pudo encontrar un código de confirmación válido. El enlace puede haber expirado.');
          }
        }
      } catch (err: any) {
        console.error('❌ [CALLBACK_CRASH]:', err.message);
        setError(err.message || 'Fallo crítico al procesar la confirmación.');
      } finally {
        console.groupEnd();
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-12 shadow-2xl">
        {!error ? (
          <>
            <div className="size-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-4">Sincronizando</h1>
            <p className="text-slate-400 font-medium italic">Estableciendo conexión segura con Mediclinic Cloud...</p>
          </>
        ) : (
          <>
            <div className="size-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-5xl">error</span>
            </div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-4">Error de Acceso</h1>
            <p className="text-rose-500 font-bold mb-8 leading-relaxed">{error}</p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-lg"
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
