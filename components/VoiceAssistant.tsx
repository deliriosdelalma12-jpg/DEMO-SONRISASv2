
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
    // Clamping para evitar distorsión y asegurar 16-bit PCM lineal
    int16[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
  }
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
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

  // Referencias para que la IA tenga datos frescos sin re-renders costosos
  const appointmentsRef = useRef(appointments);
  const patientsRef = useRef(patients);
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);
  useEffect(() => { patientsRef.current = patients; }, [patients]);

  useEffect(() => { return () => cleanup(); }, []);

  const cleanup = () => {
    if (sessionRef.current) { try { sessionRef.current.close(); } catch (e) {} sessionRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (audioContextRef.current) { try { audioContextRef.current.close(); } catch (e) {} audioContextRef.current = null; }
    stopAllAudio();
    setIsActive(false);
    setIsConnecting(false);
  };

  const stopAllAudio = () => {
    sources.current.forEach(s => { try { s.stop(); } catch(e){} });
    sources.current.clear();
    nextStartTimeRef.current = 0;
  };

  const getTools = () => [
    {
      name: 'checkPatientExists',
      description: 'Busca paciente por nombre completo y dos apellidos.',
      parameters: { type: Type.OBJECT, properties: { fullName: { type: Type.STRING } }, required: ['fullName'] }
    },
    {
      name: 'registerNewPatient',
      description: 'Registra nuevo paciente.',
      parameters: { type: Type.OBJECT, properties: { fullName: { type: Type.STRING }, phone: { type: Type.STRING } }, required: ['fullName', 'phone'] }
    },
    {
      name: 'bookAppointment',
      description: 'Agenda cita.',
      parameters: { type: Type.OBJECT, properties: { patientId: { type: Type.STRING }, date: { type: Type.STRING }, time: { type: Type.STRING } }, required: ['patientId', 'date', 'time'] }
    },
    { name: 'endCall', description: 'Cuelga la llamada.' }
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
      await ctxIn.resume();
      await ctxOut.resume();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;

      const SYSTEM_PROMPT = `
        # MODO ULTRA-LATENCIA BAJA
        Eres la recepcionista virtual de ${settings.aiPhoneSettings.aiCompanyName}.
        
        # REGLAS CRÍTICAS DE CONVERSACIÓN:
        1. CONCISIÓN EXTREMA: Tus frases deben ser cortas (máx. 15 palabras). No des rodeos.
        2. VELOCIDAD: Responde de inmediato. Si necesitas pensar, hazlo mientras hablas brevemente.
        3. INTERRUPCIÓN: Si el usuario te interrumpe, cállate y escucha.
        4. CIERRE SEGURO: Antes de colgar pregunta "¿Desea algo más?". Solo usa 'endCall' si dicen que no.
        
        # IDENTIDAD:
        Te llamas ${settings.aiPhoneSettings.assistantName}. Saluda con: "Hola, clínica ${settings.aiPhoneSettings.aiCompanyName}, le atiende ${settings.aiPhoneSettings.assistantName}. ¿En qué le ayudo?"
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            const source = ctxIn.createMediaStreamSource(stream);
            // OPTIMIZACIÓN: Buffer de 512 para reducir latencia de captura a ~30ms
            const processor = ctxIn.createScriptProcessor(512, 1, 1);
            processor.onaudioprocess = (e) => { 
                const inputData = e.inputBuffer.getChannelData(0);
                
                // Cálculo de volumen visual ultra-rápido
                let sum = 0;
                for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                setVolume(Math.sqrt(sum / inputData.length));

                sessionPromise.then(s => s && s.sendRealtimeInput({ media: createBlob(inputData) })); 
            };
            source.connect(processor); 
            processor.connect(ctxIn.destination);
            sessionPromise.then(s => s && s.sendRealtimeInput({ text: "INICIO. Saluda ya." }));
          },
          onmessage: async (msg: LiveServerMessage) => {
            // MANEJO DE INTERRUPCIÓN (Barge-in)
            if (msg.serverContent?.interrupted) {
                stopAllAudio();
                return;
            }

            const audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio && ctxOut) {
              const buffer = await decodeAudioDataToBuffer(decodeBase64(audio), ctxOut, 24000, 1);
              const src = ctxOut.createBufferSource(); 
              src.buffer = buffer; 
              src.connect(ctxOut.destination);
              
              const startAt = Math.max(ctxOut.currentTime, nextStartTimeRef.current);
              src.start(startAt); 
              nextStartTimeRef.current = startAt + buffer.duration;
              
              src.onended = () => sources.current.delete(src); 
              sources.current.add(src);
            }

            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                let res: any = { status: 'OK' };
                if (fc.name === 'checkPatientExists') {
                  const input = (fc.args.fullName as string).toLowerCase();
                  const p = patientsRef.current.find(x => x.name.toLowerCase().includes(input));
                  res = p ? { exists: true, id: p.id, name: p.name } : { exists: false };
                }
                if (fc.name === 'registerNewPatient') {
                    const id = 'P' + Math.floor(Math.random()*9000+1000);
                    setPatients(prev => [...prev, { id, name: fc.args.fullName as string, phone: fc.args.phone as string, email: '', identityDocument: 'PENDIENTE', address: '', birthDate: '1990-01-01', gender: 'Otro', img: 'https://i.pravatar.cc/150?u='+id, allergies: [], pathologies: [], surgeries: [], medications: [], habits: [], familyHistory: [], medicalHistory: 'Alta Voz', history: [] }]);
                    res = { status: 'SUCCESS', id };
                }
                if (fc.name === 'bookAppointment') {
                    const p = patientsRef.current.find(x => x.id === fc.args.patientId);
                    setAppointments(prev => [...prev, { id: 'V'+Date.now(), patientId: fc.args.patientId as string, patientName: p?.name || 'Voz', doctorName: 'Dr. IA', doctorId: 'D-AI', date: fc.args.date as string, time: fc.args.time as string, treatment: 'Consulta', status: 'Confirmed', branch: 'Sede Principal' }]);
                    res = { status: 'SUCCESS' };
                }
                if (fc.name === 'endCall') { setTimeout(() => { cleanup(); onClose(); }, 1000); return; }
                
                sessionPromise.then(s => s && s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: res } } }));
              }
            }
          },
          onerror: () => cleanup(),
          onclose: () => cleanup()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.aiPhoneSettings.voiceName as any } } },
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          tools: [{ functionDeclarations: getTools() }]
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { cleanup(); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/10">
        <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className={`size-10 rounded-2xl flex items-center justify-center ${isActive ? 'bg-success text-white shadow-lg shadow-success/20' : 'bg-primary text-white'}`}>
              <span className="material-symbols-outlined text-xl">{isActive ? 'mic' : 'smart_toy'}</span>
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{settings.aiPhoneSettings.assistantName} CORE</h2>
              <p className="text-[8px] font-bold text-primary uppercase tracking-tighter">{isActive ? 'Latencia: <300ms' : 'Canal de voz listo'}</p>
            </div>
          </div>
          <button onClick={onClose} className="size-10 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-all"><span className="material-symbols-outlined">close</span></button>
        </header>

        <div className="p-12 flex flex-col items-center gap-10">
          {isActive ? (
            <div className="w-full space-y-8">
              <div className="flex items-end justify-center gap-1.5 h-20">
                {[...Array(15)].map((_, i) => (
                  <div key={i} className="w-2 bg-primary rounded-full transition-all duration-75" 
                    style={{ height: `${Math.max(15, volume * 100 * (0.4 + Math.random() * 0.6))}%`, opacity: 0.4 + (volume * 0.6) }}></div>
                ))}
              </div>
              <div className="text-center">
                 <p className="text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-1">Conversación en Tiempo Real</p>
                 <p className="text-slate-400 text-[9px] font-medium italic">Puedes interrumpir al asistente en cualquier momento</p>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="size-20 rounded-[2rem] bg-slate-100 dark:bg-slate-800 text-slate-300 flex items-center justify-center mx-auto border-4 border-white dark:border-slate-700 shadow-xl"><span className="material-symbols-outlined text-4xl">phone_in_talk</span></div>
              <p className="text-slate-600 dark:text-slate-300 text-base font-bold leading-tight uppercase tracking-tight">Enlace de Voz de <br/> Alta Disponibilidad</p>
            </div>
          )}

          {!isActive ? (
            <button onClick={startSession} disabled={isConnecting} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
              {isConnecting ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">bolt</span>}
              {isConnecting ? 'CONECTANDO...' : 'INICIAR LLAMADA'}
            </button>
          ) : (
            <button onClick={cleanup} className="w-full h-16 bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-rose-600 transition-all flex items-center justify-center gap-3">
              <span className="material-symbols-outlined">call_end</span> COLGAR
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
