
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import React, { useEffect, useRef, useState } from 'react';
import { ClinicSettings, Appointment, Doctor, Branch, AppointmentStatus, Patient, CountryRegion } from '../types';

interface VoiceAssistantProps {
  onClose: () => void;
  settings: ClinicSettings;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  doctors: Doctor[];
  branches?: Branch[];
  patients?: Patient[]; 
  setPatients?: React.Dispatch<React.SetStateAction<Patient[]>>; 
}

// --- VALIDATION LOGIC ---
const validatePhone = (phone: string, region: CountryRegion): { valid: boolean; error?: string } => {
    const cleanPhone = phone.replace(/\D/g, ''); 
    
    switch (region) {
        case 'ES': 
            if (!/^[6789]\d{8}$/.test(cleanPhone)) return { valid: false, error: "El teléfono en España debe tener 9 dígitos y empezar por 6, 7, 8 o 9." };
            break;
        case 'MX': case 'US': case 'CO': 
            if (cleanPhone.length !== 10) return { valid: false, error: `El teléfono para ${region} debe tener 10 dígitos.` };
            break;
        case 'BZ': 
             if (cleanPhone.length !== 7) return { valid: false, error: "El teléfono en Belice debe tener 7 dígitos." };
             break;
        case 'CR': case 'SV': case 'GT': case 'HN': case 'NI':
             if (cleanPhone.length !== 8) return { valid: false, error: `El teléfono para ${region} debe tener 8 dígitos.` };
             break;
        case 'PA': 
             if (cleanPhone.length < 7 || cleanPhone.length > 8) return { valid: false, error: "El teléfono en Panamá debe tener 7 u 8 dígitos." };
             break;
        default:
            if (cleanPhone.length < 7) return { valid: false, error: "Número demasiado corto." };
    }
    return { valid: true };
};

const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// --- TOOLS DEFINITION ---

const declarationFindAppointment: FunctionDeclaration = {
  name: "findAppointment",
  description: "Busca citas y ficha de paciente por nombre. Úsala SIEMPRE que el usuario diga su nombre. Devuelve si el paciente existe y qué datos faltan.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      patientName: { type: Type.STRING, description: "Nombre (o nombre y apellidos) del paciente" }
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

const declarationUpdatePatient: FunctionDeclaration = {
    name: "updatePatientData",
    description: "Actualiza datos faltantes (teléfono, email, dni) de un paciente existente.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            patientId: { type: Type.STRING, description: "ID del paciente recuperado previamente" },
            phone: { type: Type.STRING, description: "Nuevo número de teléfono" },
            email: { type: Type.STRING, description: "Nuevo email" },
            dni: { type: Type.STRING, description: "Nuevo DNI/Documento" }
        },
        required: ["patientId"]
    }
};

const declarationCreateAppointment: FunctionDeclaration = {
  name: "createAppointment",
  description: "Agenda una nueva cita. Si el paciente es nuevo, crea su ficha. Si existe, usa su ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      patientName: { type: Type.STRING, description: "Nombre COMPLETO del paciente" },
      date: { type: Type.STRING, description: "Fecha YYYY-MM-DD" },
      time: { type: Type.STRING, description: "Hora HH:MM" },
      treatment: { type: Type.STRING, description: "Tratamiento o motivo" },
      doctorName: { type: Type.STRING, description: "Nombre del doctor (opcional)" },
      branchName: { type: Type.STRING, description: "Nombre de la sucursal (opcional, el sistema puede inferirla)" },
      dni: { type: Type.STRING, description: "DNI (obligatorio si es nuevo)" },
      phone: { type: Type.STRING, description: "Teléfono (obligatorio si es nuevo o falta)" }
    },
    required: ["patientName", "date", "time", "treatment"]
  }
};

