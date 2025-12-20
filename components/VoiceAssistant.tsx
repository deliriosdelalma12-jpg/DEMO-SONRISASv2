
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import React, { useEffect, useRef, useState } from 'react';
import { ClinicSettings, Appointment, Doctor, Branch, AppointmentStatus, Patient } from '../types';

interface VoiceAssistantProps {
  onClose: () => void;
  settings: ClinicSettings;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  doctors: Doctor[];
  branches?: Branch[];
  patients?: Patient[]; // NEW PROP
}

// --- HERRAMIENTAS (TOOLS) PARA EL MODELO ---

// 1. BUSCAR CITA Y PACIENTE (ENRICHED)
const declarationFindAppointment: FunctionDeclaration = {
  name: "findAppointment",
  description: "Busca citas y ficha de paciente por nombre. Úsala SIEMPRE cuando el usuario diga su nombre para personalizar la conversación.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      patientName: { type: Type.STRING, description: "Nombre completo del paciente (Nombre y Apellidos)" }
    },
    required: ["patientName"]
  }
};

const declarationCheckAvailability: FunctionDeclaration = {
  name: "checkAvailability",
  description: "Verifica si una fecha y hora específica está libre para citas, respetando el horario de apertura.",
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
  description: "Agenda una nueva cita. REQUIERE NOMBRE COMPLETO (Nombre + Apellidos).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      patientName: { type: Type.STRING, description: "Nombre COMPLETO del paciente (Nombre y Apellidos)" },
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
  description: "Cambia la fecha u hora de una cita existente. Debes haber localizado la cita primero con findAppointment.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      appointmentId: { type: Type.STRING, description: "ID de la cita encontrada previamente" },
      newDate: { type: Type.STRING, description: "Nueva fecha deseada (YYYY-MM-DD)" },
      newTime: { type: Type.STRING, description: "Nueva hora deseada (HH:MM)" }
    },
    required: ["appointmentId", "newDate", "newTime"]
  }
};

