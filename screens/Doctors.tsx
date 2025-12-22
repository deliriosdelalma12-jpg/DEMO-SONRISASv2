
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Doctor, Appointment, DaySchedule, Branch, Patient, ClinicSettings } from '../types';
import DoctorDetailModal from '../components/DoctorDetailModal';
import AppointmentDetailModal from '../components/AppointmentDetailModal';
import { useSearchParams } from 'react-router-dom';
import { DataField } from '../components/shared/DataField';

interface DoctorsProps {
  doctors: Doctor[];
  appointments: Appointment[];
  setDoctors?: React.Dispatch<React.SetStateAction<Doctor[]>>;
  setAppointments?: React.Dispatch<React.SetStateAction<Appointment[]>>;
  branches?: Branch[];
  patients?: Patient[];
  clinicSettings?: ClinicSettings;
}

const Doctors: React.FC<DoctorsProps> = ({ doctors, appointments, setDoctors, setAppointments, branches = [], patients = [], clinicSettings }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDoctorForAgenda, setSelectedDoctorForAgenda] = useState<Doctor | null>(null);
  const [selectedDoctorForProfile, setSelectedDoctorForProfile] = useState<Doctor | null>(null);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); 
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return doctors;
    const q = searchQuery.toLowerCase();
    return doctors.filter(d => 
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.branch.toLowerCase().includes(q)
    );
  }, [doctors, searchQuery]);

  const doctorAppointments = useMemo(() => {
    if (!selectedDoctorForAgenda) return [];
    return appointments
      .filter(a => a.doctorId === selectedDoctorForAgenda.id)
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateB.getTime() - dateA.getTime();
      });
  }, [selectedDoctorForAgenda, appointments]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Completed': return { label: 'Atendida', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 'Cancelled': return { label: 'Cancelada', class: 'bg-rose-50 text-rose-600 border-rose-100' };
      case 'Reprogramada': return { label: 'Reprogramada', class: 'bg-amber-50 text-amber-600 border-amber-100' };
      case 'Confirmed': return { label: 'Confirmada', class: 'bg-blue-50 text-blue-600 border-blue-100' };
      case 'Pending': return { label: 'Pendiente', class: 'bg-slate-100 text-slate-500 border-slate-200' };
      default: return { label: status, class: 'bg-slate-50 text-slate-400' };
    }
  };

  const handleUpdateAptStatus = (id: string, status: any, newDate?: string, newTime?: string, doctorId?: string, doctorName?: string) => {
    if (setAppointments) {
      setAppointments(prev => prev.map(apt => apt.id === id ? { 
        ...apt, 
        status, 
        date: newDate || apt.date, 
        time: newTime || apt.time,
        doctorId: doctorId || apt.doctorId,
        doctorName: doctorName || apt.doctorName
      } : apt));
      setSelectedApt(null);
    }
  };

  return (
    <div className="w-full flex flex-col p-6 gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Cuerpo Médico</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium italic">Gestión operativa y agendas de especialistas.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="h-12 px-6 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all flex items-center gap-2 shadow-lg shadow-primary/20 shrink-0"><span className="material-symbols-outlined text-xl">person_add</span><span className="text-xs uppercase tracking-tight">Registrar Médico</span></button>
      </div>

      <div className="relative w-full">
        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">search</span>
        <input 
            type="text" 
            placeholder="Buscar por nombre o especialidad..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-surface-dark border-none rounded-[1.5rem] py-4 pl-14 pr-6 text-sm font-bold shadow-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDoctors.map((doc) => (
            <div key={doc.id} className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6 hover:border-primary transition-all relative overflow-hidden group shadow-sm">
                <div className="flex items-center gap-5 mb-6">
                    <div className="size-20 rounded-lg bg-cover bg-center border border-slate-200 dark:border-slate-700 shadow-sm" style={{ backgroundImage: `url("${doc.img}")` }}></div>
                    <div>
                        <h3 className="text-xl font-display font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-tight">{doc.name}</h3>
                        <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mt-1">{doc.specialty}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-6">
                    <button onClick={() => setSelectedDoctorForAgenda(doc)} className="py-2.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[9px] font-black uppercase text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-base">event_note</span><span>Agenda</span></button>
                    <button onClick={() => setSelectedDoctorForProfile(doc)} className="py-2.5 bg-primary/10 text-primary rounded-md text-[9px] font-black uppercase hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-base">contact_page</span><span>Ficha</span></button>
                </div>
            </div>
        ))}
      </div>

      {selectedDoctorForAgenda && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
           <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-4xl rounded-[2.5rem] overflow-hidden flex flex-col border border-border-light dark:border-border-dark h-[85vh]">
              <header className="px-10 py-8 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="size-14 rounded-2xl bg-cover bg-center border-2 border-white" style={{backgroundImage: `url('${selectedDoctorForAgenda.img}')`}}></div>
                    <div>
                        <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Consultas de {selectedDoctorForAgenda.name.split(' ')[0]}</h2>
                        <p className="text-[10px] font-black text-primary uppercase mt-1">Especialidad: {selectedDoctorForAgenda.specialty}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedDoctorForAgenda(null)} className="size-10 rounded-md bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger transition-all border border-slate-200 dark:border-slate-700">
                    <span className="material-symbols-outlined text-2xl">close</span>
                 </button>
              </header>
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-4">
                {doctorAppointments.length > 0 ? doctorAppointments.map(apt => {
                    const statusInfo = getStatusInfo(apt.status);
                    return (
                        <div key={apt.id} onClick={() => setSelectedApt(apt)} className="flex items-center justify-between p-6 bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl hover:border-primary transition-all cursor-pointer group">
                            <div className="flex items-center gap-6">
                                <div className="text-center w-16 group-hover:scale-110 transition-transform">
                                    <p className="text-xl font-black text-primary">{apt.time}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(apt.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                                </div>
                                <div className="h-10 w-px bg-slate-100 dark:bg-slate-800"></div>
                                <div>
                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors">{apt.patientName}</p>
                                    <p className="text-[10px] font-bold text-slate-500">{apt.treatment}</p>
                                </div>
                            </div>
                            <div>
                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border ${statusInfo.class}`}>
                                    {statusInfo.label}
                                </span>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="py-20 text-center opacity-40">
                        <span className="material-symbols-outlined text-6xl mb-4">event_busy</span>
                        <p className="font-black text-sm uppercase tracking-widest">Sin actividad registrada en la agenda</p>
                    </div>
                )}
              </div>
           </div>
        </div>
      )}

      {selectedApt && (
        <AppointmentDetailModal 
            appointment={selectedApt} 
            onClose={() => setSelectedApt(null)} 
            onUpdateStatus={handleUpdateAptStatus} 
            patients={patients} 
            doctors={doctors} 
            settings={clinicSettings} 
        />
      )}

      {selectedDoctorForProfile && (
        <DoctorDetailModal 
            doctor={selectedDoctorForProfile} 
            appointments={appointments} 
            onClose={() => setSelectedDoctorForProfile(null)} 
            onSave={(updated) => setDoctors && setDoctors(prev => prev.map(d => d.id === updated.id ? updated : d))}
            branches={branches}
        />
      )}
    </div>
  );
};

export default Doctors;
