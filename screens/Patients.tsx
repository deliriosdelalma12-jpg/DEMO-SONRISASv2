
import React, { useState, useRef, useEffect } from 'react';
import { Patient, Appointment, FileAttachment, ClinicSettings, User, MedicalReport, Doctor } from '../types';
import { GoogleGenAI } from "@google/genai";
import { jsPDF } from "jspdf";
import { useSearchParams, useNavigate } from 'react-router-dom';

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

interface PatientsProps {
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  appointments: Appointment[];
  clinicSettings: ClinicSettings;
  currentUser: User;
  team: Doctor[];
}

const Patients: React.FC<PatientsProps> = ({ patients, setPatients, appointments, clinicSettings, currentUser, team }) => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'medical' | 'history' | 'files' | 'ai'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const initialNewPatient: Partial<Patient> = {
    name: '', gender: 'Masculino', birthDate: new Date().toISOString().split('T')[0], identityDocument: '', phone: '', email: '', address: '', medicalHistory: '', img: FLAT_ICON_MALE, allergies: [], attachments: [], savedReports: [], history: [], weight: '', height: '', bloodType: 'A+', associatedDoctorId: team[0]?.id || ''
  };

  const [newPatient, setNewPatient] = useState<Partial<Patient>>(initialNewPatient);
  const [aiReport, setAiReport] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiChat, setAiChat] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  // Referencias
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- AUTO OPEN PATIENT IF QUERY PARAM EXISTS ---
  useEffect(() => {
    const openId = searchParams.get('openId');
    if (openId && patients.length > 0) {
      const targetP = patients.find(p => p.id === openId);
      if (targetP) {
        openFicha(targetP);
        setSearchParams({}, { replace: true });
      }
    }
  }, [patients, searchParams]);

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

  const handleBirthDateChange = (date: string, target: 'edit' | 'create') => {
    if (target === 'edit') setEditData({ ...editData, birthDate: date });
    else setNewPatient({ ...newPatient, birthDate: date });
  };

  const handleGenderChange = (gender: any, target: 'edit' | 'create') => {
    const avatar = gender === 'Masculino' ? FLAT_ICON_MALE : gender === 'Femenino' ? FLAT_ICON_FEMALE : FLAT_ICON_OTHER;
    if (target === 'edit') setEditData({ ...editData, gender, img: avatar });
    else setNewPatient({ ...newPatient, gender, img: avatar });
  };

  const openFicha = (p: Patient) => {
    setSelectedPatient(p);
    setEditData({ ...p });
    setIsEditing(false);
    setActiveTab('info');
    setAiReport(''); // Limpiar reporte anterior
    setAiChat([]);
  };

  const handleSave = () => {
    if (!editData) return;
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
    setPatients(prev => prev.map(p => p.id === editData.id ? updatedData : p));
    setSelectedPatient(updatedData);
    setIsEditing(false);
  };

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name?.trim() || !newPatient.identityDocument?.trim()) {
        alert("Por favor completa los campos obligatorios.");
        return;
    }
    const doc = team.find(d => d.id === newPatient.associatedDoctorId);
    const patientToAdd: Patient = {
      ...initialNewPatient,
      ...newPatient,
      id: 'P' + (Math.floor(Math.random() * 9000) + 1000),
      associatedDoctorName: doc?.name || 'No asignado',
      history: [{ date: new Date().toISOString().split('T')[0], action: 'Alta', description: 'Registro inicial en el sistema.' }]
    } as Patient;
    
    setPatients(prev => [...prev, patientToAdd]);
    setIsCreating(false);
    setNewPatient(initialNewPatient);
  };

  // --- GESTIÓN DE ARCHIVOS ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editData) {
      const newFile: FileAttachment = {
        id: 'DOC-' + Math.floor(Math.random() * 100000),
        name: file.name,
        type: file.type,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        date: new Date().toISOString().split('T')[0],
        url: URL.createObjectURL(file)
      };
      // Actualizamos editData y patients para persistencia inmediata en la sesión
      const updatedAttachments = [newFile, ...(editData.attachments || [])];
      setEditData({ ...editData, attachments: updatedAttachments });
      setPatients(prev => prev.map(p => p.id === editData.id ? { ...p, attachments: updatedAttachments } : p));
    }
  };

  // --- FUNCIONALIDADES IA ---
  const generateClinicalReport = async () => {
    if (!selectedPatient) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        INFORME CLÍNICO ESTRATÉGICO
        Paciente: ${selectedPatient.name}
        Edad: ${calculateAge(selectedPatient.birthDate)} años
        Biometría: ${selectedPatient.weight}kg, ${selectedPatient.height}cm
        Antecedentes: ${selectedPatient.medicalHistory || 'No informados'}
        
        Analiza este paciente basándote en los protocolos de la clínica ${clinicSettings.name}.
        Genera un informe detallado que incluya:
        1. Análisis de riesgos biometritos.
        2. Recomendaciones preventivas.
        3. Plan de seguimiento sugerido.
      `;
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt,
        config: {
            systemInstruction: "Eres un consultor clínico senior de alto nivel. Tu lenguaje es técnico pero claro. Eres proactivo y detallista."
        }
      });
      setAiReport(response.text || '');
    } catch (e) { 
        setAiReport('No se pudo generar el análisis en este momento.'); 
    } finally { 
        setIsAnalyzing(false); 
    }
  };

  const sendQuestionToAi = async () => {
    if (!chatInput.trim() || !selectedPatient) return;
    const msg = chatInput;
    setAiChat(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Consulta sobre el paciente ${selectedPatient.name}: ${msg}`,
        config: { 
          systemInstruction: `Eres el consultor IA de ${clinicSettings.name}. Ayudas al equipo médico con dudas sobre el expediente de los pacientes.` 
        }
      });
      setAiChat(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (e) { 
        setAiChat(prev => [...prev, { role: 'model', text: 'Error procesando la consulta.' }]); 
    }
  };

  const saveReportToDocs = () => {
    if (!aiReport || !editData) return;
    
    // Crear un archivo de texto virtual
    const blob = new Blob([aiReport], { type: 'text/plain' });
    const newFile: FileAttachment = {
      id: 'AI-REP-' + Date.now(),
      name: `Informe IA - ${new Date().toISOString().split('T')[0]}.txt`,
      type: 'text/plain',
      size: (blob.size / 1024).toFixed(2) + ' KB',
      date: new Date().toISOString().split('T')[0],
      url: URL.createObjectURL(blob),
      description: 'Informe clínico generado por IA',
      isAiGenerated: true
    };

    const updatedAttachments = [newFile, ...(editData.attachments || [])];
    setEditData({ ...editData, attachments: updatedAttachments });
    setPatients(prev => prev.map(p => p.id === editData.id ? { ...p, attachments: updatedAttachments } : p));
    
    // Mostrar Toast de confirmación
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const printReport = () => {
    if (!aiReport) return;
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Informe Clínico</title>');
      printWindow.document.write('<style>body{font-family:sans-serif; padding: 2rem; line-height: 1.6;} h1{color:#333;}</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(`<h1>${clinicSettings.name}</h1>`);
      printWindow.document.write(`<h3>Informe Clínico - ${selectedPatient?.name}</h3>`);
      printWindow.document.write(`<pre style="white-space: pre-wrap;">${aiReport}</pre>`);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  const downloadPDF = () => {
    if (!aiReport || !selectedPatient) return;
    
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - margin * 2;
    
    // Encabezado
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(clinicSettings.name, margin, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Paciente: ${selectedPatient.name} | ID: ${selectedPatient.id}`, margin, 30);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin, 36);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 42, pageWidth - margin, 42);

    // Contenido
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Split text para que se ajuste al ancho
    const splitText = doc.splitTextToSize(aiReport, maxLineWidth);
    doc.text(splitText, margin, 50);

    // Guardar
    doc.save(`Informe_Clinico_${selectedPatient.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleDoctorClick = (docId: string) => {
      // Check if valid doctor and navigate
      if (docId) navigate(`/doctors?openId=${docId}`);
  };

  return (
    <div className="p-10 max-w-[1600px] mx-auto w-full space-y-12 no-print">
      
      {/* TOAST DE NOTIFICACIÓN */}
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
           <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-4 border border-white/10">
              <div className="size-10 rounded-full bg-success flex items-center justify-center text-white shadow-lg shadow-success/30">
                <span className="material-symbols-outlined text-xl font-bold">check</span>
              </div>
              <div>
                <p className="font-bold text-sm">Informe guardado en archivos</p>
                <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-0.5">Consultable en pestaña 'Docs'</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Expedientes Clínicos</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium italic">Gestión inteligente de la salud y el historial del paciente.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="h-16 px-10 bg-primary text-white rounded-[2rem] font-bold shadow-2xl shadow-primary/30 flex items-center gap-3 hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-2xl">person_add</span> 
            <span className="text-lg uppercase tracking-tight">Nuevo Paciente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
        {patients.map((p) => (
          <div key={p.id} onClick={() => openFicha(p)} className="group bg-white dark:bg-surface-dark rounded-[3.5rem] p-10 cursor-pointer transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)] hover:-translate-y-2 border-2 border-slate-50 dark:border-border-dark flex flex-col items-center text-center">
            <div className="relative mb-8">
                <div className="size-32 rounded-[3rem] overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-xl group-hover:rotate-2 transition-transform bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                    <img src={p.img} alt={p.name} className="w-full h-full object-contain" />
                </div>
                <div className="absolute -bottom-2 -right-2 size-10 bg-success text-white rounded-2xl flex items-center justify-center border-4 border-white dark:border-surface-dark shadow-lg">
                    <span className="material-symbols-outlined text-lg">verified</span>
                </div>
            </div>
            <div className="space-y-2">
                <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors uppercase tracking-tight leading-none">{p.name}</h3>
                <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em]">ID: {p.id} • {calculateAge(p.birthDate)} años</p>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 w-full flex justify-between gap-4">
                <div className="flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined text-primary">history_edu</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Ficha</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined text-success">folder</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Docs</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined text-orange-400">psychology</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">AI</span>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL FICHA DETALLADA */}
      {selectedPatient && editData && (
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
                         
                         {/* ENLACE A MEDICO */}
                         {editData.associatedDoctorId && (
                             <button 
                                onClick={() => handleDoctorClick(editData.associatedDoctorId)}
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
                    <button onClick={() => setSelectedPatient(null)} className="size-14 rounded-2xl bg-white/50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger transition-all shadow-md">
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
                                <DataField label="Fecha Nacimiento" value={editData.birthDate} editing={isEditing} type="date" onChange={(e: any) => handleBirthDateChange(e.target.value, 'edit')} />
                                <DataField label="Género" value={editData.gender} editing={isEditing} type="select" selectOptions={['Masculino', 'Femenino', 'Otro']} onChange={(e: any) => handleGenderChange(e.target.value, 'edit')} />
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

                    {activeTab === 'medical' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                            <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
                                <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-8"><span className="material-symbols-outlined text-sm">warning</span> Alergias e Intolerancias</h4>
                                <textarea 
                                    disabled={!isEditing} 
                                    value={editData.allergies?.join(', ')} 
                                    onChange={(e) => setEditData({...editData, allergies: e.target.value.split(',').map(s => s.trim())})}
                                    className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-sm font-bold min-h-[120px] focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"
                                    placeholder="Lista de alergias separadas por comas..."
                                />
                            </div>
                            <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
                                <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-8"><span className="material-symbols-outlined text-sm">assignment</span> Antecedentes de Interés</h4>
                                <textarea 
                                    disabled={!isEditing} 
                                    value={editData.medicalHistory} 
                                    onChange={(e) => setEditData({...editData, medicalHistory: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-sm font-bold min-h-[200px] focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"
                                    placeholder="Antecedentes quirúrgicos, familiares, patologías crónicas..."
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'files' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                             <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Repositorio Digital</h3>
                                <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:scale-105 transition-all">
                                    <span className="material-symbols-outlined text-lg">upload_file</span> Subir Nuevo
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {editData.attachments?.map((file: any) => (
                                    <div key={file.id} className="p-8 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-6 shadow-sm group hover:border-primary transition-all">
                                        <div className="size-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors"><span className="material-symbols-outlined text-3xl">description</span></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base font-black truncate text-slate-800 dark:text-white leading-tight">{file.name}</p>
                                            <p className="text-[11px] text-slate-400 font-black uppercase mt-1 tracking-widest">{file.date} • {file.size}</p>
                                            {file.isAiGenerated && <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded-lg">Generado por IA</span>}
                                        </div>
                                        <a href={file.url} download={file.name} className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-primary hover:text-white transition-all flex items-center justify-center text-slate-400 shadow-sm"><span className="material-symbols-outlined text-2xl">download</span></a>
                                    </div>
                                ))}
                                {(!editData.attachments || editData.attachments.length === 0) && (
                                    <div className="col-span-full py-24 flex flex-col items-center gap-6 opacity-30 italic text-center">
                                        <span className="material-symbols-outlined text-8xl">folder_off</span>
                                        <p className="font-black text-xl uppercase tracking-widest">Sin documentos adjuntos</p>
                                    </div>
                                )}
                             </div>
                        </div>
                    )}

                    {activeTab === 'ai' && (
                        <div className="flex flex-col gap-8 h-full animate-in fade-in slide-in-from-right-4 pb-12">
                            <div className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-primary/10 shadow-2xl overflow-hidden flex flex-col shrink-0">
                                <header className="px-10 py-8 bg-primary/5 border-b border-primary/10 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                                            <span className="material-symbols-outlined text-3xl">psychology</span>
                                        </div>
                                        <div>
                                            <h4 className="font-display font-black text-2xl uppercase tracking-tight leading-none">Consultoría Clínica IA</h4>
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Análisis predictivo y protocolar de ${clinicSettings.name}</p>
                                        </div>
                                    </div>
                                    <button 
                                        disabled={isAnalyzing} 
                                        onClick={generateClinicalReport} 
                                        className="px-10 py-4 bg-primary text-white rounded-2xl font-black shadow-xl uppercase text-[10px] tracking-widest hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isAnalyzing ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined text-lg">magic_button</span>}
                                        {isAnalyzing ? 'Analizando...' : 'Generar Informe IA'}
                                    </button>
                                </header>
                                <div className="p-10 min-h-[300px] flex flex-col relative bg-slate-50/50 dark:bg-bg-dark/20">
                                    {isAnalyzing ? (
                                        <div className="flex flex-col items-center gap-6 animate-pulse py-20">
                                            <div className="flex gap-2">
                                                {[...Array(3)].map((_,i) => <div key={i} className="size-4 bg-primary rounded-full animate-bounce" style={{animationDelay: `${i*0.2}s`}}></div>)}
                                            </div>
                                            <p className="font-black text-slate-400 uppercase tracking-widest text-[11px]">Procesando historial y protocolos...</p>
                                        </div>
                                    ) : aiReport ? (
                                        <>
                                            <div className="w-full whitespace-pre-wrap text-sm font-medium text-slate-700 dark:text-slate-300 leading-loose italic max-h-[400px] overflow-y-auto pr-6 custom-scrollbar pb-16">
                                                {aiReport}
                                            </div>
                                            <div className="absolute bottom-6 right-10 flex gap-3 animate-in slide-in-from-bottom-2">
                                                <button onClick={saveReportToDocs} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Guardar en Archivos">
                                                   <span className="material-symbols-outlined text-sm">save</span> Guardar
                                                </button>
                                                <button onClick={printReport} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Imprimir Informe">
                                                   <span className="material-symbols-outlined text-sm">print</span> Imprimir
                                                </button>
                                                <button onClick={downloadPDF} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Descargar PDF">
                                                   <span className="material-symbols-outlined text-sm">picture_as_pdf</span> PDF
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center space-y-4 opacity-40 py-20">
                                            <span className="material-symbols-outlined text-7xl text-primary">analytics</span>
                                            <p className="font-black text-lg uppercase tracking-tight">Informe no generado aún</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 min-h-[500px] bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
                                <header className="px-8 py-6 border-b bg-slate-50 dark:bg-slate-900/50 flex items-center gap-4">
                                    <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-2xl">forum</span></div>
                                    <div>
                                        <h5 className="font-black text-sm uppercase tracking-tight">Chat con Consultor Médico</h5>
                                        <p className="text-[9px] font-bold text-primary tracking-widest uppercase">Asistencia en tiempo real sobre el expediente</p>
                                    </div>
                                </header>
                                <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar bg-slate-50/20">
                                    {aiChat.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30 space-y-4">
                                            <span className="material-symbols-outlined text-6xl">chat_bubble_outline</span>
                                            <p className="font-black text-sm uppercase tracking-widest">Inicia una consulta sobre ${selectedPatient.name}</p>
                                        </div>
                                    )}
                                    {aiChat.map((m, i) => (
                                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-6 rounded-[2.5rem] text-sm font-bold shadow-xl leading-relaxed ${m.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-tl-none text-slate-700 dark:text-slate-200'}`}>
                                                {m.text}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef}></div>
                                </div>
                                <div className="p-8 bg-white dark:bg-surface-dark border-t border-slate-100 dark:border-slate-800">
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={chatInput} 
                                            onChange={e => setChatInput(e.target.value)} 
                                            onKeyPress={e => e.key === 'Enter' && sendQuestionToAi()} 
                                            placeholder={`Preguntar sobre el historial de ${selectedPatient.name.split(' ')[0]}...`} 
                                            className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-[2rem] py-5 pl-8 pr-20 text-sm font-bold focus:ring-4 focus:ring-primary/10 shadow-inner transition-all" 
                                        />
                                        <button onClick={sendQuestionToAi} className="absolute right-3 top-1/2 -translate-y-1/2 size-12 bg-primary text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-xl shadow-primary/20">
                                            <span className="material-symbols-outlined text-2xl">send</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR PACIENTE */}
      {isCreating && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
          <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col border-2 border-white/20 h-auto max-h-[90vh] my-auto shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
            <header className="px-12 py-10 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-8">
                    <div className="size-20 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center shadow-inner"><span className="material-symbols-outlined text-4xl">person_add</span></div>
                    <div>
                        <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Alta de Paciente</h2>
                        <p className="text-[11px] font-black text-primary uppercase tracking-[0.3em] mt-1">Registro digital en red clínica</p>
                    </div>
                </div>
                <button onClick={() => setIsCreating(false)} className="size-14 rounded-2xl bg-white/50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger transition-all shadow-md">
                    <span className="material-symbols-outlined text-4xl">close</span>
                </button>
            </header>
            <form onSubmit={handleCreatePatient} className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar bg-transparent">
                <div className="flex flex-col md:flex-row gap-12">
                    <div className="flex flex-col items-center gap-6 shrink-0">
                        <div className="size-48 rounded-[3.5rem] overflow-hidden border-4 border-white dark:border-slate-700 shadow-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative group">
                            <img src={newPatient.img} alt="Preview" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avatar Automático</p>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <DataField required label="Nombre y Apellidos" value={newPatient.name} editing={true} onChange={(e: any) => setNewPatient({...newPatient, name: e.target.value})} />
                        <DataField required label="Identificación (DNI)" value={newPatient.identityDocument} editing={true} onChange={(e: any) => setNewPatient({...newPatient, identityDocument: e.target.value})} />
                        <DataField required label="Género" value={newPatient.gender} editing={true} type="select" selectOptions={['Masculino', 'Femenino', 'Otro']} onChange={(e: any) => handleGenderChange(e.target.value, 'create')} />
                        <DataField required label="Fecha de Nacimiento" value={newPatient.birthDate} editing={true} type="date" onChange={(e: any) => handleBirthDateChange(e.target.value, 'create')} />
                        <DataField label="Teléfono" value={newPatient.phone} editing={true} onChange={(e: any) => setNewPatient({...newPatient, phone: e.target.value})} />
                        <DataField label="Médico Asignado" value={newPatient.associatedDoctorId} editing={true} type="select" selectOptions={team.map(d => ({ value: d.id, label: d.name }))} onChange={(e: any) => setNewPatient({...newPatient, associatedDoctorId: e.target.value})} />
                    </div>
                </div>
                <div className="pt-8 flex justify-center">
                    <button type="submit" className="h-20 w-full bg-primary text-white rounded-[2.5rem] font-black uppercase text-xl tracking-tighter shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all">Finalizar Registro Clínico</button>
                </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal-backdrop { backdrop-filter: blur(12px); }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
      `}</style>
    </div>
  );
};

export default Patients;