const declarationCancelAppointment: FunctionDeclaration = {
  name: "cancelAppointment",
  description: "Cancela una cita existente. Debes haber localizado la cita primero con findAppointment.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      appointmentId: { type: Type.STRING, description: "ID de la cita encontrada previamente" }
    },
    required: ["appointmentId"]
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

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onClose, settings, appointments, setAppointments, doctors, branches = [], patients = [] }) => {
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
  const patientsRef = useRef(patients);
  const doctorsRef = useRef(doctors);
  const servicesRef = useRef(settings.services);
  const scheduleRef = useRef(settings.globalSchedule);
  const policyRef = useRef(settings.appointmentPolicy);

  // Sync refs with props
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);
  useEffect(() => { patientsRef.current = patients; }, [patients]);
  useEffect(() => { doctorsRef.current = doctors; }, [doctors]);
  useEffect(() => { servicesRef.current = settings.services; }, [settings.services]);
  useEffect(() => { scheduleRef.current = settings.globalSchedule; }, [settings.globalSchedule]);
  useEffect(() => { policyRef.current = settings.appointmentPolicy; }, [settings.appointmentPolicy]);

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

  // Helper Logic to validate opening hours
  const isClinicOpen = (dateStr: string, timeStr: string): boolean => {
    const globalSchedule = scheduleRef.current;
    if (!globalSchedule) return true; 
    
    const date = new Date(dateStr);
    const dayIndex = date.getDay(); 
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = dayNames[dayIndex];
    const schedule = globalSchedule[dayName];

    if (!schedule) return false; 

    if (schedule.morning.active) {
        if (timeStr >= schedule.morning.start && timeStr < schedule.morning.end) return true;
    }
    if (schedule.afternoon.active) {
        if (timeStr >= schedule.afternoon.start && timeStr < schedule.afternoon.end) return true;
    }

    return false;
  };

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Generate Schedule Text
      const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      const scheduleDesc = weekDays.map(d => {
          const s = settings.globalSchedule?.[d];
          if (!s) return `${d}: CERRADO`;
          let desc = `${d}: `;
          const morning = s.morning.active ? `${s.morning.start}-${s.morning.end}` : '';
          const afternoon = s.afternoon.active ? `${s.afternoon.start}-${s.afternoon.end}` : '';
          if (!morning && !afternoon) return `${d}: CERRADO`;
          if (morning && afternoon) return `${d}: ${morning} y ${afternoon}`;
          return `${d}: ${morning}${afternoon}`;
      }).join('\n');

      // INJECT CURRENT DATE FOR RELATIVE CALCULATIONS
      const now = new Date();
      const currentDateString = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTimeString = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

      // Build KB Context
      const kbContext = (settings.aiPhoneSettings.knowledgeFiles || []).map(f => `- ${f.name} (Disponible)`).join('\n');

      const fullPrompt = `
        ${settings.aiPhoneSettings.systemPrompt}
        
        # CONTEXTO TEMPORAL ACTUAL:
        Fecha de hoy: ${currentDateString}
        Hora actual: ${currentTimeString}

        # DATOS DE EMPRESA:
        Nombre: ${settings.name}
        Sector: ${settings.sector}
        
        # BASE DE CONOCIMIENTOS:
        Tienes acceso a documentos internos. Úsalos para responder dudas técnicas.
        ${kbContext}

        # HORARIO DE APERTURA:
        ${scheduleDesc}
        NO AGENDAR/REPROGRAMAR fuera de este horario.

        # REGLA DE ORO DE PERSONALIZACIÓN:
        1. **TU SALUDAS PRIMERO**: Di tu saludo configurado apenas conecte.
        2. **IDENTIFICACIÓN**: Si el usuario dice su nombre, usa 'findAppointment' INMEDIATAMENTE.
        3. **USO DE DATOS**: La herramienta 'findAppointment' te devolverá citas Y DATOS DEL PACIENTE (historial, alergias, edad). ÚSALOS.
           - Ejemplo: "Hola Laura, veo que hace 6 meses no vienes a revisión..."
           - Ejemplo: "Teniendo en cuenta tu alergia a la penicilina..."
        4. **NOMBRE COMPLETO**: Pide siempre Nombre y Apellidos para evitar errores.

        # TUS HERRAMIENTAS:
        - findAppointment: Úsala para recuperar FICHA DEL PACIENTE y citas.
        - createAppointment: Para nuevas citas.
        - rescheduleAppointment: Requiere ID.
        - cancelAppointment: Requiere ID.
        - checkAvailability: Úsala para verificar huecos.
        - getServiceDetails: Precios e info.

        # SALUDO CONFIGURADO:
        "${settings.aiPhoneSettings.initialGreeting}"
        
        Habla natural, con acento ${settings.aiPhoneSettings.accent}.
      `;

      const sessionPromise = ai.live.connect({
        model: settings.aiPhoneSettings.model,
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            
            // 1. Setup Audio Input
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

            // 2. FORCE INITIAL GREETING
            sessionPromise.then(s => s.sendRealtimeInput([{ 
                text: `La llamada acaba de conectar. El usuario está al teléfono. DI TU SALUDO INICIAL EXACTAMENTE COMO ESTÁ CONFIGURADO: "${settings.aiPhoneSettings.initialGreeting}"` 
            }]));
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

            // 3. Handle Tool Calls
            if (m.toolCall) {
                console.log("Tool call received:", m.toolCall);
                const functionResponses = m.toolCall.functionCalls.map(fc => {
                    let result: any = { error: "Unknown function" };
                    const args = fc.args as any;

                    try {
                        // NEW TOOL: FIND APPOINTMENT + PATIENT PROFILE
                        if (fc.name === "findAppointment") {
                            const nameQuery = args.patientName.toLowerCase();
                            // 1. Find appointments
                            const matches = appointmentsRef.current.filter(a => 
                                a.patientName.toLowerCase().includes(nameQuery) &&
                                (a.status === 'Confirmed' || a.status === 'Pending' || a.status === 'Rescheduled')
                            );
                            
                            // 2. Find Patient Profile (Deep Context)
                            const patientProfile = patientsRef.current.find(p => p.name.toLowerCase().includes(nameQuery));

                            if (matches.length === 0 && !patientProfile) {
                                result = { found: false, message: "No encontré paciente ni citas con ese nombre. Pide el nombre completo de nuevo." };
                            } else {
                                result = { 
                                    found: true, 
                                    patientContext: patientProfile ? {
                                        name: patientProfile.name,
                                        age: 30, // Mock age calc
                                        allergies: patientProfile.allergies,
                                        medicalHistory: patientProfile.medicalHistory,
                                        lastVisit: "Hace 6 meses (Simulado)" 
                                    } : "Perfil no encontrado, solo citas.",
                                    matches: matches.map(a => ({
                                        id: a.id,
                                        date: a.date,
                                        time: a.time,
                                        treatment: a.treatment,
                                        doctor: a.doctorName
                                    })),
                                    message: `Encontré datos. Usa el 'patientContext' para personalizar la respuesta.`
                                };
                            }
                        }
                        else if (fc.name === "checkAvailability") {
                            if (!isClinicOpen(args.date, args.time)) {
                                result = { available: false, message: "La clínica está cerrada en ese horario." };
                            } else {
                                const busy = appointmentsRef.current.find(a => 
                                    a.date === args.date && 
                                    a.time.startsWith(args.time.substring(0,2)) && 
                                    ['Confirmed', 'Pending', 'Rescheduled'].includes(a.status)
                                );
                                result = { available: !busy, message: busy ? "Horario ocupado por otra cita" : "Horario disponible" };
                            }
                        } 
                        else if (fc.name === "createAppointment") {
                            if (!isClinicOpen(args.date, args.time)) {
                                result = { success: false, message: "No se pudo agendar: La clínica está cerrada en ese horario." };
                            } else {
                                // Calculate Status based on Policy
                                const today = new Date(); today.setHours(0,0,0,0);
                                const apptDate = new Date(args.date);
                                const diffTime = apptDate.getTime() - today.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                
                                let initialStatus: AppointmentStatus = 'Confirmed';
                                if (policyRef.current) {
                                    if (diffDays >= policyRef.current.leadTimeThreshold) {
                                        initialStatus = 'Pending';
                                    } else if (policyRef.current.autoConfirmShortNotice) {
                                        initialStatus = 'Confirmed';
                                    }
                                }

                                const newApt: Appointment = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    patientId: 'P-VOICE-' + Date.now(),
                                    patientName: args.patientName,
                                    date: args.date,
                                    time: args.time,
                                    treatment: args.treatment,
                                    doctorName: args.doctorName || doctorsRef.current[0]?.name || "Dr. Asignado",
                                    doctorId: doctorsRef.current[0]?.id || "D1",
                                    status: initialStatus
                                };
                                setAppointments(prev => [...prev, newApt]);
                                
                                const statusMsg = initialStatus === 'Pending' 
                                    ? `Cita creada como PENDIENTE. Recuérdale al usuario que debe confirmar ${policyRef.current?.confirmationWindow}h antes.` 
                                    : "Cita creada y CONFIRMADA exitosamente.";
                                
                                result = { success: true, id: newApt.id, message: statusMsg, status: initialStatus };
                            }
                        }
                        else if (fc.name === "rescheduleAppointment") {
                            if (!isClinicOpen(args.newDate, args.newTime)) {
                                result = { success: false, message: "No se pudo reprogramar: La clínica está cerrada en el nuevo horario." };
                            } else {
                                const targetId = args.appointmentId;
                                const exists = appointmentsRef.current.find(a => a.id === targetId);
                                
                                if (exists) {
                                    setAppointments(prev => prev.map(a => a.id === targetId ? { ...a, date: args.newDate, time: args.newTime, status: 'Rescheduled' } : a));
                                    result = { success: true, message: `Cita reprogramada al ${args.newDate} a las ${args.newTime}` };
                                } else {
                                    result = { success: false, message: "Error interno: ID de cita no encontrado para reprogramar." };
                                }
                            }
                        }
                        else if (fc.name === "cancelAppointment") {
                            const targetId = args.appointmentId;
                            const exists = appointmentsRef.current.find(a => a.id === targetId);

                            if (exists) {
                                setAppointments(prev => prev.map(a => a.id === targetId ? { ...a, status: 'Cancelled' } : a));
                                result = { success: true, message: "Cita cancelada correctamente" };
                            } else {
                                result = { success: false, message: "Error interno: ID de cita no encontrado para cancelar." };
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
                  declarationFindAppointment, // ENRICHED
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
