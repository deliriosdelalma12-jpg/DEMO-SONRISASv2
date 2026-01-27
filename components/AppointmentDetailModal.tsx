
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
      case 'Confirmed': return 'bg-emerald-500 text-white';
      case 'Reprogramada': return 'bg-amber-400 text-white shadow-lg shadow-amber-400/20';
      case 'Cancelled': return 'bg-rose-500 text-white shadow-lg shadow-rose-500/20';
      case 'Pending': return 'bg-slate-400 text-white';
      case 'Completed': return 'bg-blue-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const handleRescheduleSubmit = () => {
    onUpdateStatus(appointment.id, 'Reprogramada', newDate, newTime);
    setIsRescheduling(false);
    onClose();
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
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
        <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-border-light dark:border-border-dark">
          <div className="p-10 pb-4 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 mb-8">
            <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Reprogramar</h3>
            <button onClick={() => setIsRescheduling(false)} className="size-10 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition-all border border-transparent hover:border-slate-200">
              <span className="material-symbols-outlined text-4xl">close</span>
            </button>
          </div>
          
          <div className="p-10 pt-4 space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] block ml-1">Nueva Fecha</label>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]}
                  value={newDate} 
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-2xl px-6 py-5 text-xl font-black text-primary focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] block ml-1">Nueva Hora</label>
                <input 
                  type="time" 
                  value={newTime} 
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-2xl px-6 py-5 text-xl font-black text-primary focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>
            <div className="flex flex-col gap-4 pt-6">
              <button onClick={handleRescheduleSubmit} className="w-full h-20 rounded-[2rem] bg-primary text-white font-black uppercase text-xs tracking-[0.3em] shadow-[0_20px_40px_rgba(59,130,246,0.4)] hover:scale-105 transition-all">Confirmar Cambio</button>
              <button onClick={() => setIsRescheduling(false)} className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Volver atrás</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCancelling) {
    return (
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
        <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden border border-border-light dark:border-border-dark animate-in zoom-in duration-300">
          
          {replacementView === 'confirm' && (
            <div className="p-12 text-center space-y-10">
              <div className="size-24 bg-rose-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-rose-500/30 animate-bounce">
                <span className="material-symbols-outlined text-5xl">warning</span>
              </div>
              <div className="space-y-3">
                <h3 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">¿Anular Cita?</h3>
                <p className="text-slate-500 text-sm font-medium italic">¿Quieres liberar el hueco y buscar otro paciente ahora?</p>
              </div>
              <div className="flex flex-col gap-4">
                <button onClick={() => setReplacementView('options')} className="w-full h-20 rounded-[2rem] bg-primary text-white font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-2xl">person_add</span> SÍ, RELLENAR HUECO
                </button>
                <button onClick={() => { onUpdateStatus(appointment.id, 'Cancelled'); setIsCancelling(false); onClose(); }} className="w-full h-20 rounded-[2rem] bg-rose-500 text-white font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-2xl">block</span> NO, SOLO CANCELAR
                </button>
                <button onClick={() => setIsCancelling(false)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Ignorar y Volver</button>
              </div>
            </div>
          )}

          {replacementView === 'options' && (
            <div className="p-12 text-center space-y-8 animate-in slide-in-from-right-4">
              <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Protocolo de Sustitución</h3>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => onCancelWithReplacement?.(appointment.id, 'NEW')}
                  className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-bg-dark border-2 border-transparent hover:border-primary transition-all text-left flex items-center gap-6 group shadow-inner"
                >
                  <div className="size-16 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-lg">
                    <span className="material-symbols-outlined text-3xl">person_add</span>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white text-xl uppercase tracking-tighter leading-none">Alta Inmediata</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Crear expediente nuevo</p>
                  </div>
                </button>
                <button 
                  onClick={() => setReplacementView('search')}
                  className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-bg-dark border-2 border-transparent hover:border-primary transition-all text-left flex items-center gap-6 group shadow-inner"
                >
                  <div className="size-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg">
                    <span className="material-symbols-outlined text-3xl">person_search</span>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white text-xl uppercase tracking-tighter leading-none">Lista Existente</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Vincular paciente activo</p>
                  </div>
                </button>
                <button onClick={() => setReplacementView('confirm')} className="text-[10px] font-black text-slate-400 mt-6 uppercase tracking-widest">Volver a la pregunta anterior</button>
              </div>
            </div>
          )}

          {replacementView === 'search' && (
            <div className="p-10 space-y-8 animate-in slide-in-from-right-4 h-[650px] flex flex-col">
              <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Buscador de Pacientes</h3>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-2xl">search</span>
                <input 
                  autoFocus
                  placeholder="Escriba nombre o ID de expediente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-3xl pl-16 pr-8 py-6 text-lg font-bold text-primary focus:ring-4 focus:ring-primary/10 shadow-inner"
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {filteredPatients.length > 0 ? filteredPatients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onCancelWithReplacement?.(appointment.id, p)}
                    className="w-full p-5 rounded-[2rem] bg-white dark:bg-surface-dark hover:bg-primary/5 text-left transition-all flex items-center gap-6 border-2 border-slate-50 dark:border-slate-800 hover:border-primary shadow-sm"
                  >
                    <div className="size-14 rounded-2xl overflow-hidden shrink-0 border-2 border-white dark:border-slate-700 shadow-md">
                      <img src={p.img} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tighter leading-none">{p.name}</p>
                      <p className="text-[9px] text-primary font-black uppercase tracking-widest mt-2 italic">EXP: {p.id} • DNI: {p.identityDocument}</p>
                    </div>
                  </button>
                )) : (
                  <div className="text-center py-20 opacity-30 italic">
                    <span className="material-symbols-outlined text-6xl block mb-4">person_off</span>
                    <p className="text-sm font-black uppercase tracking-widest">Sin coincidencias registradas</p>
                  </div>
                )}
              </div>
              <button onClick={() => setReplacementView('options')} className="w-full h-16 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest">Atrás</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-surface-dark w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden border border-border-light dark:border-border-dark animate-in zoom-in duration-300 my-auto">
        <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-5">
             <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
               <span className="material-symbols-outlined text-3xl">event_upcoming</span>
             </div>
             <div>
                <h3 className="text-xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Detalles de la Cita</h3>
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mt-2">Sincronizado CORE v3.0</p>
             </div>
          </div>
          <button onClick={onClose} className="size-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="material-symbols-outlined text-4xl">close</span>
          </button>
        </div>
        
        <div className="p-12 space-y-10">
          <div className="flex items-start gap-8 cursor-pointer group p-6 -mx-6 rounded-[2.5rem] hover:bg-primary/5 transition-all" onClick={handlePatientClick}>
            <div className="size-24 rounded-[2rem] bg-white dark:bg-slate-800 overflow-hidden border-4 border-white dark:border-slate-700 shadow-xl group-hover:scale-105 transition-transform shrink-0">
              <img src={patients.find(p => p.id === appointment.patientId)?.img || 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=P'} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="min-w-0 flex-1 pt-2">
              <h4 className="text-5xl font-display font-black text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors tracking-tighter leading-none">{appointment.patientName}</h4>
              <div className="flex items-center gap-4 mt-4">
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-lg">EXP: {appointment.patientId}</p>
                 <span className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Ver Expediente Completo <span className="material-symbols-outlined text-xs">open_in_new</span></span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-slate-50 dark:bg-bg-dark p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-inner flex flex-col justify-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-sm">schedule</span> Turno Programado</p>
              <p className="text-5xl font-black text-primary tracking-tighter">{appointment.time}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-3 tracking-widest border-l-2 border-primary pl-3">{new Date(appointment.date).toLocaleDateString('es-ES', {weekday: 'long', day: 'numeric', month: 'long'})}</p>
            </div>
            <div className="bg-slate-50 dark:bg-bg-dark p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-inner flex flex-col justify-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-sm">info</span> Estado Operativo</p>
              <div>
                <span className={`inline-block px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] ${getStatusColor(appointment.status)}`}>
                    {getStatusLabel(appointment.status)}
                </span>
                <p className="text-[9px] text-slate-400 mt-3 font-medium italic">Actualizado hace 2 min</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div className="bg-slate-50 dark:bg-bg-dark p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-sm">stethoscope</span> Médico Especialista</p>
                {isLocked ? (
                  <p className="text-xl font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter">{appointment.doctorName}</p>
                ) : (
                  <div className="relative">
                      <select 
                        value={selectedDoctorId} 
                        onChange={handleDoctorChange}
                        className="w-full bg-white dark:bg-surface-dark border-none rounded-2xl py-4 pl-4 pr-10 text-base font-black text-primary focus:ring-4 focus:ring-primary/10 shadow-md cursor-pointer"
                      >
                        {doctors.map(doc => (
                          <option key={doc.id} value={doc.id}>{doc.name}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none">expand_more</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-bg-dark p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-sm">medical_services</span> Servicio Clínico</p>
                <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{appointment.treatment}</p>
              </div>
          </div>

          <div className="space-y-4 pt-10 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-4">
              {!isLocked && (
                <button 
                  onClick={() => { onUpdateStatus(appointment.id, 'Completed'); onClose(); }} 
                  className="w-full h-24 rounded-[2rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black hover:scale-[1.02] transition-all flex items-center justify-center gap-4 shadow-2xl text-lg uppercase tracking-[0.4em]"
                >
                  <span className="material-symbols-outlined text-4xl">check_circle</span> 
                  FINALIZAR CITA
                </button>
              )}
              <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => { onUpdateStatus(appointment.id, 'Confirmed'); onClose(); }} 
                    disabled={isLocked}
                    className="h-16 rounded-[1.5rem] bg-emerald-500 text-white font-black hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-xl text-[11px] uppercase tracking-widest"
                >
                    <span className="material-symbols-outlined">verified</span> Confirmar
                </button>
                <button 
                    onClick={() => setIsRescheduling(true)} 
                    disabled={isLocked}
                    className="h-16 rounded-[1.5rem] bg-amber-400 text-white font-black hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-xl text-[11px] uppercase tracking-widest"
                >
                    <span className="material-symbols-outlined">edit_calendar</span> Mover Cita
                </button>
              </div>
              <button 
                onClick={() => setIsCancelling(true)} 
                disabled={isLocked}
                className="w-full h-16 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 text-rose-500 font-black hover:bg-rose-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em]"
              >
                <span className="material-symbols-outlined">cancel</span> ELIMINAR REGISTRO DE AGENDA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailModal;
