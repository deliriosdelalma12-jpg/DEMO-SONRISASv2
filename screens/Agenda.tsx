
import React, { useState } from 'react';
import { Appointment, AppointmentStatus } from '../types';

interface AgendaProps {
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
}

const Agenda: React.FC<AgendaProps> = ({ appointments, setAppointments }) => {
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedAptId, setDraggedAptId] = useState<string | null>(null);

  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const calendarDays = Array.from({ length: 35 }, (_, i) => i - 4); // Fixed view for Oct 2023 demo

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'Confirmed': return 'bg-success text-white';
      case 'Rescheduled': return 'bg-warning text-white';
      case 'Cancelled': return 'bg-danger text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const onDragStart = (id: string) => setDraggedAptId(id);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (day: number) => {
    if (!draggedAptId) return;
    const newDate = `2023-10-${day.toString().padStart(2, '0')}`;
    setAppointments(prev => prev.map(apt => apt.id === draggedAptId ? { ...apt, date: newDate, status: 'Rescheduled' } : apt));
    setDraggedAptId(null);
  };

  const handleAptClick = (apt: Appointment) => {
    setSelectedApt(apt);
    setIsModalOpen(true);
  };

  const updateStatus = (id: string, status: AppointmentStatus) => {
    setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, status } : apt));
    setIsModalOpen(false);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto w-full h-full flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-slate-900 dark:text-white text-4xl font-display font-bold">Agenda Médica</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona el flujo de pacientes y disponibilidades.</p>
        </div>
        <button className="flex items-center gap-2 h-12 px-8 rounded-2xl bg-primary text-white font-bold hover:shadow-xl hover:shadow-primary/30 transition-all">
          <span className="material-symbols-outlined">add</span>
          <span>Nueva Cita</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 p-3 rounded-3xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
        <div className="flex bg-bg-light dark:bg-bg-dark rounded-2xl p-1.5 shadow-inner">
          {['day', 'week', 'month'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v as any)}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${
                view === v 
                  ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-6">
          <button className="size-10 flex items-center justify-center rounded-full hover:bg-bg-light dark:hover:bg-bg-dark border border-border-light dark:border-border-dark transition-colors">
             <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <span className="text-slate-900 dark:text-white text-xl font-display font-bold min-w-[180px] text-center">Octubre 2023</span>
          <button className="size-10 flex items-center justify-center rounded-full hover:bg-bg-light dark:hover:bg-bg-dark border border-border-light dark:border-border-dark transition-colors">
             <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-surface-dark rounded-[2rem] border border-border-light dark:border-border-dark overflow-hidden flex flex-col shadow-xl min-h-[700px]">
        <div className="grid grid-cols-7 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50">
          {days.map(d => (
            <div key={d} className="py-5 text-center text-xs font-black uppercase tracking-widest text-slate-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-5 flex-1 divide-x divide-y divide-border-light dark:divide-border-dark">
          {calendarDays.map((day, i) => {
            const dateStr = `2023-10-${day.toString().padStart(2, '0')}`;
            const dayAppointments = appointments.filter(a => a.date === dateStr);
            const isToday = day === 24;
            const isCurrentMonth = day > 0 && day <= 31;
            
            return (
              <div 
                key={i} 
                onDragOver={onDragOver}
                onDrop={() => isCurrentMonth && onDrop(day)}
                className={`p-3 min-h-[140px] transition-all relative group overflow-hidden ${!isCurrentMonth ? 'bg-slate-50 dark:bg-slate-900/20 opacity-30 cursor-not-allowed' : 'hover:bg-slate-50/50 dark:hover:bg-white/5 cursor-pointer'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  {isCurrentMonth && (
                    <span className={`flex items-center justify-center size-8 rounded-xl text-sm font-black ${isToday ? 'bg-primary text-white shadow-lg' : 'text-slate-900 dark:text-white'}`}>
                      {day}
                    </span>
                  )}
                  {isCurrentMonth && (
                    <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-opacity">
                      <span className="material-symbols-outlined text-[20px]">add_box</span>
                    </button>
                  )}
                </div>
                
                <div className="flex flex-col gap-2">
                  {isCurrentMonth && dayAppointments.map(apt => (
                    <div
                      key={apt.id}
                      draggable
                      onDragStart={() => onDragStart(apt.id)}
                      onClick={(e) => { e.stopPropagation(); handleAptClick(apt); }}
                      className={`p-2.5 rounded-xl text-[11px] font-bold shadow-sm transition-all hover:scale-[1.02] cursor-move ${getStatusColor(apt.status)}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span>{apt.time}</span>
                        <span className="material-symbols-outlined text-[14px]">drag_indicator</span>
                      </div>
                      <div className="truncate">{apt.patientName}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {isModalOpen && selectedApt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 modal-backdrop">
          <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-border-light dark:border-border-dark animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
               <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">Detalle de la Cita</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                 <span className="material-symbols-outlined">close</span>
               </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-4xl">person</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">{selectedApt.patientName}</h4>
                  <p className="text-sm text-slate-500">Paciente ID: {selectedApt.patientId}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-light dark:bg-bg-dark p-4 rounded-2xl">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fecha y Hora</p>
                   <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedApt.date} • {selectedApt.time}</p>
                </div>
                <div className="bg-bg-light dark:bg-bg-dark p-4 rounded-2xl">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Estado Actual</p>
                   <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${getStatusColor(selectedApt.status)}`}>
                     {selectedApt.status}
                   </span>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acciones Rápidas</p>
                <div className="flex flex-col gap-2">
                   <button onClick={() => updateStatus(selectedApt.id, 'Confirmed')} className="w-full py-3 rounded-2xl bg-success text-white font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2">
                     <span className="material-symbols-outlined">check_circle</span> Confirmar Cita
                   </button>
                   <button onClick={() => updateStatus(selectedApt.id, 'Rescheduled')} className="w-full py-3 rounded-2xl bg-warning text-white font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2">
                     <span className="material-symbols-outlined">event_repeat</span> Reprogramar
                   </button>
                   <button onClick={() => updateStatus(selectedApt.id, 'Cancelled')} className="w-full py-3 rounded-2xl bg-danger text-white font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2">
                     <span className="material-symbols-outlined">cancel</span> Cancelar Cita
                   </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
