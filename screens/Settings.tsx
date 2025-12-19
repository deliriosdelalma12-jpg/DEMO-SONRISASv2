
import React, { useState, useRef } from 'react';
import { ClinicSettings, UserRole, User, ClinicService, FileAttachment, VoiceAccent } from '../types';
import { COLOR_TEMPLATES } from '../App';
import { generatePersonalityPrompt } from '../services/gemini';

interface SettingsProps {
  settings: ClinicSettings;
  setSettings: React.Dispatch<React.SetStateAction<ClinicSettings>>;
  onToggleTheme: () => void;
  darkMode: boolean;
  systemUsers: User[];
  setSystemUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const PERSONALITY_TAGS = {
  emocion: ['Empática', 'Alegre', 'Serena', 'Enérgica', 'Seria', 'Dulce'],
  estilo: ['Concisa', 'Detallista', 'Proactiva', 'Escucha Activa', 'Paciente'],
  relacion: ['Formal (Usted)', 'Cercana (Tú)', 'Protectora', 'Vendedora']
};

const Settings: React.FC<SettingsProps> = ({ settings, setSettings, onToggleTheme, darkMode, systemUsers, setSystemUsers }) => {
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
  const [isGeneratingPersonality, setIsGeneratingPersonality] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');

  const logoInputRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleGeneratePersonality = async () => {
    if (selectedTags.length === 0) {
      alert("Selecciona al menos una etiqueta.");
      return;
    }
    setIsGeneratingPersonality(true);
    try {
      const newPrompt = await generatePersonalityPrompt(selectedTags, settings.aiPhoneSettings.assistantName, settings.name);
      setSettings(prev => ({
        ...prev,
        aiPhoneSettings: { ...prev.aiPhoneSettings, systemPrompt: newPrompt }
      }));
      handleGlobalSave();
    } catch (e) {
      alert("Error al generar personalidad.");
    } finally {
      setIsGeneratingPersonality(false);
    }
  };

  const handleGlobalSave = () => {
    setShowSuccessMsg(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setShowSuccessMsg(false), 3000);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSettings(prev => ({ ...prev, logo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const addSpecialty = () => {
    if (!newSpecialty.trim() || settings.specialties.includes(newSpecialty.trim())) return;
    setSettings(prev => ({ ...prev, specialties: [...prev.specialties, newSpecialty.trim()] }));
    setNewSpecialty('');
  };

  const removeSpecialty = (spec: string) => {
    setSettings(prev => ({ ...prev, specialties: prev.specialties.filter(s => s !== spec) }));
  };

  const addService = () => {
    if (!newServiceName.trim() || !newServicePrice) return;
    const service: ClinicService = { id: 'S' + Math.floor(Math.random() * 10000), name: newServiceName.trim(), price: parseFloat(newServicePrice) };
    setSettings(prev => ({ ...prev, services: [...prev.services, service] }));
    setNewServiceName('');
    setNewServicePrice('');
  };

  const removeService = (id: string) => {
    setSettings(prev => ({ ...prev, services: prev.services.filter(s => s.id !== id) }));
  };

  const openKeySelector = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setSettings(prev => ({ ...prev, aiPhoneSettings: { ...prev.aiPhoneSettings, hasPaidKey: true } }));
    }
  };

  return (
    <div className="p-10 max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-500 pb-32">
      
      {showSuccessMsg && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
           <div className="bg-success text-white px-8 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase tracking-widest text-[10px]">
              <span className="material-symbols-outlined">check_circle</span>
              Cambios aplicados correctamente
           </div>
        </div>
      )}

      <header className="flex flex-col gap-2">
        <h1 className="text-5xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Configuración Global</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium italic text-lg">Control total de marca, infraestructura de IA y operaciones.</p>
      </header>

      <div className="grid grid-cols-1 gap-12">

        {/* 1. INFRAESTRUCTURA IA Y CRÉDITOS */}
        <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-primary/20 overflow-hidden shadow-2xl">
           <div className="p-8 border-b-2 border-primary/10 bg-primary/5 flex items-center justify-between">
             <div className="flex items-center gap-5">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined">api</span>
                </div>
                <div>
                   <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Infraestructura IA</h3>
                   <p className="text-[9px] font-black text-primary uppercase tracking-widest">Modelo de lenguaje y gestión de créditos</p>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-xl flex items-center gap-2 border ${settings.aiPhoneSettings.hasPaidKey ? 'bg-success/10 border-success text-success' : 'bg-warning/10 border-warning text-warning'}`}>
                   <span className="material-symbols-outlined text-sm">{settings.aiPhoneSettings.hasPaidKey ? 'verified' : 'error'}</span>
                   <span className="text-[10px] font-black uppercase tracking-widest">{settings.aiPhoneSettings.hasPaidKey ? 'API Key Vinculada' : 'Sin créditos/Key'}</span>
                </div>
                <button onClick={openKeySelector} className="px-6 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Cambiar Key</button>
             </div>
           </div>
           <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo de Gemini</label>
                 <select 
                    value={settings.aiPhoneSettings.model || 'gemini-2.5-flash-native-audio-preview-09-2025'}
                    onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, model: e.target.value}})}
                    className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer"
                 >
                    <option value="gemini-2.5-flash-native-audio-preview-09-2025">Gemini 2.5 Flash (Audio Nativo)</option>
                    <option value="gemini-3-flash-preview">Gemini 3 Flash (Velocidad Extrema)</option>
                    <option value="gemini-3-pro-preview">Gemini 3 Pro (Razonamiento Complejo)</option>
                 </select>
              </div>
              <div className="bg-slate-50 dark:bg-bg-dark/50 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center gap-6">
                 <span className="material-symbols-outlined text-4xl text-slate-300">info</span>
                 <p className="text-xs text-slate-500 leading-relaxed">
                   El uso de modelos avanzados requiere una <b>API Key de pago</b> desde Google AI Studio. Asegúrate de tener habilitada la facturación en tu proyecto de GCP para evitar interrupciones en la voz.
                 </p>
              </div>
           </div>
        </section>

        {/* 2. IDENTIDAD Y MARCA */}
        <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
           <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
             <div className="size-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                 <span className="material-symbols-outlined">branding_watermark</span>
             </div>
             <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Identidad y Marca</h3>
           </div>
           <div className="p-10 flex flex-col md:flex-row gap-12">
              <div className="flex flex-col items-center gap-4">
                 <div className="size-40 rounded-[2.5rem] bg-slate-50 dark:bg-bg-dark border-4 border-white dark:border-slate-800 shadow-xl flex items-center justify-center overflow-hidden p-6 group relative">
                    <img src={settings.logo} className="w-full h-full object-contain" alt="Logo" />
                    <button onClick={() => logoInputRef.current?.click()} className="absolute inset-0 bg-primary/80 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center font-black text-[10px] uppercase">Cambiar Logo</button>
                 </div>
                 <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoChange} accept="image/*" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre de la Clínica</label>
                    <input type="text" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10" />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Público</label>
                    <input type="text" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10" />
                 </div>
              </div>
           </div>
        </section>

        {/* 3. PERSONALIZACIÓN VISUAL (RESTAURADA) */}
        <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
           <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="size-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                    <span className="material-symbols-outlined">palette</span>
                </div>
                <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Personalización Visual</h3>
              </div>
              <div className="flex items-center gap-4 bg-slate-100 dark:bg-bg-dark p-1.5 rounded-2xl">
                 <button onClick={onToggleTheme} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${!darkMode ? 'bg-white text-primary shadow-md' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-sm">light_mode</span> Claro
                 </button>
                 <button onClick={onToggleTheme} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${darkMode ? 'bg-surface-dark text-primary shadow-md' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-sm">dark_mode</span> Oscuro
                 </button>
              </div>
           </div>
           <div className="p-10 space-y-8">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paleta de Colores de Marca</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                 {COLOR_TEMPLATES.map(template => (
                   <button 
                      key={template.id}
                      onClick={() => setSettings({...settings, colorTemplate: template.id})}
                      className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-3 ${settings.colorTemplate === template.id ? 'border-primary bg-primary/5' : 'border-transparent bg-slate-50 dark:bg-bg-dark hover:border-slate-200'}`}
                   >
                      <div className="size-12 rounded-full shadow-inner" style={{ backgroundColor: template.primary }}></div>
                      <span className="text-[10px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-300">{template.name}</span>
                   </button>
                 ))}
              </div>
           </div>
        </section>

        {/* 4. ASISTENTE IA (VOZ Y PERSONALIDAD) */}
        <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
           <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center">
                    <span className="material-symbols-outlined">record_voice_over</span>
                </div>
                <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Asistente IA de Voz</h3>
              </div>
           </div>
           
           <div className="p-10 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                 {/* Acentos */}
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acento Regional</label>
                    <div className="grid grid-cols-1 gap-2">
                       {[
                         {id:'es-ES-Madrid', l:'España (Madrid)', i:'🇪🇸'},
                         {id:'es-ES-Canarias', l:'España (Canarias)', i:'🇮🇨'},
                         {id:'es-LATAM', l:'Latinoamérica', i:'🌎'},
                         {id:'en-GB', l:'Reino Unido (UK)', i:'🇬🇧'},
                         {id:'en-US', l:'Estados Unidos (US)', i:'🇺🇸'}
                       ].map(a => (
                         <button 
                           key={a.id}
                           onClick={() => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, accent: a.id as VoiceAccent}})}
                           className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase text-left transition-all border-2 flex items-center gap-3 ${settings.aiPhoneSettings.accent === a.id ? 'bg-primary text-white border-primary shadow-md' : 'bg-slate-50 dark:bg-bg-dark text-slate-400 border-transparent hover:border-primary/20'}`}
                         >
                            <span>{a.i}</span> {a.l}
                         </button>
                       ))}
                    </div>
                 </div>

                 {/* Velocidad y Tono */}
                 <div className="space-y-10 md:col-span-2 bg-slate-50 dark:bg-bg-dark/50 p-10 rounded-[2.5rem]">
                    <div className="space-y-6">
                       <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-primary uppercase tracking-widest">Velocidad de Habla (WPM)</label>
                          <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg text-xs font-black shadow-sm">{settings.aiPhoneSettings.voiceSpeed}x</span>
                       </div>
                       <input 
                         type="range" min="0.5" max="2.0" step="0.1" 
                         value={settings.aiPhoneSettings.voiceSpeed}
                         onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, voiceSpeed: parseFloat(e.target.value)}})}
                         className="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary" 
                       />
                       <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Lento</span><span>Dinámico</span><span>Rápido (Pro)</span>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-primary uppercase tracking-widest">Tono Emocional (Pitch)</label>
                          <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg text-xs font-black shadow-sm">{settings.aiPhoneSettings.voicePitch}</span>
                       </div>
                       <input 
                         type="range" min="0.5" max="1.5" step="0.1" 
                         value={settings.aiPhoneSettings.voicePitch}
                         onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, voicePitch: parseFloat(e.target.value)}})}
                         className="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary" 
                       />
                    </div>
                 </div>
              </div>

              {/* Personalidad */}
              <div className="space-y-8 border-t pt-10">
                 <div className="flex items-center justify-between">
                    <div>
                       <h4 className="text-xl font-display font-black uppercase text-slate-900 dark:text-white">Personalidad Humana</h4>
                       <p className="text-[9px] font-black text-primary uppercase mt-1 tracking-widest">Selecciona etiquetas para re-entrenar la personalidad</p>
                    </div>
                    <button 
                       onClick={handleGeneratePersonality}
                       disabled={isGeneratingPersonality}
                       className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-3 disabled:opacity-50"
                    >
                       {isGeneratingPersonality ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">auto_awesome</span>}
                       {isGeneratingPersonality ? 'Entrenando...' : 'Generar Prompt Maestro'}
                    </button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {Object.values(PERSONALITY_TAGS).flat().map(tag => (
                      <button 
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase border-2 transition-all ${selectedTags.includes(tag) ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-400'}`}
                      >
                         {tag}
                      </button>
                    ))}
                 </div>
                 <textarea 
                    value={settings.aiPhoneSettings.systemPrompt}
                    onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, systemPrompt: e.target.value}})}
                    className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-[2.5rem] px-10 py-8 text-sm font-medium h-48 focus:ring-4 focus:ring-primary/10"
                    placeholder="Instrucciones maestras..."
                 />
              </div>
           </div>
        </section>

      </div>

      <footer className="flex justify-end pt-12">
         <button onClick={handleGlobalSave} className="h-20 px-16 bg-primary text-white rounded-[2.5rem] font-black text-xl uppercase tracking-tighter shadow-2xl hover:scale-105 transition-all flex items-center gap-4">
            <span className="material-symbols-outlined text-3xl">save</span>
            Guardar Configuración
         </button>
      </footer>
    </div>
  );
};

export default Settings;
