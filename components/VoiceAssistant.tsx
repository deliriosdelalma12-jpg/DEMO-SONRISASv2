
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import React, { useEffect, useRef, useState } from 'react';
import { ClinicSettings } from '../types';

interface VoiceAssistantProps {
  onClose: () => void;
  settings: ClinicSettings;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onClose, settings }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [aiTranscription, setAiTranscription] = useState<string>('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const handleKeySelection = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setErrorMsg(null);
      startSession();
    }
  };

  const startSession = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const accentInstructions: Record<string, string> = {
        'es-ES-Madrid': 'Acento español de Madrid. Pronuncia las Z y C claramente. Habla de forma directa.',
        'es-ES-Canarias': 'Acento canario melódico y seseante.',
        'es-LATAM': 'Acento latino neutro y cálido.',
        'en-GB': 'British English accent (UK). Professional and crisp.',
        'en-US': 'American English accent (US). Energetic and clear.'
      };

      // TRADUCCIÓN DE AJUSTES TÉCNICOS A ÓRDENES DE PERSONALIDAD
      const speed = settings.aiPhoneSettings.voiceSpeed || 1.0;
      const pitch = settings.aiPhoneSettings.voicePitch || 1.0;
      
      const fluencyInstruction = speed > 1.3 
        ? "DEBES HABLAR MUY RÁPIDO. Evita pausas innecesarias. Responde al instante. No uses muletillas en cada frase."
        : speed < 0.8 ? "Habla pausado y con calma." : "Habla a un ritmo natural y fluido.";

      const humanityLayer = `
        # REGLAS DE ORO DE HUMANIDAD (SUBTILES):
        1. RITMO: ${fluencyInstruction}. Tu entonación debe ser ${pitch > 1.1 ? 'más aguda y alegre' : pitch < 0.9 ? 'más grave y seria' : 'equilibrada'}.
        2. MULETILLAS INTELIGENTES: Puedes usar "eh...", "bueno...", "mmh..." de forma ALEATORIA y SÓLO si la respuesta es larga o estás simulando que buscas un dato. No abuses. No lo digas en cada frase.
        3. BREVEDAD: Responde de forma muy concisa. Si el paciente confirma algo, di simplemente "Perfecto" o "Vale".
        4. NO ERES UNA IA: No digas "Cómo puedo ayudarle" de forma robótica. Di "Hola, ¿qué tal?, soy ${settings.aiPhoneSettings.assistantName} de ${settings.name}, dime qué necesitas".
      `;

      const fullSystemInstruction = `
        ${humanityLayer}

        # CONTEXTO DE NEGOCIO:
        - Clínica: ${settings.name}.
        - Conocimiento: ${settings.aiPhoneSettings.knowledgeBase}.
        - Acento: ${accentInstructions[settings.aiPhoneSettings.accent] || 'Español natural'}.
        
        # PERSONALIDAD ESPECÍFICA:
        ${settings.aiPhoneSettings.systemPrompt}
      `;

      const sessionPromise = ai.live.connect({
        model: settings.aiPhoneSettings.model || 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              const base64 = encode(new Uint8Array(int16.buffer));
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (m: LiveServerMessage) => {
            if (m.serverContent?.inputTranscription) setTranscription(t => t + ' ' + m.serverContent?.inputTranscription?.text);
            if (m.serverContent?.outputTranscription) setAiTranscription(t => t + ' ' + m.serverContent?.outputTranscription?.text);
            const base64 = m.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64 && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              if (ctx.state === 'suspended') await ctx.resume();
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(base64), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
            if (m.serverContent?.interrupted) {
              for (const source of sourcesRef.current) { try { source.stop(); } catch(e) {} }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => { setIsActive(false); setIsConnecting(false); },
          onerror: (e: any) => { 
            console.error(e); 
            setIsActive(false); 
            setIsConnecting(false);
            if (e.message?.includes("entity") || e.message?.includes("403")) {
              setErrorMsg("Error de créditos o API Key. Asegúrate de tener saldo en Google Cloud.");
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.aiPhoneSettings.voiceName as any } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: fullSystemInstruction
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) { console.error(e); setIsConnecting(false); }
  };

  const stopSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    setIsActive(false);
    setIsConnecting(false);
  };

  useEffect(() => { return () => stopSession(); }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[200] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
      <div className="max-w-3xl w-full flex flex-col items-center gap-12 text-center">
        <button onClick={() => { stopSession(); onClose(); }} className="absolute top-10 right-10 text-slate-400 hover:text-white transition-all hover:scale-110">
          <span className="material-symbols-outlined text-5xl">close</span>
        </button>

        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className={`size-56 rounded-[3rem] bg-primary/10 flex items-center justify-center border-4 border-primary/20 transition-all duration-700 ${isActive ? 'scale-110 shadow-[0_0_100px_rgba(59,130,246,0.3)]' : ''}`}>
               {isActive ? (
                 <div className="flex items-center gap-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-2.5 bg-primary rounded-full animate-bounce" style={{ height: '50px', animationDelay: `${i * 0.1}s` }}></div>
                    ))}
                 </div>
               ) : (
                 <span className="material-symbols-outlined text-7xl text-primary">contact_phone</span>
               )}
            </div>
            {isActive && <div className="absolute -inset-4 rounded-[4rem] border-8 border-primary/10 animate-ping"></div>}
          </div>
          <div className="space-y-3">
             <h2 className="text-white text-4xl font-display font-black tracking-tight uppercase">
               {isActive ? 'Atención Activa' : isConnecting ? 'Conectando...' : `${settings.aiPhoneSettings.assistantName}`}
             </h2>
             <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">{settings.name}</p>
          </div>
        </div>

        {errorMsg ? (
          <div className="bg-danger/10 border-2 border-danger/30 p-8 rounded-[2rem] space-y-6 max-w-md">
            <p className="text-danger font-bold text-sm leading-relaxed">{errorMsg}</p>
            <button onClick={handleKeySelection} className="w-full py-4 bg-danger text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 shadow-xl shadow-danger/20">Configurar API Key</button>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-6">
             <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] text-left">
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-2">Usuario</p>
                <p className="text-white text-xl font-medium min-h-[1.5em]">{transcription || (isActive ? 'Escuchando...' : '---')}</p>
             </div>
             <div className="bg-primary/5 border border-primary/20 p-8 rounded-[2rem] text-left">
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-2">{settings.aiPhoneSettings.assistantName}</p>
                <p className="text-white text-xl font-medium italic min-h-[1.5em]">{aiTranscription || '---'}</p>
             </div>
          </div>
        )}

        <div className="flex gap-6 mt-4">
          {!isActive && !isConnecting && !errorMsg && (
            <button onClick={startSession} className="bg-primary text-white px-12 py-5 rounded-2xl font-black text-xl hover:bg-primary-dark transition-all shadow-2xl shadow-primary/40 hover:scale-105 flex items-center gap-4">
               <span className="material-symbols-outlined text-2xl">mic</span> Iniciar Atención
            </button>
          )}
          {isActive && (
            <button onClick={() => { stopSession(); onClose(); }} className="bg-danger text-white px-12 py-5 rounded-2xl font-black text-xl hover:brightness-110 shadow-2xl shadow-danger/40 hover:scale-105 flex items-center gap-4">
               <span className="material-symbols-outlined text-2xl">call_end</span> Finalizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
