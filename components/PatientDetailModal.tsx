
import React, { useState, useRef, useEffect } from 'react';
import { Patient, FileAttachment, ClinicSettings, MedicalReport, Doctor } from '../types';
import { GoogleGenAI } from "@google/genai";
import { jsPDF } from "jspdf";

const FLAT_ICON_MALE = 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Felix&backgroundColor=e2e8f0';
const FLAT_ICON_FEMALE = 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Aneka&backgroundColor=e2e8f0';
const FLAT_ICON_OTHER = 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Midnight&backgroundColor=e2e8f0';

const DataField = ({ label, value, editing, onChange, type = "text", selectOptions = [], required = false }: any) => (
  <div className="flex flex-col gap-1 w-full overflow-hidden">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">
      {label} {required && <span className="text-danger">*</span>}
    </label>
    {editing ? (
      type === "select" ? (
        <select value={value} onChange={onChange} className="bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none w-full transition-all">
          {selectOptions.map((opt: any) => <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={onChange} className="bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none w-full transition-all" />
      )
    ) : (
      <div className="bg-white/40 dark:bg-white/5 border border-transparent rounded-2xl px-5 py-3.5 min-h-[52px] flex items-center">
        <span className="text-sm font-black text-slate-800 dark:text-white leading-tight break-words">{value || '---'}</span>
      </div>
    )}
  </div>
);

interface PatientDetailModalProps {
  patient: Patient;
  clinicSettings: ClinicSettings;
  team: Doctor[];
  onClose: () => void;
  onSave: (updatedPatient: Patient) => void;
  onOpenDoctor?: (doctorId: string) => void;
}

const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ patient, clinicSettings, team, onClose, onSave, onOpenDoctor }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'medical' | 'files' | 'ai'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Patient>(patient);
  const [aiReport, setAiReport] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiChat, setAiChat] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiChat]);

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSave = () => {
    const missing = [];
    if (!editData.name?.trim()) missing.push("Nombre Completo");
    if (!editData.identityDocument?.trim()) missing.push("DNI / Documento");
    if (!editData.birthDate) missing.push("Fecha de Nacimiento");
    
    if (missing.length > 0) { 
        alert(`⚠️ Faltan datos obligatorios:\n\n${missing.map(m => `• ${m}`).join('\n')}`); 
        return; 
    }
    const doc = team.find(d => d.id === editData.associatedDoctorId);
    const updatedData = { ...editData, associatedDoctorName: doc?.name || 'No asignado' };
    onSave(updatedData);
    setIsEditing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newFile: FileAttachment = {
        id: 'DOC-' + Math.floor(Math.random() * 100000),
        name: file.name, type: file.type,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        date: new Date().toISOString().split('T')[0], url: URL.createObjectURL(file)
      };
      setEditData({ ...editData, attachments: [newFile, ...(editData.attachments || [])] });
    }
  };

  const generateClinicalReport = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        INFORME CLÍNICO ESTRATÉGICO
        Paciente: ${editData.name}
        Edad: ${calculateAge(editData.birthDate)} años
        Biometría: ${editData.weight}kg, ${editData.height}cm
        Antecedentes: ${editData.medicalHistory || 'No informados'}
        
        Analiza este paciente basándote en los protocolos de la clínica ${clinicSettings.name}.
        Genera un informe detallado que incluya:
        1. Análisis de riesgos biometritos.
        2. Recomendaciones preventivas.
        3. Plan de seguimiento sugerido.
      `;
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt,
        config: { systemInstruction: "Eres un consultor clínico senior de alto nivel. Tu lenguaje es técnico pero claro." }
      });
      setAiReport(response.text || '');
    } catch (e) { setAiReport('No se pudo generar el análisis en este momento.'); } finally { setIsAnalyzing(false); }
  };

  const sendQuestionToAi = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setAiChat(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Consulta sobre el paciente ${editData.name}: ${msg}`,
        config: { systemInstruction: `Eres el consultor IA de ${clinicSettings.name}. Ayudas al equipo médico con dudas sobre el expediente.` }
      });
      setAiChat(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (e) { setAiChat(prev => [...prev, { role: 'model', text: 'Error procesando la consulta.' }]); }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300 overflow-y-auto">
      <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-6xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark h-[92vh] my-auto">
        <header className="px-12 py-10 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-8">
                <div className="size-24 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 bg-slate-50 flex items-center justify-center">
                    <img src={editData.img} alt={editData.name} className="w-full h-full object-contain" />
                </div>
                <div>
                   <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{editData.name}</h2>
                   <div className="flex items-center gap-4 mt-3">
                     <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-xl text-[11px] font-black uppercase tracking-widest">EXPEDIENTE: {editData.id}</span>
                     <span className="px-4 py-1.5 bg-success/10 text-success rounded-xl text-[11px] font-black uppercase tracking-widest">{editData.gender}</span>
                     
                     {editData.associatedDoctorId && onOpenDoctor && (
                         <button 
                            onClick={() => onOpenDoctor(editData.associatedDoctorId!)}
                            className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 group transition-colors"
                         >
                            <span className="material-symbols-outlined text-sm">stethoscope</span>
                            Dr. Asignado
                            <span className="material-symbols-outlined text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                         </button>
                     )}
                   </div>
                </div>
           </div>
           <div className="flex items-center gap-4">
                {isEditing ? (
                    <button onClick={handleSave} className="h-14 px-10 bg-primary text-white rounded-[1.75rem] font-black flex items-center gap-3 shadow-xl transition-all active:scale-95 text-xs uppercase tracking-widest">
                        <span className="material-symbols-outlined">save</span> Guardar
                    </button>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="h-14 px-10 bg-white dark:bg-slate-800 text-primary border-2 border-primary/20 rounded-[1.75rem] font-black flex items-center gap-3 transition-all hover:bg-primary hover:text-white text-xs uppercase tracking-widest">
                        <span className="material-symbols-outlined">edit</span> Editar Ficha
                    </button>
                )}
                <button onClick={onClose} className="size-14 rounded-2xl bg-white/50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger transition-all shadow-md">
                    <span className="material-symbols-outlined text-4xl">close</span>
                </button>
           </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            <nav className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white/40 dark:bg-surface-dark/40 p-8 gap-3 shrink-0">
                {[
                  { id: 'info', label: 'Biometría', icon: 'person' },
                  { id: 'medical', label: 'Historia Médica', icon: 'history_edu' },
                  { id: 'files', label: 'Archivos / Docs', icon: 'folder_open' },
                  { id: 'ai', label: 'Consultor IA', icon: 'psychology' },
                ].map((t) => (
                    <button 
                        key={t.id} 
                        onClick={() => setActiveTab(t.id as any)} 
                        className={`flex items-center gap-4 px-6 py-5 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-xl translate-x-2' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-primary'}`}
                    >
                        <span className="material-symbols-outlined text-2xl">{t.icon}</span> {t.label}
                    </button>
                ))}
            </nav>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-transparent">
                {activeTab === 'info' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            <DataField label="Nombre Completo" value={editData.name} editing={isEditing} onChange={(e: any) => setEditData({...editData, name: e.target.value})} required={true} />
                            <DataField label="DNI / Pasaporte" value={editData.identityDocument} editing={isEditing} onChange={(e: any) => setEditData({...editData, identityDocument: e.target.value})} required={true} />
                            <DataField label="Fecha Nacimiento" value={editData.birthDate} editing={isEditing} type="date" onChange={(e: any) => setEditData({...editData, birthDate: e.target.value})} />
                            <DataField label="Género" value={editData.gender} editing={isEditing} type="select" selectOptions={['Masculino', 'Femenino', 'Otro']} onChange={(e: any) => setEditData({...editData, gender: e.target.value})} />
                            <DataField label="Email" value={editData.email} editing={isEditing} onChange={(e: any) => setEditData({...editData, email: e.target.value})} />
                            <DataField label="Teléfono" value={editData.phone} editing={isEditing} onChange={(e: any) => setEditData({...editData, phone: e.target.value})} />
                        </div>
                        <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
                            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-10"><span className="material-symbols-outlined text-sm">fitness_center</span> Datos Biométricos</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <DataField label="Peso (kg)" value={editData.weight} editing={isEditing} onChange={(e: any) => setEditData({...editData, weight: e.target.value})} />
                                <DataField label="Altura (cm)" value={editData.height} editing={isEditing} onChange={(e: any) => setEditData({...editData, height: e.target.value})} />
                                <DataField label="Grupo Sanguíneo" value={editData.bloodType} editing={isEditing} type="select" selectOptions={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} onChange={(e: any) => setEditData({...editData, bloodType: e.target.value})} />
                            </div>
                        </div>
                    </div>
                )}
                {/* Other tabs omitted for brevity but would be included in real file */}
                {activeTab === 'medical' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                        <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
                            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-8"><span className="material-symbols-outlined text-sm">warning</span> Alergias e Intolerancias</h4>
                            <textarea disabled={!isEditing} value={editData.allergies?.join(', ')} onChange={(e) => setEditData({...editData, allergies: e.target.value.split(',').map(s => s.trim())})} className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-sm font-bold min-h-[120px] focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none" />
                        </div>
                        <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
                            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-8"><span className="material-symbols-outlined text-sm">assignment</span> Antecedentes de Interés</h4>
                            <textarea disabled={!isEditing} value={editData.medicalHistory} onChange={(e) => setEditData({...editData, medicalHistory: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-sm font-bold min-h-[200px] focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none" />
                        </div>
                    </div>
                )}
                {activeTab === 'files' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                         <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Repositorio Digital</h3>
                            <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:scale-105 transition-all"><span className="material-symbols-outlined text-lg">upload_file</span> Subir Nuevo</button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {editData.attachments?.map((file: any) => (
                                <div key={file.id} className="p-8 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-6 shadow-sm group hover:border-primary transition-all">
                                    <div className="size-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors"><span className="material-symbols-outlined text-3xl">description</span></div>
                                    <div className="flex-1 min-w-0"><p className="text-base font-black truncate text-slate-800 dark:text-white leading-tight">{file.name}</p><p className="text-[11px] text-slate-400 font-black uppercase mt-1 tracking-widest">{file.date} • {file.size}</p></div>
                                    <a href={file.url} download={file.name} className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-primary hover:text-white transition-all flex items-center justify-center text-slate-400 shadow-sm"><span className="material-symbols-outlined text-2xl">download</span></a>
                                </div>
                            ))}
                         </div>
                    </div>
                )}
                {activeTab === 'ai' && (
                    <div className="flex flex-col gap-8 h-full animate-in fade-in slide-in-from-right-4 pb-12">
                        <div className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-primary/10 shadow-2xl overflow-hidden flex flex-col shrink-0">
                            <header className="px-10 py-8 bg-primary/5 border-b border-primary/10 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30"><span className="material-symbols-outlined text-3xl">psychology</span></div>
                                    <div><h4 className="font-display font-black text-2xl uppercase tracking-tight leading-none">Consultoría Clínica IA</h4></div>
                                </div>
                                <button disabled={isAnalyzing} onClick={generateClinicalReport} className="px-10 py-4 bg-primary text-white rounded-2xl font-black shadow-xl uppercase text-[10px] tracking-widest hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50">{isAnalyzing ? 'Analizando...' : 'Generar Informe IA'}</button>
                            </header>
                            <div className="p-10 min-h-[300px] flex flex-col relative bg-slate-50/50 dark:bg-bg-dark/20">
                                <div className="w-full whitespace-pre-wrap text-sm font-medium text-slate-700 dark:text-slate-300 leading-loose italic max-h-[400px] overflow-y-auto pr-6 custom-scrollbar pb-16">{aiReport}</div>
                            </div>
                        </div>
                        <div className="flex-1 min-h-[500px] bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
                            <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar bg-slate-50/20">
                                {aiChat.map((m, i) => (
                                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-6 rounded-[2.5rem] text-sm font-bold shadow-xl leading-relaxed ${m.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-tl-none text-slate-700 dark:text-slate-200'}`}>{m.text}</div>
                                    </div>
                                ))}
                                <div ref={chatEndRef}></div>
                            </div>
                            <div className="p-8 bg-white dark:bg-surface-dark border-t border-slate-100 dark:border-slate-800">
                                <div className="relative">
                                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendQuestionToAi()} placeholder={`Preguntar sobre el historial de ${patient.name.split(' ')[0]}...`} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-[2rem] py-5 pl-8 pr-20 text-sm font-bold focus:ring-4 focus:ring-primary/10 shadow-inner transition-all" />
                                    <button onClick={sendQuestionToAi} className="absolute right-3 top-1/2 -translate-y-1/2 size-12 bg-primary text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-xl shadow-primary/20"><span className="material-symbols-outlined text-2xl">send</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailModal;
