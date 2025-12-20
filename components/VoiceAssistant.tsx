
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import React, { useEffect, useRef, useState } from 'react';
import { ClinicSettings, Appointment, Doctor, Branch } from '../types';

interface VoiceAssistantProps {
  onClose: () => void;
  settings: ClinicSettings;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  doctors: Doctor[];
  branches?: Branch[];
}

// --- HERRAMIENTAS (TOOLS) PARA EL MODELO ---
const declarationCheckAvailability: FunctionDeclaration = {
  name: "checkAvailability",
  description: "Verifica si una fecha y hora específica está libre para citas.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING, description: "Fecha en formato YYYY-MM-DD" },
      time: { type: Type.STRING, description: "Hora en formato HH:MM" }
    },
    required: ["date", "time"]
  }
};

const declarationCreateAppointment: FunctionDeclaration = {
  name: "createAppointment",
  description: "Agenda una nueva cita médica en el sistema.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      patientName: { type: Type.STRING, description: "Nombre del paciente" },
      date: { type: Type.STRING, description: "Fecha en formato YYYY-MM-DD" },
      time: { type: Type.STRING, description: "Hora en formato HH:MM" },
      treatment: { type: Type.STRING, description: "Nombre del tratamiento o servicio" },
      doctorName: { type: Type.STRING, description: "Nombre del doctor preferido (opcional)" }
    },
    required: ["patientName", "date", "time", "treatment"]
  }
};

const declarationRescheduleAppointment: FunctionDeclaration = {
  name: "rescheduleAppointment",
  description: "Cambia la fecha u hora de una cita existente.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      patientName: { type: Type.STRING, description: "Nombre del paciente para buscar la cita" },
      oldDate: { type: Type.STRING, description: "Fecha actual de la cita (YYYY-MM-DD)" },
      newDate: { type: Type.STRING, description: "Nueva fecha deseada (YYYY-MM-DD)" },
      newTime: { type: Type.STRING, description: "Nueva hora deseada (HH:MM)" }
    },
    required: ["patientName", "newDate", "newTime"]
  }
};

const declarationCancelAppointment: FunctionDeclaration = {
  name: "cancelAppointment",
  description: "Cancela una cita existente.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      patientName: { type: Type.STRING, description: "Nombre del paciente" },
      date: { type: Type.STRING, description: "Fecha de la cita a cancelar (YYYY-MM-DD)" }
    },
    required: ["patientName", "date"]
  }
};

