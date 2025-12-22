
import React, { useState, useRef, useEffect } from 'react';
import { ClinicSettings, VoiceAccent, FileAttachment } from '../../types';
import { generatePersonalityPrompt, speakText, decodeBase64, decodeAudioDataToBuffer } from '../../services/gemini';

interface SettingsAssistantProps {
  settings: ClinicSettings;
  setSettings: React.Dispatch<React.SetStateAction<ClinicSettings>>;
}

const PERSONALITY_TAGS = {
  emocion: ['Empática', 'Alegre', 'Serena', 'Enérgica', 'Seria', 'Dulce'],
  estilo: ['Concisa', 'Detallista', 'Proactiva', 'Escucha Activa', 'Paciente'],
  relacion: ['Formal (Usted)', 'Cercana (Tú)', 'Protectora', 'Vendedora'],
  enfoque: ['Venta Consultiva', 'Triaje Clínico', 'Fidelización VIP', 'Resolución Técnica', 'Gestión de Quejas', 'Cierre Agresivo']
};

const DEFAULT_TEST_PARAGRAPH = "Hola, soy {name}. Es un placer saludarte. Estoy aquí para gestionar tus citas en {clinic} y resolver cualquier duda sobre nuestros tratamientos de forma inmediata. ¿En qué puedo ayudarte hoy?";

