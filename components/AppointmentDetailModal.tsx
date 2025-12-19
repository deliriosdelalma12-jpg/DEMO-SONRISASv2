
import React, { useState } from 'react';
import { Appointment, AppointmentStatus, Patient, Doctor } from '../types';

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
        <div className="bg-[#e9ecef] dark:bg-surface-dark w-full max-w-[420px] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
          <div className="p-10 pb-4 flex justify-between items-center">
            <h3 className="text-2xl font-display font-bold text-[#334155] dark:text-white">Reprogramar Cita</h3>
            <button onClick={() => setIsRescheduling(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
          </div>
          
          <div className="p-10 pt-6 space-y-8">
            <div className="space-y-6">
              <div>
                <label className="text-[11px] font-black uppercase text-[#94a3b8] tracking-widest block mb-3 ml-2">Nueva Fecha</label>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]}
                  value={newDate} 
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-[#f1f5f9]/80 dark:bg-bg-dark border-none rounded-[1.5rem] px-6 py-4 text-base font-medium text-black dark:text-white focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-[#94a3b8] tracking-widest block mb-3 ml-2">Nueva Hora</label>
                <input 
                  type="time" 
                  value={newTime} 
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-[#f1f5f9]/80 dark:bg-bg-dark border-none rounded-[1.5rem] px-6 py-4 text-base font-medium text-black dark:text-white focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setIsRescheduling(false)} className="flex-1 py-5 rounded-[2rem] bg-[#f1f5f9] dark:bg-slate-800 font-bold text-[#64748b]">Cancelar</button>
              <button onClick={handleRescheduleSubmit} className="flex-1 py-5 rounded-[2rem] bg-[#4285f4] text-white font-bold shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCancelling) {
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 modal-backdrop">
        <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-border-light dark:border-border-dark animate-in zoom-in duration-200">
          
          {replacementView === 'confirm' && (
            <div className="p-10 text-center space-y-6">
              <div className="size-20 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-4xl">warning</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">¿Cancelar Cita?</h3>
                <p className="text-slate-500 text-sm">Esta acción marcará la cita como cancelada. ¿Deseas asignar este hueco a otro paciente inmediatamente?</p>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => setReplacementView('options')} className="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">person_add</span> Sí, llenar hueco libre
                </button>
                <button onClick={() => { onUpdateStatus(appointment.id, 'Cancelled'); setIsCancelling(false); }} className="w-full py-4 rounded-2xl bg-danger text-white font-bold flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">close</span> No, solo cancelar
                </button>
                <button onClick={() => setIsCancelling(false)} className="w-full py-3 text-slate-400 font-bold">Volver</button>
              </div>
            </div>
          )}

          {replacementView === 'options' && (
            <div className="p-10 text-center space-y-6 animate-in slide-in-from-right-4">
              <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Rellenar Hueco Libre</h3>
              <p className="text-slate-500 text-sm">Selecciona cómo deseas ocupar el espacio de {appointment.time}</p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => onCancelWithReplacement?.(appointment.id, 'NEW')}
                  className="p-6 rounded-3xl bg-bg-light dark:bg-bg-dark border-2 border-transparent hover:border-primary transition-all text-left flex items-center gap-4 group"
                >
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">person_add</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Crear Nuevo Paciente</p>
                    <p className="text-xs text-slate-500">Registrar y agendar nueva ficha</p>
                  </div>
                </button>
                <button 
                  onClick={() => setReplacementView('search')}
                  className="p-6 rounded-3xl bg-bg-light dark:bg-bg-dark border-2 border-transparent hover:border-primary transition-all text-left flex items-center gap-4 group"
                >
                  <div className="size-12 rounded-2xl bg-success/10 text-success flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">person_search</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Seleccionar de la Lista</p>
                    <p className="text-xs text-slate-500">Buscar en la base de datos existente</p>
                  </div>
                </button>
                <button onClick={() => setReplacementView('confirm')} className="text-sm font-bold text-slate-400 mt-2">Volver atrás</button>
              </div>
            </div>
          )}

          {replacementView === 'search' && (
            <div className="p-10 space-y-6 animate-in slide-in-from-right-4 h-[600px] flex flex-col">
              <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Buscar Paciente</h3>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input 
                  autoFocus
                  placeholder="Buscar por nombre o ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-light dark:bg-bg-dark border-none rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {filteredPatients.length > 0 ? filteredPatients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onCancelWithReplacement?.(appointment.id, p)}
                    className="w-full p-4 rounded-2xl hover:bg-primary/10 text-left transition-colors flex items-center gap-4 border border-transparent hover:border-primary/20"
                  >
                    <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                      <img src={p.img} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase">ID: {p.id}</p>
                    </div>
                  </button>
                )) : (
                  <div className="text-center py-10 opacity-40">
                    <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                    <p className="text-sm">No se encontraron pacientes</p>
                  </div>
                )}
              </div>
              <button onClick={() => setReplacementView('options')} className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-500">Atrás</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 modal-backdrop">
      <div className="bg-white dark:bg-surface-dark w-full max-md rounded-[3rem] shadow-2xl overflow-hidden border border-border-light dark:border-border-dark animate-in fade-in zoom-in duration-200">
        <div className="p-8 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">Ficha de la Cita</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-4xl">person</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">{appointment.patientName}</h4>
              <p className="text-sm text-slate-500 font-medium">Paciente ID: {appointment.patientId}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-light dark:bg-bg-dark p-4 rounded-2xl border border-border-light dark:border-border-dark">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fecha y Hora</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{appointment.date} • {appointment.time}</p>
            </div>
            <div className="bg-bg-light dark:bg-bg-dark p-4 rounded-2xl border border-border-light dark:border-border-dark">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Estado</p>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${getStatusColor(appointment.status)}`}>
                {appointment.status === 'Completed' ? 'Atendido' : appointment.status}
              </span>
            </div>
          </div>
          
          <div className="bg-bg-light dark:bg-bg-dark p-4 rounded-2xl border border-border-light dark:border-border-dark">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Médico Tratante</p>
            {isLocked ? (
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{appointment.doctorName}</p>
            ) : (
              <select 
                value={selectedDoctorId} 
                onChange={handleDoctorChange}
                className="w-full bg-transparent border-none p-0 text-sm font-bold text-primary focus:ring-0 cursor-pointer"
              >
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialty})</option>
                ))}
              </select>
            )}
          </div>

          <div className="p-4 bg-bg-light dark:bg-bg-dark rounded-2xl border border-border-light dark:border-border-dark">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Tratamiento</p>
            <p className="text-sm font-bold text-primary">{appointment.treatment}</p>
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Acciones</p>
            <div className="flex flex-col gap-2">
              {!isLocked && (
                <button 
                  onClick={() => onUpdateStatus(appointment.id, 'Completed')} 
                  className="w-full py-4 rounded-2xl bg-primary text-white font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">task_alt</span> 
                  Finalizar / Marcar Atendido
                </button>
              )}
              <button 
                onClick={() => onUpdateStatus(appointment.id, 'Confirmed')} 
                disabled={isLocked}
                className="w-full py-4 rounded-2xl bg-success text-white font-bold hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">check_circle</span> 
                Confirmar Cita
              </button>
              <button 
                onClick={() => setIsRescheduling(true)} 
                disabled={isLocked}
                className="w-full py-4 rounded-2xl bg-warning text-white font-bold hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">event_repeat</span> 
                Reprogramar
              </button>
              <button 
                onClick={() => setIsCancelling(true)} 
                disabled={isLocked}
                className="w-full py-4 rounded-2xl bg-danger text-white font-bold hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">cancel</span> 
                Cancelar Cita
              </button>
              {isCancelled && (
                <p className="text-[10px] text-center text-danger font-bold uppercase tracking-widest bg-danger/10 py-2 rounded-xl">Las citas canceladas no pueden ser modificadas.</p>
              )}
              {isCompleted && (
                <p className="text-[10px] text-center text-primary font-bold uppercase tracking-widest bg-primary/10 py-2 rounded-xl">Cita finalizada. El expediente está cerrado para cambios.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailModal;
