
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import React, { useEffect, useRef, useState } from 'react';
import { ClinicSettings, Appointment, Doctor } from '../types';

interface VoiceAssistantProps {
  onClose: () => void;
  settings: ClinicSettings;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  doctors: Doctor[];
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onClose, settings, appointments, setAppointments, doctors }) => {
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

  const functions: FunctionDeclaration[] = [
    {
      name: 'consultar_disponibilidad',
      parameters: {
        type: Type.OBJECT,
        properties: {
          fecha: { type: Type.STRING, description: 'Fecha en formato YYYY-MM-DD' },
          hora_preferida: { type: Type.STRING, description: 'Hora en formato HH:mm' }
        },
        required: ['fecha']
      }
    },
    {
      name: 'agendar_cita',
      parameters: {
        type: Type.OBJECT,
        properties: {
          paciente_nombre: { type: Type.STRING },
          servicio_nombre: { type: Type.STRING },
          fecha: { type: Type.STRING },
          hora: { type: Type.STRING },
          doctor_id: { type: Type.STRING }
        },
        required: ['paciente_nombre', 'servicio_nombre', 'fecha', 'hora']
      }
    },
    {
      name: 'cancelar_cita',
      parameters: {
        type: Type.OBJECT,
        properties: {
          paciente_nombre: { type: Type.STRING },
          fecha: { type: Type.STRING }
        },
        required: ['paciente_nombre', 'fecha']
      }
    }
  ];

  const handleFunctionCall = (fc: any) => {
    if (fc.name === 'consultar_disponibilidad') {
      const ocupadas = appointments
        .filter(a => a.date === fc.args.fecha && a.status !== 'Cancelled')
        .map(a => a.time);
      return { ocupadas, disponible: !ocupadas.includes(fc.args.hora_preferida) };
    }

    if (fc.name === 'agendar_cita') {
      const newApt: Appointment = {
        id: Math.random().toString(36).substr(2, 9),
        patientName: fc.args.paciente_nombre,
        patientId: 'P-AUTO',
        treatment: fc.args.servicio_nombre,
        date: fc.args.fecha,
        time: fc.args.hora,
        doctorId: fc.args.doctor_id || doctors[0]?.id,
        doctorName: doctors.find(d => d.id === fc.args.doctor_id)?.name || doctors[0]?.name,
        status: 'Confirmed'
      };
      setAppointments(prev => [...prev, newApt]);
      return { success: true, mensaje: "Cita agendada" };
    }

    if (fc.name === 'cancelar_cita') {
      setAppointments(prev => prev.map(a => 
        (a.patientName.toLowerCase().includes(fc.args.paciente_nombre.toLowerCase()) && a.date === fc.args.fecha)
        ? { ...a, status: 'Cancelled' } : a
      ));
      return { success: true, mensaje: "Cita cancelada." };
    }

    return { error: 'Función no encontrada' };
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

      const currentHour = new Date().getHours();
      const timeGreeting = currentHour < 12 ? "Buenos días" : "Buenas tardes";
      const initialGreeting = `${timeGreeting}, soy ${settings.aiPhoneSettings.assistantName}, asistente de ${settings.name}, ¿en qué puedo ayudar?`;

      const serviceList = settings.services.map(s => `${s.name} (${s.price}${settings.currency})`).join(", ");
      const knowledgeFilesInfo = settings.aiPhoneSettings.knowledgeFiles?.map(f => `Archivo: ${f.name}`).join(", ") || "Ninguno.";

      const brainPrompt = `
        # CEREBRO DE NEGOCIO Y OPERACIONES:
        - SALUDO INICIAL OBLIGATORIO: Empieza siempre diciendo: "${initialGreeting}".
        - ACENTO: Debes hablar con acento "${settings.aiPhoneSettings.accent}".
        - VELOCIDAD: Debes hablar a una velocidad de ${settings.aiPhoneSettings.voiceSpeed}x.
        - OBJETIVO SUPREMO: Optimizar la agenda de ${settings.name}. Los huecos vacíos son pérdidas de dinero.
        - SERVICIOS Y PRECIOS: Ofrecemos: [${serviceList}]. Si piden algo distinto, di que no lo hacemos de forma humana.
        - DISPONIBILIDAD: Consulta siempre antes de confirmar. 
        - CONOCIMIENTO ADICIONAL: ${knowledgeFilesInfo}.
        
        # PERSONALIDAD:
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
            if (m.toolCall) {
              for (const fc of m.toolCall.functionCalls) {
                const result = handleFunctionCall(fc);
                sessionPromise.then(s => s.sendToolResponse({
                  functionResponses: { id: fc.id, name: fc.name, response: { result } }
                }));
              }
            }

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
          },
          onclose: () => { setIsActive(false); setIsConnecting(false); },
          onerror: (e: any) => { console.error(e); stopSession(); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { 
            voiceConfig: { 
                prebuiltVoiceConfig: { 
                    voiceName: settings.aiPhoneSettings.voiceName as any
                } 
            } 
          },
          tools: [{ functionDeclarations: functions }],
          systemInstruction: brainPrompt,
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
               {isActive ? 'Atendiendo Llamada...' : isConnecting ? 'Sincronizando...' : `${settings.aiPhoneSettings.assistantName}`}
             </h2>
             <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">{settings.name}</p>
          </div>
        </div>

        <div className="w-full flex flex-col gap-6">
           <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] text-left">
              <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-2">Paciente</p>
              <p className="text-white text-xl font-medium min-h-[1.5em] leading-relaxed">{transcription || (isActive ? 'Escuchando paciente...' : '---')}</p>
           </div>
           <div className="bg-primary/5 border border-primary/20 p-8 rounded-[2rem] text-left">
              <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-2">{settings.aiPhoneSettings.assistantName}</p>
              <p className="text-white text-xl font-medium italic min-h-[1.5em] leading-relaxed">{aiTranscription || '---'}</p>
           </div>
        </div>

        <div className="flex gap-6 mt-4">
          {!isActive && !isConnecting && (
            <button onClick={startSession} className="bg-primary text-white px-12 py-5 rounded-2xl font-black text-xl hover:bg-primary-dark transition-all shadow-2xl shadow-primary/40 hover:scale-105 flex items-center gap-4">
               <span className="material-symbols-outlined text-2xl">call</span> Iniciar Atención
            </button>
          )}
          {isActive && (
            <button onClick={() => { stopSession(); onClose(); }} className="bg-danger text-white px-12 py-5 rounded-2xl font-black text-xl hover:brightness-110 shadow-2xl shadow-danger/40 hover:scale-105 flex items-center gap-4">
               <span className="material-symbols-outlined text-2xl">call_end</span> Cortar Llamada
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
