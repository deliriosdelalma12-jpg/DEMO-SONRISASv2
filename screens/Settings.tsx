
import React, { useState, useEffect } from 'react';
import { ClinicSettings, User, Doctor, Patient, Branch } from '../types';
import SettingsCompany from './settings/SettingsCompany';
import SettingsVisual from './settings/SettingsVisual';
import SettingsAssistant from './settings/SettingsAssistant';
import SettingsImport from './settings/SettingsImport';

interface SettingsProps {
  settings: ClinicSettings;
  setSettings: React.Dispatch<React.SetStateAction<ClinicSettings>>;
  onToggleTheme: () => void;
  darkMode: boolean;
  systemUsers: User[];
  setSystemUsers: React.Dispatch<React.SetStateAction<User[]>>;
  doctors: Doctor[];
  setDoctors: React.Dispatch<React.SetStateAction<Doctor[]>>;
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  onOpenDoctor?: (doctorId: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, setSettings, onToggleTheme, darkMode, 
  systemUsers, setSystemUsers, doctors, setDoctors,
  patients, setPatients, branches, setBranches,
  onOpenDoctor 
}) => {
  const [activeTab, setActiveTab] = useState<'company' | 'visual' | 'assistant' | 'import'>('company');
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
  
  const [localSettings, setLocalSettings] = useState<ClinicSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleGlobalSave = () => {
    setSettings(localSettings);
    setShowSuccessMsg(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setShowSuccessMsg(false), 3000);
  };

  return (
    <div className="p-10 max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-500 pb-32">
      {showSuccessMsg && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
           <div className="bg-success text-white px-6 py-2 rounded-md shadow-lg flex items-center gap-3 font-bold uppercase tracking-widest text-[10px]">
              <span className="material-symbols-outlined text-sm">check_circle</span> Configuración Guardada
           </div>
        </div>
      )}

      <header className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Configuración del Sistema</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium italic text-base">Personaliza la identidad de tu marca y la inteligencia de tu asistente.</p>
          </div>
          <button onClick={handleGlobalSave} className="h-14 px-10 bg-primary text-white rounded-md font-black text-sm uppercase tracking-wider shadow-sm hover:bg-primary-dark transition-all flex items-center gap-3 shrink-0">
            <span className="material-symbols-outlined text-xl">save</span> Guardar Configuración Maestra
          </button>
        </div>
        <div className="flex flex-wrap bg-white dark:bg-bg-dark p-1 rounded-lg w-fit border border-slate-200 dark:border-slate-800">
           <button onClick={() => setActiveTab('company')} className={`px-6 py-2.5 rounded-md text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 ${activeTab === 'company' ? 'bg-slate-100 dark:bg-surface-dark text-primary' : 'text-slate-400 hover:text-slate-600'}`}><span className="material-symbols-outlined text-lg">business</span> Empresa</button>
           <button onClick={() => setActiveTab('visual')} className={`px-6 py-2.5 rounded-md text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 ${activeTab === 'visual' ? 'bg-slate-100 dark:bg-surface-dark text-primary' : 'text-slate-400 hover:text-slate-600'}`}><span className="material-symbols-outlined text-lg">palette</span> Visual</button>
           <button onClick={() => setActiveTab('assistant')} className={`px-6 py-2.5 rounded-md text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 ${activeTab === 'assistant' ? 'bg-slate-100 dark:bg-surface-dark text-primary' : 'text-slate-400 hover:text-slate-600'}`}><span className="material-symbols-outlined text-lg">psychology</span> Asistente IA</button>
           <button onClick={() => setActiveTab('import')} className={`px-6 py-2.5 rounded-md text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 ${activeTab === 'import' ? 'bg-slate-100 dark:bg-surface-dark text-primary' : 'text-slate-400 hover:text-slate-600'}`}><span className="material-symbols-outlined text-lg">upload_file</span> Importación</button>
        </div>
      </header>

      <div className="border border-border-light dark:border-border-dark rounded-xl bg-white dark:bg-surface-dark overflow-hidden">
        {activeTab === 'company' && (
            <SettingsCompany 
                settings={localSettings} 
                setSettings={setLocalSettings} 
                systemUsers={systemUsers} 
                setSystemUsers={setSystemUsers} 
                doctors={doctors} 
                setDoctors={setDoctors} 
                branches={branches} // Passed
                setBranches={setBranches} // Passed
            />
        )}
        {activeTab === 'visual' && <SettingsVisual settings={localSettings} setSettings={setLocalSettings} onToggleTheme={onToggleTheme} darkMode={darkMode} />}
        {activeTab === 'assistant' && <SettingsAssistant settings={localSettings} setSettings={setLocalSettings} />}
        {activeTab === 'import' && (
            <SettingsImport 
                patients={patients} setPatients={setPatients} 
                doctors={doctors} setDoctors={setDoctors} 
                branches={branches} setBranches={setBranches} 
            />
        )}
      </div>

      <footer className="flex justify-end pt-8">
         <button onClick={handleGlobalSave} className="h-14 px-10 bg-primary text-white rounded-md font-black text-sm uppercase tracking-wider shadow-sm hover:bg-primary-dark transition-all flex items-center gap-3">
            <span className="material-symbols-outlined text-xl">save</span> Guardar Configuración Maestra
         </button>
      </footer>
    </div>
  );
};

export default Settings;
