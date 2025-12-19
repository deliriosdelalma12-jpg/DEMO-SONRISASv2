
import React, { useState, useRef } from 'react';
import { ClinicSettings, User, ClinicService, FileAttachment, VoiceAccent, AppLanguage } from '../types';
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

const Settings: React.FC<SettingsProps> = ({ settings, setSettings, onToggleTheme, darkMode }) => {
  const [activeTab, setActiveTab] = useState<'company' | 'assistant'>('company');
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
  const [isGeneratingPersonality, setIsGeneratingPersonality] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const knowledgeInputRef = useRef<HTMLInputElement>(null);

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

  const handleKnowledgeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newFile: FileAttachment = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
        size: (file.size / 1024).toFixed(0) + " KB",
        date: new Date().toISOString().split('T')[0]
      };
      setSettings(prev => ({
        ...prev,
        aiPhoneSettings: {
          ...prev.aiPhoneSettings,
          knowledgeFiles: [...(prev.aiPhoneSettings.knowledgeFiles || []), newFile]
        }
      }));
    }
  };

  const addService = () => {
    if (!newServiceName.trim() || !newServicePrice) return;
    const service: ClinicService = { 
      id: 'S' + Math.floor(Math.random() * 10000), 
      name: newServiceName.trim(), 
      price: parseFloat(newServicePrice) 
    };
    setSettings(prev => ({ ...prev, services: [...prev.services, service] }));
    setNewServiceName('');
    setNewServicePrice('');
  };

  const removeService = (id: string) => {
    setSettings(prev => ({ ...prev, services: prev.services.filter(s => s.id !== id) }));
  };

  return (
    <div className="p-10 max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-500 pb-32">
      
      {showSuccessMsg && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
           <div className="bg-success text-white px-8 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase tracking-widest text-[10px]">
              <span className="material-symbols-outlined">check_circle</span>
              Cambios guardados correctamente
           </div>
        </div>
      )}

      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Panel de Gestión Integral</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium italic text-lg">Configura la identidad de tu marca y la inteligencia de tu asistente.</p>
        </div>

        {/* NAVEGACIÓN DE PESTAÑAS */}
        <div className="flex bg-slate-100 dark:bg-bg-dark p-2 rounded-[2.5rem] w-fit border border-slate-200 dark:border-slate-800 shadow-inner">
           <button 
             onClick={() => setActiveTab('company')}
             className={`px-10 py-4 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeTab === 'company' ? 'bg-white dark:bg-surface-dark text-primary shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}
           >
              <span className="material-symbols-outlined">business</span> Configuración Empresa
           </button>
           <button 
             onClick={() => setActiveTab('assistant')}
             className={`px-10 py-4 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeTab === 'assistant' ? 'bg-white dark:bg-surface-dark text-primary shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}
           >
              <span className="material-symbols-outlined">psychology</span> Configuración Asistente
           </button>
        </div>
      </header>

      {activeTab === 'company' && (
        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-left-4 duration-500">
          
          {/* SECCIÓN DATOS EMPRESA */}
          <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
              <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center">
                <span className="material-symbols-outlined">info</span>
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Identidad y Datos de Empresa</h3>
            </div>
            <div className="p-10 flex flex-col md:flex-row gap-12">
               <div className="flex flex-col items-center gap-4">
                  <div className="size-44 rounded-[3rem] bg-slate-50 dark:bg-bg-dark border-4 border-white dark:border-slate-800 shadow-xl flex items-center justify-center overflow-hidden p-6 group relative">
                    <img src={settings.logo} className="w-full h-full object-contain" alt="Logo" />
                    <button onClick={() => logoInputRef.current?.click()} className="absolute inset-0 bg-primary/80 text-white opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2 font-black text-[10px] uppercase">
                       <span className="material-symbols-outlined">photo_camera</span> Cambiar Logo
                    </button>
                  </div>
                  <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoChange} accept="image/*" />
               </div>
               <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                    <input type="text" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Divisa Principal</label>
                    <select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary">
                       <option value="€">Euro (€)</option>
                       <option value="$">Dólar ($)</option>
                       <option value="£">Libra (£)</option>
                       <option value="MXN$">Peso Mexicano (MXN$)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idioma Aplicación (Frontend)</label>
                    <select value={settings.language} onChange={e => setSettings({...settings, language: e.target.value as any})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary">
                       <option value="es-ES">Español (España)</option>
                       <option value="es-LATAM">Español (Latinoamérica)</option>
                       <option value="en-GB">English (United Kingdom)</option>
                       <option value="en-US">English (United States)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email de Contacto</label>
                    <input type="text" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary" />
                  </div>
               </div>
            </div>
          </section>

          {/* CATÁLOGO DE SERVICIOS */}
          <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
              <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center">
                <span className="material-symbols-outlined">medical_services</span>
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Catálogo de Servicios y Precios</h3>
            </div>
            <div className="p-10 space-y-8">
               <div className="flex gap-4">
                  <input 
                    type="text" placeholder="Nombre del servicio" 
                    value={newServiceName} onChange={e => setNewServiceName(e.target.value)}
                    className="flex-1 bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold"
                  />
                  <div className="relative">
                    <input 
                      type="number" placeholder="Precio" 
                      value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)}
                      className="w-40 bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold pr-12"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-400">{settings.currency}</span>
                  </div>
                  <button onClick={addService} className="px-10 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Añadir</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {settings.services.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-bg-dark rounded-3xl border border-slate-200 dark:border-slate-800 group hover:border-primary transition-all">
                       <div className="min-w-0">
                          <p className="font-black text-sm truncate uppercase tracking-tight text-slate-800 dark:text-white">{s.name}</p>
                          <p className="text-[10px] font-black text-primary mt-1">{s.price} {settings.currency}</p>
                       </div>
                       <button onClick={() => removeService(s.id)} className="text-danger hover:scale-125 transition-transform"><span className="material-symbols-outlined">delete</span></button>
                    </div>
                  ))}
               </div>
            </div>
          </section>

          {/* PERSONALIZACIÓN VISUAL */}
          <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
             <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                   <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center">
                      <span className="material-symbols-outlined">palette</span>
                   </div>
                   <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Personalización Visual</h3>
                </div>
                <button onClick={onToggleTheme} className="px-6 py-3 bg-slate-100 dark:bg-bg-dark rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                   <span className="material-symbols-outlined text-sm">{darkMode ? 'light_mode' : 'dark_mode'}</span> Cambiar Tema
                </button>
             </div>
             <div className="p-10 space-y-6">
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
        </div>
      )}

      {activeTab === 'assistant' && (
        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
           
           {/* CEREBRO IA */}
           <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-primary/20 overflow-hidden shadow-2xl">
              <div className="p-8 border-b-2 border-primary/10 bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined">api</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Cerebro IA (Gestión de Voz)</h3>
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">Infraestructura de razonamiento y conocimiento</p>
                  </div>
                </div>
              </div>
              <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo de Lenguaje</label>
                    <select 
                       value={settings.aiPhoneSettings.model}
                       onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, model: e.target.value}})}
                       className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold"
                    >
                       <option value="gemini-2.5-flash-native-audio-preview-09-2025">Gemini 2.5 Flash (Voz Nativa)</option>
                       <option value="gemini-3-pro-preview">Gemini 3 Pro (Razonamiento Crítico)</option>
                    </select>
                 </div>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base de Conocimientos PDF</label>
                       <button onClick={() => knowledgeInputRef.current?.click()} className="text-[10px] font-black text-primary uppercase hover:underline">Subir PDF</button>
                    </div>
                    <input type="file" ref={knowledgeInputRef} className="hidden" onChange={handleKnowledgeFileChange} accept=".pdf,.txt" />
                    <div className="flex flex-wrap gap-2">
                       {settings.aiPhoneSettings.knowledgeFiles?.map(f => (
                         <div key={f.id} className="px-4 py-2 bg-slate-100 dark:bg-bg-dark rounded-xl flex items-center gap-2 text-[10px] font-bold border border-slate-200 dark:border-slate-800">
                           <span className="material-symbols-outlined text-sm text-primary">description</span> {f.name}
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </section>

           {/* PERSONALIDAD, VOZ Y MOTOR */}
           <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
              <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center">
                  <span className="material-symbols-outlined">record_voice_over</span>
                </div>
                <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Voz e Inteligencia Emocional</h3>
              </div>
              
              <div className="p-10 space-y-12">
                 {/* Ajustes de Voz */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Perfil de Voz (Género)</label>
                       <select value={settings.aiPhoneSettings.voiceName} onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, voiceName: e.target.value}})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold">
                          <option value="Zephyr">Zephyr (Femenina - Neutra)</option>
                          <option value="Kore">Kore (Femenina - Cálida)</option>
                          <option value="Puck">Puck (Masculina - Juvenil)</option>
                          <option value="Charon">Charon (Masculina - Autoritaria)</option>
                       </select>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acento y Dialecto</label>
                       <select value={settings.aiPhoneSettings.accent} onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, accent: e.target.value as VoiceAccent}})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold">
                          <option value="es-ES-Madrid">Español (España - Central)</option>
                          <option value="es-ES-Canarias">Español (Islas Canarias)</option>
                          <option value="es-LATAM">Español (Latinoamérica)</option>
                          <option value="en-GB">Inglés (Reino Unido)</option>
                          <option value="en-US">Inglés (EE.UU.)</option>
                       </select>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Asistente</label>
                       <input type="text" value={settings.aiPhoneSettings.assistantName} onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, assistantName: e.target.value}})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" />
                    </div>
                 </div>

                 {/* Motor de Personalidad y Parámetros */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-10 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-10">
                       <div className="space-y-6">
                          <div className="flex items-center justify-between">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest tracking-widest">Temperatura Creativa (Modelo)</label>
                             <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full">{settings.aiPhoneSettings.temperature}</span>
                          </div>
                          <input 
                            type="range" min="0" max="1" step="0.1" 
                            value={settings.aiPhoneSettings.temperature}
                            onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, temperature: parseFloat(e.target.value)}})}
                            className="w-full h-2 bg-slate-200 dark:bg-bg-dark rounded-lg appearance-none cursor-pointer accent-primary" 
                          />
                          <p className="text-[9px] text-slate-400 italic">Valores bajos: más preciso y serio. Valores altos: más creativo y humano.</p>
                       </div>

                       <div className="space-y-6">
                          <div className="flex items-center justify-between">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest tracking-widest">Velocidad de Habla</label>
                             <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full">{settings.aiPhoneSettings.voiceSpeed}x</span>
                          </div>
                          <input 
                            type="range" min="0.5" max="2.0" step="0.1" 
                            value={settings.aiPhoneSettings.voiceSpeed}
                            onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, voiceSpeed: parseFloat(e.target.value)}})}
                            className="w-full h-2 bg-slate-200 dark:bg-bg-dark rounded-lg appearance-none cursor-pointer accent-primary" 
                          />
                          <p className="text-[9px] text-slate-400 italic">Controla la rapidez con la que el asistente responde verbalmente.</p>
                       </div>
                    </div>

                    <div className="space-y-8 bg-slate-50 dark:bg-bg-dark p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-inner">
                       <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generador de Personalidad</label>
                          <button onClick={handleGeneratePersonality} disabled={isGeneratingPersonality} className="px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105">
                             {isGeneratingPersonality ? 'Entrenando...' : 'Re-Generar Perfil'}
                          </button>
                       </div>
                       <div className="flex flex-wrap gap-2">
                          {Object.values(PERSONALITY_TAGS).flat().map(tag => (
                            <button key={tag} onClick={() => toggleTag(tag)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border-2 transition-all ${selectedTags.includes(tag) ? 'bg-primary/10 border-primary text-primary' : 'bg-white dark:bg-surface-dark border-transparent text-slate-400'}`}>
                               {tag}
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>

                 {/* SYSTEM PROMPT */}
                 <div className="space-y-4 pt-10 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                       <h4 className="text-xl font-display font-black uppercase tracking-tight text-slate-900 dark:text-white">Instrucciones Maestras (System Prompt)</h4>
                       <span className="px-3 py-1 bg-slate-100 dark:bg-bg-dark text-slate-400 rounded-lg text-[9px] font-black uppercase">Cerebro de Negocio</span>
                    </div>
                    <textarea 
                       value={settings.aiPhoneSettings.systemPrompt}
                       onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, systemPrompt: e.target.value})}
                       className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-[2.5rem] px-10 py-8 text-sm font-medium h-80 focus:ring-4 focus:ring-primary/10 outline-none leading-relaxed shadow-inner"
                       placeholder="Escribe aquí las directrices lógicas y operativas del asistente..."
                    />
                 </div>
              </div>
           </section>
        </div>
      )}

      <footer className="flex justify-end pt-12">
         <button onClick={handleGlobalSave} className="h-20 px-16 bg-primary text-white rounded-[2.5rem] font-black text-xl uppercase tracking-tighter shadow-2xl hover:scale-105 transition-all flex items-center gap-4">
            <span className="material-symbols-outlined text-3xl">save</span>
            Guardar Configuración Maestra
         </button>
      </footer>
    </div>
  );
};

export default Settings;
