
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface VoiceAssistantProps {
  onClose: () => void;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [aiTranscription, setAiTranscription] = useState<string>('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              setTranscription(prev => prev + ' ' + message.serverContent?.inputTranscription?.text);
            }
            if (message.serverContent?.outputTranscription) {
              setAiTranscription(prev => prev + ' ' + message.serverContent?.outputTranscription?.text);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (message.serverContent?.turnComplete) {
              // Reset current local transcription state if needed for UX
            }
          },
          onerror: (e) => console.error('Live API Error:', e),
          onclose: () => {
            setIsActive(false);
            setIsConnecting(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: 'Eres un asistente de voz para MediClinic. Ayudas a los doctores a gestionar sus tareas mediante la voz. Sé profesional y cálido.'
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error('Failed to start session:', error);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
    }
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    setIsActive(false);
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="fixed inset-0 bg-background-dark/95 backdrop-blur-xl z-[70] flex flex-col items-center justify-center p-6 transition-all duration-500">
      <div className="max-w-2xl w-full flex flex-col items-center gap-12 text-center">
        <button onClick={onClose} className="absolute top-8 right-8 text-text-secondary hover:text-white transition-colors">
          <span className="material-symbols-outlined text-4xl">close</span>
        </button>

        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className={`size-48 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30 transition-all duration-700 ${isActive ? 'scale-110 shadow-[0_0_50px_rgba(70,236,19,0.3)]' : ''}`}>
               {isActive ? (
                 <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-1.5 bg-primary rounded-full animate-bounce" style={{ height: '40px', animationDelay: `${i * 0.1}s` }}></div>
                    ))}
                 </div>
               ) : (
                 <span className="material-symbols-outlined text-6xl text-primary">mic</span>
               )}
            </div>
            {isActive && <div className="absolute inset-0 rounded-full border-4 border-primary/50 animate-ping"></div>}
          </div>
          <h2 className="text-white text-3xl font-black tracking-tight mt-6">
            {isActive ? 'Te escucho...' : isConnecting ? 'Conectando...' : 'Asistente MediClinic'}
          </h2>
          <p className="text-text-secondary max-w-md">
            {isActive ? 'Puedes hacerme preguntas sobre tus citas o pacientes.' : 'Usa el micrófono para hablar con la IA en tiempo real.'}
          </p>
        </div>

        <div className="w-full flex flex-col gap-6">
           <div className="bg-surface-dark border border-border-dark p-6 rounded-2xl min-h-[100px] text-left">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Tú:</p>
              <p className="text-white text-lg font-medium">{transcription || (isActive ? 'Empieza a hablar...' : '---')}</p>
           </div>
           <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl min-h-[100px] text-left">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">MediClinic AI:</p>
              <p className="text-white text-lg font-medium">{aiTranscription || '---'}</p>
           </div>
        </div>

        <div className="flex gap-4">
          {!isActive && !isConnecting && (
            <button
              onClick={startSession}
              className="bg-primary text-background-dark px-10 py-4 rounded-full font-bold text-xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/20"
            >
              Iniciar Conversación
            </button>
          )}
          {isActive && (
            <button
              onClick={stopSession}
              className="bg-red-500 text-white px-10 py-4 rounded-full font-bold text-xl hover:bg-red-600 transition-all shadow-xl shadow-red-500/20"
            >
              Terminar Llamada
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
