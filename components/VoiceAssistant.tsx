
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
  patients?: Patient[]; 
  setPatients?: React.Dispatch<React.SetStateAction<Patient[]>>; // Needed for creating patients
}

// --- HERRAMIENTAS (TOOLS) PARA EL MODELO ---

// 1. BUSCAR CITA Y PACIENTE (ENRICHED)
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

const declarationCreateAppointment: FunctionDeclaration = {
  name: "createAppointment",
  description: "Agenda una nueva cita. Si el paciente NO existe, CREA UNA FICHA NUEVA (requiere DNI y Teléfono). Si existe pero le faltan datos, los actualiza.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      patientName: { type: Type.STRING, description: "Nombre COMPLETO del paciente (Nombre y Apellidos)" },
      date: { type: Type.STRING, description: "Fecha en formato YYYY-MM-DD" },
      time: { type: Type.STRING, description: "Hora en formato HH:MM" },
      treatment: { type: Type.STRING, description: "Nombre del tratamiento o servicio" },
      doctorName: { type: Type.STRING, description: "Nombre del doctor preferido (opcional)" },
      branchName: { type: Type.STRING, description: "Nombre de la sucursal o sede donde se agenda la cita (OBLIGATORIO si hay más de 1 sucursal)" },
      dni: { type: Type.STRING, description: "DNI o Documento de Identidad (OBLIGATORIO si es paciente nuevo)" },
      phone: { type: Type.STRING, description: "Teléfono de contacto (OBLIGATORIO si es paciente nuevo o no lo tiene)" }
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
  const servicesRef = useRef(settings.services);
  const scheduleRef = useRef(settings.globalSchedule);
  const policyRef = useRef(settings.appointmentPolicy);

  // Sync refs with props
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);
  useEffect(() => { patientsRef.current = patients; }, [patients]);
  useEffect(() => { doctorsRef.current = doctors; }, [doctors]);
  useEffect(() => { branchesRef.current = branches; }, [branches]);
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

      // Generate Branch Info
      const branchInfo = branches.length > 0 
        ? branches.map(b => `${b.name} (${b.city})`).join(', ')
        : "Sede Central (Única)";

      const branchPromptLogic = settings.branchCount > 1
        ? `TIENES ${settings.branchCount} SUCURSALES: ${branchInfo}. CUANDO EL USUARIO QUIERA AGENDAR, PREGUNTA SIEMPRE A QUÉ SUCURSAL QUIERE IR.`
        : `SOLO HAY UNA SUCURSAL: ${branchInfo}. NO HACE FALTA PREGUNTAR LUGAR.`;

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
        
        # SUCURSALES Y UBICACIÓN:
        ${branchPromptLogic}

        # BASE DE CONOCIMIENTOS:
        ${kbContext}

        # HORARIO DE APERTURA:
        ${scheduleDesc}
        NO AGENDAR fuera de este horario.

        # REGLAS FUNDAMENTALES DE INTERACCIÓN:

        1. **TU HABLAS PRIMERO Y AL INSTANTE**:
           - En cuanto conecte la llamada, di tu saludo configurado. NO ESPERES A QUE EL USUARIO DIGA "HOLA".
           - NO PUEDE HABER SILENCIOS INICIALES.

        2. **GESTIÓN DE PACIENTES (CRÍTICO - LEE ATENTAMENTE)**:
           - **Identificación**: Cuando el usuario diga su nombre, usa 'findAppointment'.
           - **Paciente NUEVO**: Si 'findAppointment' dice que NO existe:
             - DEBES pedir **Nombre Completo, DNI y Teléfono** antes de confirmar la cita.
             - Una vez tengas los datos, usa 'createAppointment' pasando el DNI y el Teléfono.
           - **Paciente EXISTENTE**:
             - Si 'findAppointment' dice que falta el Teléfono en su ficha, PÍDESELO.
             - Si tiene todo (Nombre, DNI, Teléfono), NO pidas nada, solo agenda.

        3. **TRATAMIENTO DEL NOMBRE (NATURALIDAD)**:
           - Una vez el usuario te diga su nombre, ÚSALO.
           - **REGLA DE ORO**: No repitas el nombre completo todo el tiempo.
           - Usa solo el nombre de pila (ej: "Claro Adexe") O usa "Señor/Señora Apellido".

        4. **NOMBRE COMPLETO**:
           - Para crear ficha nueva, pide SIEMPRE "Nombre y Apellidos".

        # TUS HERRAMIENTAS:
        - findAppointment: Úsala para ver si existe y QUÉ DATOS TIENE/FALTAN.
        - createAppointment: CREA FICHA (si es nuevo) y AGENDA. IMPORTANTE: Si hay varias sucursales, pasa el 'branchName'.
        - rescheduleAppointment: Requiere ID.
        - cancelAppointment: Requiere ID.
        - checkAvailability: Consultar huecos.

        # SALUDO CONFIGURADO:
        "${settings.aiPhoneSettings.initialGreeting}"
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

            // 2. FORCE INITIAL GREETING IMMEDIATELY
            // Mensaje imperativo para eliminar el silencio inicial.
            sessionPromise.then(s => s.sendRealtimeInput([{ 
                text: `SISTEMA: La llamada ha conectado. El usuario está esperando. DI TU SALUDO INICIAL AHORA MISMO: "${settings.aiPhoneSettings.initialGreeting}"` 
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
                        // TOOL: FIND APPOINTMENT
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
                                // IMPORTANT: If not found, tell the model it is a NEW PATIENT
                                result = { 
                                    found: false, 
                                    message: "No encontré paciente con ese nombre. Es un PACIENTE NUEVO. Pídele DNI y Teléfono para crearle la ficha al agendar." 
                                };
                            } else {
                                result = { 
                                    found: true, 
                                    patientContext: patientProfile ? {
                                        name: patientProfile.name,
                                        hasPhone: !!patientProfile.phone,
                                        hasDNI: !!patientProfile.identityDocument,
                                        message: !patientProfile.phone ? "IMPORTANTE: El paciente existe pero NO tiene teléfono registrado. Pídeselo." : "Datos completos."
                                    } : "Perfil no encontrado, solo citas.",
                                    matches: matches.map(a => ({
                                        id: a.id,
                                        date: a.date,
                                        time: a.time,
                                        treatment: a.treatment,
                                        branch: a.branch
                                    })),
                                    message: `Paciente encontrado. ${!patientProfile?.phone ? "FALTA TELÉFONO." : ""}`
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
                                result = { available: !busy, message: busy ? "Horario ocupado" : "Horario disponible" };
                            }
                        } 
                        else if (fc.name === "createAppointment") {
                            if (!isClinicOpen(args.date, args.time)) {
                                result = { success: false, message: "No se pudo agendar: La clínica está cerrada en ese horario." };
                            } else {
                                // LOGIC FOR PATIENT CREATION / UPDATE
                                let patientId = '';
                                const nameQuery = args.patientName.toLowerCase();
                                const existingPatient = patientsRef.current.find(p => p.name.toLowerCase().includes(nameQuery));

                                if (existingPatient) {
                                    // Patient exists
                                    patientId = existingPatient.id;
                                    // Update phone if missing and provided
                                    if (!existingPatient.phone && args.phone && setPatients) {
                                        setPatients(prev => prev.map(p => p.id === existingPatient.id ? { ...p, phone: args.phone } : p));
                                    }
                                } else {
                                    // NEW PATIENT: Create Record
                                    if (setPatients) {
                                        const newId = 'P-' + Math.floor(Math.random() * 100000);
                                        const newPatient: Patient = {
                                            id: newId,
                                            name: args.patientName,
                                            birthDate: new Date().toISOString().split('T')[0], // Default
                                            gender: 'Otro', // Default
                                            identityDocument: args.dni || 'Sin DNI',
                                            phone: args.phone || '',
                                            email: '',
                                            address: '',
                                            medicalHistory: 'Alta automática por Asistente de Voz',
                                            img: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=NewUser&backgroundColor=e2e8f0',
                                            history: [{ date: new Date().toISOString().split('T')[0], action: 'Alta Voz', description: 'Creado por Asistente IA' }]
                                        };
                                        setPatients(prev => [...prev, newPatient]);
                                        patientId = newId;
                                    } else {
                                        // Fallback if no setPatients (should not happen based on props)
                                        patientId = 'P-VOICE-' + Date.now();
                                    }
                                }

                                // FIND DOCTOR BY BRANCH (IF SPECIFIED)
                                let assignedDoctorId = doctorsRef.current[0]?.id || "D1";
                                let assignedDoctorName = doctorsRef.current[0]?.name || "Dr. Asignado";
                                
                                if (args.branchName) {
                                    const branchDoc = doctorsRef.current.find(d => d.branch.toLowerCase().includes(args.branchName.toLowerCase()));
                                    if (branchDoc) {
                                        assignedDoctorId = branchDoc.id;
                                        assignedDoctorName = branchDoc.name;
                                    }
                                } else if (args.doctorName) {
                                    const nameDoc = doctorsRef.current.find(d => d.name.toLowerCase().includes(args.doctorName.toLowerCase()));
                                    if (nameDoc) {
                                        assignedDoctorId = nameDoc.id;
                                        assignedDoctorName = nameDoc.name;
                                    }
                                }

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
                                    patientId: patientId,
                                    patientName: args.patientName,
                                    date: args.date,
                                    time: args.time,
                                    treatment: args.treatment,
                                    doctorName: assignedDoctorName,
                                    doctorId: assignedDoctorId,
                                    branch: args.branchName || "Sede Central",
                                    status: initialStatus
                                };
                                setAppointments(prev => [...prev, newApt]);
                                
                                result = { 
                                    success: true, 
                                    id: newApt.id, 
                                    message: existingPatient 
                                        ? `Cita agendada correctamente en ${newApt.branch}.` 
                                        : `Ficha creada y cita agendada en ${newApt.branch}.` 
                                };
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
                                    result = { success: false, message: "Error interno: ID de cita no encontrado." };
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
                                result = { success: false, message: "Error interno: ID de cita no encontrado." };
                            }
                        }
                        else if (fc.name === "getServiceDetails") {
                            const service = servicesRef.current.find(s => s.name.toLowerCase().includes(args.serviceName.toLowerCase()));
                            if (service) {
                                result = { 
                                    found: true, 
                                    name: service.name, 
                                    price: service.price, 
                                    duration: service.duration
                                };
                            } else {
                                result = { found: false, message: "Servicio no encontrado." };
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