const declarationRescheduleAppointment: FunctionDeclaration = {
  name: "rescheduleAppointment",
  description: "Cambia la fecha u hora de una cita existente (requiere ID de la cita).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      appointmentId: { type: Type.STRING, description: "ID de la cita encontrada con findAppointment" },
      newDate: { type: Type.STRING, description: "Nueva fecha YYYY-MM-DD" },
      newTime: { type: Type.STRING, description: "Nueva hora HH:MM" }
    },
    required: ["appointmentId", "newDate", "newTime"]
  }
};

const declarationCancelAppointment: FunctionDeclaration = {
  name: "cancelAppointment",
  description: "Cancela una cita existente (requiere ID de la cita).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      appointmentId: { type: Type.STRING, description: "ID de la cita encontrada con findAppointment" }
    },
    required: ["appointmentId"]
  }
};

const declarationGetServiceDetails: FunctionDeclaration = {
  name: "getServiceDetails",
  description: "Consulta detalles, precio y duración de un servicio.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      serviceName: { type: Type.STRING, description: "Nombre del servicio" }
    },
    required: ["serviceName"]
  }
};

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onClose, settings, appointments, setAppointments, doctors, branches = [], patients = [], setPatients }) => {
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
  const branchesRef = useRef(branches);
  const scheduleRef = useRef(settings.globalSchedule);
  const regionRef = useRef(settings.region);

  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);
  useEffect(() => { patientsRef.current = patients; }, [patients]);
  useEffect(() => { doctorsRef.current = doctors; }, [doctors]);
  useEffect(() => { branchesRef.current = branches; }, [branches]);
  useEffect(() => { scheduleRef.current = settings.globalSchedule; }, [settings.globalSchedule]);
  useEffect(() => { regionRef.current = settings.region; }, [settings.region]);

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

  const isClinicOpen = (dateStr: string, timeStr: string): boolean => {
    const globalSchedule = scheduleRef.current;
    if (!globalSchedule) return true; 
    
    const date = new Date(dateStr);
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = dayNames[date.getDay()];
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

      const scheduleDesc = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => {
          const s = settings.globalSchedule?.[d];
          if (!s) return `${d}: CERRADO`;
          const m = s.morning.active ? `${s.morning.start}-${s.morning.end}` : '';
          const a = s.afternoon.active ? `${s.afternoon.start}-${s.afternoon.end}` : '';
          return `${d}: ${m} ${a}`.trim();
      }).join('\n');

      const branchInfo = branches.map(b => b.name).join(', ') || "Sede Central";
      
      // Mapeo de acentos para instrucción de sistema
      const accentNames: Record<string, string> = {
        'es-ES-Madrid': 'Español de España (acento de Madrid)',
        'es-ES-Canarias': 'Español de España (acento canario suave)',
        'es-LATAM': 'Español Latinoamericano neutro',
        'en-GB': 'British English',
        'en-US': 'American English'
      };
      
      const selectedAccent = accentNames[settings.aiPhoneSettings.accent] || accentNames['es-ES-Madrid'];

      const systemInstruction = `
        ${settings.aiPhoneSettings.systemPrompt}
        
        # REGLAS LINGÜÍSTICAS CRÍTICAS:
        - Tu idioma y acento ES: ${selectedAccent}.
        - DEBES hablar SIEMPRE con este acento, independientemente de la voz asignada.
        - Usa giros lingüísticos y modismos propios de esta región para sonar natural.
        - Nunca cambies de acento durante la llamada.

        # DATOS DE LA CLÍNICA:
        - FECHA HOY: ${new Date().toLocaleDateString('es-ES')}
        - HORA ACTUAL: ${new Date().toLocaleTimeString('es-ES')}
        - SUCURSALES: ${branchInfo}
        - HORARIOS: 
        ${scheduleDesc}

        # REGLAS DE ORO:
        1. VALIDACIÓN ESTRICTA: Si el usuario quiere una cita fuera de horario, dile que está cerrado y propón un hueco válido.
        2. DATOS PACIENTE: Si es nuevo, PIDE DNI Y TELÉFONO. No inventes datos.
        3. CONFIRMACIÓN: Al agendar, repite claramente: "Cita agendada para [Paciente] el [Día] a las [Hora] en [Sucursal]".
        4. USO DE TOOLS: findAppointment, createAppointment, rescheduleAppointment, cancelAppointment.
      `;

      const sessionPromise = ai.live.connect({
        model: settings.aiPhoneSettings.model,
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const input = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
              const base64 = encode(new Uint8Array(int16.buffer));
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(processor);
            processor.connect(audioContextRef.current!.destination);
            
            // Forzamos el saludo con la instrucción de acento
            const greetingWithAccent = `SISTEMA: Saluda en ${selectedAccent} diciendo: "${settings.aiPhoneSettings.initialGreeting}"`;
            sessionPromise.then(s => s.sendRealtimeInput([{ text: greetingWithAccent }]));
          },
          onmessage: async (m: LiveServerMessage) => {
            if (m.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const ctx = outputAudioContextRef.current;
              if (ctx && ctx.state === 'suspended') await ctx.resume();
              if (ctx) {
                  const base64 = m.serverContent.modelTurn.parts[0].inlineData.data;
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
            }
            if (m.serverContent?.inputTranscription) {
               setTranscription(prev => prev + ' ' + m.serverContent?.inputTranscription?.text);
            }
            if (m.toolCall) {
                const functionResponses = m.toolCall.functionCalls.map(fc => {
                    const args = fc.args as any;
                    let result: any = { error: "Unknown error" };
                    try {
                        if (fc.name === "findAppointment") {
                            const query = args.patientName.toLowerCase();
                            const matches = appointmentsRef.current.filter(a => a.patientName.toLowerCase().includes(query) && a.status !== 'Cancelled');
                            const patient = patientsRef.current.find(p => p.name.toLowerCase().includes(query));
                            result = {
                                found: !!patient || matches.length > 0,
                                patient: patient ? { id: patient.id, name: patient.name, phone: patient.phone, email: patient.email } : null,
                                appointments: matches.map(a => ({ id: a.id, date: a.date, time: a.time, branch: a.branch })),
                                message: patient ? "Paciente encontrado." : "No se encontró paciente, crear ficha nueva."
                            };
                        }
                        else if (fc.name === "checkAvailability") {
                            const isOpen = isClinicOpen(args.date, args.time);
                            const isBusy = appointmentsRef.current.some(a => a.date === args.date && a.time === args.time && a.status !== 'Cancelled');
                            result = { available: isOpen && !isBusy, reason: !isOpen ? "Clínica cerrada" : (isBusy ? "Horario ocupado" : "Libre") };
                        }
                        else if (fc.name === "createAppointment") {
                            const today = new Date().toISOString().split('T')[0];
                            if (args.date < today) throw new Error("Fecha en el pasado");
                            if (!isClinicOpen(args.date, args.time)) throw new Error("Clínica cerrada en ese horario");
                            if (args.phone) {
                                const val = validatePhone(args.phone, regionRef.current);
                                if (!val.valid) throw new Error(val.error || "Teléfono inválido");
                            }
                            let patientId = "";
                            const existingP = patientsRef.current.find(p => p.name.toLowerCase().includes(args.patientName.toLowerCase()));
                            if (existingP) {
                                patientId = existingP.id;
                                if (!existingP.phone && args.phone && setPatients) {
                                    setPatients(prev => prev.map(p => p.id === existingP.id ? { ...p, phone: args.phone } : p));
                                }
                            } else {
                                if (setPatients) {
                                    const newP: Patient = {
                                        id: 'P-' + Date.now(),
                                        name: args.patientName,
                                        identityDocument: args.dni || 'PENDIENTE',
                                        phone: args.phone || '',
                                        email: '', address: '', gender: 'Otro',
                                        birthDate: today, medicalHistory: 'Alta vía Voz',
                                        img: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=' + args.patientName,
                                        history: []
                                    };
                                    setPatients(prev => [...prev, newP]);
                                    patientId = newP.id;
                                } else { patientId = 'TEMP-' + Date.now(); }
                            }
                            let docId = doctorsRef.current[0]?.id || "D1";
                            let docName = doctorsRef.current[0]?.name || "Dr. Asignado";
                            let branch = args.branchName;
                            if (args.doctorName) {
                                const d = doctorsRef.current.find(doc => doc.name.toLowerCase().includes(args.doctorName.toLowerCase()));
                                if (d) { docId = d.id; docName = d.name; if (!branch) branch = d.branch; }
                            }
                            if (!branch) { branch = doctorsRef.current.find(d => d.id === docId)?.branch || branchesRef.current[0]?.name || "Centro"; }
                            const knownBranch = branchesRef.current.find(b => b.name.toLowerCase() === branch?.toLowerCase());
                            if (knownBranch) branch = knownBranch.name;

                            const newApt: Appointment = {
                                id: 'APT-' + Date.now(),
                                patientId, patientName: args.patientName,
                                doctorId: docId, doctorName: docName,
                                branch: branch || "Centro",
                                date: args.date, time: args.time,
                                treatment: args.treatment || "Consulta General",
                                status: 'Confirmed'
                            };
                            setAppointments(prev => [...prev, newApt]);
                            result = { success: true, appointmentId: newApt.id, message: `Cita confirmada: ${newApt.date} a las ${newApt.time} en ${newApt.branch}.` };
                        }
                        else if (fc.name === "rescheduleAppointment") {
                            const apt = appointmentsRef.current.find(a => a.id === args.appointmentId);
                            if (!apt) throw new Error("Cita no encontrada");
                            if (!isClinicOpen(args.newDate, args.newTime)) throw new Error("Clínica cerrada en nuevo horario");
                            setAppointments(prev => prev.map(a => a.id === args.appointmentId ? { ...a, date: args.newDate, time: args.newTime, status: 'Rescheduled' } : a));
                            result = { success: true, message: "Cita reprogramada con éxito." };
                        }
                        else if (fc.name === "cancelAppointment") {
                            const apt = appointmentsRef.current.find(a => a.id === args.appointmentId);
                            if (!apt) throw new Error("Cita no encontrada");
                            setAppointments(prev => prev.map(a => a.id === args.appointmentId ? { ...a, status: 'Cancelled' } : a));
                            result = { success: true, message: "Cita cancelada." };
                        }
                    } catch (e: any) { result = { success: false, error: e.message }; }
                    return { id: fc.id, name: fc.name, response: { result } };
                });
                sessionPromise.then(s => s.sendToolResponse({ functionResponses }));
            }
          },
          onclose: () => { setIsActive(false); setIsConnecting(false); },
          onerror: (e) => { console.error(e); setIsActive(false); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.aiPhoneSettings.voiceName as any } } },
          systemInstruction,
          tools: [{ functionDeclarations: [declarationFindAppointment, declarationCheckAvailability, declarationCreateAppointment, declarationRescheduleAppointment, declarationCancelAppointment, declarationUpdatePatient, declarationGetServiceDetails] }]
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { console.error(e); setIsConnecting(false); }
  };

  const stopSession = () => {
    try {
        if (sessionRef.current) sessionRef.current.close();
        if (audioContextRef.current) audioContextRef.current.close();
        if (outputAudioContextRef.current) outputAudioContextRef.current.close();
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    } catch(e) {}
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
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-2 bg-white/5 py-1 px-3 rounded-full mx-auto w-fit italic">
                    Configuración: {settings.aiPhoneSettings.accent}
                </p>
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
                <p className="text-xs text-slate-400 font-mono italic">
                    {transcription || "Escuchando..."}
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default VoiceAssistant;
