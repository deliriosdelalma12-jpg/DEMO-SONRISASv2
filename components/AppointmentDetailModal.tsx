
import React, { useState } from 'react';
import { Appointment, AppointmentStatus, Patient, Doctor, ClinicSettings } from '../types';
import { useNavigate } from 'react-router-dom';

interface AppointmentDetailModalProps {
  appointment: Appointment;
  onClose: () => void;
  onUpdateStatus: (id: string, status: AppointmentStatus, newDate?: string, newTime?: string, doctorId?: string, doctorName?: string) => void;
  onCancelWithReplacement?: (id: string, replacement?: Patient | 'NEW') => void;
  patients: Patient[];
  doctors: Doctor[];
  settings?: ClinicSettings; 
}

const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({ 
  appointment, 
  onClose, 
  onUpdateStatus,
  onCancelWithReplacement,
  patients,
  doctors,
  settings
}) => {
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [replacementView, setReplacementView] = useState<'confirm' | 'options' | 'search'>('confirm');
  const [searchQuery, setSearchQuery] = useState('');
  const [newDate, setNewDate] = useState(appointment.date);
  const [newTime, setNewTime] = useState(appointment.time);
  const [selectedDoctorId, setSelectedDoctorId] = useState(appointment.doctorId);
  const navigate = useNavigate();

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'Confirmada';
      case 'Reprogramada': return 'Reprogramada';
      case 'Cancelled': return 'Cancelada';
      case 'Pending': return 'Pendiente';
      case 'Completed': return 'Atendida';
      default: return status;
    }
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'Confirmed': return 'bg-success text-white';
      case 'Reprogramada': return 'bg-warning text-white';
      case 'Cancelled': return 'bg-danger text-white';
      case 'Pending': return 'bg-slate-400 text-white';
      case 'Completed': return 'bg-primary text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const handleRescheduleSubmit = () => {
    onUpdateStatus(appointment.id, 'Reprogramada', newDate, newTime);
    setIsRescheduling(false);
  };

  const handleDoctorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const docId = e.target.value;
    setSelectedDoctorId(docId);
    const doc = doctors.find(d => d.id === docId);
    onUpdateStatus(appointment.id, appointment.status, appointment.date, appointment.time, docId, doc?.name);
  };

  const handlePatientClick = () => {
      navigate(`/patients?openId=${appointment.patientId}`);
      onClose();
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLocked = appointment.status === 'Cancelled' || appointment.status === 'Completed';

  if (isRescheduling) {
    return (
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-6 bg-slate-900/60 modal-backdrop">
        <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 border border-border-light dark:border-border-dark">
          <div className="p-8 pb-4 flex justify-between items-center">
            <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Reprogramar Cita</h3>
            <button onClick={() => setIsRescheduling(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
          </div>
          
          <div className="p-8 pt-4 space-y-6">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black uppercase text-slate-400 tracking-widest block mb-2 ml-1">Nueva Fecha</label>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]}
                  value={newDate} 
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-2xl px-6 py-4 text-lg font-bold text-black dark:text-white focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-slate-400 tracking-widest block mb-2 ml-1">Nueva Hora</label>
                <input 
                  type="time" 
                  value={newTime} 
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-2xl px-6 py-4 text-lg font-bold text-black dark:text-white focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setIsRescheduling(false)} className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-500 uppercase tracking-widest">Cancelar</button>
              <button onClick={handleRescheduleSubmit} className="flex-1 py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 uppercase tracking-widest">Confirmar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCancelling) {
    return (
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-6 bg-slate-900/60 modal-backdrop">
        <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-border-light dark:border-border-dark animate-in zoom-in duration-200">
          
          {replacementView === 'confirm' && (
            <div className="p-10 text-center space-y-8">
              <div className="size-20 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-4xl">warning</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white">¿Cancelar Cita?</h3>
                <p className="text-slate-500 text-sm font-medium">¿Deseas asignar este hueco a otro paciente inmediatamente?</p>
              </div>
              <div className="flex flex-col gap-4">
                <button onClick={() => setReplacementView('options')} className="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-xl">person_add</span> SÍ, LLENAR HUECO
                </button>
                <button onClick={() => { onUpdateStatus(appointment.id, 'Cancelled'); setIsCancelling(false); }} className="w-full py-4 rounded-2xl bg-danger text-white font-bold flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-xl">close</span> NO, SOLO CANCELAR
                </button>
                <button onClick={() => setIsCancelling(false)} className="w-full py-2 text-slate-400 font-bold text-sm uppercase tracking-widest">Volver</button>
              </div>
            </div>
          )}

          {replacementView === 'options' && (
            <div className="p-10 text-center space-y-8 animate-in slide-in-from-right-4">
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white">Rellenar Hueco Libre</h3>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => onCancelWithReplacement?.(appointment.id, 'NEW')}
                  className="p-6 rounded-[2rem] bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark hover:border-primary transition-all text-left flex items-center gap-6 group"
                >
                  <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">person_add</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-lg">Crear Nuevo Paciente</p>
                  </div>
                </button>
                <button 
                  onClick={() => setReplacementView('search')}
                  className="p-6 rounded-[2rem] bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark hover:border-primary transition-all text-left flex items-center gap-6 group"
                >
                  <div className="size-14 rounded-2xl bg-success/10 text-success flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">person_search</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-lg">Seleccionar de la Lista</p>
                  </div>
                </button>
                <button onClick={() => setReplacementView('confirm')} className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-widest">Volver atrás</button>
              </div>
            </div>
          )}

          {replacementView === 'search' && (
            <div className="p-8 space-y-6 animate-in slide-in-from-right-4 h-[600px] flex flex-col">
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white">Buscar Paciente</h3>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                <input 
                  autoFocus
                  placeholder="Nombre o ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-light dark:bg-bg-dark border-border-light dark:border-border-dark rounded-2xl pl-12 pr-4 py-4 text-base font-bold focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredPatients.length > 0 ? filteredPatients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onCancelWithReplacement?.(appointment.id, p)}
                    className="w-full p-4 rounded-2xl hover:bg-primary/5 text-left transition-colors flex items-center gap-4 border border-transparent hover:border-primary/20"
                  >
                    <div className="size-12 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                      <img src={p.img} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-base truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 font-black">ID: {p.id}</p>
                    </div>
                  </button>
                )) : (
                  <div className="text-center py-10 opacity-40">
                    <p className="text-sm font-bold italic">No se encontraron pacientes</p>
                  </div>
                )}
              </div>
              <button onClick={() => setReplacementView('options')} className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-500 text-sm uppercase tracking-widest">Atrás</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 modal-backdrop overflow-y-auto">
      <div className="bg-white dark:bg-surface-dark w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-border-light dark:border-border-dark animate-in fade-in zoom-in duration-200 my-auto">
        <div className="p-8 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
             <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
               <span className="material-symbols-outlined text-2xl">event</span>
             </div>
             <div>
                <h3 className="text-lg font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Ficha de Cita</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ID: {appointment.id}</p>
             </div>
          </div>
          <button onClick={onClose} className="size-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </div>
        
        <div className="p-10 space-y-8">
          <div className="flex items-start gap-6 cursor-pointer group p-4 -mx-4 rounded-3xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" onClick={handlePatientClick} title="Ver Expediente">
            <div className="size-20 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform shadow-md">
              <span className="material-symbols-outlined text-5xl">person</span>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-4xl font-display font-black text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors tracking-tight">{appointment.patientName}</h4>
              <div className="flex items-center gap-3 mt-2">
                 <p className="text-sm text-slate-500 font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">ID: {appointment.patientId}</p>
                 <span className="flex items-center gap-1 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Ver Ficha <span className="material-symbols-outlined text-sm">open_in_new</span></span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 dark:bg-bg-dark p-6 rounded-[2rem] border border-border-light dark:border-border-dark flex flex-col justify-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-sm">schedule</span> Horario</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{appointment.time}</p>
              <p className="text-xs font-bold text-slate-500 uppercase mt-1">{new Date(appointment.date).toLocaleDateString('es-ES', {weekday: 'long', day: 'numeric', month: 'long'})}</p>
            </div>
            <div className="bg-slate-50 dark:bg-bg-dark p-6 rounded-[2rem] border border-border-light dark:border-border-dark flex flex-col justify-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-sm">info</span> Estado</p>
              <div>
                <span className={`inline-block px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${getStatusColor(appointment.status)}`}>
                    {getStatusLabel(appointment.status)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-bg-dark p-6 rounded-[2rem] border border-border-light dark:border-border-dark">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-sm">stethoscope</span> Médico Responsable</p>
            {isLocked ? (
              <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{appointment.doctorName}</p>
            ) : (
              <div className="relative">
                  <select 
                    value={selectedDoctorId} 
                    onChange={handleDoctorChange}
                    className="w-full bg-white dark:bg-surface-dark border-none rounded-xl py-4 pl-4 pr-10 text-lg font-bold text-primary focus:ring-2 focus:ring-primary shadow-sm cursor-pointer"
                  >
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialty})</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none">expand_more</span>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 dark:bg-bg-dark rounded-[2rem] border border-border-light dark:border-border-dark">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-sm">medical_services</span> Tratamiento</p>
            <p className="text-xl font-bold text-primary">{appointment.treatment}</p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-4">
              {!isLocked && (
                <button 
                  onClick={() => onUpdateStatus(appointment.id, 'Completed')} 
                  className="w-full h-16 rounded-[1.5rem] bg-primary text-white font-black hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/30 text-sm uppercase tracking-widest"
                >
                  <span className="material-symbols-outlined text-2xl">task_alt</span> 
                  Finalizar Consulta
                </button>
              )}
              <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => onUpdateStatus(appointment.id, 'Confirmed')} 
                    disabled={isLocked}
                    className="h-14 rounded-[1.5rem] bg-emerald-500 text-white font-bold hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md text-xs uppercase tracking-widest"
                >
                    <span className="material-symbols-outlined text-lg">check_circle</span> Confirmar
                </button>
                <button 
                    onClick={() => setIsRescheduling(true)} 
                    disabled={isLocked}
                    className="h-14 rounded-[1.5rem] bg-amber-500 text-white font-bold hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md text-xs uppercase tracking-widest"
                >
                    <span className="material-symbols-outlined text-lg">edit_calendar</span> Reprogramar
                </button>
              </div>
              <button 
                onClick={() => setIsCancelling(true)} 
                disabled={isLocked}
                className="w-full h-12 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 text-rose-500 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
                <span className="material-symbols-outlined text-lg">cancel</span> Cancelar Cita
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailModal;
