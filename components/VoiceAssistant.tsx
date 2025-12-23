
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type, Blob } from '@google/genai';
import React, { useEffect, useRef, useState } from 'react';
import { ClinicSettings, Appointment, Doctor, Branch, AppointmentStatus, Patient, CountryRegion } from '../types';
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

// --- BASE DE DATOS DE VALIDACIÓN REGIONAL (CORE) ---
const REGION_RULES: Record<string, { regex: RegExp; error: string; hint: string }> = {
  'ES': { regex: /^[6789]\d{8}$/, error: 'Formato incorrecto para España.', hint: 'Debe tener 9 dígitos y empezar por 6, 7, 8 o 9.' },
  'MX': { regex: /^\d{10}$/, error: 'Formato incorrecto para México.', hint: 'Debe tener 10 dígitos.' },
  'US': { regex: /^\d{10}$/, error: 'Invalid US format.', hint: 'Must be 10 digits.' },
};

const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

// --- HOLIDAY LOGIC SIMULATION (CORE) ---
const getHolidayInfo = (dateStr: string, region: CountryRegion, province?: string, city?: string): string | null => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.getMonth() + 1; 
    const key = `${day}/${month}`;

    if (region === 'ES') {
        if (key === '1/1') return 'Año Nuevo (Nacional)';
        if (key === '6/1') return 'Reyes (Nacional)';
        if (key === '1/5') return 'Día del Trabajo (Nacional)';
        if (key === '12/10') return 'Fiesta Nacional (Nacional)';
        if (key === '25/12') return 'Navidad (Nacional)';
    }
    if (region === 'MX') {
        if (key === '16/9') return 'Independencia (Nacional)';
        if (key === '20/11') return 'Revolución (Nacional)';
    }

    if (province && region === 'ES') {
        const p = province.toLowerCase();
        if (p.includes('madrid') && key === '2/5') return 'Comunidad de Madrid';
        if (p.includes('cataluña') && key === '11/9') return 'Diada';
    }

    if (city && region === 'ES') {
        const c = city.toLowerCase();
        if (c.includes('madrid') && key === '15/5') return 'San Isidro (Local)';
        if (c.includes('barcelona') && key === '24/9') return 'La Mercè (Local)';
    }

    return null;
};

