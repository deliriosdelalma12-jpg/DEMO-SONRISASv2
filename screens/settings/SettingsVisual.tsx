
import React from 'react';
import { ClinicSettings } from '../../types';
import { COLOR_TEMPLATES } from '../../App';

interface SettingsVisualProps {
  settings: ClinicSettings;
  setSettings: React.Dispatch<React.SetStateAction<ClinicSettings>>;
  onToggleTheme: () => void;
  darkMode: boolean;
}

const SettingsVisual: React.FC<SettingsVisualProps> = ({ settings, setSettings, onToggleTheme, darkMode }) => {
  const updateLabel = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, labels: { ...prev.labels, [key]: value } }));
  };

  return (
    <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
       <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
          <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center"><span className="material-symbols-outlined">palette</span></div>
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Temas y Paleta de Colores</h3>
            </div>
            <button onClick={onToggleTheme} className="px-6 py-2.5 bg-slate-100 dark:bg-bg-dark rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary hover:text-white transition-all shadow-sm">
              <span className="material-symbols-outlined text-lg">{darkMode ? 'light_mode' : 'dark_mode'}</span> Pasar a modo {darkMode ? 'Claro' : 'Oscuro'}
            </button>
          </div>
          <div className="p-10 space-y-10">
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {COLOR_TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setSettings({...settings, colorTemplate: t.id})} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-4 group ${settings.colorTemplate === t.id ? 'border-primary bg-primary/5 shadow-xl scale-105' : 'border-transparent bg-slate-50 dark:bg-bg-dark hover:border-slate-200'}`}>
                     <div className="size-12 rounded-full shadow-lg transition-transform group-hover:scale-110" style={{backgroundColor: t.primary}}></div>
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t.name}</span>
                  </button>
                ))}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-6">
                   <div className="flex justify-between items-center"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tamaño Fuente Títulos</label><span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-black">{settings.visuals.titleFontSize}px</span></div>
                   <input type="range" min="20" max="64" value={settings.visuals.titleFontSize} onChange={e => setSettings({...settings, visuals: {...settings.visuals, titleFontSize: parseInt(e.target.value)}})} className="w-full h-2 bg-slate-200 dark:bg-bg-dark rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>
                <div className="space-y-6">
                   <div className="flex justify-between items-center"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tamaño Fuente Cuerpo</label><span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-black">{settings.visuals.bodyFontSize}px</span></div>
                   <input type="range" min="12" max="24" value={settings.visuals.bodyFontSize} onChange={e => setSettings({...settings, visuals: {...settings.visuals, bodyFontSize: parseInt(e.target.value)}})} className="w-full h-2 bg-slate-200 dark:bg-bg-dark rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>
             </div>
          </div>
       </section>
       <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
          <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
            <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center"><span className="material-symbols-outlined">edit_note</span></div>
            <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Etiquetas y Textos de la Web (White Label)</h3>
          </div>
          <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
             {Object.entries(settings.labels).map(([key, value]) => (
               <div key={key} className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                  <input type="text" value={value} onChange={e => updateLabel(key, e.target.value)} className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all" />
               </div>
             ))}
          </div>
       </section>
    </div>
  );
};

export default SettingsVisual;
