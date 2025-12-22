
import React, { useState, useRef } from 'react';
import { ClinicSettings, VoiceAccent, FileAttachment } from '../../types';
import { generatePersonalityPrompt, speakText } from '../../services/gemini';

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

const GREETING_PILLS = [
  "Hola, soy {name} de {clinic}. ¿En qué puedo ayudarte hoy?",
  "Bienvenido a {clinic}. Mi nombre es {name}, ¿cómo puedo asistirte?",
  "Hola, gracias por llamar a {clinic}. Soy {name}, tu asistente virtual."
];

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

const SettingsAssistant: React.FC<SettingsAssistantProps> = ({ settings, setSettings }) => {
  const [isGeneratingPersonality, setIsGeneratingPersonality] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const knowledgeFileInputRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleTestVoice = async () => {
    const text = settings.aiPhoneSettings.testSpeechText || settings.aiPhoneSettings.initialGreeting;
    setIsTestingVoice(true);
    try {
      // Pasamos el acento actual para que el motor de TTS sepa cómo hablar
      const base64 = await speakText(text, settings.aiPhoneSettings.voiceName, settings.aiPhoneSettings.accent);
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
    } catch (e) { alert("Error al probar voz."); } finally { setIsTestingVoice(false); }
  };

  const handleAssistantNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    const oldName = settings.aiPhoneSettings.assistantName;
    if (!oldName) { setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, assistantName: newName}}); return; }
    const updatedPrompt = settings.aiPhoneSettings.systemPrompt.replaceAll(oldName, newName);
    const updatedGreeting = settings.aiPhoneSettings.initialGreeting.replaceAll(oldName, newName);
    setSettings(prev => ({ ...prev, aiPhoneSettings: { ...prev.aiPhoneSettings, assistantName: newName, systemPrompt: updatedPrompt, initialGreeting: updatedGreeting } }));
  };

  const handleGeneratePersonality = async () => {
    if (selectedTags.length === 0) { alert("Selecciona al menos una etiqueta de personalidad."); return; }
    setIsGeneratingPersonality(true);
    try {
      const newPrompt = await generatePersonalityPrompt(selectedTags, settings.aiPhoneSettings.assistantName, settings.name);
      setSettings(prev => ({ ...prev, aiPhoneSettings: { ...prev.aiPhoneSettings, systemPrompt: newPrompt } }));
    } catch (e) { alert("Error al generar personalidad."); } finally { setIsGeneratingPersonality(false); }
  };

  const handleKnowledgeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const newFile: FileAttachment = {
            id: 'KB-' + Date.now(), name: file.name, type: file.type, size: (file.size / 1024 / 1024).toFixed(2) + ' MB', date: new Date().toISOString().split('T')[0], url: URL.createObjectURL(file)
        };
        const currentFiles = settings.aiPhoneSettings.knowledgeFiles || [];
        setSettings({ ...settings, aiPhoneSettings: { ...settings.aiPhoneSettings, knowledgeFiles: [...currentFiles, newFile] } });
    }
  };

  const removeKnowledgeFile = (id: string) => {
    const currentFiles = settings.aiPhoneSettings.knowledgeFiles || [];
    setSettings({ ...settings, aiPhoneSettings: { ...settings.aiPhoneSettings, knowledgeFiles: currentFiles.filter(f => f.id !== id) } });
  };

  const useGreetingPill = (template: string) => {
    const greeting = template
      .replace('{name}', settings.aiPhoneSettings.assistantName)
      .replace('{clinic}', settings.name);
    
    setSettings(prev => ({
      ...prev,
      aiPhoneSettings: {
        ...prev.aiPhoneSettings,
        initialGreeting: greeting
      }
    }));
  };

  return (
    <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
       
       <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
            <div className="size-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">badge</span></div>
            <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Identidad del Asistente</h3>
            </div>
            <div className="p-10">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Asistente</label>
                <div className="flex gap-4 items-center mt-2">
                    <input type="text" value={settings.aiPhoneSettings.assistantName} onChange={handleAssistantNameChange} className="flex-1 bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-lg font-black text-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="Ej: Sara" />
                    <div className="text-xs font-medium text-slate-400 max-w-xs italic flex items-start gap-2"><span className="material-symbols-outlined text-sm mt-0.5">info</span> Al cambiar el nombre, se actualizará automáticamente en el Prompt y el Saludo inicial.</div>
                </div>
            </div>
        </section>

       <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
          <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
            <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center"><span className="material-symbols-outlined">volume_up</span></div>
            <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Selección de Voz e Idioma</h3>
          </div>
          <div className="p-10 space-y-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acento y Región (Persistente)</label>
                   <div className="grid grid-cols-1 gap-3">
                      {ACCENT_OPTIONS.map(opt => (
                        <button key={opt.id} onClick={() => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, accent: opt.id}})} className={`flex items-center justify-between px-6 py-4 rounded-2xl border-2 transition-all ${settings.aiPhoneSettings.accent === opt.id ? 'bg-primary/10 border-primary text-primary shadow-lg scale-[1.02]' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-500'}`}>
                           <span className="text-sm font-bold uppercase tracking-wide">{opt.name}</span>{settings.aiPhoneSettings.accent === opt.id && <span className="material-symbols-outlined text-sm">verified</span>}
                        </button>
                      ))}
                   </div>
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voz del Asistente</label>
                   <div className="grid grid-cols-1 gap-3">
                      {VOICE_OPTIONS.map(voice => (
                        <button key={voice.id} onClick={() => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, voiceName: voice.id}})} className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all ${settings.aiPhoneSettings.voiceName === voice.id ? 'bg-primary/10 border-primary text-primary shadow-md scale-[1.02]' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-500'}`}>
                           <div className={`size-10 rounded-xl flex items-center justify-center ${settings.aiPhoneSettings.voiceName === voice.id ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'}`}><span className="material-symbols-outlined">{voice.gender === 'Femenino' ? 'female' : 'male'}</span></div>
                           <div className="text-left flex-1"><p className="text-sm font-bold">{voice.name} <span className="text-[9px] opacity-60 uppercase">({voice.gender})</span></p><p className="text-[10px] italic opacity-60">{voice.desc}</p></div>
                           {settings.aiPhoneSettings.voiceName === voice.id && <span className="material-symbols-outlined text-sm">check_circle</span>}
                        </button>
                      ))}
                   </div>
                </div>
             </div>
             <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/20 space-y-6">
                <div className="flex items-center justify-between">
                   <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Laboratorio de Pruebas ({settings.aiPhoneSettings.accent})</h4>
                   <button onClick={handleTestVoice} disabled={isTestingVoice} className="px-6 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:scale-105 transition-all">
                      {isTestingVoice ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">play_circle</span>} Escuchar con Acento
                   </button>
                </div>
                <textarea value={settings.aiPhoneSettings.testSpeechText} onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, testSpeechText: e.target.value}})} className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-medium h-24 shadow-inner resize-none" placeholder="Escribe lo que quieres que el asistente diga para probar su voz..." />
             </div>
          </div>
       </section>

       <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
          <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined">auto_awesome</span></div>
              <div><h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Cerebro y Personalidad</h3><p className="text-[9px] font-black text-primary uppercase tracking-widest">Genera instrucciones avanzadas con IA</p></div>
            </div>
            <button onClick={handleGeneratePersonality} disabled={isGeneratingPersonality} className="px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-3">
              {isGeneratingPersonality ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">magic_button</span>} Generar con Píldoras
            </button>
          </div>
          <div className="p-10 space-y-12">
             <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {Object.entries(PERSONALITY_TAGS).map(([category, tags]) => (
                        <div key={category} className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 border-b border-slate-200 dark:border-slate-800 pb-1 block">
                                {category === 'enfoque' ? 'Enfoque Profesional' : category}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {tags.map(tag => (
                                <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${selectedTags.includes(tag) ? 'bg-primary border-primary text-white' : 'bg-slate-50 dark:bg-bg-dark border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/50'}`}>{tag}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
             </div>
             <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrucciones Maestras (System Prompt)</label>
                <textarea value={settings.aiPhoneSettings.systemPrompt} onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, systemPrompt: e.target.value}})} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-[2rem] px-8 py-8 text-sm font-medium h-64 shadow-inner leading-relaxed focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
             </div>
             <div className="space-y-6 pt-10 border-t">
                <div className="flex items-center justify-between">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Saludo Inicial</label>
                   <div className="flex gap-2">
                      {GREETING_PILLS.map((pill, i) => (
                        <button key={i} onClick={() => useGreetingPill(pill)} className="px-3 py-1.5 bg-slate-100 dark:bg-bg-dark text-[9px] font-black uppercase rounded-lg border border-transparent hover:border-primary transition-all text-slate-500">Plantilla {i+1}</button>
                      ))}
                   </div>
                </div>
                <textarea value={settings.aiPhoneSettings.initialGreeting} onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, initialGreeting: e.target.value}})} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold h-24 shadow-inner resize-none" />
             </div>
          </div>
       </section>

       <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-5">
                <div className="size-12 rounded-xl bg-teal-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">folder_data</span></div>
                <div><h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Base de Conocimientos</h3><p className="text-[10px] font-black text-primary uppercase tracking-widest">Documentación empresarial para la IA</p></div>
            </div>
            <button onClick={() => knowledgeFileInputRef.current?.click()} className="px-8 py-3 bg-teal-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"><span className="material-symbols-outlined text-lg">upload</span> Subir Archivos</button>
            <input type="file" ref={knowledgeFileInputRef} onChange={handleKnowledgeFileUpload} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png" />
            </div>
            <div className="p-10">
                {(settings.aiPhoneSettings.knowledgeFiles?.length || 0) === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem]">
                        <span className="material-symbols-outlined text-6xl mb-2">upload_file</span>
                        <p className="font-bold text-sm">No hay documentos subidos</p>
                        <p className="text-xs">Sube PDFs, Excel, Word o Imágenes para entrenar al asistente.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {settings.aiPhoneSettings.knowledgeFiles?.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="size-10 rounded-xl bg-white dark:bg-surface-dark flex items-center justify-center text-teal-500 shadow-sm shrink-0"><span className="material-symbols-outlined">{file.name.endsWith('.pdf') ? 'picture_as_pdf' : 'description'}</span></div>
                                    <div className="min-w-0"><p className="text-sm font-bold truncate">{file.name}</p><p className="text-[10px] text-slate-400 uppercase font-black">{file.size}</p></div>
                                </div>
                                <button onClick={() => removeKnowledgeFile(file.id)} className="size-8 rounded-lg bg-white dark:bg-surface-dark text-slate-400 hover:text-danger flex items-center justify-center transition-colors"><span className="material-symbols-outlined text-sm">close</span></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    </div>
  );
};

export default SettingsAssistant;