// --- AUDIO UTILS ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) { int16[i] = Math.max(-1, Math.min(1, data[i])) * 32768; }
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ 
  onClose, settings, appointments, setAppointments, doctors, branches = [], patients = [], setPatients 
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const sources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  // Refs Vivos
  const appointmentsRef = useRef(appointments);
  const patientsRef = useRef(patients);
  const settingsRef = useRef(settings);
  const branchesRef = useRef(branches);

  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);
  useEffect(() => { patientsRef.current = patients; }, [patients]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { branchesRef.current = branches; }, [branches]);

  useEffect(() => { return () => cleanup(); }, []);

  const cleanup = () => {
    if (sessionRef.current) { try { sessionRef.current.close(); } catch (e) {} sessionRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    
    // Close contexts to release hardware
    if (audioContextRef.current) { try { audioContextRef.current.close(); } catch (e) {} audioContextRef.current = null; }
    // outputAudioContextRef can stay or be closed, but closing ensures clean state
    
    sources.current.forEach(s => { try { s.stop(); } catch(e){} });
    sources.current.clear();
    
    setIsActive(false);
    setIsConnecting(false);
    setVolume(0);
  };

  const getTools = () => {
    const hasBranches = settings.branchCount > 1;

    const declarationCheckPatient: FunctionDeclaration = {
      name: 'checkPatient',
      description: 'Buscar si el paciente existe en la base de datos por nombre.',
      parameters: {
        type: Type.OBJECT,
        properties: { name: { type: Type.STRING } },
        required: ['name']
      }
    };

    const declarationGetPatientAppointments: FunctionDeclaration = {
      name: 'getPatientAppointments',
      description: 'Obtener las citas futuras de un paciente existente.',
      parameters: {
        type: Type.OBJECT,
        properties: { patientId: { type: Type.STRING } },
        required: ['patientId']
      }
    };

    const declarationCancelAppointment: FunctionDeclaration = {
      name: 'cancelAppointment',
      description: 'Cancelar una cita existente mediante su ID.',
      parameters: {
        type: Type.OBJECT,
        properties: { appointmentId: { type: Type.STRING } },
        required: ['appointmentId']
      }
    };

    const declarationUpdatePatientContact: FunctionDeclaration = {
      name: 'updatePatientContact',
      description: 'Actualizar datos de contacto de un paciente existente.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          patientId: { type: Type.STRING },
          phone: { type: Type.STRING },
          email: { type: Type.STRING }
        }
      }
    };

    const declarationRegisterPatient: FunctionDeclaration = {
      name: 'registerPatient',
      description: 'Registrar NUEVO paciente. Usar SOLO si checkPatient confirmó que no existe.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          fullName: { type: Type.STRING },
          phone: { type: Type.STRING },
          email: { type: Type.STRING }
        },
        required: ['fullName', 'phone', 'email']
      }
    };

    const declarationCheckAvailability: FunctionDeclaration = {
      name: 'checkAvailability',
      description: 'Consultar huecos libres en agenda.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          branch: { type: Type.STRING, description: 'Sucursal (si aplica)' },
          date: { type: Type.STRING, description: 'YYYY-MM-DD' },
          time: { type: Type.STRING, description: 'HH:MM' }
        },
        required: hasBranches ? ['branch', 'date', 'time'] : ['date', 'time']
      }
    };

    const declarationBookAppointment: FunctionDeclaration = {
      name: 'bookAppointment',
      description: 'Confirmar y agendar la cita.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          patientId: { type: Type.STRING },
          branch: { type: Type.STRING },
          date: { type: Type.STRING },
          time: { type: Type.STRING },
          treatment: { type: Type.STRING }
        },
        required: hasBranches ? ['patientId', 'branch', 'date', 'time'] : ['patientId', 'date', 'time']
      }
    };

    const declarationEndCall: FunctionDeclaration = {
      name: 'endCall',
      description: 'FINALIZAR LLAMADA. Ejecutar si el usuario confirma que no necesita nada más.',
    };

    return [declarationCheckPatient, declarationGetPatientAppointments, declarationCancelAppointment, declarationUpdatePatientContact, declarationRegisterPatient, declarationCheckAvailability, declarationBookAppointment, declarationEndCall];
  };

  const validateData = (phone: string, email: string) => {
    const region = settingsRef.current.region || 'ES';
    const rules = REGION_RULES[region] || REGION_RULES['ES'];
    const cleanPhone = phone.replace(/\D/g, '');
    const isPhoneValid = rules.regex.test(cleanPhone);
    const isEmailValid = EMAIL_REGEX.test(email);
    if (!isPhoneValid) return { valid: false, error: "Dile amablemente que ese número no parece correcto y que te lo repita." };
    if (!isEmailValid) return { valid: false, error: "Dile que el correo no parece válido y pídelo de nuevo." };
    return { valid: true, cleanPhone };
  };

  const checkOpeningStatus = (dateStr: string, timeStr: string, branchName?: string) => {
      let province = settingsRef.current.province;
      let city = settingsRef.current.city;
      let scheduleSource = settingsRef.current.globalSchedule;

      if (branchName && settingsRef.current.branchCount > 1) {
          const targetBranch = branchesRef.current.find(b => b.name === branchName);
          if (targetBranch) {
              if (targetBranch.province) province = targetBranch.province;
              if (targetBranch.city) city = targetBranch.city;
              if (targetBranch.schedule) {
                  scheduleSource = targetBranch.schedule;
              }
          }
      }

      const holidayName = getHolidayInfo(dateStr, settingsRef.current.region, province, city);
      if (holidayName) {
          return { isOpen: false, reason: `Es festivo (${holidayName}) en la ubicación seleccionada.` };
      }

      const date = new Date(dateStr);
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dayName = dayNames[date.getDay()];
      const schedule = scheduleSource?.[dayName];

      if (!schedule) return { isOpen: false, reason: 'No hay horario configurado para este día.' };

      const check = (s:string, e:string) => timeStr >= s && timeStr < e;
      
      if (schedule.morning.active && check(schedule.morning.start, schedule.morning.end)) return { isOpen: true };
      if (schedule.afternoon.active && check(schedule.afternoon.start, schedule.afternoon.end)) return { isOpen: true };

      return { isOpen: false, reason: `La sucursal ${branchName || 'central'} está cerrada a las ${timeStr}.` };
  };

  const startSession = async () => {
    if (isConnecting || isActive) return;
    setIsConnecting(true);
    setErrorMsg(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Initialize Contexts
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (!outputAudioContextRef.current) outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000, latencyHint: 'interactive' });
      
      const ctxIn = audioContextRef.current;
      const ctxOut = outputAudioContextRef.current;
      
      // FORCE RESUME CONTEXTS
      if (ctxIn.state === 'suspended') await ctxIn.resume();
      if (ctxOut.state === 'suspended') await ctxOut.resume();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
              echoCancellation: true, 
              noiseSuppression: true, 
              autoGainControl: true, 
              channelCount: 1 
          } 
      });
      streamRef.current = stream;

      const region = settings.region || 'ES';
      const hasBranches = settings.branchCount > 1;
      const branchList = branchesRef.current.map(b => `${b.name} (${b.city})`).join(', ');
      
      // --- CORE SYSTEM PROMPT CONFIGURATION ---
      const now = new Date();
      const hour = now.getHours();
      const timeGreeting = hour < 12 ? "Buenos días" : "Buenas tardes";
      const exactGreeting = `${timeGreeting}, soy ${settings.aiPhoneSettings.assistantName} de ${settings.aiPhoneSettings.aiCompanyName}.`;

      const SYSTEM_PROMPT = `
        # ROL CORE (INMUTABLE)
        Eres ${settings.aiPhoneSettings.assistantName}, asistente de ${settings.aiPhoneSettings.aiCompanyName}.
        - Voz/Personalidad: ${settings.aiPhoneSettings.voiceName}. Tono natural, eficiente y educado.
        - Idioma: ${region === 'ES' ? 'Español de España' : 'Español Latino'}. NUNCA cambies el acento configurado.

        # INICIO DE LLAMADA (OBLIGATORIO)
        Tu primera frase DEBE SER EXACTAMENTE: "${exactGreeting} ¿Ya eres cliente nuestro?"

        # FLUJO DE IDENTIFICACIÓN (CRÍTICO)
        
        1. **SI EL USUARIO DICE QUE SÍ (ES CLIENTE):**
           - Pide su nombre completo UNA SOLA VEZ.
           - Ejecuta 'checkPatient' para verificarlo internamente.
           - Si existe: Llámalo por su nombre de pila (ej: "Perfecto, Juan"). Pregunta qué necesita.
           - NO le preguntes teléfono ni email si ya lo has encontrado.
        
        2. **SI EL USUARIO DICE QUE NO (NO ES CLIENTE):**
           - Si ya te dijo su nombre al saludar, ÚSALO. NO lo vuelvas a pedir.
           - Si no sabes el nombre, pídelo.
           - Di de forma natural: "Vale, veo que todavía no tienes ficha. Si te parece, te doy de alta ahora mismo."
           - Pide SOLO lo que falte (Teléfono y Email).
           - Ejecuta 'registerPatient'.
           - Una vez registrado, continúa normal llamándole por su nombre.

        # MEMORIA CONVERSACIONAL (REGLA DE ORO)
        - RECUERDA todo lo que te dice el usuario.
        - NUNCA pidas un dato que ya te han dicho en la frase anterior.
        - Si ya te dijo "Soy Juan Pérez y quiero cita", NO preguntes "¿Cómo te llamas?". Ve directo a buscar a Juan Pérez.

        # FLUJO PARA AGENDAR (ORDEN ESTRICTO)
        Para agendar una cita, sigue estos pasos UNO A UNO. No pidas todo a la vez:
        1. **SUCURSAL**: Pregunta en qué centro quiere la cita (SOLO si hay varias sucursales: ${hasBranches ? branchList : 'Sede Única'}).
        2. **DÍA**: Pregunta qué día le viene mejor.
        3. **HORA**: Pregunta qué hora prefiere.
        4. Ejecuta 'checkAvailability'. Si está libre, confirma y ejecuta 'bookAppointment'.

        # REPROGRAMAR O CANCELAR
        - Asume que el paciente existe. Búscalo.
        - JAMÁS intentes registrar de nuevo a alguien que quiere cancelar o cambiar una cita.

        # CIERRE
        - Al terminar la gestión: "¿Necesitas algo más?".
        - Si dice NO: Despídete y EJECUTA 'endCall' INMEDIATAMENTE.

        # DATOS CONTEXTUALES
        - Fecha/Hora Actual: ${now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}.
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            
            // Set up audio input stream
            const source = ctxIn.createMediaStreamSource(stream);
            const processor = ctxIn.createScriptProcessor(2048, 1, 1);
            
            processor.onaudioprocess = (e) => { 
                const inputData = e.inputBuffer.getChannelData(0);
                
                // Volume Visualization
                let sum = 0;
                for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                const amplifiedVolume = Math.min(1, rms * 5); 
                setVolume(amplifiedVolume);

                sessionPromise.then(s => s && s.sendRealtimeInput({ media: createBlob(inputData) })); 
            };
            
            source.connect(processor); 
            processor.connect(ctxIn.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio && ctxOut) {
              const buffer = await decodeAudioDataToBuffer(decodeBase64(audio), ctxOut, 24000, 1);
              const src = ctxOut.createBufferSource(); 
              src.buffer = buffer; 
              src.connect(ctxOut.destination);
              
              const now = ctxOut.currentTime; 
              const startAt = nextStartTimeRef.current < now ? now : nextStartTimeRef.current;
              
              src.start(startAt); 
              nextStartTimeRef.current = startAt + buffer.duration;
              
              src.onended = () => sources.current.delete(src); 
              sources.current.add(src);
            }
            
            if (msg.serverContent?.interrupted) { 
                sources.current.forEach(s => { try { s.stop(); } catch(e){} }); 
                sources.current.clear(); 
                nextStartTimeRef.current = 0; 
            }

            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                let res: any = { error: 'Error desconocido' };
                try {
                    // --- CORE TOOLS ---
                    if (fc.name === 'endCall') {
                        // Cierre automático de la llamada solicitado por la IA
                        cleanup();
                        return; // Stop processing
                    }
                    else if (fc.name === 'checkPatient') {
                      const nameInput = (fc.args.name as string).toLowerCase().trim();
                      const inputParts = nameInput.split(' ');
                      const found = patientsRef.current.filter(pat => {
                          const patName = pat.name.toLowerCase();
                          return inputParts.every(part => patName.includes(part));
                      });
                      if (found.length === 0) res = { status: 'NOT_FOUND', msg: 'No encontrado. Procede con flujo de Nuevo Cliente (registerPatient).' };
                      else if (found.length > 1) res = { status: 'MULTIPLE', msg: `Hay ${found.length} coincidencias. Pide un dato más para filtrar.` };
                      else {
                        const p = found[0];
                        const hasPhone = p.phone && p.phone.length > 5;
                        const hasEmail = p.email && p.email.includes('@');
                        if (hasPhone && hasEmail) res = { status: 'FOUND_OK', id: p.id, name: p.name, msg: `Paciente encontrado: ${p.name}. NO pidas más datos de contacto. Pregunta qué necesita.` };
                        else res = { status: 'INCOMPLETE', id: p.id, name: p.name, missing: !hasPhone ? 'Teléfono' : 'Email', msg: 'Encontrado pero faltan datos de contacto.' };
                      }
                    }
                    else if (fc.name === 'getPatientAppointments') {
                        const { patientId } = fc.args as any;
                        const patApps = appointmentsRef.current.filter(a => a.patientId === patientId && ['Confirmed', 'Pending', 'Reprogramada'].includes(a.status));
                        if (patApps.length === 0) res = { status: 'NO_APPS', msg: 'No tiene citas futuras.' };
                        else {
                            const appList = patApps.map(a => `${a.date} a las ${a.time}`).join(', ');
                            res = { status: 'FOUND', msg: `Citas: ${appList}` };
                        }
                    }
                    else if (fc.name === 'cancelAppointment') {
                        const { appointmentId } = fc.args as any;
                        setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'Cancelled' } : a));
                        res = { status: 'SUCCESS', msg: 'Cita cancelada.' };
                    }
                    else if (fc.name === 'updatePatientContact') {
                      const { patientId, phone, email } = fc.args as any;
                      let error = null;
                      if(phone) { const v = validateData(phone, 'test@test.com'); if(!v.valid) error = v.error; }
                      if(email) { const v = validateData('600000000', email); if(!v.valid) error = v.error; }
                      if (error) res = { status: 'ERROR', msg: error };
                      else {
                        setPatients(prev => prev.map(p => p.id === patientId ? { ...p, phone: phone || p.phone, email: email || p.email } : p));
                        res = { status: 'SUCCESS', msg: 'Datos actualizados.' };
                      }
                    }
                    else if (fc.name === 'registerPatient') {
                      const { fullName, phone, email } = fc.args as any;
                      const nameParts = fullName.trim().split(/\s+/);
                      if (nameParts.length < 2) res = { status: 'ERROR', msg: "Necesito Nombre y al menos un Apellido." };
                      else {
                          const val = validateData(phone, email);
                          if (!val.valid) res = { status: 'ERROR', msg: val.error };
                          else {
                            const newP: Patient = {
                              id: 'P-' + Math.floor(Math.random() * 10000), name: fullName, phone: val.cleanPhone!, email,
                              identityDocument: 'PENDIENTE', birthDate: new Date().toISOString().split('T')[0], gender: 'Otro', address: '', medicalHistory: 'Alta Voz', img: `https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${fullName}`, allergies: [], pathologies: [], surgeries: [], medications: [], habits: [], familyHistory: [], history: []
                            };
                            setPatients(prev => [...prev, newP]);
                            res = { status: 'SUCCESS', id: newP.id, msg: `Paciente ${fullName} registrado. Llámalo por su nombre y pregunta cuándo quiere la cita.` };
                          }
                      }
                    }
                    else if (fc.name === 'checkAvailability') {
                      const { branch, date, time } = fc.args as any;
                      if (settingsRef.current.branchCount > 1 && !branch) res = { status: 'ERROR', msg: 'Falta sucursal. Pregúntala antes de mirar disponibilidad.' };
                      else {
                          const status = checkOpeningStatus(date, time, branch);
                          if (!status.isOpen) {
                              res = { status: 'CLOSED', msg: status.reason };
                          } else {
                              const busy = appointmentsRef.current.some(a => {
                                  if (a.status === 'Cancelled') return false;
                                  if (a.date !== date || a.time !== time) return false;
                                  if (settingsRef.current.branchCount > 1 && branch) return a.branch === branch;
                                  return true;
                              });
                              if (busy) res = { status: 'BUSY', msg: 'Ocupado.' };
                              else res = { status: 'AVAILABLE', msg: 'Libre.' };
                          }
                      }
                    }
                    else if (fc.name === 'bookAppointment') {
                      const { patientId, branch, date, time, treatment } = fc.args as any;
                      const status = checkOpeningStatus(date, time, branch);
                      if (!status.isOpen) res = { status: 'ERROR', msg: status.reason };
                      else {
                          const pat = patientsRef.current.find(p => p.id === patientId);
                          const assignedBranch = settingsRef.current.branchCount > 1 ? branch : 'Centro';
                          const newApt: Appointment = {
                            id: 'V-' + Math.random().toString(36).substr(2, 9), patientId, patientName: pat?.name || 'Voz',
                            doctorName: 'Dr. Asignado', doctorId: 'D-AUTO', date, time, treatment: treatment || 'Consulta General', 
                            status: 'Confirmed', branch: assignedBranch
                          };
                          setAppointments(prev => [...prev, newApt]);
                          res = { status: 'BOOKED', msg: 'Cita confirmada correctamente.' };
                      }
                    }
                } catch (toolError) {
                    console.error("Tool execution error:", toolError);
                    res = { status: 'ERROR', msg: 'Error interno.' };
                }
                sessionPromise.then(s => s && s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: res } } }));
              }
            }
          },
          onerror: (e) => { 
              console.error("Session Error:", e);
              setErrorMsg("Conexión interrumpida. Reintentando..."); 
              cleanup(); 
          },
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
    } catch (e) { 
        console.error("Connection Start Error:", e);
        setErrorMsg("No se pudo iniciar la conexión. Verifica permisos."); 
        cleanup(); 
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark">
        <header className="p-6 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className={`size-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-success text-white animate-pulse' : 'bg-primary text-white'}`}>
              <span className="material-symbols-outlined">{isActive ? 'record_voice_over' : 'smart_toy'}</span>
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{settings.aiPhoneSettings.assistantName} AI</h2>
              <p className="text-[9px] font-bold text-primary uppercase tracking-tighter">{isActive ? 'En llamada' : 'Listo'}</p>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger shadow-sm border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </header>

        <div className="flex-1 p-10 flex flex-col items-center justify-center text-center gap-6">
          {isActive ? (
            <div className="space-y-6 w-full">
              <div className="flex items-center justify-center gap-1.5 h-16">
                {[...Array(12)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-primary rounded-full transition-all duration-75" 
                    style={{ 
                        height: `${Math.max(15, volume * 100 * (0.5 + Math.random() * 0.5))}%`,
                        opacity: 0.5 + (volume * 0.5) 
                    }}
                  ></div>
                ))}
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 rounded-xl border border-slate-100 dark:border-slate-700">
                 <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">{settings.aiPhoneSettings.voiceName} • {settings.region || 'ES'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="size-20 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-outlined text-4xl">wifi_calling_3</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm font-bold leading-relaxed">
                Pulsa para iniciar el <span className="text-primary uppercase">Core Conversacional</span> de <br/>{settings.aiPhoneSettings.aiCompanyName}.
              </p>
              {errorMsg && <p className="text-[10px] text-danger font-bold mt-2 bg-danger/5 p-3 rounded-lg border border-danger/10">{errorMsg}</p>}
            </div>
          )}

          {!isActive && (
            <button onClick={startSession} disabled={isConnecting} className="h-14 px-12 bg-primary text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3">
              {isConnecting ? <span className="material-symbols-outlined animate-spin text-lg">sync</span> : <span className="material-symbols-outlined text-lg">call</span>}
              {isConnecting ? 'Conectando...' : 'Iniciar Llamada'}
            </button>
          )}

          {isActive && (
            <button onClick={cleanup} className="h-14 px-12 bg-danger text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all mt-4">
              Finalizar Llamada
            </button>
          )}
        </div>
        
        <footer className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-border-light dark:border-border-dark flex items-center justify-center">
           <div className="flex items-center gap-2 text-slate-400">
              <span className="material-symbols-outlined text-sm">security</span>
              <p className="text-[9px] font-bold uppercase tracking-widest">Festivos Regionales • Privacidad L5</p>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default VoiceAssistant;
