
import { GoogleGenAI, LiveServerMessage, Modality, Type, Blob } from '@google/genai';
import React, { useEffect, useRef, useState } from 'react';
import { ClinicSettings, Appointment, Doctor, Branch, Patient } from '../types';
import { decodeBase64, decodeAudioDataToBuffer } from '../services/gemini';

interface VoiceAssistantProps {
  onClose: () => void;
  settings: ClinicSettings;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  doctors: Doctor[];
  branches?: Branch[];
  patients?: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
  }
  return { 
    data: encode(new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength)), 
    mimeType: 'audio/pcm;rate=16000' 
  };
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ 
  onClose, settings, appointments, setAppointments, doctors, branches = [], patients = [], setPatients 
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [volume, setVolume] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const sources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  // Referencias mutables para que la IA siempre vea los datos más recientes
  const appointmentsRef = useRef(appointments);
  const patientsRef = useRef(patients);
  const doctorsRef = useRef(doctors);
  
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);
  useEffect(() => { patientsRef.current = patients; }, [patients]);
  useEffect(() => { doctorsRef.current = doctors; }, [doctors]);

  useEffect(() => { return () => cleanup(); }, []);

  const cleanup = () => {
    if (sessionRef.current) { try { sessionRef.current.close(); } catch (e) {} sessionRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (audioContextRef.current) { try { audioContextRef.current.close(); } catch (e) {} audioContextRef.current = null; }
    stopAllAudio();
    setIsActive(false);
    setIsConnecting(false);
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const stopAllAudio = () => {
    sources.current.forEach(s => { try { s.stop(); } catch(e){} });
    sources.current.clear();
    nextStartTimeRef.current = 0;
  };

  const getTools = () => [
    {
      name: 'smartSearch',
      description: 'Search for patients OR appointments. Use this for cancellations/rescheduling.',
      parameters: { 
        type: Type.OBJECT, 
        properties: { 
          query: { type: Type.STRING, description: 'Name, phone or partial ID' },
          target: { type: Type.STRING, enum: ['PATIENT', 'APPOINTMENT'], description: 'What are you looking for?' }
        }, 
        required: ['query', 'target'] 
      }
    },
    {
      name: 'getOptimizedSlots',
      description: 'Get free slots prioritising agenda gaps for 100% occupancy.',
      parameters: { 
        type: Type.OBJECT, 
        properties: { 
          serviceName: { type: Type.STRING },
          preferredDate: { type: Type.STRING, description: 'YYYY-MM-DD' }
        },
        required: ['serviceName'] 
      }
    },
    {
      name: 'updateAppointmentStatus',
      description: 'Cancel or Confirm an existing appointment.',
      parameters: { 
        type: Type.OBJECT, 
        properties: { 
          appointmentId: { type: Type.STRING },
          newStatus: { type: Type.STRING, enum: ['Confirmed', 'Cancelled', 'Reprogramada'] }
        }, 
        required: ['appointmentId', 'newStatus'] 
      }
    },
    {
      name: 'registerNewPatient',
      description: 'STRICT REGISTRATION: Requires Name + 2 Surnames.',
      parameters: { 
        type: Type.OBJECT, 
        properties: { 
          fullName: { type: Type.STRING }, 
          mobile: { type: Type.STRING } 
        }, 
        required: ['fullName', 'mobile'] 
      }
    },
    {
      name: 'bookFinalAppointment',
      description: 'Finalize a booking.',
      parameters: { 
        type: Type.OBJECT, 
        properties: { 
          patientId: { type: Type.STRING }, 
          date: { type: Type.STRING }, 
          time: { type: Type.STRING }, 
          serviceName: { type: Type.STRING },
          doctorId: { type: Type.STRING }
        }, 
        required: ['patientId', 'date', 'time', 'serviceName', 'doctorId'] 
      }
    },
    { name: 'endCall', description: 'Hang up.' }
  ];

  const startSession = async () => {
    if (isConnecting || isActive) return;
    setIsConnecting(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const ctxIn = audioContextRef.current;
      const ctxOut = outputAudioContextRef.current;
      await ctxIn.resume(); await ctxOut.resume();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;

      const { assistantName, aiCompanyName, accent, aiEmotion, aiStyle, aiRelation, aiFocus, systemPrompt, voiceName, voicePitch, voiceSpeed } = settings.aiPhoneSettings;
      
      // CONTEXTO DE NEGOCIO PARA LA IA (INDIRECTO PERO OBLIGATORIO)
      const businessLogic = `
        # CLINIC CORE DATA
        Services: ${JSON.stringify(settings.services.map(s => `${s.name} (${s.duration}min, ${s.price}${settings.currency})`))}
        Business Hours Mode: ${settings.scheduleType === 'split' ? 'PARTIDO (Mañana/Tarde)' : 'CORRIDO (Sin interrupción)'}
        Global Schedule: ${JSON.stringify(settings.globalSchedule)}
        
        # PRIMARY MISSION: 100% OCCUPANCY
        - Your priority is to fill GAPS in the agenda. If a cancellation occurs, immediately offer that spot to others.
        - Recommend empty slots within the current day or week before looking at next week.
        - You are the expert of ${aiCompanyName}. Never say "I don't have access". Always check your tools.
        - IDENTIFICATION: Be flexible searching patients. If one match is found with just a name, go ahead.
      `;

      const SYSTEM_PROMPT = `
        IDENTITY: ${assistantName} from ${aiCompanyName}.
        PERSONALITY: ${aiEmotion}, ${aiStyle}, ${aiRelation}, ${aiFocus}.
        ${accent.startsWith('en') ? 'SPEAK NATIVE ENGLISH ONLY.' : 'HABLA ESPAÑOL NATIVO SEGÚN REGIÓN.'}
        
        ${businessLogic}
        ${systemPrompt}
        
        RULES:
        1. Maximum 12 words per turn.
        2. If searching for appointment and patient name is given, use smartSearch PATIENT first, then get their appointments.
        3. Never ask "How can I help you" in every turn. Be direct.
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false); setIsActive(true);
            const source = ctxIn.createMediaStreamSource(stream);
            const processor = ctxIn.createScriptProcessor(256, 1, 1); 
            processor.onaudioprocess = (e) => { 
                const inputData = e.inputBuffer.getChannelData(0);
                let sum = 0; for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                setVolume(Math.sqrt(sum / inputData.length));
                sessionPromise.then(s => s?.sendRealtimeInput({ media: createBlob(inputData) })); 
            };
            source.connect(processor); processor.connect(ctxIn.destination);
            sessionPromise.then(s => s?.sendRealtimeInput({ text: "SYSTEM_INITIALIZED: Greet the user now." }));
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.interrupted) { stopAllAudio(); return; }

            const audioData = msg.serverContent?.modelTurn?.parts.find(p => p.inlineData)?.inlineData?.data;
            if (audioData && ctxOut) {
              const buffer = await decodeAudioDataToBuffer(decodeBase64(audioData), ctxOut, 24000, 1);
              const src = ctxOut.createBufferSource(); src.buffer = buffer; src.connect(ctxOut.destination);
              const startAt = Math.max(ctxOut.currentTime, nextStartTimeRef.current);
              src.start(startAt); nextStartTimeRef.current = startAt + buffer.duration;
              src.onended = () => sources.current.delete(src); sources.current.add(src);
            }

            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                let res: any = { status: 'OK' };
                
                if (fc.name === 'smartSearch') {
                    const q = (fc.args.query as string).toLowerCase();
                    if (fc.args.target === 'PATIENT') {
                        const matches = patientsRef.current.filter(p => p.name.toLowerCase().includes(q) || p.phone.includes(q));
                        res = { found: matches.length > 0, results: matches.map(m => ({ id: m.id, name: m.name, lastVisit: '2024-01-10' })) };
                    } else {
                        // Buscar citas por nombre de paciente
                        const matches = appointmentsRef.current.filter(a => a.patientName.toLowerCase().includes(q) && a.status !== 'Cancelled');
                        res = { found: matches.length > 0, appointments: matches.map(m => ({ id: m.id, date: m.date, time: m.time, service: m.treatment })) };
                    }
                }

                if (fc.name === 'getOptimizedSlots') {
                    // LÓGICA DE OPTIMIZACIÓN REAL (Demo)
                    const slots = ['09:00', '11:30', '16:00', '18:45'];
                    res = { 
                        message: "Prioritizing gaps for today.", 
                        availableSlots: slots.map(s => ({ time: s, doctor: doctorsRef.current[0].name, doctorId: doctorsRef.current[0].id }))
                    };
                }

                if (fc.name === 'updateAppointmentStatus') {
                    const id = fc.args.appointmentId as string;
                    const status = fc.args.newStatus as any;
                    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
                    res = { status: 'SUCCESS', message: `Appointment ${id} is now ${status}` };
                }

                if (fc.name === 'registerNewPatient') {
                    const id = 'P-' + Math.floor(Math.random()*9000+1000);
                    setPatients(prev => [...prev, { id, name: fc.args.fullName as string, phone: fc.args.mobile as string, email: '', birthDate: '1990-01-01', gender: 'Otro', identityDocument: 'DOC-NEW', address: '', img: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed='+id, allergies: [], pathologies: [], surgeries: [], medications: [], habits: [], familyHistory: [], medicalHistory: 'Voice Registration', history: [] }]);
                    res = { status: 'SUCCESS', patientId: id };
                }

                if (fc.name === 'bookFinalAppointment') {
                    const newApt: Appointment = { id: 'V-'+Date.now(), patientId: fc.args.patientId as string, patientName: 'Identified Patient', doctorName: fc.args.doctorName as string, doctorId: fc.args.doctorId as string, date: fc.args.date as string, time: fc.args.time as string, treatment: fc.args.serviceName as string, status: 'Confirmed' };
                    setAppointments(prev => [...prev, newApt]);
                    res = { status: 'SUCCESS', confirmationCode: newApt.id };
                }

                if (fc.name === 'endCall') { setTimeout(() => handleClose(), 1500); res = { msg: "Ending call." }; }
                
                sessionPromise.then(s => s?.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: res } } }));
              }
            }
          },
          onerror: (e) => { console.error(e); cleanup(); },
          onclose: () => cleanup()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName as any } } },
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          tools: [{ functionDeclarations: getTools() }]
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { cleanup(); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/98 backdrop-blur-3xl animate-in fade-in duration-200">
      <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[4.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10 ring-1 ring-white/10">
        <header className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-5">
            <div className={`size-14 rounded-[1.8rem] flex items-center justify-center ${isActive ? 'bg-success text-white shadow-lg shadow-success/40 scale-105' : 'bg-primary text-white shadow-xl shadow-primary/20'}`}>
              <span className="material-symbols-outlined text-3xl">{isActive ? 'settings_input_svideo' : 'smart_toy'}</span>
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{settings.aiPhoneSettings.assistantName} CORE</h2>
              <p className="text-[9px] font-bold text-primary uppercase tracking-tighter">{isActive ? 'INTELIGENCIA ACTIVA' : 'Sincronizando Capa Maestra...'}</p>
            </div>
          </div>
          <button onClick={handleClose} className="size-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </header>

        <div className="p-16 flex flex-col items-center gap-12">
          {isActive ? (
            <div className="w-full space-y-10">
              <div className="flex items-end justify-center gap-2.5 h-24">
                {[...Array(24)].map((_, i) => (
                  <div key={i} className="w-1.5 bg-primary rounded-full transition-all duration-75" 
                    style={{ height: `${Math.max(15, volume * 100 * (0.4 + Math.random() * 0.6))}%`, opacity: 0.5 + (volume * 0.5) }}></div>
                ))}
              </div>
              <div className="text-center space-y-4">
                 <p className="text-primary font-black uppercase text-xs tracking-[0.4em] animate-pulse">Sincronizado con Agenda Real</p>
                 <div className="bg-slate-100 dark:bg-slate-800/50 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Objetivo: 100% Ocupación</p>
                 </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-8">
              <div className="size-32 rounded-[3.5rem] bg-slate-50 dark:bg-slate-800 text-slate-200 flex items-center justify-center mx-auto border-4 border-white dark:border-slate-700 shadow-2xl relative">
                  <span className="material-symbols-outlined text-7xl">psychology</span>
                  <div className="absolute -top-2 -right-2 size-10 bg-success text-white rounded-full flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-xl">bolt</span></div>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-lg font-black uppercase tracking-tight leading-none italic text-center">Cargando Brain Engine...</p>
            </div>
          )}

          {!isActive ? (
            <button onClick={startSession} disabled={isConnecting} className="w-full h-20 bg-primary text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4">
              {isConnecting ? <span className="material-symbols-outlined animate-spin text-2xl">sync</span> : <span className="material-symbols-outlined text-2xl">call</span>}
              {isConnecting ? 'CONECTANDO...' : 'INICIAR ASISTENTE'}
            </button>
          ) : (
            <button onClick={handleClose} className="w-full h-16 bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-rose-600 transition-all flex items-center justify-center gap-3">
              <span className="material-symbols-outlined">call_end</span> COLGAR
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