const VOICE_OPTIONS = [
  { id: 'Zephyr', name: 'Zephyr', gender: 'Femenino', desc: 'Clara y profesional' },
  { id: 'Kore', name: 'Kore', gender: 'Femenino', desc: 'Dulce y cercana' },
  { id: 'Puck', name: 'Puck', gender: 'Masculino', desc: 'Juvenil y enérgico' },
  { id: 'Charon', name: 'Charon', gender: 'Masculino', desc: 'Profunda y autoritaria' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Masculino', desc: 'Robusta y madura' },
];

const ACCENT_OPTIONS: { id: VoiceAccent; name: string }[] = [
  { id: 'es-ES-Madrid', name: 'ESPAÑOL (MADRID)' },
  { id: 'es-ES-Canarias', name: 'ESPAÑOL (CANARIAS)' },
  { id: 'es-LATAM', name: 'ESPAÑOL (LATINOAMÉRICA)' },
  { id: 'en-GB', name: 'ENGLISH (BRITISH)' },
  { id: 'en-US', name: 'ENGLISH (US)' },
];

const SettingsAssistant: React.FC<SettingsAssistantProps> = ({ settings, setSettings }) => {
  const [isGeneratingPersonality, setIsGeneratingPersonality] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs blindados para la gestión de audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const lastAssistantName = useRef(settings.aiPhoneSettings.assistantName);
  const lastCompanyName = useRef(settings.aiPhoneSettings.aiCompanyName);

  useEffect(() => {
    // Inicializar texto de prueba si está vacío
    if (!settings.aiPhoneSettings.testSpeechText || settings.aiPhoneSettings.testSpeechText.length < 10) {
        const initialTest = DEFAULT_TEST_PARAGRAPH
            .replace('{name}', settings.aiPhoneSettings.assistantName)
            .replace('{clinic}', settings.aiPhoneSettings.aiCompanyName);
        setSettings(prev => ({ ...prev, aiPhoneSettings: { ...prev.aiPhoneSettings, testSpeechText: initialTest } }));
    }

    return () => stopAudio();
  }, []);

  const stopAudio = () => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.onended = null;
        currentSourceRef.current.stop();
      } catch (e) {
        // Silencioso
      }
      currentSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  // SINCRONIZACIÓN BLINDADA: Detecta cambios externos y los propaga al prompt
  useEffect(() => {
    if (lastCompanyName.current !== settings.aiPhoneSettings.aiCompanyName) {
        syncText(lastCompanyName.current, settings.aiPhoneSettings.aiCompanyName);
        lastCompanyName.current = settings.aiPhoneSettings.aiCompanyName;
    }
    if (lastAssistantName.current !== settings.aiPhoneSettings.assistantName) {
        syncText(lastAssistantName.current, settings.aiPhoneSettings.assistantName);
        lastAssistantName.current = settings.aiPhoneSettings.assistantName;
    }
  }, [settings.aiPhoneSettings.aiCompanyName, settings.aiPhoneSettings.assistantName]);

  const syncText = (oldVal: string, newVal: string) => {
    if (!oldVal || oldVal.length < 3 || oldVal === newVal) return;
    const regex = new RegExp(oldVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    setSettings(prev => ({
        ...prev,
        aiPhoneSettings: {
            ...prev.aiPhoneSettings,
            systemPrompt: prev.aiPhoneSettings.systemPrompt.replace(regex, newVal),
            initialGreeting: prev.aiPhoneSettings.initialGreeting.replace(regex, newVal),
            testSpeechText: prev.aiPhoneSettings.testSpeechText.replace(regex, newVal)
        }
    }));
  };

  const handleTestVoice = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    const text = settings.aiPhoneSettings.testSpeechText || settings.aiPhoneSettings.initialGreeting;
    if (!text.trim()) return;

    setIsTestingVoice(true);
    try {
      const base64 = await speakText(text, settings.aiPhoneSettings.voiceName, {
        pitch: settings.aiPhoneSettings.voicePitch,
        speed: settings.aiPhoneSettings.voiceSpeed
      });
      
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      
      const rawData = decodeBase64(base64);
      const audioBuffer = await decodeAudioDataToBuffer(rawData, ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        currentSourceRef.current = null;
      };

      currentSourceRef.current = source;
      source.start();
      setIsPlaying(true);
      setIsTestingVoice(false);
    } catch (e) { 
        alert("El motor de voz está ocupado o no disponible en este momento."); 
        setIsPlaying(false);
        setIsTestingVoice(false);
    }
  };

  const handleGeneratePersonality = async () => {
    if (selectedTags.length === 0) { alert("Selecciona al menos una etiqueta."); return; }
    setIsGeneratingPersonality(true);
    try {
      const newPrompt = await generatePersonalityPrompt(selectedTags, settings.aiPhoneSettings.assistantName, settings.aiPhoneSettings.aiCompanyName);
      setSettings(prev => ({ ...prev, aiPhoneSettings: { ...prev.aiPhoneSettings, systemPrompt: newPrompt } }));
    } catch (e) { alert("Error al generar personalidad."); } finally { setIsGeneratingPersonality(false); }
  };

  return (
    <div className="grid grid-cols-1 gap-12 animate-in fade-in duration-500 p-10 bg-slate-50 dark:bg-bg-dark">
       
       <section className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-4">
              <span className="material-symbols-outlined text-primary">badge</span>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Identidad y Voz</h3>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Asistente</label>
                    <input 
                      type="text" 
                      value={settings.aiPhoneSettings.assistantName} 
                      onChange={(e) => setSettings(prev => ({...prev, aiPhoneSettings: {...prev.aiPhoneSettings, assistantName: e.target.value}}))} 
                      className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-lg px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre de Empresa (IA)</label>
                    <input 
                      type="text" 
                      value={settings.aiPhoneSettings.aiCompanyName} 
                      onChange={(e) => setSettings(prev => ({...prev, aiPhoneSettings: {...prev.aiPhoneSettings, aiCompanyName: e.target.value}}))} 
                      className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-lg px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary" 
                    />
                </div>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acento y Región</label>
                        <div className="grid grid-cols-1 gap-2">
                            {ACCENT_OPTIONS.map(opt => (
                                <button key={opt.id} onClick={() => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, accent: opt.id}})} className={`text-left px-4 py-3 rounded-lg border text-xs font-bold transition-all ${settings.aiPhoneSettings.accent === opt.id ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-500'}`}>
                                    {opt.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Voz del Asistente</label>
                        <div className="grid grid-cols-1 gap-2">
                            {VOICE_OPTIONS.map(voice => (
                                <button key={voice.id} onClick={() => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, voiceName: voice.id}})} className={`flex items-center justify-between px-4 py-3 rounded-lg border text-xs font-bold transition-all ${settings.aiPhoneSettings.voiceName === voice.id ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-500'}`}>
                                    <span>{voice.name} <span className="opacity-50 text-[10px]">({voice.gender})</span></span>
                                    {settings.aiPhoneSettings.voiceName === voice.id && <span className="material-symbols-outlined text-sm">check_circle</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-slate-50 dark:bg-bg-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tono de Voz (Pitch)</label>
                            <span className="text-[10px] font-bold text-primary">{settings.aiPhoneSettings.voicePitch}x</span>
                        </div>
                        <input type="range" min="0.5" max="1.5" step="0.1" value={settings.aiPhoneSettings.voicePitch} onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, voicePitch: parseFloat(e.target.value)}})} className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary" />
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Velocidad (Speed)</label>
                            <span className="text-[10px] font-bold text-primary">{settings.aiPhoneSettings.voiceSpeed}x</span>
                        </div>
                        <input type="range" min="0.5" max="1.5" step="0.1" value={settings.aiPhoneSettings.voiceSpeed} onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, voiceSpeed: parseFloat(e.target.value)}})} className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary" />
                    </div>
                </div>
            </div>
        </section>

       <section className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-primary">play_circle</span>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Laboratorio de Simulación</h3>
            </div>
            <button 
                onClick={handleTestVoice} 
                disabled={isTestingVoice}
                className={`px-6 py-3 rounded-lg font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all shadow-md ${
                    isPlaying 
                    ? 'bg-danger text-white hover:bg-danger-dark' 
                    : 'bg-primary text-white hover:bg-primary-dark'
                }`}
            >
                {isTestingVoice ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">{isPlaying ? 'stop_circle' : 'volume_up'}</span>}
                {isTestingVoice ? 'Cargando...' : isPlaying ? 'Cancelar Simulación' : 'Escuchar Simulación Inmediata'}
            </button>
          </div>
          <div className="p-8">
            <textarea 
                value={settings.aiPhoneSettings.testSpeechText} 
                onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, testSpeechText: e.target.value}})} 
                className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-sm font-medium h-32 focus:ring-2 focus:ring-primary outline-none transition-all leading-relaxed" 
                placeholder="Escribe el texto que quieres probar con la voz actual..." 
            />
          </div>
       </section>

       <section className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Personalidad y Prompting</h3>
            </div>
            <button onClick={handleGeneratePersonality} disabled={isGeneratingPersonality} className="px-6 py-2 bg-primary text-white rounded-lg font-black uppercase text-[10px] tracking-widest shadow-sm flex items-center gap-2 hover:bg-primary-dark transition-all">
              {isGeneratingPersonality ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">magic_button</span>} Inteligencia Rápida
            </button>
          </div>
          <div className="p-8 space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(PERSONALITY_TAGS).map(([category, tags]) => (
                    <div key={category} className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{category}</label>
                        <div className="flex flex-wrap gap-1.5">
                            {tags.map(tag => (
                                <button key={tag} onClick={() => toggleTag(tag)} className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${selectedTags.includes(tag) ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>{tag}</button>
                            ))}
                        </div>
                    </div>
                ))}
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Prompt (Instrucciones Maestras)</label>
                <textarea value={settings.aiPhoneSettings.systemPrompt} onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, systemPrompt: e.target.value}})} className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-xs font-mono h-64 focus:ring-2 focus:ring-primary outline-none transition-all leading-relaxed" />
             </div>
          </div>
       </section>
    </div>
  );
};

export default SettingsAssistant;
