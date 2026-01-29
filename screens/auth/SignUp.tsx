
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    clinicName: '',
    fullName: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      console.info("[SIGNUP_ATTEMPT]", { email: formData.email, redirectTo });

      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            clinic_name: formData.clinicName.trim(),
            full_name: formData.fullName.trim(),
            phone: formData.phone.trim()
          }
        }
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        setMessage("¡Registro con éxito! Revisa tu correo para confirmar tu cuenta. Si no lo recibes, revisa tu carpeta de spam.");
      } else {
        setError("El servidor no pudo procesar la creación del usuario.");
      }
    } catch (e: any) {
      console.error("[SIGNUP_FATAL]", e);
      setError("Fallo crítico de conexión al servidor de autenticación.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.resend({ 
      type: 'signup', 
      email: formData.email, 
      options: { emailRedirectTo: redirectTo } 
    });
    setLoading(false);
    if (error) setError(error.message);
    else setMessage("Enlace de verificación reenviado.");
  };

  if (message) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 animate-in fade-in zoom-in">
        <div className="w-full max-w-md bg-slate-900 border border-emerald-500/20 rounded-[2.5rem] p-12 text-center shadow-2xl">
          <div className="size-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
            <span className="material-symbols-outlined text-5xl">mark_email_read</span>
          </div>
          <h1 className="text-3xl font-display font-black text-white uppercase tracking-tighter mb-4">Verifica tu email</h1>
          <p className="text-slate-400 font-medium leading-relaxed mb-8">{message}</p>
          <div className="space-y-4">
            <button onClick={() => navigate('/login')} className="w-full h-14 bg-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/20 transition-all border border-white/5">Ir al Login</button>
            <button onClick={handleResend} disabled={loading} className="w-full text-primary font-bold text-xs uppercase hover:underline">Reenviar correo de verificación</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 size-[500px] bg-primary/20 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3"></div>
      <div className="w-full max-w-xl bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative z-10 animate-in slide-in-from-bottom-8">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-display font-black text-white uppercase tracking-tighter">Crear mi Clínica</h1>
          <p className="text-slate-400 text-sm mt-2 font-medium italic">Acceso inmediato a Mediclinic Cloud</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre de la Clínica</label>
              <input type="text" required value={formData.clinicName} onChange={e => setFormData({...formData, clinicName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tu Nombre Completo</label>
              <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Profesional</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
              <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirmar</label>
              <input type="password" required value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
            {loading ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Crear mi Clínica'}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500 text-xs font-medium">¿Ya tienes cuenta? <Link to="/login" className="text-primary font-black hover:underline">Inicia sesión</Link></p>
      </div>
    </div>
  );
};

export default SignUp;
