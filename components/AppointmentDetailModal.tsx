
import React, { useState } from 'react';
import { Appointment, AppointmentStatus, Patient, Doctor } from '../types';
import { useNavigate } from 'react-router-dom';

interface AppointmentDetailModalProps {
  appointment: Appointment;
  onClose: () => void;
  onUpdateStatus: (id: string, status: AppointmentStatus, newDate?: string, newTime?: string, doctorId?: string, doctorName?: string) => void;
  onCancelWithReplacement?: (id: string, replacement?: Patient | 'NEW') => void;
  patients: Patient[];
  doctors: Doctor[];
}

const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({ 
  appointment, 
  onClose, 
  onUpdateStatus,
  onCancelWithReplacement,
  patients,
  doctors
}) => {
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [replacementView, setReplacementView] = useState<'confirm' | 'options' | 'search'>('confirm');
  const [searchQuery, setSearchQuery] = useState('');
  const [newDate, setNewDate] = useState(appointment.date);
  const [newTime, setNewTime] = useState(appointment.time);
  const [selectedDoctorId, setSelectedDoctorId] = useState(appointment.doctorId);
  const navigate = useNavigate();

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'Confirmed': return 'bg-success text-white';
      case 'Rescheduled': return 'bg-warning text-white';
      case 'Cancelled': return 'bg-danger text-white';
      case 'Pending': return 'bg-slate-400 text-white';
      case 'Completed': return 'bg-primary text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const handleRescheduleSubmit = () => {
    onUpdateStatus(appointment.id, 'Rescheduled', newDate, newTime);
    setIsRescheduling(false);
  };

  const handleDoctorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const docId = e.target.value;
    setSelectedDoctorId(docId);
    const doc = doctors.find(d => d.id === docId);
    onUpdateStatus(appointment.id, appointment.status, appointment.date, appointment.time, docId, doc?.name);
  };

  const handlePatientClick = () => {
      // Navigate to patient profile
      navigate(`/patients?openId=${appointment.patientId}`);
      onClose();
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isCancelled = appointment.status === 'Cancelled';
  const isCompleted = appointment.status === 'Completed';
  const isLocked = isCancelled || isCompleted;

  if (isRescheduling) {
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 modal-backdrop">
        <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 border border-border-light dark:border-border-dark">
          <div className="p-8 pb-4 flex justify-between items-center">
            <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">Reprogramar Cita</h3>
            <button onClick={() => setIsRescheduling(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
          </div>
          
          <div className="p-8 pt-4 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2 ml-1">Nueva Fecha</label>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]}
                  value={newDate} 
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-xl px-4 py-3 text-sm font-bold text-black dark:text-white focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2 ml-1">Nueva Hora</label>
                <input 
                  type="time" 
                  value={newTime} 
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-xl px-4 py-3 text-sm font-bold text-black dark:text-white focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsRescheduling(false)} className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-500">Cancelar</button>
              <button onClick={handleRescheduleSubmit} className="flex-1 py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20">Confirmar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCancelling) {
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 modal-backdrop">
        <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-border-light dark:border-border-dark animate-in zoom-in duration-200">
          
          {replacementView === 'confirm' && (
            <div className="p-10 text-center space-y-6">
              <div className="size-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-3xl">warning</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">¿Cancelar Cita?</h3>
                <p className="text-slate-500 text-xs">¿Deseas asignar este hueco a otro paciente inmediatamente?</p>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => setReplacementView('options')} className="w-full py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">person_add</span> Sí, llenar hueco
                </button>
                <button onClick={() => { onUpdateStatus(appointment.id, 'Cancelled'); setIsCancelling(false); }} className="w-full py-3.5 rounded-xl bg-danger text-white font-bold flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">close</span> No, solo cancelar
                </button>
                <button onClick={() => setIsCancelling(false)} className="w-full py-2 text-slate-400 font-bold text-xs">Volver</button>
              </div>
            </div>
          )}

          {replacementView === 'options' && (
            <div className="p-8 text-center space-y-6 animate-in slide-in-from-right-4">
              <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">Rellenar Hueco Libre</h3>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => onCancelWithReplacement?.(appointment.id, 'NEW')}
                  className="p-4 rounded-2xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark hover:border-primary transition-all text-left flex items-center gap-4 group"
                >
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">person_add</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">Crear Nuevo Paciente</p>
                  </div>
                </button>
                <button 
                  onClick={() => setReplacementView('search')}
                  className="p-4 rounded-2xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark hover:border-primary transition-all text-left flex items-center gap-4 group"
                >
                  <div className="size-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">person_search</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">Seleccionar de la Lista</p>
                  </div>
                </button>
                <button onClick={() => setReplacementView('confirm')} className="text-xs font-bold text-slate-400 mt-2">Volver atrás</button>
              </div>
            </div>
          )}

          {replacementView === 'search' && (
            <div className="p-8 space-y-4 animate-in slide-in-from-right-4 h-[500px] flex flex-col">
              <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">Buscar Paciente</h3>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input 
                  autoFocus
                  placeholder="Nombre o ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-light dark:bg-bg-dark border-border-light dark:border-border-dark rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filteredPatients.length > 0 ? filteredPatients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onCancelWithReplacement?.(appointment.id, p)}
                    className="w-full p-3 rounded-xl hover:bg-primary/5 text-left transition-colors flex items-center gap-3 border border-transparent hover:border-primary/20"
                  >
                    <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                      <img src={p.img} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{p.name}</p>
                      <p className="text-[9px] text-slate-500 font-black">ID: {p.id}</p>
                    </div>
                  </button>
                )) : (
                  <div className="text-center py-6 opacity-40">
                    <p className="text-xs italic">No se encontraron pacientes</p>
                  </div>
                )}
              </div>
              <button onClick={() => setReplacementView('options')} className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-500 text-sm">Atrás</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 modal-backdrop overflow-y-auto">
      <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-border-light dark:border-border-dark animate-in fade-in zoom-in duration-200 my-auto">
        <div className="p-6 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white uppercase tracking-wider">Ficha de la Cita</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-xl">person</span>
            </div>
            <div className="min-w-0 cursor-pointer group" onClick={handlePatientClick} title="Ver Expediente de Paciente">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">{appointment.patientName} <span className="material-symbols-outlined text-[10px] opacity-0 group-hover:opacity-100">open_in_new</span></h4>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Paciente ID: {appointment.patientId}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-bg-dark p-3 rounded-xl border border-border-light dark:border-border-dark">
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Fecha y Hora</p>
              <p className="text-[11px] font-bold text-slate-900 dark:text-white">{appointment.date} • {appointment.time}</p>
            </div>
            <div className="bg-slate-50 dark:bg-bg-dark p-3 rounded-xl border border-border-light dark:border-border-dark">
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Estado</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${getStatusColor(appointment.status)}`}>
                {appointment.status === 'Completed' ? 'Atendido' : appointment.status}
              </span>
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-bg-dark p-3 rounded-xl border border-border-light dark:border-border-dark">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Médico Tratante</p>
            {isLocked ? (
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{appointment.doctorName}</p>
            ) : (
              <select 
                value={selectedDoctorId} 
                onChange={handleDoctorChange}
                className="w-full bg-transparent border-none p-0 text-[11px] font-bold text-primary focus:ring-0 cursor-pointer"
              >
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialty})</option>
                ))}
              </select>
            )}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Tratamiento</p>
            <p className="text-[11px] font-bold text-primary">{appointment.treatment}</p>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Acciones</p>
            <div className="flex flex-col gap-2">
              {!isLocked && (
                <button 
                  onClick={() => onUpdateStatus(appointment.id, 'Completed')} 
                  className="w-full py-2.5 rounded-xl bg-primary text-white font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-sm text-xs"
                >
                  <span className="material-symbols-outlined text-base">task_alt</span> 
                  Finalizar / Marcar Atendido
                </button>
              )}
              <button 
                onClick={() => onUpdateStatus(appointment.id, 'Confirmed')} 
                disabled={isLocked}
                className="w-full py-2.5 rounded-xl bg-success text-white font-bold hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm text-xs"
              >
                <span className="material-symbols-outlined text-base">check_circle</span> 
                Confirmar Cita
              </button>
              <button 
                onClick={() => setIsRescheduling(true)} 
                disabled={isLocked}
                className="w-full py-2.5 rounded-xl bg-warning text-white font-bold hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm text-xs"
              >
                <span className="material-symbols-outlined text-base">event_repeat</span> 
                Reprogramar
              </button>
              <button 
                onClick={() => setIsCancelling(true)} 
                disabled={isLocked}
                className="w-full py-2.5 rounded-xl bg-danger text-white font-bold hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm text-xs"
              >
                <span className="material-symbols-outlined text-base">cancel</span> 
                Cancelar Cita
              </button>
              {(isCancelled || isCompleted) && (
                <p className="text-[8px] text-center text-slate-500 font-bold uppercase tracking-widest bg-slate-100 dark:bg-white/5 py-1.5 rounded-lg mt-1 italic">
                  {isCancelled ? 'Cita cancelada: solo lectura' : 'Cita atendida: expediente cerrado'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailModal;
