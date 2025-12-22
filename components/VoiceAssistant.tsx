
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

const declarationFindAppointment: FunctionDeclaration = {
  name: "findAppointment",
  description: "Busca a un paciente por su nombre completo en la base de datos de la clínica. Devuelve su ID y detalles clínicos si existe. Úsala obligatoriamente cuando el paciente se identifique por primera vez.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      patientName: { type: Type.STRING, description: "Nombre completo del paciente para buscar." }
    },
    required: ["patientName"]
  }
};

const declarationValidateContactInfo: FunctionDeclaration = {
  name: "validateContactInfo",
  description: "Verifica si el teléfono y el correo electrónico dictados cumplen con el formato regional configurado para la clínica. Esta validación es obligatoria antes de proceder con el registro de un nuevo paciente.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      phone: { type: Type.STRING, description: "Número de teléfono dictado por el usuario." },
      email: { type: Type.STRING, description: "Dirección de correo electrónico dictada por el usuario." }
    },
    required: ["phone", "email"]
  }
};

const declarationCreateAppointment: FunctionDeclaration = {
  name: "createAppointment",
  description: "Registra formalmente una cita en el sistema. Si el paciente es nuevo, esta función creará automáticamente su expediente utilizando los datos previamente validados.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      patientName: { type: Type.STRING, description: "Nombre completo del paciente." },
      date: { type: Type.STRING, description: "Fecha de la cita en formato YYYY-MM-DD." },
      time: { type: Type.STRING, description: "Hora de la cita en formato HH:MM." },
      treatment: { type: Type.STRING, description: "Tipo de servicio o tratamiento solicitado." },
      isNewPatient: { type: Type.BOOLEAN, description: "Indicar verdadero si el paciente no existía en el sistema." },
      phone: { type: Type.STRING, description: "Teléfono del paciente (solo para nuevos registros)." },
      email: { type: Type.STRING, description: "Email del paciente (solo para nuevos registros)." }
    },
    required: ["patientName", "date", "time", "treatment"]
  }
};

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onClose, settings, appointments, setAppointments, doctors, branches = [], patients = [], setPatients }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const patientsRef = useRef(patients);
  const appointmentsRef = useRef(appointments);
  useEffect(() => { patientsRef.current = patients; }, [patients]);
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);

  // --- REGIONAL VALIDATION ENGINE (EXTENDED) ---
  const validateData = (phone: string, email: string) => {
    const region = settings.region || 'ES';
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    let isPhoneValid = false;
    let errorMsg = "";

    switch(region) {
      case 'ES': // España: 9 dígitos, empieza por 6, 7, 8 o 9
        isPhoneValid = /^[6789]\d{8}$/.test(cleanPhone);
        if (!isPhoneValid) errorMsg = "El teléfono en España debe tener 9 dígitos y empezar por 6, 7, 8 o 9.";
        break;
      case 'MX': // México: 10 dígitos
      case 'US': // EE.UU: 10 dígitos
        isPhoneValid = /^\d{10}$/.test(cleanPhone);
        if (!isPhoneValid) errorMsg = `En ${region === 'MX' ? 'México' : 'EE.UU.'} el teléfono debe tener exactamente 10 dígitos.`;
        break;
      case 'CO': // Colombia
        isPhoneValid = cleanPhone.length === 10;
        if (!isPhoneValid) errorMsg = "El número móvil en Colombia debe tener 10 dígitos.";
        break;
      case 'AR': // Argentina
        isPhoneValid = cleanPhone.length >= 10 && cleanPhone.length <= 13;
        if (!isPhoneValid) errorMsg = "El formato de teléfono para Argentina es inválido.";
        break;
      case 'BZ': case 'CR': case 'SV': case 'GT': case 'HN': case 'NI': case 'PA': // Centroamérica
        isPhoneValid = cleanPhone.length === 8;
        if (!isPhoneValid) errorMsg = `En ${region}, el número de teléfono debe tener 8 dígitos.`;
        break;
      default:
        isPhoneValid = cleanPhone.length >= 7 && cleanPhone.length <= 15;
    }

    const isEmailValid = emailRegex.test(email);
    if (!isEmailValid) errorMsg += (errorMsg ? " Además, el " : "El ") + "correo electrónico no tiene un formato válido.";

    return { valid: isPhoneValid && isEmailValid, error: errorMsg || null };
  };

  // --- MANUAL ENCODING / DECODING ---
  function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  }

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const systemInstruction = `
        Eres ${settings.aiPhoneSettings.assistantName}, la recepción virtual avanzada de la clínica ${settings.name}. 
        Operas en la región de ${settings.region}, por lo que conoces perfectamente sus formatos de contacto.

        # COMPORTAMIENTO INMEDIATO:
        1. Debes saludar de inmediato usando EXACTAMENTE este texto: "${settings.aiPhoneSettings.initialGreeting}".
        2. Si tras saludar el paciente no dice su nombre, pídelo amablemente.

        # FLUJO DE IDENTIFICACIÓN:
        1. Una vez tengas el nombre, usa 'findAppointment' para verificar su existencia.
        2. PACIENTE ANTIGUO: Dale la bienvenida personalizada. Menciona que ya tienes sus datos y pregunta cómo puedes ayudarle.
        3. PACIENTE NUEVO: Infórmale con calidez que no está en el sistema pero que le darás de alta ahora mismo. 
           - DEBES PEDIR: Teléfono y Correo Electrónico.
           - NO PIDAS DNI (no es obligatorio por voz).
           - Una vez te dé los datos, USA 'validateContactInfo'. 
           - Si la validación falla por formato regional (longitud, prefijos), dile exactamente por qué y pide que lo repita.

        # AGENDAMIENTO:
        - Verifica siempre disponibilidad.
        - Tras confirmar la cita con 'createAppointment', el sistema creará automáticamente la ficha si es un nuevo ingreso.
        - Sé siempre eficiente, empática y mantén un tono profesional.
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then((session) => { session.sendRealtimeInput({ media: pcmBlob }); });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
            
            // DISPARO INMEDIATO DEL SALUDO AL CONECTAR
            sessionPromise.then(s => s.sendRealtimeInput([{ text: `SISTEMA: Saluda ahora mismo al usuario. Tu saludo configurado es: "${settings.aiPhoneSettings.initialGreeting}". Habla tú primero sin esperar.` }]));
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => { sourcesRef.current.delete(source); });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current.values()) { source.stop(); sourcesRef.current.delete(source); }
              nextStartTimeRef.current = 0;
            }

            if (message.toolCall) {
                const functionResponses = message.toolCall.functionCalls.map(fc => {
                    const args = fc.args as any;
                    let result: any = { error: "Datos no procesables" };
                    
                    if (fc.name === "findAppointment") {
                        const p = patientsRef.current.find(p => p.name.toLowerCase().includes(args.patientName.toLowerCase()));
                        if (p) {
                            result = { found: true, name: p.name, id: p.id, info: "Paciente registrado en base de datos." };
                        } else {
                            result = { found: false, message: "No se encuentra el paciente. Proceder a captura de teléfono y email para alta masiva." };
                        }
                    } else if (fc.name === "validateContactInfo") {
                        const validation = validateData(args.phone, args.email);
                        result = { valid: validation.valid, reason: validation.error };
                    } else if (fc.name === "createAppointment") {
                        let finalPatientId = "";
                        let finalPatientName = args.patientName;

                        if (args.isNewPatient && setPatients) {
                            finalPatientId = 'P' + Math.floor(Math.random() * 10000);
                            const newPatient: Patient = {
                                id: finalPatientId,
                                name: args.patientName,
                                birthDate: "1990-01-01",
                                gender: 'Otro',
                                identityDocument: "ALTA VÍA VOZ",
                                phone: args.phone || "",
                                email: args.email || "",
                                address: `Alta automática desde Asistente de Voz (${settings.region})`,
                                img: `https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${args.patientName}`,
                                allergies: [], pathologies: [], surgeries: [], medications: [], habits: [], familyHistory: [],
                                medicalHistory: `Expediente generado por el asistente virtual ${settings.aiPhoneSettings.assistantName} durante llamada de registro.`,
                                history: [{ date: new Date().toISOString().split('T')[0], action: 'Alta Voz', description: 'Registro creado automáticamente mediante conversación fluida con IA.' }]
                            };
                            setPatients(prev => [...prev, newPatient]);
                        } else {
                            const p = patientsRef.current.find(p => p.name.toLowerCase().includes(args.patientName.toLowerCase()));
                            finalPatientId = p?.id || "P-VOZ";
                            finalPatientName = p?.name || args.patientName;
                        }

                        const newApt: Appointment = {
                            id: 'APT-' + Math.random().toString(36).substr(2, 9),
                            patientId: finalPatientId,
                            patientName: finalPatientName,
                            doctorId: doctors[0].id,
                            doctorName: doctors[0].name,
                            date: args.date,
                            time: args.time,
                            treatment: args.treatment,
                            status: 'Confirmed',
                            branch: doctors[0].branch
                        };
                        setAppointments(prev => [...prev, newApt]);
                        result = { success: true, message: `Cita confirmada para el día ${args.date} a las ${args.time}.` };
                    }
                    
                    return { id: fc.id, name: fc.name, response: { result } };
                });
                sessionPromise.then(s => s.sendToolResponse({ functionResponses }));
            }
          },
          onerror: (e) => { console.error('Error Live API:', e); setIsConnecting(false); },
          onclose: () => { setIsActive(false); setIsConnecting(false); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.aiPhoneSettings.voiceName as any } } },
          systemInstruction,
          tools: [{ functionDeclarations: [declarationFindAppointment, declarationValidateContactInfo, declarationCreateAppointment] }]
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      console.error('Fallo al iniciar sesión de voz:', e);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setIsActive(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[250] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
      <div className="max-w-3xl w-full flex flex-col items-center gap-12 text-center">
        <button onClick={() => { stopSession(); onClose(); }} className="absolute top-10 right-10 text-slate-400 hover:text-white transition-all">
          <span className="material-symbols-outlined text-5xl">close</span>
        </button>
        
        <div className="flex flex-col items-center gap-6">
          <div className={`size-56 rounded-[3.5rem] bg-primary/10 flex items-center justify-center border-4 border-primary/20 transition-all duration-700 ${isActive ? 'scale-110 shadow-[0_0_100px_rgba(59,130,246,0.3)]' : ''}`}>
             {isActive ? (
               <div className="flex items-center gap-2">
                 {[...Array(6)].map((_, i) => (
                   <div key={i} className="w-2.5 bg-primary rounded-full animate-bounce" style={{ height: '60px', animationDelay: `${i * 0.1}s` }}></div>
                 ))}
               </div>
             ) : (
               <span className="material-symbols-outlined text-8xl text-primary">contact_phone</span>
             )}
          </div>
          
          <div className="space-y-4">
             <h2 className="text-white text-5xl font-display font-black tracking-tight uppercase">
                {isActive ? 'Conversación Activa' : isConnecting ? 'Estableciendo Conexión...' : settings.aiPhoneSettings.assistantName}
             </h2>
             <p className="text-slate-400 text-sm font-black uppercase tracking-[0.3em]">
                {settings.name} • Central de Llamadas {settings.region}
             </p>
          </div>
        </div>

        {!isActive && !isConnecting && (
          <button onClick={startSession} className="bg-primary text-white px-20 py-7 rounded-[2.5rem] font-black text-2xl hover:scale-105 transition-all shadow-[0_20px_50px_rgba(59,130,246,0.4)] flex items-center gap-6 uppercase tracking-tighter">
            <span className="material-symbols-outlined text-4xl">call</span> Iniciar Atención AI
          </button>
        )}
        
        {isActive && (
          <button onClick={stopSession} className="bg-danger text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-3 shadow-lg">
            <span className="material-symbols-outlined">call_end</span> Finalizar Llamada
          </button>
        )}
        
        <div className="mt-8 p-8 bg-white/5 rounded-[2.5rem] border border-white/10 max-w-md backdrop-blur-md">
            <p className="text-xs text-slate-400 italic leading-relaxed">
              "El asistente identificará automáticamente su región para validar su teléfono e email, permitiéndole agendar o registrarse en segundos."
            </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
