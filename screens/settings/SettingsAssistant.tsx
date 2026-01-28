
import React, { useState, useRef, useEffect } from 'react';
import { ClinicSettings, VoiceAccent, AiEscalationRules, AiPolicyTexts, AiPromptOverrides } from '../../types';
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
      
      const systemContext = `
        IDENTITY: Assistant ${settings.aiPhoneSettings.assistantName} from ${settings.aiPhoneSettings.clinicDisplayName}.
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
      const prompt = await generatePersonalityPrompt(tags, settings.aiPhoneSettings.assistantName, settings.aiPhoneSettings.clinicDisplayName);
      updateSetting('systemPrompt', prompt);
    } catch (e) { alert("Error al generar personalidad."); } finally { setIsGenerating(false); }
  };

  const updateSetting = (field: keyof typeof settings.aiPhoneSettings, value: any) => {
    setSettings(prev => ({ 
      ...prev, 
      aiPhoneSettings: { ...prev.aiPhoneSettings, [field]: value, configVersion: Date.now() } 
    }));
  };

  const updateEscalation = (field: keyof AiEscalationRules, value: any) => {
    setSettings(prev => ({ 
      ...prev, 
      aiPhoneSettings: { 
        ...prev.aiPhoneSettings, 
        escalation_rules: { ...prev.aiPhoneSettings.escalation_rules, [field]: value } 
      } 
    }));
  };

  const updatePolicy = (field: keyof AiPolicyTexts, value: any) => {
    setSettings(prev => ({ 
      ...prev, 
      aiPhoneSettings: { 
        ...prev.aiPhoneSettings, 
        policy_texts: { ...prev.aiPhoneSettings.policy_texts, [field]: value } 
      } 
    }));
  };

  const updateOverrides = (field: keyof AiPromptOverrides, value: any) => {
    setSettings(prev => ({ 
      ...prev, 
      aiPhoneSettings: { 
        ...prev.aiPhoneSettings, 
        prompt_overrides: { ...prev.aiPhoneSettings.prompt_overrides, [field]: value } 
      } 
    }));
  };

  return (
    <div className="grid grid-cols-1 gap-12 animate-in fade-in duration-500 p-10 bg-slate-50 dark:bg-bg-dark">
       
       {/* 1. IDENTITY PROFILE */}
       <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-primary/20 overflow-hidden shadow-xl ring-8 ring-primary/5">
            <div className="p-8 border-b-2 border-primary/10 bg-primary/5 flex items-center gap-5">
                <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-3xl">badge</span></div>
                <div>
                    <h3 className="text-2xl font-display font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Perfil de Identidad Local</h3>
                    <p className="text-[10px] font-bold text-primary uppercase mt-1 tracking-widest italic">Personalización del perfil del Tenant</p>
                </div>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                <DataField label="Nombre del Asistente (Elena/Sara...)" value={settings.aiPhoneSettings.assistantName} editing={true} onChange={(v: string) => updateSetting('assistantName', v)} />
                <DataField label="Nombre Comercial para la IA" value={settings.aiPhoneSettings.clinicDisplayName} editing={true} onChange={(v: string) => updateSetting('clinicDisplayName', v)} />
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tono de Interacción</label>
                    <select value={settings.aiPhoneSettings.tone} onChange={(e) => updateSetting('tone', e.target.value)} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold">
                        <option value="formal">Formal (Usted)</option>
                        <option value="cercano">Cercano (Tú)</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idioma del Perfil</label>
                    <select value={settings.aiPhoneSettings.language} onChange={(e) => updateSetting('language', e.target.value)} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold">
                        <option value="es-ES">Español (España)</option>
                        <option value="es-MX">Español (México)</option>
                        <option value="en-US">English (USA)</option>
                    </select>
                </div>
            </div>
       </section>

       {/* 2. ESCALATION & POLICIES */}
       <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
              <div className="size-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-3xl">support_agent</span></div>
              <div>
                  <h3 className="text-2xl font-display font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Escalado y Políticas</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest italic">Reglas críticas de transferencia y avisos legales</p>
              </div>
            </div>
            <div className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2">Reglas de Escalado</h4>
                        <DataField label="Número de Transferencia Humana" value={settings.aiPhoneSettings.escalation_rules.transfer_number} editing={true} onChange={(v: string) => updateEscalation('transfer_number', v)} />
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-100 dark:border-slate-800">
                           <span className="text-xs font-black uppercase text-slate-500">Escalar ante frustración</span>
                           <button onClick={() => updateEscalation('escalate_on_frustration', !settings.aiPhoneSettings.escalation_rules.escalate_on_frustration)} className={`size-12 rounded-xl flex items-center justify-center transition-all ${settings.aiPhoneSettings.escalation_rules.escalate_on_frustration ? 'bg-success text-white' : 'bg-slate-200 text-slate-400'}`}>
                             <span className="material-symbols-outlined">{settings.aiPhoneSettings.escalation_rules.escalate_on_frustration ? 'check' : 'close'}</span>
                           </button>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2">Textos de Política</h4>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Política de Cancelación</label>
                           <textarea value={settings.aiPhoneSettings.policy_texts.cancel_policy} onChange={(e) => updatePolicy('cancel_policy', e.target.value)} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-2xl p-4 text-xs font-bold h-24 resize-none shadow-inner" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Aviso de Privacidad Corto</label>
                           <textarea value={settings.aiPhoneSettings.policy_texts.privacy_notice} onChange={(e) => updatePolicy('privacy_notice', e.target.value)} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-2xl p-4 text-xs font-bold h-24 resize-none shadow-inner" />
                        </div>
                    </div>
                </div>
            </div>
       </section>

       {/* 3. NEURAL PARAMETERS (LEGACY UI RE-STYLED) */}
       <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="size-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-3xl">psychology</span></div>
                <div>
                    <h3 className="text-2xl font-display font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Personalidad y Voz</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest italic">Ajustes de comportamiento emocional y acústico</p>
                </div>
              </div>
              <button onClick={handleAutoPrompt} disabled={isGenerating} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                {isGenerating ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">auto_awesome</span>}
                Regenerar Personalidad
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
                                className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-xl px-4 py-3.5 text-xs font-bold cursor-pointer"
                            >
                                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Acento Regional</label>
                      <div className="grid grid-cols-1 gap-2">
                          {ACCENT_OPTIONS.map(opt => (
                              <button key={opt.id} onClick={() => updateSetting('accent', opt.id)} className={`text-left px-5 py-3 rounded-2xl border-2 transition-all flex justify-between items-center ${settings.aiPhoneSettings.accent === opt.id ? 'bg-primary/5 border-primary text-primary' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-500'}`}>
                                  <div className="flex items-center gap-3">
                                      <span className="text-xl">{opt.flag}</span>
                                      <p className="text-[11px] font-black uppercase tracking-tight">{opt.name}</p>
                                  </div>
                                  {settings.aiPhoneSettings.accent === opt.id && <span className="material-symbols-outlined text-sm">verified</span>}
                              </button>
                          ))}
                      </div>
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perfil de Voz</label>
                      <div className="grid grid-cols-1 gap-2">
                          {VOICE_OPTIONS.map(voice => (
                              <button key={voice.id} onClick={() => updateSetting('voiceName', voice.id)} className={`text-left px-5 py-3 rounded-2xl border-2 transition-all flex justify-between items-center ${settings.aiPhoneSettings.voiceName === voice.id ? 'bg-primary/5 border-primary text-primary' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-500'}`}>
                                  <div><p className="text-[11px] font-black uppercase tracking-tight">{voice.name}</p><p className="text-[9px] opacity-60 uppercase font-bold">{voice.desc}</p></div>
                                  <span className={`material-symbols-outlined text-lg ${voice.gender === 'Femenino' ? 'text-rose-400' : 'text-blue-400'}`}>{voice.gender === 'Femenino' ? 'female' : 'male'}</span>
                              </button>
                          ))}
                      </div>
                   </div>
                </div>
            </div>
       </section>

       {/* 4. AUDITION SIMULATOR */}
       <section className="bg-slate-900 text-white rounded-[3.5rem] border-2 border-primary/30 overflow-hidden shadow-2xl relative">
            <div className="p-10 flex flex-col items-center gap-8">
                <div className="text-center">
                    <h3 className="text-2xl font-display font-black uppercase tracking-tighter text-primary">Simulador de Voz Maestro</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Test de interacción acústica</p>
                </div>
                <textarea 
                  value={settings.aiPhoneSettings.testSpeechText} 
                  onChange={e => updateSetting('testSpeechText', e.target.value)} 
                  className="w-full bg-white/5 border-2 border-white/10 rounded-[2.5rem] p-10 text-lg font-bold text-slate-200 h-44 focus:ring-8 focus:ring-primary/5 outline-none text-center italic shadow-inner" 
                  placeholder="Escriba aquí para probar la voz..." 
                />
                <button onClick={handleTestVoice} className={`px-16 py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] transition-all shadow-[0_20px_50px_rgba(59,130,246,0.3)] flex items-center gap-4 ${isPlaying ? 'bg-rose-500 text-white' : 'bg-primary text-white hover:scale-105 active:scale-95'}`}>
                   <span className="material-symbols-outlined text-3xl">{isPlaying ? 'stop_circle' : 'volume_up'}</span>
                   {isPlaying ? 'DETENER PRUEBA' : 'SOLICITAR AUDICIÓN'}
                </button>
            </div>
       </section>
    </div>
  );
};

export default SettingsAssistant;