const declarationGetServiceDetails: FunctionDeclaration = {
  name: "getServiceDetails",
  description: "Consulta la base de datos para obtener detalles técnicos, precio y duración de un examen o servicio.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      serviceName: { type: Type.STRING, description: "Nombre del servicio o síntoma relacionado" }
    },
    required: ["serviceName"]
  }
};

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

  // Refs for state access inside callbacks
  const appointmentsRef = useRef(appointments);
  const doctorsRef = useRef(doctors);
  const servicesRef = useRef(settings.services);

  // Sync refs with props
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);
  useEffect(() => { doctorsRef.current = doctors; }, [doctors]);
  useEffect(() => { servicesRef.current = settings.services; }, [settings.services]);

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

      // Construct dynamic prompt
      const activeBranches = branches.filter(b => b.status === 'Active');
      const branchContext = activeBranches.length > 0 
        ? `\n# SUCURSALES ACTIVAS:\n${activeBranches.map(b => `- ${b.name}: ${b.address}, ${b.city}. Horario: ${b.openingHours}`).join('\n')}`
        : '\n# SUCURSAL: Única sede central.';

      const serviceList = settings.services.map(s => `- ${s.name}: ${s.price}${settings.currency} (${s.duration} min)`).join('\n');

      const fullPrompt = `
        ${settings.aiPhoneSettings.systemPrompt}
        
        # TU ROL: SECRETARIA PROFESIONAL
        1. Eres la secretaria de ${settings.name}. Tu trabajo es gestionar la agenda y orientar al paciente.
        2. NO ERES MÉDICO. Si el paciente pregunta por síntomas graves o pide diagnóstico, responde: "Como asistente administrativa no puedo dar diagnósticos médicos, pero puedo agendarle una consulta con el especialista para que lo evalúe".
        3. Eres extremadamente eficiente. Usa las herramientas (tools) para verificar disponibilidad y agendar en tiempo real.
        4. Tienes acceso total a la "Base de Datos" de la empresa (lista de servicios y precios). Úsala para responder dudas sobre en qué consiste un examen o cuánto cuesta.

        # TUS FUNCIONES PRINCIPALES (USA TOOLS):
        1. AGENDAR: Usa 'createAppointment'. Pide nombre, fecha y hora. Verifica disponibilidad primero.
        2. REPROGRAMAR: Usa 'rescheduleAppointment'.
        3. CANCELAR: Usa 'cancelAppointment'.
        4. CONSULTAR/ORIENTAR: Usa 'getServiceDetails' si te preguntan detalles específicos de un servicio. Usa tu conocimiento del contexto para responder sobre ubicaciones.

        # DATOS DE LA EMPRESA (BASE DE DATOS EN MEMORIA):
        Servicios:
        ${serviceList}
        
        Sucursales:
        ${branchContext}
        
        # SALUDO INICIAL:
        "${settings.aiPhoneSettings.initialGreeting}"
        
        Habla natural, con acento ${settings.aiPhoneSettings.accent}.
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
            // 1. Handle Audio
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

            // 2. Handle Transcription
            if (m.serverContent?.inputTranscription) {
               setTranscription(t => t + ' ' + m.serverContent?.inputTranscription?.text);
            }

            // 3. Handle Tool Calls (The Core Logic)
            if (m.toolCall) {
                console.log("Tool call received:", m.toolCall);
                const functionResponses = m.toolCall.functionCalls.map(fc => {
                    let result: any = { error: "Unknown function" };
                    const args = fc.args as any;

                    try {
                        if (fc.name === "checkAvailability") {
                            // Logic: Check if any ACTIVE appointment exists at that time
                            const busy = appointmentsRef.current.find(a => 
                                a.date === args.date && 
                                a.time.startsWith(args.time.substring(0,2)) && 
                                a.status !== 'Cancelled' && a.status !== 'Completed'
                            );
                            result = { available: !busy, message: busy ? "Horario ocupado" : "Horario disponible" };
                        } 
                        else if (fc.name === "createAppointment") {
                            const newApt: Appointment = {
                                id: Math.random().toString(36).substr(2, 9),
                                patientId: 'P-GUEST', // Guest ID for phone booking
                                patientName: args.patientName,
                                date: args.date,
                                time: args.time,
                                treatment: args.treatment,
                                doctorName: args.doctorName || doctorsRef.current[0]?.name || "Dr. Asignado",
                                doctorId: doctorsRef.current[0]?.id || "D1",
                                status: 'Confirmed'
                            };
                            setAppointments(prev => [...prev, newApt]);
                            result = { success: true, id: newApt.id, message: "Cita creada exitosamente" };
                        }
                        else if (fc.name === "rescheduleAppointment") {
                            const target = appointmentsRef.current.find(a => 
                                a.patientName.toLowerCase().includes(args.patientName.toLowerCase()) || 
                                a.date === args.oldDate
                            );
                            if (target) {
                                setAppointments(prev => prev.map(a => a.id === target.id ? { ...a, date: args.newDate, time: args.newTime, status: 'Rescheduled' } : a));
                                result = { success: true, message: `Cita reprogramada al ${args.newDate} a las ${args.newTime}` };
                            } else {
                                result = { success: false, message: "No encontré la cita original" };
                            }
                        }
                        else if (fc.name === "cancelAppointment") {
                            const target = appointmentsRef.current.find(a => 
                                a.patientName.toLowerCase().includes(args.patientName.toLowerCase())
                            );
                            if (target) {
                                setAppointments(prev => prev.map(a => a.id === target.id ? { ...a, status: 'Cancelled' } : a));
                                result = { success: true, message: "Cita cancelada correctamente" };
                            } else {
                                result = { success: false, message: "No encontré la cita para cancelar" };
                            }
                        }
                        else if (fc.name === "getServiceDetails") {
                            const service = servicesRef.current.find(s => s.name.toLowerCase().includes(args.serviceName.toLowerCase()));
                            if (service) {
                                result = { 
                                    found: true, 
                                    name: service.name, 
                                    price: service.price, 
                                    duration: service.duration, 
                                    description: `El servicio ${service.name} tiene un costo de ${service.price} y dura aproximadamente ${service.duration} minutos.`
                                };
                            } else {
                                result = { found: false, message: "Servicio no encontrado en la base de datos." };
                            }
                        }
                    } catch (e) {
                        console.error("Error executing tool:", e);
                        result = { error: "Failed to execute operation" };
                    }

                    return {
                        id: fc.id,
                        name: fc.name,
                        response: { result }
                    };
                });

                // Send response back to model
                sessionPromise.then(s => s.sendToolResponse({ functionResponses }));
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
          },
          tools: [{ 
              functionDeclarations: [
                  declarationCheckAvailability, 
                  declarationCreateAppointment, 
                  declarationRescheduleAppointment,
                  declarationCancelAppointment,
                  declarationGetServiceDetails
              ] 
          }]
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
             <div className="flex flex-col gap-1">
                <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">{settings.name}</p>
                <p className="text-slate-400 text-xs font-medium">Asistente Administrativo Inteligente</p>
             </div>
          </div>
        </div>

        {!isActive && !isConnecting && (
          <button onClick={startSession} className="bg-primary text-white px-16 py-6 rounded-[2.5rem] font-black text-xl hover:bg-primary-dark transition-all shadow-2xl shadow-primary/40 hover:scale-105 flex items-center gap-4 uppercase tracking-tighter">
             <span className="material-symbols-outlined text-3xl">call</span> Iniciar Atención AI
          </button>
        )}
        
        {isActive && (
            <div className="bg-slate-800/50 px-6 py-3 rounded-2xl border border-slate-700 max-w-lg">
                <p className="text-xs text-slate-400 font-mono">
                    {transcription || "Escuchando..."}
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default VoiceAssistant;
