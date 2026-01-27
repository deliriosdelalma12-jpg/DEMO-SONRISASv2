
import React, { useState, useMemo, useEffect } from 'react';
import { Patient, Appointment, ClinicSettings, User, Doctor } from '../types';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PatientDetailModal from '../components/PatientDetailModal';
import { DataField } from '../components/shared/DataField';

const FLAT_ICON_MALE = 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Felix&backgroundColor=e2e8f0';
const FLAT_ICON_FEMALE = 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Aneka&backgroundColor=e2e8f0';

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
  const [initialModalTab, setInitialModalTab] = useState<'info' | 'medical' | 'history' | 'files' | 'ai'>('info');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
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
    pathologies: [],
    surgeries: [],
    medications: [],
    habits: [],
    familyHistory: [],
    attachments: [], 
    savedReports: [], 
    history: [], 
    weight: '', 
    height: '', 
    bloodType: 'A+', 
    associatedDoctorId: team[0]?.id || '',
    clinicalSummary: '',
    emotionalNotes: ''
  };

  const [newPatient, setNewPatient] = useState<Partial<Patient>>(initialNewPatient);

  useEffect(() => {
    const openId = searchParams.get('openId');
    if (openId && patients.length > 0) {
      const targetP = patients.find(p => p.id === openId);
      if (targetP) {
        setInitialModalTab('info');
        setSelectedPatient(targetP);
        setSearchParams({}, { replace: true });
      }
    }
  }, [patients, searchParams]);

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.id.toLowerCase().includes(q) || 
      p.identityDocument.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  }, [patients, searchQuery]);

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name?.trim() || !newPatient.identityDocument?.trim()) {
        alert("Por favor completa los campos obligatorios (Nombre y DNI).");
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

  return (
    <div className="w-full flex flex-col p-6 gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Expedientes Clínicos</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium italic">Gestión inteligente de la salud y el historial del paciente.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="h-12 px-6 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:bg-primary-dark transition-all shrink-0">
            <span className="material-symbols-outlined text-xl">person_add</span> 
            <span className="text-xs uppercase tracking-tight">Nuevo Paciente</span>
        </button>
      </div>

      <div className="relative w-full">
        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">search</span>
        <input 
            type="text" 
            placeholder="Buscar por nombre, DNI, teléfono o ID de expediente..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-surface-dark border-none rounded-[1.5rem] py-4 pl-14 pr-6 text-sm font-bold shadow-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPatients.length > 0 ? (
            filteredPatients.map((p) => (
            <div key={p.id} className="group bg-white dark:bg-surface-dark rounded-lg p-6 hover:border-primary transition-all border border-slate-200 dark:border-border-dark flex flex-col items-center text-center relative overflow-hidden shadow-sm">
                <div className="relative mb-4">
                    <div className="size-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                        <img src={p.img} alt={p.name} className="w-full h-full object-contain" />
                    </div>
                </div>
                <div className="space-y-1 mb-4">
                    <h3 className="text-lg font-display font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors uppercase tracking-tight leading-none">{p.name}</h3>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">ID: {p.id} • {calculateAge(p.birthDate)} años</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-auto w-full pt-4 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => { setInitialModalTab('history'); setSelectedPatient(p); }} className="py-2.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[9px] font-black uppercase text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-base">history</span>
                    <span>Citas</span>
                </button>
                <button onClick={() => { setInitialModalTab('info'); setSelectedPatient(p); }} className="py-2.5 bg-primary/10 text-primary rounded-md text-[9px] font-black uppercase hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-base">contact_page</span>
                    <span>Ficha</span>
                </button>
                </div>
            </div>
            ))
        ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 opacity-60">
                <span className="material-symbols-outlined text-6xl mb-4">person_search</span>
                <p className="text-sm font-bold uppercase tracking-widest">No se encontraron pacientes</p>
            </div>
        )}
      </div>

      {selectedPatient && (
        <PatientDetailModal
            patient={selectedPatient}
            appointments={appointments}
            clinicSettings={clinicSettings}
            team={team}
            initialTab={initialModalTab}
            onClose={() => setSelectedPatient(null)}
            onSave={(updated) => {
                setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
                setSelectedPatient(null);
            }}
            onOpenDoctor={(id) => navigate(`/doctors?openId=${id}`)}
        />
      )}

      {isCreating && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
          <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark h-auto max-h-[90vh] my-auto">
            <header className="px-10 py-8 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                    <div className="size-16 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-3xl">person_add</span></div>
                    <div>
                        <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Alta de Paciente</h2>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-1">Registro digital en red clínica</p>
                    </div>
                </div>
                <button onClick={() => setIsCreating(false)} className="size-10 rounded-md bg-white/50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger transition-all border border-slate-200 dark:border-slate-700">
                    <span className="material-symbols-outlined text-2xl">close</span>
                </button>
            </header>
            <form onSubmit={handleCreatePatient} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-transparent">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DataField required label="Nombre y Apellidos" value={newPatient.name} editing={true} onChange={(v: string) => setNewPatient({...newPatient, name: v})} />
                    <DataField required label="DNI" value={newPatient.identityDocument} editing={true} onChange={(v: string) => setNewPatient({...newPatient, identityDocument: v})} />
                    <DataField label="Teléfono" value={newPatient.phone} editing={true} onChange={(v: string) => setNewPatient({...newPatient, phone: v})} />
                    <DataField label="Email" value={newPatient.email} editing={true} onChange={(v: string) => setNewPatient({...newPatient, email: v})} />
                    <DataField label="Médico Asignado" value={newPatient.associatedDoctorId} editing={true} type="select" options={team.map(d => ({ value: d.id, label: d.name }))} onChange={(v: string) => setNewPatient({...newPatient, associatedDoctorId: v})} />
                </div>
                <div className="pt-6 flex justify-center border-t border-slate-200 dark:border-slate-800">
                    <button type="submit" className="h-14 w-full md:w-auto md:px-16 bg-primary text-white rounded-md font-black uppercase text-sm tracking-widest hover:bg-primary-dark transition-all shadow-xl shadow-primary/20">Finalizar Registro</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;
