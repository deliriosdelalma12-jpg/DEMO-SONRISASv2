
import React, { useState } from 'react';
import { ClinicSettings } from '../../types';

interface SettingsAiCoreProps {
  settings: ClinicSettings;
  setSettings: React.Dispatch<React.SetStateAction<ClinicSettings>>;
}

const SettingsAiCore: React.FC<SettingsAiCoreProps> = ({ settings, setSettings }) => {
  const [showTools, setShowTools] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-right-4 duration-500 p-10">
      <section className="bg-slate-900 text-white rounded-[3.5rem] border-2 border-primary/30 overflow-hidden shadow-2xl relative">
        <div className="p-12 relative z-10 space-y-10">
           <div className="flex items-center gap-8">
              <div className="size-20 rounded-3xl bg-primary text-white flex items-center justify-center">
                 <span className="material-symbols-outlined text-5xl">cognition</span>
              </div>
              <div>
                 <h3 className="text-3xl font-display font-black uppercase tracking-tighter">AI Agent Master Core</h3>
                 <p className="text-xs font-bold text-primary uppercase tracking-[0.4em] mt-2">Versión {settings.aiPhoneSettings.core_version}</p>
              </div>
           </div>
        </div>
      </section>

      <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
        <div className="p-8 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
           <div className="flex items-center gap-5">
              <span className="material-symbols-outlined text-3xl text-indigo-500">description</span>
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">System Prompt Master</h3>
           </div>
        </div>
        <div className="p-10">
           <div className="bg-slate-900 text-emerald-400 p-10 rounded-[2.5rem] font-mono text-sm leading-relaxed overflow-x-auto max-h-[500px] overflow-y-auto">
              <p className="text-slate-500 mb-6 font-bold uppercase tracking-widest text-[10px]"># AGENT CORE SYSTEM PROMPT</p>
              <p>{settings.aiPhoneSettings.systemPrompt}</p>
           </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsAiCore;
