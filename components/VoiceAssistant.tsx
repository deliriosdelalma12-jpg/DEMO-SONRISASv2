
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
  const [visualizerNodes, setVisualizerNodes] = useState<number[]>(Array(40).fill(10));

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const sources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setVisualizerNodes(prev => prev.map(() => 10 + Math.random() * (volume * 100 + 10)));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isActive, volume]);

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
      name: 'smartSearch',
      description: 'Search for patients OR appointments.',
      parameters: { 
        type: Type.OBJECT, 
        properties: { 
          query: { type: Type.STRING, description: 'Name, phone or partial ID' },
          target: { type: Type.STRING, enum: ['PATIENT', 'APPOINTMENT'] }
        }, 
        required: ['query', 'target'] 
      }
    }
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

      const { assistantName, aiCompanyName, systemPrompt, voiceName } = settings.aiPhoneSettings;
      
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
            sessionPromise.then(s => s?.sendRealtimeInput({ text: "GREET_PATIENT" }));
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
          },
          onerror: (e) => { console.error(e); cleanup(); },
          onclose: () => cleanup()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName as any } } },
          systemInstruction: { parts: [{ text: `${systemPrompt} Assistant: ${assistantName} from ${aiCompanyName}.` }] },
          tools: [{ functionDeclarations: getTools() }]
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { cleanup(); }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-1/4 left-1/4 size-[500px] bg-primary/30 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-1/4 right-1/4 size-[400px] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse delay-700"></div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl w-full max-w-2xl rounded-[4rem] border border-white/10 shadow-[0_0_100px_rgba(59,130,246,0.15)] overflow-hidden flex flex-col relative">
        <header className="px-12 py-10 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-6">
            <div className={`size-16 rounded-[1.8rem] flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-success shadow-[0_0_30px_rgba(16,185,129,0.4)] scale-110' : 'bg-primary shadow-[0_0_30px_rgba(59,130,246,0.3)]'}`}>
              <span className="material-symbols-outlined text-white text-4xl">{isActive ? 'leak_add' : 'smart_toy'}</span>
            </div>
            <div>
              <h2 className="text-white font-display font-black text-xl uppercase tracking-tighter leading-none">{settings.aiPhoneSettings.assistantName} CORE</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`size-2 rounded-full ${isActive ? 'bg-success animate-ping' : 'bg-slate-500'}`}></span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isActive ? 'Sincronizado' : 'Motor en Standby'}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="size-12 rounded-2xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-500 text-slate-400 transition-all border border-white/5 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </header>

        <div className="flex-1 p-16 flex flex-col items-center justify-center gap-12">
          <div className="w-full h-48 flex items-center justify-center gap-1">
            {visualizerNodes.map((h, i) => (
              <div 
                key={i} 
                className={`w-1 rounded-full transition-all duration-75 ${isActive ? 'bg-primary' : 'bg-slate-700 opacity-30'}`}
                style={{ height: `${isActive ? h : 10}%`, opacity: isActive ? 0.3 + (h / 100) : 0.1 }}
              ></div>
            ))}
          </div>

          <div className="text-center space-y-6">
             {isActive ? (
               <div className="space-y-3 animate-in fade-in">
                  <p className="text-primary font-black uppercase text-xs tracking-[0.6em] animate-pulse">Escuchando Voz Natural</p>
                  <p className="text-slate-500 text-sm font-medium italic max-w-sm">"Gestionando agenda en tiempo real"</p>
               </div>
             ) : (
               <div className="space-y-4">
                  <div className="size-32 rounded-full border-4 border-white/5 mx-auto flex items-center justify-center bg-white/2">
                    <span className="material-symbols-outlined text-6xl text-slate-700">mic_off</span>
                  </div>
                  <p className="text-slate-400 text-sm font-black uppercase tracking-widest italic">Establezca enlace para operar</p>
               </div>
             )}
          </div>

          <div className="w-full pt-6">
            {!isActive ? (
              <button 
                onClick={startSession} 
                disabled={isConnecting}
                className="w-full h-24 bg-primary text-white rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-sm shadow-[0_20px_50px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50 group"
              >
                {isConnecting ? (
                  <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
                ) : (
                  <>
                    <div className="size-10 rounded-full bg-white/20 flex items-center justify-center group-hover:animate-ping">
                      <span className="material-symbols-outlined">call</span>
                    </div>
                    <span>ESTABLECER ENLACE</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex flex-col gap-4">
                 <button onClick={cleanup} className="w-full h-20 bg-rose-500 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl flex items-center justify-center gap-4 hover:bg-rose-600 transition-all">
                    <span className="material-symbols-outlined text-2xl">call_end</span> TERMINAR SESIÓN
                 </button>
              </div>
            )}
          </div>
        </div>

        <footer className="px-12 py-6 border-t border-white/5 bg-black/20 flex justify-between items-center">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Core v{settings.aiPhoneSettings.core_version}</p>
        </footer>
      </div>
    </div>
  );
};

export default VoiceAssistant;
