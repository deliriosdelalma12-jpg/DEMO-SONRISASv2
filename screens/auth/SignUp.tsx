
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
      
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            clinic_name: formData.clinicName.trim(),
            full_name: formData.fullName.trim()
          }
        }
      });

      if (authError) throw authError;

      if (data.user) {
        setMessage("¡Registro con éxito! Revisa tu correo para activar tu cuenta. No olvides revisar la carpeta de spam.");
      }
    } catch (e: any) {
      setError(e.message || "Fallo en el registro.");
    } finally {
      setLoading(false);
    }
  };

  if (message) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 animate-in zoom-in">
        <div className="w-full max-w-md bg-slate-900 border border-emerald-500/20 rounded-[2.5rem] p-12 text-center shadow-2xl">
          <div className="size-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
            <span className="material-symbols-outlined text-5xl">mark_email_read</span>
          </div>
          <h1 className="text-3xl font-display font-black text-white uppercase mb-4">Verifica tu email</h1>
          <p className="text-slate-400 font-medium mb-8 leading-relaxed">{message}</p>
          <button onClick={() => navigate('/login')} className="w-full h-14 bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest border border-white/5">Ir al Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 size-[500px] bg-primary/20 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3"></div>
      <div className="w-full max-w-xl bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative z-10 animate-in slide-in-from-bottom-8">
        <div className="mb-10">
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Clínica</label>
              <input type="text" required value={formData.clinicName} onChange={e => setFormData({...formData, clinicName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tu Nombre</label>
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
            {loading ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Activar mi Clínica'}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500 text-xs font-medium">¿Ya eres miembro? <Link to="/login" className="text-primary font-black hover:underline">Inicia sesión</Link></p>
      </div>
    </div>
  );
};

export default SignUp;
