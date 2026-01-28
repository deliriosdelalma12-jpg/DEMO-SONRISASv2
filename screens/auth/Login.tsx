
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) setInfo(location.state.message);
    
    // Si ya hay sesión, no deberíamos estar aquí
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/', { replace: true });
    });
  }, [location, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    // Safety timeout (15s)
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('El servidor tarda demasiado en responder. Revisa tu conexión.');
      }
    }, 15000);

    console.group('🔑 LOGIN_ATTEMPT');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      clearTimeout(timer);

      if (authError) {
        console.warn('❌ LOGIN_FAILED:', authError.message);
        if (authError.message.toLowerCase().includes('email not confirmed')) {
          setError('Debes confirmar tu correo antes de iniciar sesión.');
        } else if (authError.message.toLowerCase().includes('invalid login credentials')) {
          setError('Credenciales inválidas. Revisa tu email y contraseña.');
        } else {
          setError(authError.message);
        }
        setLoading(false);
      } else if (data.session) {
        console.log('✅ LOGIN_SUCCESS');
        navigate('/', { replace: true });
      }
    } catch (err) {
      clearTimeout(timer);
      console.error('🔥 LOGIN_CRASH:', err);
      setError('Error crítico de conexión.');
      setLoading(false);
    } finally {
      console.groupEnd();
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Introduce tu email para reenviar el enlace.');
      return;
    }
    setResending(true);
    setError('');
    
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: 'https://demo-sonrisasv2-production.up.railway.app/auth/callback'
        }
      });
      
      if (resendError) throw resendError;
      setInfo('Enlace de verificación reenviado. Revisa tu bandeja de entrada.');
    } catch (err: any) {
      setError(`Error al reenviar: ${err.message}`);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 size-[500px] bg-primary/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="size-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white text-4xl font-bold">hospital</span>
          </div>
          <h1 className="text-3xl font-display font-black text-white uppercase tracking-tighter">Mediclinic Cloud</h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">Panel de Gestión Médica Unificado</p>
        </div>

        {info && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-bold text-center animate-in fade-in slide-in-from-top-2">
            {info}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold text-center animate-in shake duration-500">
            {error}
            {error.includes('confirmar') && (
              <button 
                onClick={handleResend}
                disabled={resending}
                className="block mx-auto mt-3 text-primary hover:underline uppercase text-[9px] font-black tracking-[0.2em] border border-primary/20 px-3 py-1.5 rounded-lg bg-primary/5"
              >
                {resending ? 'Enviando...' : 'Reenviar enlace de confirmación'}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
            <input 
              type="email" required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-50"
              placeholder="ejemplo@clinicacloud.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
            <input 
              type="password" required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" disabled={loading}
            className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Iniciando...
              </>
            ) : 'Entrar al Sistema'}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500 text-xs font-medium">
          ¿No tienes cuenta? <Link to="/signup" className="text-primary font-black hover:underline">Regístrate gratis</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
