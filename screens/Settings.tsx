
import React, { useState, useRef } from 'react';
import { ClinicSettings, User, ClinicService, FileAttachment, VoiceAccent, AppLanguage, AppLabels } from '../types';
import { COLOR_TEMPLATES } from '../App';
import { generatePersonalityPrompt, speakText } from '../services/gemini';

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

const VOICE_OPTIONS = [
  { id: 'Zephyr', name: 'Zephyr', gender: 'Femenino', desc: 'Clara y profesional' },
  { id: 'Kore', name: 'Kore', gender: 'Femenino', desc: 'Dulce y cercana' },
  { id: 'Puck', name: 'Puck', gender: 'Masculino', desc: 'Juvenil y enérgico' },
  { id: 'Charon', name: 'Charon', gender: 'Masculino', desc: 'Profunda y autoritaria' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Masculino', desc: 'Robusta y madura' },
];

const ACCENT_OPTIONS: { id: VoiceAccent; name: string }[] = [
  { id: 'es-ES-Madrid', name: 'Español (Madrid)' },
  { id: 'es-ES-Canarias', name: 'Español (Canarias)' },
  { id: 'es-LATAM', name: 'Español (Latinoamérica)' },
  { id: 'en-GB', name: 'English (British)' },
  { id: 'en-US', name: 'English (US)' },
];

const GREETING_PILLS = [
  "Hola, soy {name}, de {clinic}. ¿En qué te ayudo?",
  "Buenos días, habla {name}. ¿Quieres agendar una cita?",
  "Gracias por llamar a {clinic}, soy {name}. ¿Cómo puedo asistirte hoy?",
  "Central de {clinic}, habla {name}. Dígame."
];

const Settings: React.FC<SettingsProps> = ({ settings, setSettings, onToggleTheme, darkMode }) => {
  const [activeTab, setActiveTab] = useState<'company' | 'visual' | 'assistant'>('company');
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
  const [isGeneratingPersonality, setIsGeneratingPersonality] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');
  const [newServiceDuration, setNewServiceDuration] = useState<string>('30');

  const logoInputRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleTestVoice = async () => {
    const text = settings.aiPhoneSettings.testSpeechText || settings.aiPhoneSettings.initialGreeting;
    setIsTestingVoice(true);
    try {
      const base64 = await speakText(text, settings.aiPhoneSettings.voiceName);
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
      
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (e) {
      alert("Error al probar voz.");
    } finally {
      setIsTestingVoice(false);
    }
  };

  const handleGeneratePersonality = async () => {
    if (selectedTags.length === 0) {
      alert("Selecciona al menos una etiqueta de personalidad.");
      return;
    }
    setIsGeneratingPersonality(true);
    try {
      const newPrompt = await generatePersonalityPrompt(selectedTags, settings.aiPhoneSettings.assistantName, settings.name);
      setSettings(prev => ({
        ...prev,
        aiPhoneSettings: { ...prev.aiPhoneSettings, systemPrompt: newPrompt }
      }));
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

  const addService = () => {
    if (!newServiceName.trim() || !newServicePrice) return;
    const service: ClinicService = { 
      id: 'S' + Math.floor(Math.random() * 10000), 
      name: newServiceName.trim(), 
      price: parseFloat(newServicePrice),
      duration: parseInt(newServiceDuration) || 30
    };
    setSettings(prev => ({ ...prev, services: [...prev.services, service] }));
    setNewServiceName('');
    setNewServicePrice('');
  };

  const removeService = (id: string) => {
    setSettings(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id)
    }));
  };

  const updateLabel = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      labels: { ...prev.labels, [key]: value }
    }));
  };

  const useGreetingPill = (pill: string) => {
    const processed = pill
      .replace('{name}', settings.aiPhoneSettings.assistantName)
      .replace('{clinic}', settings.name);
    setSettings(prev => ({
      ...prev,
      aiPhoneSettings: { ...prev.aiPhoneSettings, initialGreeting: processed }
    }));
  };

  return (
    <div className="p-10 max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-500 pb-32">
      
      {showSuccessMsg && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
           <div className="bg-success text-white px-8 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase tracking-widest text-[10px]">
              <span className="material-symbols-outlined">check_circle</span>
              Configuración sincronizada correctamente
           </div>
        </div>
      )}

      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">
            Configuración del Sistema
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium italic text-lg">
            Personaliza la identidad de tu marca y la inteligencia de tu asistente.
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-bg-dark p-2 rounded-[2.5rem] w-fit border border-slate-200 dark:border-slate-800 shadow-inner overflow-x-auto max-w-full">
           <button 
             onClick={() => setActiveTab('company')}
             className={`px-10 py-4 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shrink-0 ${activeTab === 'company' ? 'bg-white dark:bg-surface-dark text-primary shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}
           >
              <span className="material-symbols-outlined text-lg">business</span> Empresa
           </button>
           <button 
             onClick={() => setActiveTab('visual')}
             className={`px-10 py-4 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shrink-0 ${activeTab === 'visual' ? 'bg-white dark:bg-surface-dark text-primary shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}
           >
              <span className="material-symbols-outlined text-lg">palette</span> Config. Visual
           </button>
           <button 
             onClick={() => setActiveTab('assistant')}
             className={`px-10 py-4 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shrink-0 ${activeTab === 'assistant' ? 'bg-white dark:bg-surface-dark text-primary shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}
           >
              <span className="material-symbols-outlined text-lg">psychology</span> Asistente IA
           </button>
        </div>
      </header>

      {activeTab === 'company' && (
        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-left-4 duration-500">
          
          <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
              <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center">
                <span className="material-symbols-outlined">info</span>
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Datos de Marca e Identidad</h3>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                 <input type="text" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Divisa</label>
                 <select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold">
                    <option value="€">Euro (€)</option>
                    <option value="$">Dólar ($)</option>
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idioma Web</label>
                 <select value={settings.language} onChange={e => setSettings({...settings, language: e.target.value as any})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold">
                    <option value="es-ES">Español (España)</option>
                    <option value="es-LATAM">Español (Latinoamérica)</option>
                    <option value="en-US">English (US)</option>
                 </select>
               </div>
               <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-bg-dark rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 group relative overflow-hidden">
                  {settings.logo ? <img src={settings.logo} className="h-12 w-auto object-contain mb-2" /> : <span className="material-symbols-outlined text-4xl text-slate-300">image</span>}
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logo Institucional</p>
                  <button onClick={() => logoInputRef.current?.click()} className="absolute inset-0 bg-primary/80 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center font-bold text-xs">Cambiar Logo</button>
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={e => {
                    const f = e.target.files?.[0];
                    if(f) {
                      const r = new FileReader();
                      r.onload = (re) => setSettings({...settings, logo: re.target?.result as string});
                      r.readAsDataURL(f);
                    }
                  }} />
               </div>
            </div>
          </section>

          <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
              <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center">
                <span className="material-symbols-outlined">medical_services</span>
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Catálogo de Servicios y Tiempos</h3>
            </div>
            <div className="p-10 space-y-8">
               <div className="flex gap-4 flex-wrap">
                  <input 
                    type="text" placeholder="Nombre del servicio" 
                    value={newServiceName} onChange={e => setNewServiceName(e.target.value)}
                    className="flex-1 min-w-[200px] bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold"
                  />
                  <div className="relative">
                    <input 
                      type="number" placeholder="Precio" 
                      value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)}
                      className="w-32 bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold pr-12"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-400">{settings.currency}</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" placeholder="Minutos" 
                      value={newServiceDuration} onChange={e => setNewServiceDuration(e.target.value)}
                      className="w-32 bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold pr-12"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-400 text-[10px]">MIN</span>
                  </div>
                  <button onClick={addService} className="px-10 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Añadir</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {settings.services.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-bg-dark rounded-3xl border border-slate-200 dark:border-slate-800 group hover:border-primary transition-all">
                       <div className="min-w-0">
                          <p className="font-black text-sm truncate uppercase tracking-tight text-slate-800 dark:text-white">{s.name}</p>
                          <p className="text-[10px] font-black text-primary mt-1">{s.price}{settings.currency} • {s.duration} min</p>
                       </div>
                       <button onClick={() => removeService(s.id)} className="text-danger hover:scale-125 transition-transform"><span className="material-symbols-outlined">delete</span></button>
                    </div>
                  ))}
               </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'visual' && (
        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
           
           {/* TEMAS Y COLORES */}
           <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
              <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center">
                    <span className="material-symbols-outlined">palette</span>
                  </div>
                  <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Temas y Paleta de Colores</h3>
                </div>
                <button 
                  onClick={onToggleTheme}
                  className="px-6 py-2.5 bg-slate-100 dark:bg-bg-dark rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary hover:text-white transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg">{darkMode ? 'light_mode' : 'dark_mode'}</span>
                  Pasar a modo {darkMode ? 'Claro' : 'Oscuro'}
                </button>
              </div>
              <div className="p-10 space-y-10">
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {COLOR_TEMPLATES.map(t => (
                      <button 
                        key={t.id} 
                        onClick={() => setSettings({...settings, colorTemplate: t.id})}
                        className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-4 group ${settings.colorTemplate === t.id ? 'border-primary bg-primary/5 shadow-xl scale-105' : 'border-transparent bg-slate-50 dark:bg-bg-dark hover:border-slate-200'}`}
                      >
                         <div className="size-12 rounded-full shadow-lg transition-transform group-hover:scale-110" style={{backgroundColor: t.primary}}></div>
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t.name}</span>
                      </button>
                    ))}
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-6">
                       <div className="flex justify-between items-center">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tamaño Fuente Títulos</label>
                          <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-black">{settings.visuals.titleFontSize}px</span>
                       </div>
                       <input 
                         type="range" min="20" max="64" 
                         value={settings.visuals.titleFontSize} 
                         onChange={e => setSettings({...settings, visuals: {...settings.visuals, titleFontSize: parseInt(e.target.value)}})}
                         className="w-full h-2 bg-slate-200 dark:bg-bg-dark rounded-lg appearance-none cursor-pointer accent-primary" 
                       />
                    </div>
                    <div className="space-y-6">
                       <div className="flex justify-between items-center">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tamaño Fuente Cuerpo</label>
                          <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-black">{settings.visuals.bodyFontSize}px</span>
                       </div>
                       <input 
                         type="range" min="12" max="24" 
                         value={settings.visuals.bodyFontSize} 
                         onChange={e => setSettings({...settings, visuals: {...settings.visuals, bodyFontSize: parseInt(e.target.value)}})}
                         className="w-full h-2 bg-slate-200 dark:bg-bg-dark rounded-lg appearance-none cursor-pointer accent-primary" 
                       />
                    </div>
                 </div>
              </div>
           </section>

           {/* PERSONALIZACIÓN DE TEXTOS (WHITE LABEL) */}
           <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
              <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center">
                  <span className="material-symbols-outlined">edit_note</span>
                </div>
                <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Etiquetas y Textos de la Web (White Label)</h3>
              </div>
              <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                 {Object.entries(settings.labels).map(([key, value]) => (
                   <div key={key} className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </label>
                      <input 
                        type="text" value={value} 
                        onChange={e => updateLabel(key, e.target.value)}
                        className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                      />
                   </div>
                 ))}
              </div>
           </section>
        </div>
      )}

      {activeTab === 'assistant' && (
        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
           
           {/* SELECCIÓN DE VOZ E IDIOMA */}
           <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
              <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center">
                  <span className="material-symbols-outlined">volume_up</span>
                </div>
                <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Selección de Voz e Idioma</h3>
              </div>
              <div className="p-10 space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acento y Región</label>
                       <div className="grid grid-cols-1 gap-3">
                          {ACCENT_OPTIONS.map(opt => (
                            <button 
                              key={opt.id}
                              onClick={() => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, accent: opt.id}})}
                              className={`flex items-center justify-between px-6 py-4 rounded-2xl border-2 transition-all ${settings.aiPhoneSettings.accent === opt.id ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-500'}`}
                            >
                               <span className="text-sm font-bold">{opt.name}</span>
                               {settings.aiPhoneSettings.accent === opt.id && <span className="material-symbols-outlined text-sm">check_circle</span>}
                            </button>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voz del Asistente</label>
                       <div className="grid grid-cols-1 gap-3">
                          {VOICE_OPTIONS.map(voice => (
                            <button 
                              key={voice.id}
                              onClick={() => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, voiceName: voice.id}})}
                              className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all ${settings.aiPhoneSettings.voiceName === voice.id ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-500'}`}
                            >
                               <div className={`size-10 rounded-xl flex items-center justify-center ${settings.aiPhoneSettings.voiceName === voice.id ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'}`}>
                                  <span className="material-symbols-outlined">{voice.gender === 'Femenino' ? 'female' : 'male'}</span>
                               </div>
                               <div className="text-left flex-1">
                                  <p className="text-sm font-bold">{voice.name} <span className="text-[9px] opacity-60 uppercase">({voice.gender})</span></p>
                                  <p className="text-[10px] italic opacity-60">{voice.desc}</p>
                               </div>
                               {settings.aiPhoneSettings.voiceName === voice.id && <span className="material-symbols-outlined text-sm">check_circle</span>}
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>
                 
                 <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/20 space-y-6">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Laboratorio de Pruebas</h4>
                       <button 
                         onClick={handleTestVoice} 
                         disabled={isTestingVoice}
                         className="px-6 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                       >
                          {isTestingVoice ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">play_circle</span>}
                          Escuchar Prueba
                       </button>
                    </div>
                    <textarea 
                      value={settings.aiPhoneSettings.testSpeechText}
                      onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, testSpeechText: e.target.value}})}
                      className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-medium h-24 shadow-inner resize-none"
                      placeholder="Escribe lo que quieres que el asistente diga para probar su voz..."
                    />
                 </div>
              </div>
           </section>

           {/* PERSONALIDAD CON PÍLDORAS */}
           <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
              <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined">auto_awesome</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Cerebro y Personalidad</h3>
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">Genera instrucciones avanzadas con IA</p>
                  </div>
                </div>
                <button 
                  onClick={handleGeneratePersonality}
                  disabled={isGeneratingPersonality}
                  className="px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-3"
                >
                  {isGeneratingPersonality ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">magic_button</span>}
                  Generar con Píldoras
                </button>
              </div>
              <div className="p-10 space-y-12">
                 {/* Píldoras de Personalidad */}
                 <div className="space-y-8">
                    {Object.entries(PERSONALITY_TAGS).map(([category, tags]) => (
                      <div key={category} className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{category}</label>
                         <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                              <button 
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase border-2 transition-all ${selectedTags.includes(tag) ? 'bg-primary border-primary text-white' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-400 hover:border-slate-200'}`}
                              >
                                 {tag}
                              </button>
                            ))}
                         </div>
                      </div>
                    ))}
                 </div>

                 {/* System Prompt Result */}
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrucciones Maestras (System Prompt)</label>
                    <textarea 
                       value={settings.aiPhoneSettings.systemPrompt}
                       onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, systemPrompt: e.target.value}})}
                       className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-[2rem] px-8 py-8 text-sm font-medium h-64 shadow-inner leading-relaxed focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    />
                 </div>

                 {/* Saludo Inicial */}
                 <div className="space-y-6 pt-10 border-t">
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Saludo Inicial</label>
                       <div className="flex gap-2">
                          {GREETING_PILLS.map((pill, i) => (
                            <button 
                              key={i} onClick={() => useGreetingPill(pill)}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-bg-dark text-[9px] font-black uppercase rounded-lg border border-transparent hover:border-primary transition-all text-slate-500"
                            >
                              Plantilla {i+1}
                            </button>
                          ))}
                       </div>
                    </div>
                    <textarea 
                       value={settings.aiPhoneSettings.initialGreeting}
                       onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, initialGreeting: e.target.value}})}
                       className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold h-24 shadow-inner resize-none"
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
