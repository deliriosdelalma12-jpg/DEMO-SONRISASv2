import React, { useState, useMemo } from 'react';
import { Appointment, Doctor, Patient, DaySchedule, ClinicSettings, AppointmentStatus } from '../types';
import AppointmentDetailModal from '../components/AppointmentDetailModal';

interface AgendaProps {
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  patients: Patient[];
  doctors: Doctor[];
  globalSchedule: Record<string, DaySchedule>;
  settings: ClinicSettings;
}

const Agenda: React.FC<AgendaProps> = ({ appointments, setAppointments, patients, doctors, globalSchedule, settings }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [doctorFilter, setDoctorFilter] = useState<string>('ALL');

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'Confirmed': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
      case 'Completed': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      case 'Cancelled': return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
      case 'Reprogramada': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => doctorFilter === 'ALL' || a.doctorId === doctorFilter);
  }, [appointments, doctorFilter]);

  // Calendar generation logic (days in month, padding days)
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    // Previous month padding
    const firstDayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1; // Mon start
    for (let i = firstDayIndex; i > 0; i--) {
        const prevDate = new Date(year, month, 1 - i);
        days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Current month days
    while (date.getMonth() === month) {
        days.push({ date: new Date(date), isCurrentMonth: true });
        date.setDate(date.getDate() + 1);
    }
    
    // Next month padding
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
        const nextDate = new Date(year, month + 1, i);
        days.push({ date: nextDate, isCurrentMonth: false });
    }
    
    return days;
  }, [currentDate]);

  const handleUpdateStatus = (id: string, status: AppointmentStatus, newDate?: string, newTime?: string, doctorId?: string, doctorName?: string) => {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status, date: newDate || a.date, time: newTime || a.time, doctorId: doctorId || a.doctorId, doctorName: doctorName || a.doctorName } : a));
      setSelectedApt(null);
  };

  const changeMonth = (delta: number) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setCurrentDate(newDate);
  };

  return (
    <div className="flex flex-col h-full p-6 gap-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">{settings.labels.agendaTitle}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium italic">Gestión de citas y disponibilidad.</p>
            </div>
            
            <div className="flex items-center gap-4 bg-white dark:bg-surface-dark p-2 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
                <button onClick={() => changeMonth(-1)} className="size-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><span className="material-symbols-outlined">chevron_left</span></button>
                <div className="text-center min-w-[140px]">
                    <span className="block text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{currentDate.toLocaleDateString('es-ES', { month: 'long' })}</span>
                    <span className="block text-[10px] font-bold text-slate-400">{currentDate.getFullYear()}</span>
                </div>
                <button onClick={() => changeMonth(1)} className="size-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><span className="material-symbols-outlined">chevron_right</span></button>
            </div>

            <select 
                value={doctorFilter} 
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary outline-none min-w-[200px]"
            >
                <option value="ALL">Todos los Doctores</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-white dark:bg-surface-dark rounded-[2rem] border border-border-light dark:border-border-dark shadow-xl overflow-hidden flex flex-col">
            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                    <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{day}</div>
                ))}
            </div>
            
            {/* Days Cells */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6">
                {daysInMonth.map((dayObj, idx) => {
                    const dateStr = dayObj.date.toISOString().split('T')[0];
                    const dayApts = filteredAppointments
                        .filter(a => a.date === dateStr && a.status !== 'Cancelled')
                        .sort((a, b) => a.time.localeCompare(b.time));
                    
                    const isToday = new Date().toDateString() === dayObj.date.toDateString();

                    return (
                        <div 
                            key={idx} 
                            className={`border-b border-r border-border-light dark:border-border-dark p-2 flex flex-col gap-1 transition-colors relative group min-h-[100px] ${!dayObj.isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                            onClick={() => { if(dayApts.length > 0) setExpandedDay(dateStr); }}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`text-xs font-bold size-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white shadow-md' : dayObj.isCurrentMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>
                                    {dayObj.date.getDate()}
                                </span>
                                {dayApts.length > 0 && <span className="text-[9px] font-black text-slate-400">{dayApts.length} citas</span>}
                            </div>
                            
                            <div className="flex-1 flex flex-col gap-1 mt-1 overflow-hidden">
                                {dayApts.slice(0, 3).map(apt => (
                                    <div 
                                        key={apt.id} 
                                        onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); }}
                                        className={`px-2 py-1 rounded-md text-[9px] font-bold truncate cursor-pointer hover:brightness-95 border-l-2 ${getStatusColor(apt.status)}`}
                                    >
                                        {apt.time} {apt.patientName.split(' ')[0]}
                                    </div>
                                ))}
                                {dayApts.length > 3 && (
                                    <div className="text-[9px] font-black text-slate-400 text-center bg-slate-100 dark:bg-slate-800 rounded-md py-0.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700">
                                        + {dayApts.length - 3} más
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Expanded Day Modal */}
        {expandedDay && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setExpandedDay(null)}>
            <div 
                className="bg-white dark:bg-surface-dark w-[95vw] max-w-[1600px] rounded-[3rem] shadow-2xl border border-border-light dark:border-border-dark overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-6">
                    <div className="size-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center shadow-sm">
                        <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{new Date(expandedDay).getDate()}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(expandedDay).toLocaleDateString('es-ES', { month: 'short' })}</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {new Date(expandedDay).toLocaleDateString('es-ES', { weekday: 'long' })}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Vista Detallada de Agenda • {filteredAppointments.filter(a => a.date === expandedDay).length} Citas
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => setExpandedDay(null)}
                    className="size-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-danger transition-all hover:scale-105"
                >
                    <span className="material-symbols-outlined text-2xl">close</span>
                </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 dark:bg-bg-dark/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {filteredAppointments
                        .filter(a => a.date === expandedDay)
                        .sort((a, b) => a.time.localeCompare(b.time))
                        .map((apt) => (
                        <div 
                            key={apt.id}
                            onClick={() => { setSelectedApt(apt); setExpandedDay(null); }}
                            className={`p-6 rounded-[2.5rem] flex flex-col gap-4 cursor-pointer transition-all hover:scale-[1.02] border hover:shadow-xl group relative overflow-hidden aspect-square ${
                            apt.status === 'Cancelled' ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 opacity-60' : 
                            'bg-white dark:bg-surface-dark border-white dark:border-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${getStatusColor(apt.status)}`}>
                                    {apt.status === 'Confirmed' ? 'CONF' : apt.status === 'Pending' ? 'PEND' : apt.status === 'Completed' ? 'OK' : apt.status === 'Reprogramada' ? 'REPRO' : 'CANC'}
                                </span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white">{apt.time}</span>
                            </div>
                            
                            <div className="flex-1 flex flex-col justify-center gap-2">
                                <div className="size-14 rounded-2xl bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors flex items-center justify-center font-bold text-2xl text-slate-500 uppercase mb-2">
                                    {apt.patientName.charAt(0)}
                                </div>
                                <p className="text-lg font-black text-slate-900 dark:text-white leading-tight line-clamp-2">{apt.patientName}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide truncate">{apt.treatment}</p>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-primary/50"></span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[120px]">{apt.doctorName}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                </div>
            </div>
            </div>
        )}

        {selectedApt && (
            <AppointmentDetailModal 
                appointment={selectedApt} 
                onClose={() => setSelectedApt(null)} 
                onUpdateStatus={handleUpdateStatus}
                patients={patients}
                doctors={doctors}
                settings={settings}
            />
        )}
    </div>
  );
};

export default Agenda;