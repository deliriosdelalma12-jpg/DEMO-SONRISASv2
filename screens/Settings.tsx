
import React from 'react';
import { ClinicSettings } from '../types';

interface SettingsProps {
  settings: ClinicSettings;
  setSettings: React.Dispatch<React.SetStateAction<ClinicSettings>>;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-10 max-w-[1000px] mx-auto space-y-10">
      <div>
        <h1 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Configuración Global</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Personaliza la identidad corporativa y parámetros del sistema.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <section className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark overflow-hidden shadow-xl">
           <div className="p-8 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50">
             <h3 className="text-xl font-bold text-slate-900 dark:text-white">Identidad de la Clínica</h3>
           </div>
           <div className="p-8 space-y-8">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                 <div className="relative group">
                    <div className="size-32 rounded-3xl bg-slate-100 dark:bg-bg-dark border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                       {settings.logo ? <img src={settings.logo} className="w-full h-full object-contain" alt="Logo" /> : <span className="material-symbols-outlined text-4xl text-slate-300">image</span>}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-3xl">
                       <span className="material-symbols-outlined text-white">upload</span>
                       <input type="file" onChange={handleLogoChange} className="hidden" accept="image/*" />
                    </label>
                 </div>
                 <div className="flex-1 space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Logotipo Corporativo</p>
                    <p className="text-xs text-slate-500 leading-relaxed italic">Este logo se utilizará en las cabeceras de todos los informes médicos generados por la IA, facturas y comunicaciones oficiales.</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border-light dark:border-border-dark">
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Nombre de la Clínica</label>
                    <input type="text" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Email Central</label>
                    <input type="email" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold" />
                 </div>
                 <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Dirección Fiscal</label>
                    <input type="text" value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold" />
                 </div>
              </div>
           </div>
        </section>

        <section className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark overflow-hidden shadow-xl p-8">
           <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Configuración de Privacidad IA</h3>
           <div className="p-6 bg-primary/5 rounded-2xl border border-primary/20 space-y-4">
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Blindaje de Datos de Pacientes</p>
                    <p className="text-xs text-slate-500 mt-1">Garantiza que el contexto de la IA se limpie tras cada consulta individual.</p>
                 </div>
                 <div className="size-12 bg-success/20 text-success rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">verified_user</span></div>
              </div>
           </div>
        </section>
      </div>

      <div className="flex justify-end gap-4 pt-6">
         <button className="px-10 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-all">Guardar Cambios</button>
      </div>
    </div>
  );
};

export default Settings;
