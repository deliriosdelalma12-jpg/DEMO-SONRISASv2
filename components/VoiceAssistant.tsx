
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import React, { useEffect, useRef, useState } from 'react';
import { ClinicSettings, Appointment, Doctor, Branch } from '../types';

interface VoiceAssistantProps {
  onClose: () => void;
  settings: ClinicSettings;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  doctors: Doctor[];
  branches?: Branch[]; // NEW PROP
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onClose, settings, appointments, setAppointments, doctors, branches = [] }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  
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
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
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

      // Construct dynamic prompt with branch info
      const activeBranches = branches.filter(b => b.status === 'Active');
      const branchContext = activeBranches.length > 0 
        ? `\n# SUCURSALES ACTIVAS:\n${activeBranches.map(b => `- ${b.name}: ${b.address}, ${b.city}. Horario: ${b.openingHours}`).join('\n')}`
        : '\n# SUCURSAL: Única sede central.';

      const fullPrompt = `
        ${settings.aiPhoneSettings.systemPrompt}
        
        # INDICACIONES OPERATIVAS:
        ${settings.aiPhoneSettings.instructions}
        
        # CONTEXTO DE NEGOCIO:
        Nombre de la clínica: ${settings.name}
        Servicios disponibles (con duración estimada):
        ${settings.services.map(s => `- ${s.name}: ${s.price}${settings.currency} (${s.duration} min)`).join('\n')}
        ${branchContext}
        
        # SALUDO INICIAL OBLIGATORIO:
        "${settings.aiPhoneSettings.initialGreeting}"
        
        Debes sonar natural, con acento ${settings.aiPhoneSettings.accent} y hablar a una velocidad de ${settings.aiPhoneSettings.voiceSpeed}x.
        Si el paciente pregunta por ubicaciones, usa la lista de sucursales activas.
      `;

      const sessionPromise = ai.live.connect({
        model: settings.aiPhoneSettings.model,
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
              sourcesRef.add(source);
            }
          },
          onclose: () => { setIsActive(false); setIsConnecting(false); },
          onerror: (e: any) => { console.error(e); stopSession(); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { 
            voiceConfig: { 
                prebuiltVoiceConfig: { voiceName: settings.aiPhoneSettings.voiceName as any } 
            } 
          },
          systemInstruction: fullPrompt,
          generationConfig: {
              temperature: settings.aiPhoneSettings.temperature,
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) { console.error(e); setIsConnecting(false); }
  };

  const stopSession = () => {
    if (sessionRef.current) try { sessionRef.current.close(); } catch(e) {}
    if (audioContextRef.current) try { audioContextRef.current.close(); } catch(e) {}
    if (outputAudioContextRef.current) try { outputAudioContextRef.current.close(); } catch(e) {}
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
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
          </div>
          <div className="space-y-3">
             <h2 className="text-white text-4xl font-display font-black tracking-tight uppercase">
               {isActive ? 'Llamada en curso' : isConnecting ? 'Conectando...' : `${settings.aiPhoneSettings.assistantName}`}
             </h2>
             <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">{settings.name}</p>
          </div>
        </div>

        {!isActive && !isConnecting && (
          <button onClick={startSession} className="bg-primary text-white px-16 py-6 rounded-[2.5rem] font-black text-xl hover:bg-primary-dark transition-all shadow-2xl shadow-primary/40 hover:scale-105 flex items-center gap-4 uppercase tracking-tighter">
             <span className="material-symbols-outlined text-3xl">call</span> Iniciar Atención AI
          </button>
        )}
      </div>
    </div>
  );
};

export default VoiceAssistant;
