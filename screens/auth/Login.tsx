
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) setInfo(location.state.message);
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard');
    });
  }, [location, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("email not confirmed")) {
          setError("Debes confirmar tu correo electrónico. Revisa tu bandeja de entrada o haz clic en reenviar.");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError("Error crítico de conexión.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) { setError("Introduce tu email para reenviar el enlace."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resend({ 
      type: 'signup', 
      email, 
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` } 
    });
    setLoading(false);
    if (error) setError(error.message);
    else setInfo("Enlace de verificación reenviado con éxito.");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 size-[500px] bg-primary/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="size-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="material-symbols-outlined text-white text-4xl font-bold">hospital</span>
          </div>
          <h1 className="text-3xl font-display font-black text-white uppercase tracking-tighter">MediClinic Cloud</h1>
          <p className="text-slate-400 text-sm mt-2 font-medium italic">Gestión Profesional Segura</p>
        </div>

        {info && <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-bold text-center">{info}</div>}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold text-center flex flex-col gap-2">
            <span>{error}</span>
            {error.includes("confirmar") && (
              <button onClick={handleResend} className="text-white underline text-[10px] font-black uppercase mt-1">Reenviar activación</button>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Profesional</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
          </div>
          
          <button type="submit" disabled={loading} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
            {loading ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Entrar al Sistema'}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500 text-xs font-medium">¿No tienes cuenta? <Link to="/signup" className="text-primary font-black hover:underline">Regístrate</Link></p>
      </div>
    </div>
  );
};

export default Login;
