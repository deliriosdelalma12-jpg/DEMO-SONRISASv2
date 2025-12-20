
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Doctor, Appointment, DaySchedule, Branch } from '../types';
import DoctorDetailModal from '../components/DoctorDetailModal';
import { useSearchParams } from 'react-router-dom';
import { DataField } from '../components/shared/DataField';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

interface DoctorsProps {
  doctors: Doctor[];
  appointments: Appointment[];
  setDoctors?: React.Dispatch<React.SetStateAction<Doctor[]>>;
  branches?: Branch[];
}

const Doctors: React.FC<DoctorsProps> = ({ doctors, appointments, setDoctors, branches = [] }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDoctorForAgenda, setSelectedDoctorForAgenda] = useState<Doctor | null>(null);
  const [selectedDoctorForProfile, setSelectedDoctorForProfile] = useState<Doctor | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const branchOptions = useMemo(() => branches.length > 0 ? branches.map(b => ({ value: b.name, label: b.name })) : [{ value: 'Centro', label: 'Centro' }], [branches]);

  useEffect(() => {
    const openId = searchParams.get('openId');
    if (openId && doctors.length > 0) {
      const targetDoc = doctors.find(d => d.id === openId);
      if (targetDoc) {
        setSelectedDoctorForProfile(targetDoc);
        setSearchParams({}, { replace: true });
      }
    }
  }, [doctors, searchParams]);

  const getInitialSchedule = (): Record<string, DaySchedule> => DAYS.reduce((acc, day) => ({
    ...acc, [day]: { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } }
  }), {});

  const [newDocData, setNewDocData] = useState<Doctor>({
    id: '', name: '', role: 'Doctor', specialty: '', status: 'Active',
    img: 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?q=80&w=300&auto=format&fit=crop', branch: branches[0]?.name || 'Centro',
    phone: '', corporateEmail: '', docs: [], schedule: getInitialSchedule(),
    contractType: 'Indefinido - Jornada Completa', hourlyRate: 0, overtimeHours: 0, totalHoursWorked: 0,
    vacationDaysTotal: 30, vacationDaysTaken: 0, vacationHistory: [], attendanceHistory: []
  });

  const handleCreateDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocData.name?.trim()) { alert("Nombre requerido"); return; }
    if (setDoctors) {
      setDoctors(prev => [...prev, { ...newDocData, id: `D${Math.floor(Math.random() * 900) + 100}` }]);
      setIsCreating(false);
      setNewDocData({ ...newDocData, id: '', name: '', specialty: '', phone: '', corporateEmail: '', img: 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?q=80&w=300&auto=format&fit=crop' });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewDocData({ ...newDocData, img: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateDoctor = (updatedDoc: Doctor) => {
      if(setDoctors) setDoctors(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
      setSelectedDoctorForProfile(updatedDoc);
  };

  return (
    <div className="w-full flex flex-col p-6 gap-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Cuerpo Médico</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium italic">Gestión operativa, RRHH y analítica estratégica.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="h-10 px-6 bg-primary text-white rounded-md font-bold hover:bg-primary-dark transition-all flex items-center gap-2"><span className="material-symbols-outlined text-xl">person_add</span><span className="text-xs uppercase tracking-tight">Registrar Médico</span></button>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map((doc) => (
        <div key={doc.id} className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6 hover:border-primary transition-all relative overflow-hidden group shadow-sm">
            <div className={`absolute top-6 right-6 text-[9px] font-black uppercase tracking-[0.2em] ${doc.status === 'Active' ? 'text-success' : 'text-warning'}`}><span className="flex items-center gap-2"><span className={`size-2 rounded-full ${doc.status === 'Active' ? 'bg-success' : 'bg-warning'} animate-pulse`}></span> {doc.status === 'Active' ? 'En Servicio' : 'Ausente'}</span></div>
            <div className="flex items-center gap-5 mb-6">
            <div className="size-20 rounded-lg bg-cover bg-center border border-slate-200 dark:border-slate-700 shadow-sm" style={{ backgroundImage: `url("${doc.img}")` }}></div>
            <div><h3 className="text-xl font-display font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-tight">{doc.name}</h3><p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mt-1">{doc.specialty}</p></div>
            </div>
            <div className="space-y-2 pt-4 border-t border-border-light dark:border-border-dark">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-bg-dark px-3 py-2 rounded-md"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sucursal</span><span className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{doc.branch}</span></div>
            <div className="flex justify-between items-center px-3"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Email</span><span className="text-[10px] font-black text-slate-600 dark:text-slate-400 italic truncate max-w-[150px]">{doc.corporateEmail}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-6">
            <button onClick={() => setSelectedDoctorForAgenda(doc)} className="py-2.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[9px] font-black uppercase text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-base">event_note</span><span>Agenda</span></button>
            <button onClick={() => setSelectedDoctorForProfile(doc)} className="py-2.5 bg-primary/10 text-primary rounded-md text-[9px] font-black uppercase hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-base">contact_page</span><span>Ficha</span></button>
            </div>
        </div>
        ))}
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
          <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-6xl rounded-xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark h-[90vh]">
            <header className="px-10 py-8 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
               <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Alta de Especialista</h2>
               <button onClick={() => setIsCreating(false)} className="size-10 rounded-md bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger transition-all border border-slate-200 dark:border-slate-700"><span className="material-symbols-outlined text-2xl">close</span></button>
            </header>
            <form onSubmit={handleCreateDoctor} className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10 bg-transparent">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8 p-8 bg-white/70 dark:bg-surface-dark/60 rounded-lg border border-white dark:border-border-dark shadow-sm">
                  <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3"><span className="material-symbols-outlined text-sm">contact_page</span> Identidad</h4>
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="shrink-0 group relative cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                      <div className="size-32 rounded-lg bg-cover bg-center border border-white dark:border-slate-700 shadow-sm" style={{ backgroundImage: `url("${newDocData.img}")` }}></div>
                      <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                    </div>
                    <div className="flex-1 grid grid-cols-1 gap-4 w-full">
                      <DataField required label="Nombre y Apellidos" value={newDocData.name} onChange={(val: string) => setNewDocData({...newDocData, name: val})} />
                      <DataField required label="Especialidad Clínica" value={newDocData.specialty} onChange={(val: string) => setNewDocData({...newDocData, specialty: val})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <DataField required label="Email Corporativo" value={newDocData.corporateEmail} onChange={(val: string) => setNewDocData({...newDocData, corporateEmail: val})} />
                    <DataField label="Teléfono" value={newDocData.phone} onChange={(val: string) => setNewDocData({...newDocData, phone: val})} />
                  </div>
                </div>
                <div className="space-y-8 p-8 bg-white/70 dark:bg-surface-dark/60 rounded-lg border border-white dark:border-border-dark shadow-sm">
                  <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3"><span className="material-symbols-outlined text-sm">work</span> Contrato</h4>
                  <div className="grid grid-cols-1 gap-6">
                    <DataField label="Sede de Trabajo" value={newDocData.branch} onChange={(val: string) => setNewDocData({...newDocData, branch: val})} type="select" options={branchOptions} />
                    <DataField label="Relación Laboral" value={newDocData.contractType} onChange={(val: string) => setNewDocData({...newDocData, contractType: val})} type="select" options={['Indefinido - Jornada Completa', 'Indefinido - Media Jornada', 'Autónomo / Colaborador', 'Temporal']} />
                    <div className="grid grid-cols-2 gap-6">
                      <DataField label="Coste / Hora" value={newDocData.hourlyRate} onChange={(val: number) => setNewDocData({...newDocData, hourlyRate: val})} type="number" />
                      <DataField label="Vacaciones" value={newDocData.vacationDaysTotal} onChange={(val: number) => setNewDocData({...newDocData, vacationDaysTotal: val})} type="number" />
                    </div>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full h-14 bg-primary text-white rounded-md font-black uppercase tracking-widest hover:bg-primary-dark transition-all">Registrar Especialista</button>
            </form>
          </div>
        </div>
      )}

      {selectedDoctorForProfile && (
        <DoctorDetailModal 
            doctor={selectedDoctorForProfile} 
            appointments={appointments} 
            onClose={() => setSelectedDoctorForProfile(null)} 
            onSave={handleUpdateDoctor}
            branches={branches}
        />
      )}

      {selectedDoctorForAgenda && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
           <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-6xl rounded-xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark h-[85vh]">
              <header className="px-10 py-8 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                 <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Planificación Operativa</h2>
                 <button onClick={() => setSelectedDoctorForAgenda(null)} className="size-10 rounded-md bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger transition-all border border-slate-200 dark:border-slate-700"><span className="material-symbols-outlined text-2xl">close</span></button>
              </header>
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar"><p className="text-center text-slate-400">Vista de agenda (simplificada para demo)</p></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Doctors;
