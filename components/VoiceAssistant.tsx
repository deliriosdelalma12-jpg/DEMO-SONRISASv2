
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

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const accentInstructions: Record<string, string> = {
        'es-ES-Madrid': 'Acento de Madrid, España. Usa un tono directo y profesional.',
        'es-ES-Canarias': 'Acento canario, suave y melódico. Habla de forma dulce.',
        'es-LATAM': 'Acento latino neutro. Cálido y muy claro.',
        'en-GB': 'British accent (UK). Professional and crisp.',
        'en-US': 'American accent (US). Energetic and direct.'
      };

      // AJUSTE DINÁMICO DE VELOCIDAD Y TONO VÍA LENGUAJE NATURAL
      const speedTerm = settings.aiPhoneSettings.voiceSpeed > 1.2 ? 'muy rápido, ágil y sin ninguna pausa innecesaria' : 
                        settings.aiPhoneSettings.voiceSpeed < 0.8 ? 'muy pausado y tranquilo' : 'natural y fluido';
      
      const pitchTerm = settings.aiPhoneSettings.voicePitch > 1.1 ? 'agudo y jovial' :
                        settings.aiPhoneSettings.voicePitch < 0.9 ? 'grave y autoritario' : 'equilibrado';

      const humanityLayer = `
        # REGLAS CRÍTICAS DE VOZ Y RITMO:
        1. VELOCIDAD DE HABLA: Debes hablar de forma ${speedTerm}. Elimina silencios entre palabras. Tu objetivo es una conversación ágil.
        2. TONO: Tu voz debe sonar ${pitchTerm}.
        3. MULETILLAS NATURALES: Usa "eh..." o "a ver..." ÚNICAMENTE si estás buscando un dato en la agenda o si la respuesta es larga. No las uses en saludos ni confirmaciones cortas. Sé natural, no repetitivo.
        4. BREVEDAD: Responde de forma concisa. No des rodeos a menos que te pregunten detalles técnicos.
      `;

      const fullSystemInstruction = `
        ${humanityLayer}

        # IDENTIDAD Y NEGOCIO:
        - Eres ${settings.aiPhoneSettings.assistantName}, de ${settings.name}.
        - ${accentInstructions[settings.aiPhoneSettings.accent] || 'Habla de forma natural.'}
        - CONOCIMIENTO: ${settings.aiPhoneSettings.knowledgeBase}
        - FUNCIONES: Agendar, cancelar y reprogramar citas.

        # PERSONALIDAD ESPECÍFICA:
        ${settings.aiPhoneSettings.systemPrompt}

        REGLA DE ORO FINAL: Inicia siempre diciendo: "Hola, ¿qué tal? Soy ${settings.aiPhoneSettings.assistantName} de ${settings.name}, ¿en qué puedo ayudarte?".
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
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
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { 
                  data: base64, 
                  mimeType: 'audio/pcm;rate=16000' 
                } 
              }));
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
              for (const source of sourcesRef.current) {
                try { source.stop(); } catch(e) {}
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => { setIsActive(false); setIsConnecting(false); },
          onerror: (e) => console.error(e)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: settings.aiPhoneSettings.voiceName as any }
            }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: fullSystemInstruction
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { console.error(e); setIsConnecting(false); }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    
    setIsActive(false);
    setIsConnecting(false);
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[200] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
      <div className="max-w-3xl w-full flex flex-col items-center gap-16 text-center">
        <button onClick={() => { stopSession(); onClose(); }} className="absolute top-10 right-10 text-slate-400 hover:text-white transition-all hover:scale-110">
          <span className="material-symbols-outlined text-5xl">close</span>
        </button>

        <div className="flex flex-col items-center gap-8">
          <div className="relative">
            <div className={`size-60 rounded-[3rem] bg-primary/10 flex items-center justify-center border-4 border-primary/20 transition-all duration-700 ${isActive ? 'scale-110 shadow-[0_0_100px_rgba(59,130,246,0.3)]' : ''}`}>
               {isActive ? (
                 <div className="flex items-center gap-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-2.5 bg-primary rounded-full animate-bounce" style={{ height: '60px', animationDelay: `${i * 0.1}s` }}></div>
                    ))}
                 </div>
               ) : (
                 <span className="material-symbols-outlined text-8xl text-primary">settings_phone</span>
               )}
            </div>
            {isActive && <div className="absolute -inset-4 rounded-[4rem] border-8 border-primary/10 animate-ping"></div>}
          </div>
          <div className="space-y-4">
             <h2 className="text-white text-5xl font-display font-black tracking-tight uppercase">
               {isActive ? 'Te escucho...' : isConnecting ? 'Conectando...' : `Asistente: ${settings.aiPhoneSettings.assistantName}`}
             </h2>
             <p className="text-primary font-black uppercase tracking-[0.3em] text-sm">{settings.name}</p>
          </div>
        </div>

        <div className="w-full flex flex-col gap-8">
           <div className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem] min-h-[140px] text-left">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Voz del Paciente</p>
              <p className="text-white text-2xl font-medium leading-relaxed">{transcription || (isActive ? 'Empieza a hablar...' : 'Esperando...')}</p>
           </div>
           <div className="bg-primary/5 border border-primary/20 p-10 rounded-[2.5rem] min-h-[140px] text-left">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Respuesta de {settings.aiPhoneSettings.assistantName}</p>
              <p className="text-white text-2xl font-medium leading-relaxed italic">{aiTranscription || '---'}</p>
           </div>
        </div>

        <div className="flex gap-8">
          {!isActive && !isConnecting && (
            <button onClick={startSession} className="bg-primary text-white px-16 py-6 rounded-[2rem] font-black text-2xl hover:bg-primary-dark transition-all shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 flex items-center gap-4">
               <span className="material-symbols-outlined text-3xl">call</span> Iniciar Atención IA
            </button>
          )}
          {isActive && (
            <button onClick={() => { stopSession(); onClose(); }} className="bg-danger text-white px-16 py-6 rounded-[2rem] font-black text-2xl hover:brightness-110 transition-all shadow-2xl shadow-danger/40 hover:scale-105 active:scale-95 flex items-center gap-4">
               <span className="material-symbols-outlined text-3xl">call_end</span> Finalizar Atención
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
