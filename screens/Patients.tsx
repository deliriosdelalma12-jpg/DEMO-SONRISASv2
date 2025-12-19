
import React, { useState, useRef, useEffect } from 'react';
import { Patient, Appointment, FileAttachment, ClinicSettings, User, MedicalReport, Doctor } from '../types';
import { GoogleGenAI } from "@google/genai";

// URLs de Iconos Line-Art Planos (Estilo minimalista blanco y negro según capturas)
const FLAT_ICON_MALE = 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Felix&backgroundColor=e2e8f0';
const FLAT_ICON_FEMALE = 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Aneka&backgroundColor=e2e8f0';
const FLAT_ICON_OTHER = 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Midnight&backgroundColor=e2e8f0';

const DataField = ({ label, value, editing, onChange, type = "text", selectOptions = [], required = false }: any) => (
  <div className="flex flex-col gap-0.5 w-full max-w-full overflow-hidden">
    <label className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-[0.2em] mb-0.5">
      {label} {required && <span className="text-danger">*</span>}
    </label>
    {editing ? (
      type === "select" ? (
        <select value={value} onChange={onChange} className="bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[14px] font-bold focus:ring-2 focus:ring-primary/20 outline-none w-full h-10 transition-all">
          {selectOptions.map((opt: any) => <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={onChange} className="bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[14px] font-bold focus:ring-2 focus:ring-primary/20 outline-none w-full h-10 transition-all" />
      )
    ) : (
      <span className="text-[14px] font-black text-slate-800 dark:text-white leading-normal break-words whitespace-normal">{value || '---'}</span>
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
  
  const initialNewPatient: Partial<Patient> = {
    name: '',
    gender: 'Masculino',
    birthDate: new Date().toISOString().split('T')[0],
    identityDocument: '',
    phone: '',
    email: '',
    address: '',
    medicalHistory: '',
    img: FLAT_ICON_MALE,
    allergies: [],
    attachments: [],
    savedReports: [],
    history: [],
    weight: '',
    height: '',
    bloodType: 'A+',
    associatedDoctorId: team[0]?.id || ''
  };

  const [newPatient, setNewPatient] = useState<Partial<Patient>>(initialNewPatient);

  const [aiReport, setAiReport] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiChat, setAiChat] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChat]);

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
    const age = calculateAge(date);
    if (target === 'edit') {
      setEditData({ ...editData, birthDate: date, age: age });
    } else {
      setNewPatient({ ...newPatient, birthDate: date });
    }
  };

  const handleGenderChange = (gender: any, target: 'edit' | 'create') => {
    const avatar = gender === 'Masculino' ? FLAT_ICON_MALE : gender === 'Femenino' ? FLAT_ICON_FEMALE : FLAT_ICON_OTHER;
    if (target === 'edit') {
      setEditData({ ...editData, gender, img: avatar });
    } else {
      setNewPatient({ ...newPatient, gender, img: avatar });
    }
  };

  const openFicha = (p: Patient) => {
    setSelectedPatient(p);
    setEditData({ 
      ...p, 
      age: calculateAge(p.birthDate),
      phoneFixed: (p as any).phoneFixed || '+34 912 345 678',
      city: (p as any).city || 'Madrid',
      province: (p as any).province || 'Madrid',
      zipCode: (p as any).zipCode || '28001',
      pathologies: (p as any).pathologies || 'Ninguna',
      diseases: (p as any).diseases || 'Ninguna',
      surgeries: (p as any).surgeries || 'Ninguna',
      medications: (p as any).medications || 'Ninguna',
      tempAllergy: ''
    });
    setIsEditing(false);
    setActiveTab('info');
  };

  const handleSave = () => {
    if (!editData) return;
    
    // Validación de campos obligatorios al editar
    const missing = [];
    if (!editData.name?.trim()) missing.push("Nombre Completo");
    if (!editData.identityDocument?.trim()) missing.push("DNI / Documento");
    if (!editData.birthDate) missing.push("Fecha de Nacimiento");

    if (missing.length > 0) {
      alert(`⚠️ No se pueden guardar los cambios. Faltan datos obligatorios:\n\n${missing.map(m => `• ${m}`).join('\n')}`);
      return;
    }

    const doc = team.find(d => d.id === editData.associatedDoctorId);
    // Asegurar icono flat actualizado por género si se cambió
    const finalAvatar = editData.gender === 'Masculino' ? FLAT_ICON_MALE : editData.gender === 'Femenino' ? FLAT_ICON_FEMALE : FLAT_ICON_OTHER;
    
    const updatedData = { 
      ...editData, 
      img: finalAvatar,
      associatedDoctorName: doc?.name || 'No asignado' 
    };
    
    setPatients(prev => prev.map(p => p.id === editData.id ? updatedData : p));
    setSelectedPatient(updatedData);
    setIsEditing(false);
  };

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación exhaustiva
    const missing = [];
    if (!newPatient.name?.trim()) missing.push("Nombre Completo");
    if (!newPatient.identityDocument?.trim()) missing.push("DNI / Documento de Identidad");
    if (!newPatient.birthDate) missing.push("Fecha de Nacimiento");
    if (!newPatient.gender) missing.push("Género");

    if (missing.length > 0) {
      alert(`⚠️ Error al registrar paciente. Por favor completa:\n\n${missing.map(m => `• ${m}`).join('\n')}`);
      return;
    }

    const doc = team.find(d => d.id === newPatient.associatedDoctorId);
    // Garantizar asignación de icono flat dinámico al guardar
    const finalAvatar = newPatient.gender === 'Masculino' ? FLAT_ICON_MALE : newPatient.gender === 'Femenino' ? FLAT_ICON_FEMALE : FLAT_ICON_OTHER;

    const patientToAdd: Patient = {
      id: 'P' + (Math.floor(Math.random() * 9000) + 1000),
      name: (newPatient.name || '').trim(),
      birthDate: newPatient.birthDate || '',
      gender: (newPatient.gender as any) || 'Masculino',
      identityDocument: (newPatient.identityDocument || '').trim(),
      phone: newPatient.phone || '',
      email: newPatient.email || '',
      address: newPatient.address || '',
      medicalHistory: newPatient.medicalHistory || '',
      img: finalAvatar,
      associatedDoctorId: newPatient.associatedDoctorId,
      associatedDoctorName: doc?.name || 'No asignado',
      weight: newPatient.weight || '',
      height: newPatient.height || '',
      bloodType: newPatient.bloodType || 'A+',
      allergies: newPatient.allergies || [],
      attachments: [],
      savedReports: [],
      history: [{ date: new Date().toISOString().split('T')[0], action: 'Alta', description: 'Paciente registrado en el sistema con expediente digital.' }]
    };

    setPatients(prev => [...prev, patientToAdd]);
    setIsCreating(false);
    setNewPatient(initialNewPatient);
  };

  const addAllergy = () => {
    if (!editData.tempAllergy?.trim()) return;
    const updatedAllergies = [...(editData.allergies || []), editData.tempAllergy.trim()];
    setEditData({ ...editData, allergies: updatedAllergies, tempAllergy: '' });
  };

  const removeAllergy = (index: number) => {
    const updatedAllergies = editData.allergies.filter((_: any, i: number) => i !== index);
    setEditData({ ...editData, allergies: updatedAllergies });
  };

  const patientAppointments = appointments.filter(a => a.patientId === selectedPatient?.id);

  const generateClinicalReport = async () => {
    if (!selectedPatient) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analiza expediente: ${selectedPatient.name}, Biometría: ${selectedPatient.weight}kg. Patologías: ${(selectedPatient as any).pathologies}. Medicación: ${(selectedPatient as any).medications}. Genera informe clínico estratégico.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
      setAiReport(response.text || '');
    } catch (e) { setAiReport('Error IA.'); } finally { setIsAnalyzing(false); }
  };

  const sendQuestionToAi = async () => {
    if (!chatInput.trim() || !selectedPatient) return;
    const msg = chatInput;
    setAiChat(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = `Paciente: ${selectedPatient.name}. Pregunta: ${msg}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: context,
        config: { systemInstruction: `Eres consultor clínico. Responde al Dr. ${currentUser.name}.` }
      });
      setAiChat(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (e) { setAiChat(prev => [...prev, { role: 'model', text: 'Error.' }]); }
  };

  return (
    <div className="p-10 max-w-[1600px] mx-auto w-full space-y-10 no-print">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestión de Pacientes</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Acceso centralizado a expedientes clínicos.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="h-14 px-8 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
        >
          <span className="material-symbols-outlined">person_add</span> Registrar Nuevo Paciente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {patients.map((p) => (
          <div key={p.id} onClick={() => openFicha(p)} className="group bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-[2.5rem] p-8 cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-2">
            <div className="flex flex-col items-center text-center gap-4 mb-8">
              {/* Contenedor de Avatar Estilo Captura */}
              <div className="size-28 rounded-[2.5rem] overflow-hidden border-2 border-slate-100 dark:border-border-dark shadow-sm group-hover:rotate-1 transition-transform bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                <img 
                  src={p.img} 
                  alt={p.name} 
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=e2e8f0&color=475569&bold=true`; }}
                />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors lowercase">{p.name}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">ID: {p.id} • {calculateAge(p.birthDate)} años</p>
                <div className="mt-4 flex items-center justify-center gap-2 px-4 py-1.5 bg-primary/5 rounded-full">
                  <span className="material-symbols-outlined text-[14px] text-primary">medical_services</span>
                  <p className="text-[9px] font-black text-primary uppercase tracking-widest truncate max-w-[150px]">{p.associatedDoctorName || 'Sin asignar'}</p>
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-border-light dark:border-border-dark space-y-3">
               <div className="flex items-center gap-3 text-xs font-bold text-slate-500"><span className="material-symbols-outlined text-primary text-[18px]">fingerprint</span>{p.identityDocument}</div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-500"><span className="material-symbols-outlined text-primary text-[18px]">call</span>{p.phone || ''}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: REGISTRAR NUEVO PACIENTE */}
      {isCreating && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-slate-900/60 modal-backdrop overflow-y-auto">
          <div className="bg-[#e2e8f0] dark:bg-bg-dark w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark animate-in zoom-in h-auto max-h-[90vh] my-auto">
            <header className="px-10 py-8 bg-white/50 dark:bg-surface-dark/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-6">
                  <div className="size-20 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center shadow-inner"><span className="material-symbols-outlined text-4xl">person_add</span></div>
                  <div>
                    <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Alta de Paciente</h2>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Iconografía Minimalista 2D</p>
                  </div>
               </div>
               <button onClick={() => setIsCreating(false)} className="size-12 rounded-2xl bg-white/50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger"><span className="material-symbols-outlined text-2xl">close</span></button>
            </header>

            <form onSubmit={handleCreatePatient} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
               <div className="flex flex-col md:flex-row gap-10">
                  <div className="flex flex-col items-center gap-4 shrink-0">
                     <div className="size-44 rounded-[3rem] overflow-hidden border-4 border-white dark:border-slate-700 shadow-xl bg-slate-50 flex items-center justify-center">
                        <img 
                          src={newPatient.img} 
                          alt="Previsualización Line-Art" 
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).src = FLAT_ICON_OTHER; }}
                        />
                     </div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Perfil Lineal Automático</p>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                     <DataField required label="Nombre Completo" value={newPatient.name} editing={true} onChange={(e: any) => setNewPatient({...newPatient, name: e.target.value})} />
                     <DataField required label="DNI / NIE / Pasaporte" value={newPatient.identityDocument} editing={true} onChange={(e: any) => setNewPatient({...newPatient, identityDocument: e.target.value})} />
                     <DataField required label="Género" value={newPatient.gender} editing={true} type="select" selectOptions={['Masculino', 'Femenino', 'Otro']} onChange={(e: any) => handleGenderChange(e.target.value, 'create')} />
                     <DataField required label="Fecha Nacimiento" value={newPatient.birthDate} editing={true} type="date" onChange={(e: any) => handleBirthDateChange(e.target.value, 'create')} />
                     <DataField label="Email" value={newPatient.email} editing={true} type="email" onChange={(e: any) => setNewPatient({...newPatient, email: e.target.value})} />
                     <DataField label="Teléfono" value={newPatient.phone} editing={true} onChange={(e: any) => setNewPatient({...newPatient, phone: e.target.value})} />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DataField label="Dirección Completa" value={newPatient.address} editing={true} onChange={(e: any) => setNewPatient({...newPatient, address: e.target.value})} />
                  <DataField label="Médico Responsable" value={newPatient.associatedDoctorId} editing={true} type="select" selectOptions={team.map(d => ({ label: d.name, value: d.id }))} onChange={(e: any) => setNewPatient({...newPatient, associatedDoctorId: e.target.value})} />
               </div>

               <div className="p-8 bg-primary/5 rounded-[2.5rem] border-2 border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                     <span className="material-symbols-outlined text-primary text-3xl">face</span>
                     <p className="text-xs text-slate-500 font-medium">Se ha seleccionado un estilo de <span className="font-bold text-primary uppercase">Icono Line-Art</span> basado en las preferencias de diseño plano minimalista.</p>
                  </div>
                  <button type="submit" className="h-14 px-12 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/30 hover:scale-105 transition-all">Finalizar Registro</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {selectedPatient && editData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 modal-backdrop overflow-y-auto">
          <div className="bg-[#e2e8f0] dark:bg-bg-dark w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark animate-in zoom-in h-[90vh] my-auto">
            
            <header className="px-10 py-6 bg-white/50 dark:bg-surface-dark/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between no-print shrink-0">
              <div className="flex items-center gap-6">
                 <div className="size-20 rounded-3xl overflow-hidden shadow-lg border-2 border-white dark:border-slate-800 bg-slate-50 flex items-center justify-center">
                    <img 
                      src={editData.img} 
                      alt={editData.name} 
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).src = FLAT_ICON_OTHER; }}
                    />
                 </div>
                 <div className="flex flex-col">
                    <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">{editData.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-widest">Expediente: {editData.id}</span>
                      <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">Doctor: {editData.associatedDoctorName}</span>
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <button onClick={handleSave} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 text-sm"><span className="material-symbols-outlined text-lg">save</span> Guardar Ficha</button>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 text-sm"><span className="material-symbols-outlined text-lg">edit</span> Editar Perfil</button>
                )}
                <button onClick={() => setSelectedPatient(null)} className="size-10 rounded-xl bg-white/50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger"><span className="material-symbols-outlined text-xl">close</span></button>
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
               <nav className="w-60 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white/30 dark:bg-surface-dark/30 no-print p-6 gap-1 shrink-0">
                 {[
                   { id: 'info', label: 'Biometría y Perfil', icon: 'person' },
                   { id: 'medical', label: 'Historia Clínica', icon: 'history_edu' },
                   { id: 'history', label: 'Citas y Visitas', icon: 'event_note' },
                   { id: 'files', label: 'Documentación', icon: 'folder_open' },
                   { id: 'ai', label: 'Asistente IA', icon: 'psychology' }
                 ].map((t) => (
                   <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-primary'}`}>
                     <span className="material-symbols-outlined text-lg">{t.icon}</span> {t.label}
                   </button>
                 ))}
               </nav>

               <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8">
                  {activeTab === 'info' && (
                    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4">
                       
                       <div className="bg-white/70 dark:bg-surface-dark/60 p-8 rounded-[2rem] shadow-sm border border-white/40 dark:border-slate-800 space-y-6">
                          <h4 className="text-[9px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3"><span className="material-symbols-outlined text-[14px]">contact_page</span> Identidad y Contacto</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-8">
                             <DataField label="DNI / Pasaporte" value={editData.identityDocument} editing={isEditing} onChange={(e: any) => setEditData({...editData, identityDocument: e.target.value})} required={true} />
                             <DataField label="Correo Electrónico" value={editData.email} editing={isEditing} onChange={(e: any) => setEditData({...editData, email: e.target.value})} />
                             <DataField label="Teléfono Móvil" value={editData.phone} editing={isEditing} onChange={(e: any) => setEditData({...editData, phone: e.target.value})} />
                             <DataField label="Teléfono Fijo" value={editData.phoneFixed} editing={isEditing} onChange={(e: any) => setEditData({...editData, phoneFixed: e.target.value})} />
                             <DataField label="Fecha de Nacimiento" value={editData.birthDate} editing={isEditing} onChange={(e: any) => handleBirthDateChange(e.target.value, 'edit')} type="date" required={true} />
                             <DataField label="Edad Calculada" value={`${editData.age} años`} editing={isEditing} onChange={() => {}} type="number" />
                          </div>
                       </div>

                       <div className="bg-white/70 dark:bg-surface-dark/60 p-8 rounded-[2rem] shadow-sm border border-white/40 dark:border-slate-800 space-y-6">
                          <h4 className="text-[9px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3"><span className="material-symbols-outlined text-[14px]">analytics</span> Parámetros Biométricos</h4>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-8">
                             <div className="flex flex-col gap-0.5">
                                <label className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-[0.2em] mb-0.5">Peso Corporal</label>
                                {isEditing ? <input type="text" value={editData.weight} onChange={e => setEditData({...editData, weight: e.target.value})} className="bg-slate-50 border rounded-lg px-3 py-2 font-bold w-full text-[14px] h-10" /> : <div className="flex items-baseline gap-1"><span className="text-[20px] font-black text-slate-800 dark:text-white leading-none">{editData.weight}</span><span className="text-[14px] font-bold text-[#94a3b8]">kg</span></div>}
                             </div>
                             <div className="flex flex-col gap-0.5">
                                <label className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-[0.2em] mb-0.5">Altura Estatura</label>
                                {isEditing ? <input type="text" value={editData.height} onChange={e => setEditData({...editData, height: e.target.value})} className="bg-slate-50 border rounded-lg px-3 py-2 font-bold w-full text-[14px] h-10" /> : <div className="flex items-baseline gap-1"><span className="text-[20px] font-black text-slate-800 dark:text-white leading-none">{editData.height}</span><span className="text-[14px] font-bold text-[#94a3b8]">cm</span></div>}
                             </div>
                             <DataField label="Grupo Sanguíneo" value={editData.bloodType} editing={isEditing} onChange={(e: any) => setEditData({...editData, bloodType: e.target.value})} />
                             <DataField label="Género" value={editData.gender} editing={isEditing} onChange={(e: any) => handleGenderChange(e.target.value, 'edit')} type="select" selectOptions={['Masculino', 'Femenino', 'Otro']} required={true} />
                          </div>
                       </div>

                       <div className="bg-white/70 dark:bg-surface-dark/60 p-8 rounded-[2rem] shadow-sm border border-white/40 dark:border-slate-800 space-y-6">
                          <h4 className="text-[9px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3"><span className="material-symbols-outlined text-[14px]">map</span> Localización y Domicilio</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-8">
                             <DataField label="Dirección de Residencia" value={editData.address} editing={isEditing} onChange={(e: any) => setEditData({...editData, address: e.target.value})} />
                             <DataField label="Ciudad" value={editData.city} editing={isEditing} onChange={(e: any) => setEditData({...editData, city: e.target.value})} />
                             <DataField label="Provincia" value={editData.province} editing={isEditing} onChange={(e: any) => setEditData({...editData, province: e.target.value})} />
                             <DataField label="Código Postal" value={editData.zipCode} editing={isEditing} onChange={(e: any) => setEditData({...editData, zipCode: e.target.value})} />
                          </div>
                       </div>

                       <div className="bg-white/70 dark:bg-surface-dark/60 p-8 rounded-[2rem] shadow-sm border border-white/40 dark:border-slate-800 space-y-6">
                          <h4 className="text-[9px] font-black text-danger uppercase tracking-[0.2em] flex items-center gap-3"><span className="material-symbols-outlined text-[14px]">warning</span> Alergias y Contraindicaciones</h4>
                          <div className="flex flex-wrap gap-3">
                             {editData.allergies?.map((a: string, i: number) => (
                               <span key={i} className="px-4 py-2 bg-[#fde8e8] text-danger text-[10px] font-black rounded-xl uppercase tracking-widest border border-danger/10 flex items-center gap-2">
                                 {a}
                                 {isEditing && <button onClick={() => removeAllergy(i)} className="size-4 bg-danger text-white rounded-md flex items-center justify-center hover:scale-110 transition-transform"><span className="material-symbols-outlined text-[10px]">close</span></button>}
                               </span>
                             ))}
                             {isEditing && (
                               <div className="flex gap-2 min-w-[200px]">
                                 <input type="text" value={editData.tempAllergy} onChange={e => setEditData({...editData, tempAllergy: e.target.value})} placeholder="Nueva..." className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-[12px] w-full font-bold h-8" />
                                 <button onClick={addAllergy} className="bg-primary text-white px-3 rounded-lg font-bold text-[10px] uppercase h-8">Añadir</button>
                               </div>
                             )}
                             {!editData.allergies?.length && !isEditing && <p className="text-[12px] italic text-slate-400">Sin alergias documentadas.</p>}
                          </div>
                       </div>

                       <div className="bg-white/70 dark:bg-surface-dark/60 p-8 rounded-[2rem] shadow-sm border border-white/40 dark:border-slate-800 space-y-6">
                          <h4 className="text-[9px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3"><span className="material-symbols-outlined text-[14px]">medical_information</span> Diagnóstico Crónico y Situación Clínica</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                             <div className="space-y-8">
                                <DataField label="Patologías Crónicas Actuales" value={editData.pathologies} editing={isEditing} onChange={(e: any) => setEditData({...editData, pathologies: e.target.value})} />
                                <DataField label="Enfermedades de Interés Previas" value={editData.diseases} editing={isEditing} onChange={(e: any) => setEditData({...editData, diseases: e.target.value})} />
                             </div>
                             <div className="space-y-8">
                                <DataField label="Intervenciones Quirúrgicas / Cirugías" value={editData.surgeries} editing={isEditing} onChange={(e: any) => setEditData({...editData, surgeries: e.target.value})} />
                                <DataField label="Medicación y Dosis Actual" value={editData.medications} editing={isEditing} onChange={(e: any) => setEditData({...editData, medications: e.target.value})} />
                             </div>
                          </div>
                       </div>
                    </div>
                  )}

                  {activeTab === 'medical' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                       <div className="bg-white/70 p-10 rounded-[2.5rem] border border-white shadow-sm space-y-6">
                          <h4 className="text-xl font-display font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><span className="material-symbols-outlined text-2xl text-primary">history_edu</span> Evolución Médica Narrativa</h4>
                          {isEditing ? (
                            <textarea value={editData.medicalHistory} onChange={e => setEditData({...editData, medicalHistory: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] p-6 text-[14px] min-h-[350px] leading-relaxed shadow-inner font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                          ) : (
                            <div className="p-8 bg-slate-100/50 rounded-[2rem] border-2 border-dashed border-slate-200 text-[14px] leading-relaxed italic text-slate-600 font-medium">
                               "{editData.medicalHistory || 'No hay registros históricos narrativos disponibles.'}"
                            </div>
                          )}
                       </div>
                    </div>
                  )}

                  {activeTab === 'ai' && (
                    <div className="flex flex-col gap-6 h-full animate-in fade-in slide-in-from-right-4">
                       <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
                          <header className="px-8 py-6 border-b bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                             <div className="flex items-center gap-3"><span className="material-symbols-outlined text-primary text-3xl">psychology</span><h4 className="font-display font-black text-lg uppercase tracking-tight">Consultor IA MediClinic</h4></div>
                             {aiReport && <button onClick={() => setAiReport('')} className="size-9 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-danger transition-colors"><span className="material-symbols-outlined text-xl">delete</span></button>}
                          </header>
                          <div className="p-8 min-h-[250px] flex items-center justify-center">
                             {isAnalyzing ? (
                               <div className="flex flex-col items-center gap-4 animate-pulse"><span className="material-symbols-outlined text-6xl text-primary animate-spin">sync</span><p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Analizando expediente crítico...</p></div>
                             ) : aiReport ? (
                               <div className="w-full whitespace-pre-wrap text-[14px] italic text-slate-700 leading-relaxed font-medium max-h-[350px] overflow-y-auto pr-4 custom-scrollbar">{aiReport}</div>
                             ) : (
                               <button onClick={generateClinicalReport} className="px-10 py-4 bg-primary text-white rounded-xl font-black shadow-xl shadow-primary/30 hover:scale-105 transition-all uppercase text-[10px] tracking-widest">Generar Informe IA</button>
                             )}
                          </div>
                       </div>
                       
                       <div className="flex-1 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col min-h-[400px]">
                          <header className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
                             <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md"><span className="material-symbols-outlined text-lg">chat</span></div>
                             <div><h5 className="font-black text-xs uppercase tracking-tight">Chat Clínico</h5><p className="text-[8px] font-bold text-primary tracking-widest uppercase">Consultoría en tiempo real</p></div>
                          </header>
                          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/20">
                             {aiChat.map((m, i) => (
                               <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-4 rounded-[1.5rem] text-[14px] font-bold shadow-sm ${m.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white border border-slate-100 rounded-tl-none text-slate-700'}`}>{m.text}</div></div>
                             ))}
                          </div>
                          <div className="p-5 bg-white border-t border-slate-100">
                             <div className="relative"><input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendQuestionToAi()} placeholder="Consultar diagnóstico..." className="w-full bg-slate-50 border-none rounded-xl py-4 pl-6 pr-14 text-[14px] font-bold focus:ring-4 focus:ring-primary/5 shadow-inner" /><button onClick={sendQuestionToAi} className="absolute right-2 top-1/2 -translate-y-1/2 size-10 bg-primary text-white rounded-lg flex items-center justify-center hover:scale-110 transition-all shadow-lg"><span className="material-symbols-outlined text-xl">send</span></button></div>
                          </div>
                       </div>
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b">
                            <tr><th className="px-8 py-5">Fecha / Hora</th><th className="px-8 py-5">Servicio</th><th className="px-8 py-5">Especialista</th><th className="px-8 py-5">Estado</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {patientAppointments.map(apt => (
                              <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-8 py-5 font-bold text-[14px] text-slate-800">{apt.date} • {apt.time}</td>
                                <td className="px-8 py-5"><span className="px-3 py-1 bg-primary/10 text-primary text-[9px] font-black rounded-lg uppercase tracking-wider">{apt.treatment}</span></td>
                                <td className="px-8 py-5 text-[14px] font-bold text-slate-600">{apt.doctorName}</td>
                                <td className="px-8 py-5"><span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${apt.status === 'Completed' ? 'bg-success text-white shadow-sm' : 'bg-warning text-white shadow-sm'}`}>{apt.status === 'Completed' ? 'Atendido' : 'Pendiente'}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                    </div>
                  )}

                  {activeTab === 'files' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4">
                       {editData.attachments?.map((file: any) => (
                         <div key={file.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 flex items-center gap-5 shadow-sm hover:border-primary transition-all group">
                            <div className="size-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors"><span className="material-symbols-outlined text-2xl">clinical_notes</span></div>
                            <div className="flex-1 min-w-0">
                               <p className="text-[14px] font-black truncate text-slate-800">{file.name}</p>
                               <p className="text-[9px] text-slate-400 font-black uppercase mt-0.5 tracking-widest">{file.date} • {file.size}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}

               </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print { .no-print { display: none !important; } }
        .modal-backdrop { backdrop-filter: blur(8px); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Patients;
