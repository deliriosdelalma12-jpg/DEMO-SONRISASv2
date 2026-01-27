
import React, { useState, useRef, useEffect } from 'react';
import { ClinicSettings, VoiceAccent } from '../../types';
import { generatePersonalityPrompt, speakText, decodeBase64, decodeAudioDataToBuffer } from '../../services/gemini';
import { DataField } from '../../components/shared/DataField';

const MASTER_OPTIONS = {
  emocion: ['Empática', 'Alegre', 'Serena', 'Enérgica', 'Seria', 'Dulce'],
  estilo: ['Concisa', 'Detallista', 'Proactiva', 'Escucha Activa', 'Paciente'],
  relacion: ['Formal (Usted)', 'Cercana (Tú)', 'Protectora', 'Vendedora'],
  enfoque: ['Resolutiva', 'Comercial', 'Triaje Clínico', 'Atención VIP']
};

const VOICE_OPTIONS = [
  { id: 'Zephyr', name: 'Zephyr', gender: 'Femenino', desc: 'Clara y profesional' },
  { id: 'Kore', name: 'Kore', gender: 'Femenino', desc: 'Dulce y cercana' },
  { id: 'Puck', name: 'Puck', gender: 'Masculino', desc: 'Juvenil y enérgico' },
  { id: 'Charon', name: 'Charon', gender: 'Masculino', desc: 'Profunda y autoritaria' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Masculino', desc: 'Robusta y madura' },
];

const ACCENT_OPTIONS: { id: VoiceAccent; name: string; flag: string; lang: string; prompt: string }[] = [
  { id: 'es-ES-Madrid', name: 'Español (Madrid)', flag: '🇪🇸', lang: 'Spanish', prompt: 'Speak in native Castilian Spanish from Madrid.' },
  { id: 'es-ES-Canarias', name: 'Español (Canarias)', flag: '🇮🇨', lang: 'Spanish (Canary Islands)', prompt: 'Speak in native Spanish from Canary Islands. Use "ustedes" and "seseo".' },
  { id: 'es-LATAM', name: 'Español (LATAM)', flag: '🌎', lang: 'Spanish (Latin America)', prompt: 'Speak in native neutral Latin American Spanish.' },
  { id: 'en-GB', name: 'English (UK Native)', flag: '🇬🇧', lang: 'British English', prompt: 'SPEAK EXCLUSIVELY IN NATIVE BRITISH ENGLISH. NO SPANISH.' },
  { id: 'en-US', name: 'English (US Native)', flag: '🇺🇸', lang: 'American English', prompt: 'SPEAK EXCLUSIVELY IN NATIVE AMERICAN ENGLISH. NO SPANISH.' },
];

const SettingsAssistant: React.FC<{ settings: ClinicSettings; setSettings: React.Dispatch<React.SetStateAction<ClinicSettings>> }> = ({ settings, setSettings }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopAudio = () => {
    if (currentSourceRef.current) { try { currentSourceRef.current.stop(); } catch (e) {} currentSourceRef.current = null; }
    setIsPlaying(false);
  };

  const handleTestVoice = async () => {
    if (isPlaying) { stopAudio(); return; }
    const text = settings.aiPhoneSettings.testSpeechText;
    if (!text.trim()) return;

    try {
      const selectedAccent = ACCENT_OPTIONS.find(a => a.id === settings.aiPhoneSettings.accent);
      const personality = `${settings.aiPhoneSettings.aiEmotion}, ${settings.aiPhoneSettings.aiStyle}, ${settings.aiPhoneSettings.aiRelation}`;
      
      // PROMPT MAESTRO PARA EL SIMULADOR: Inyecta Identidad, Idioma y Personalidad
      const systemContext = `
        IDENTITY: Assistant ${settings.aiPhoneSettings.assistantName} from ${settings.aiPhoneSettings.aiCompanyName}.
        LANGUAGE RULE: ${selectedAccent?.prompt}.
        PERSONALITY: ${personality}.
        VOICE PARAMETERS: Pitch ${settings.aiPhoneSettings.voicePitch}, Speed ${settings.aiPhoneSettings.voiceSpeed}.
      `;
      
      const promptText = `(SYSTEM INSTRUCTION: ${systemContext.toUpperCase()}) NATIVE RESPONSE: ${text}`;
      
      const base64 = await speakText(promptText, settings.aiPhoneSettings.voiceName, { 
        pitch: settings.aiPhoneSettings.voicePitch, 
        speed: settings.aiPhoneSettings.voiceSpeed 
      });

      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      
      const buffer = await decodeAudioDataToBuffer(decodeBase64(base64), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      currentSourceRef.current = source;
      source.start();
      setIsPlaying(true);
    } catch (e) { 
        console.error(e);
        alert("Error en el simulador de voz."); 
    }
  };

  const handleAutoPrompt = async () => {
    setIsGenerating(true);
    try {
      const tags = [
        settings.aiPhoneSettings.aiEmotion,
        settings.aiPhoneSettings.aiStyle,
        settings.aiPhoneSettings.aiRelation,
        settings.aiPhoneSettings.aiFocus
      ];
      const prompt = await generatePersonalityPrompt(tags, settings.aiPhoneSettings.assistantName, settings.aiPhoneSettings.aiCompanyName);
      setSettings(prev => ({ 
        ...prev, 
        aiPhoneSettings: { ...prev.aiPhoneSettings, systemPrompt: prompt, configVersion: Date.now() } 
      }));
    } catch (e) { alert("Error al generar personalidad."); } finally { setIsGenerating(false); }
  };

  const updateSetting = (field: keyof typeof settings.aiPhoneSettings, value: any) => {
    setSettings(prev => ({ 
      ...prev, 
      aiPhoneSettings: { ...prev.aiPhoneSettings, [field]: value, configVersion: Date.now() } 
    }));
  };

  return (
    <div className="grid grid-cols-1 gap-12 animate-in fade-in duration-500 p-10 bg-slate-50 dark:bg-bg-dark">
       
       {/* SECCIÓN 0: IDENTIDAD DEL ASISTENTE (RESTABLECIDA) */}
       <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-primary/20 overflow-hidden shadow-xl ring-8 ring-primary/5">
            <div className="p-8 border-b-2 border-primary/10 bg-primary/5 flex items-center gap-5">
                <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-3xl">face</span></div>
                <div>
                    <h3 className="text-2xl font-display font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Identidad del Asistente</h3>
                    <p className="text-[10px] font-bold text-primary uppercase mt-1 tracking-widest italic">Cómo se presenta la IA ante los pacientes</p>
                </div>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Asistente</label>
                    <input 
                        type="text" 
                        value={settings.aiPhoneSettings.assistantName}
                        onChange={(e) => updateSetting('assistantName', e.target.value)}
                        placeholder="Ej: Sara"
                        className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de la Clínica para la IA</label>
                    <input 
                        type="text" 
                        value={settings.aiPhoneSettings.aiCompanyName}
                        onChange={(e) => updateSetting('aiCompanyName', e.target.value)}
                        placeholder="Ej: MediClinic Premium"
                        className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                </div>
                <div className="md:col-span-2 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-[10px] text-primary font-bold italic text-center">La IA dirá: "Hola, soy {settings.aiPhoneSettings.assistantName} de {settings.aiPhoneSettings.aiCompanyName}..."</p>
                </div>
            </div>
       </section>

       {/* SECCIÓN 1: PERSONALIDAD Y CEREBRO IA */}
       <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="size-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-3xl">psychology</span></div>
                    <div>
                        <h3 className="text-2xl font-display font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Cerebro y Personalidad</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest italic">Capa de comportamiento maestra del asistente</p>
                    </div>
                </div>
                <button onClick={handleAutoPrompt} disabled={isGenerating} className="px-6 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:scale-105 transition-all">
                    {isGenerating ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">auto_awesome</span>}
                    Regenerar IA
                </button>
            </div>
            
            <div className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Object.entries(MASTER_OPTIONS).map(([key, options]) => (
                        <div key={key} className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{key}</label>
                            <select 
                                value={(settings.aiPhoneSettings as any)[`ai${key.charAt(0).toUpperCase() + key.slice(1)}`]}
                                onChange={(e) => updateSetting(`ai${key.charAt(0).toUpperCase() + key.slice(1)}` as any, e.target.value)}
                                className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-xl px-4 py-3.5 text-xs font-bold focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
                            >
                                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrucciones de Lógica Superior (System Prompt)</label>
                    <textarea 
                        value={settings.aiPhoneSettings.systemPrompt}
                        onChange={(e) => updateSetting('systemPrompt', e.target.value)}
                        className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-[2rem] p-8 text-sm font-medium min-h-[140px] focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none italic shadow-inner"
                    />
                </div>
            </div>
       </section>

       {/* SECCIÓN 2: MOTOR REGIONAL NATIVO */}
       <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-3xl">language</span></div>
                <div>
                    <h3 className="text-2xl font-display font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Idioma y Acento Nativo</h3>
                    <p className="text-[10px] font-bold text-primary uppercase mt-1 tracking-widest italic">Cambia el idioma de interacción de forma 100% nativa</p>
                </div>
              </div>
            </div>
            
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Región / Idioma</label>
                    <div className="grid grid-cols-1 gap-2">
                        {ACCENT_OPTIONS.map(opt => (
                            <button key={opt.id} onClick={() => updateSetting('accent', opt.id)} className={`text-left px-6 py-4 rounded-2xl border-2 transition-all flex justify-between items-center ${settings.aiPhoneSettings.accent === opt.id ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-500 hover:border-slate-200'}`}>
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl">{opt.flag}</span>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tight">{opt.name}</p>
                                        <p className="text-[9px] opacity-60 uppercase font-black tracking-tighter">Motor Nativo: {opt.lang}</p>
                                    </div>
                                </div>
                                {settings.aiPhoneSettings.accent === opt.id && <span className="material-symbols-outlined text-xl">verified</span>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voz y Sexo del Asistente</label>
                    <div className="grid grid-cols-1 gap-2">
                        {VOICE_OPTIONS.map(voice => (
                            <button key={voice.id} onClick={() => updateSetting('voiceName', voice.id)} className={`text-left px-6 py-4 rounded-2xl border-2 transition-all flex justify-between items-center ${settings.aiPhoneSettings.voiceName === voice.id ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-500 hover:border-slate-200'}`}>
                                <div>
                                    <p className="text-sm font-black uppercase tracking-tight">{voice.name}</p>
                                    <p className="text-[9px] opacity-60 uppercase mt-1 tracking-tighter">{voice.gender} • {voice.desc}</p>
                                </div>
                                <span className={`material-symbols-outlined text-2xl ${voice.gender === 'Femenino' ? 'text-rose-400' : 'text-blue-400'}`}>
                                    {voice.gender === 'Femenino' ? 'female' : 'male'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
       </section>

       {/* SECCIÓN 3: TONO Y VELOCIDAD */}
       <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
              <div className="size-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-2xl">tune</span></div>
              <h3 className="text-xl font-display font-black text-slate-800 dark:text-white uppercase tracking-tight">Parametrización Acústica</h3>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10 bg-slate-900 text-white rounded-b-[3.5rem]">
                <div className="space-y-6">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tono (Pitch)</label><span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-black">{settings.aiPhoneSettings.voicePitch}x</span></div>
                    <input type="range" min="0.5" max="1.5" step="0.05" value={settings.aiPhoneSettings.voicePitch} onChange={e => updateSetting('voicePitch', parseFloat(e.target.value))} className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white" />
                </div>
                <div className="space-y-6">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Velocidad (Speed)</label><span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-black">{settings.aiPhoneSettings.voiceSpeed}x</span></div>
                    <input type="range" min="0.5" max="2.0" step="0.1" value={settings.aiPhoneSettings.voiceSpeed} onChange={e => updateSetting('voiceSpeed', parseFloat(e.target.value))} className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white" />
                </div>
            </div>
       </section>

       {/* SIMULADOR FINAL SINCRONIZADO */}
       <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-primary/20 overflow-hidden shadow-2xl ring-8 ring-primary/5">
            <div className="p-8 border-b-2 border-primary/10 bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-3xl">play_circle</span></div>
                <div>
                   <h3 className="text-xl font-display font-black text-primary uppercase tracking-tight">Audición de Prueba</h3>
                   <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest italic">Inyecta identidad y personalidad real</p>
                </div>
              </div>
              <button onClick={handleTestVoice} className={`px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] transition-all shadow-2xl flex items-center gap-4 ${isPlaying ? 'bg-rose-500 text-white' : 'bg-primary text-white hover:scale-105 active:scale-95'}`}>
                <span className="material-symbols-outlined text-2xl">{isPlaying ? 'stop_circle' : 'volume_up'}</span>
                {isPlaying ? 'DETENER AUDICIÓN' : 'SOLICITAR AUDICIÓN'}
              </button>
            </div>
            <div className="p-10">
                <textarea 
                  value={settings.aiPhoneSettings.testSpeechText} 
                  onChange={e => updateSetting('testSpeechText', e.target.value)} 
                  className="w-full bg-white dark:bg-bg-dark border-none rounded-[2.5rem] p-10 text-lg font-black text-slate-700 dark:text-slate-200 h-44 focus:ring-8 focus:ring-primary/5 outline-none shadow-inner text-center italic leading-relaxed" 
                  placeholder="Escribe el texto de prueba aquí..." 
                />
            </div>
       </section>
    </div>
  );
};

export default SettingsAssistant;
