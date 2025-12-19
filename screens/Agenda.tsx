
import React, { useState } from 'react';
import { Appointment, AppointmentStatus, Patient, Doctor } from '../types';
import AppointmentDetailModal from '../components/AppointmentDetailModal';

interface AgendaProps {
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  patients: Patient[];
  doctors: Doctor[];
}

const Agenda: React.FC<AgendaProps> = ({ appointments, setAppointments, patients, doctors }) => {
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [draggedAptId, setDraggedAptId] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newAptData, setNewAptData] = useState({
    patientName: '',
    treatment: 'Consulta General',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    doctorId: doctors[0]?.id || '',
    doctorName: doctors[0]?.name || ''
  });

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const hours = Array.from({ length: 14 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);
  const years = Array.from({ length: 10 }, (_, i) => 2020 + i);

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

  const navigateDate = (direction: number) => {
    const next = new Date(currentDate);
    if (view === 'month') next.setMonth(currentDate.getMonth() + direction);
    else if (view === 'week') next.setDate(currentDate.getDate() + (direction * 7));
    else next.setDate(currentDate.getDate() + direction);
    setCurrentDate(next);
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación exhaustiva de campos obligatorios
    const missing = [];
    if (!newAptData.patientName.trim()) missing.push("Paciente");
    if (!newAptData.doctorId) missing.push("Médico Responsable");
    if (!newAptData.date) missing.push("Fecha");
    if (!newAptData.time) missing.push("Hora");

    if (missing.length > 0) {
      alert(`⚠️ No se puede agendar la cita:\n\n${missing.map(m => `• ${m}`).join('\n')}`);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (newAptData.date < todayStr) {
      alert("❌ Error: No se pueden agendar citas en fechas pasadas.");
      return;
    }

    const newApt: Appointment = {
      id: Math.random().toString(36).substr(2, 9),
      patientId: 'P' + Math.floor(Math.random() * 1000),
      doctorName: newAptData.doctorName,
      doctorId: newAptData.doctorId,
      patientName: newAptData.patientName.trim(),
      treatment: newAptData.treatment,
      date: newAptData.date,
      time: newAptData.time,
      status: 'Confirmed'
    };
    setAppointments(prev => [...prev, newApt]);
    setIsCreating(false);
    setNewAptData({ 
      ...newAptData, 
      patientName: '', 
      date: new Date().toISOString().split('T')[0], 
      time: '09:00',
      doctorId: doctors[0]?.id || '',
      doctorName: doctors[0]?.name || ''
    });
  };

  const handleUpdateStatus = (id: string, status: AppointmentStatus, newDate?: string, newTime?: string, doctorId?: string, doctorName?: string) => {
    setAppointments(prev => prev.map(apt => apt.id === id ? { 
      ...apt, 
      status, 
      date: newDate || apt.date, 
      time: newTime || apt.time,
      doctorId: doctorId || apt.doctorId,
      doctorName: doctorName || apt.doctorName
    } : apt));
    setSelectedApt(null);
  };

  const handleCancelWithReplacement = (id: string, replacement?: Patient | 'NEW') => {
    const original = appointments.find(a => a.id === id);
    if (!original) return;

    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'Cancelled' } : a));
    setSelectedApt(null);

    if (replacement === 'NEW') {
      setNewAptData({
        ...newAptData,
        date: original.date,
        time: original.time,
        doctorId: original.doctorId,
        doctorName: original.doctorName
      });
      setIsCreating(true);
    } else if (replacement) {
      const newApt: Appointment = {
        id: Math.random().toString(36).substr(2, 9),
        patientId: replacement.id,
        patientName: replacement.name,
        doctorName: original.doctorName,
        doctorId: original.doctorId,
        date: original.date,
        time: original.time,
        treatment: 'Consulta General',
        status: 'Confirmed'
      };
      setAppointments(prev => [...prev, newApt]);
    }
  };

  const onDrop = (dateStr: string, timeStr: string) => {
    if (!draggedAptId) return;
    const apt = appointments.find(a => a.id === draggedAptId);
    
    if (apt?.status === 'Cancelled' || apt?.status === 'Completed') {
      alert("No se pueden reagendar citas canceladas o ya atendidas.");
      setDraggedAptId(null);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr < todayStr) {
      alert("No se pueden mover citas a fechas pasadas.");
      setDraggedAptId(null);
      return;
    }
    
    handleUpdateStatus(draggedAptId, 'Rescheduled', dateStr, timeStr);
    setDraggedAptId(null);
  };

  const isPastDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  const getSlotAppointment = (dateStr: string, timeHour: string) => {
    const slotApps = appointments.filter(a => a.date === dateStr && a.time.startsWith(timeHour.substring(0, 2)));
    if (slotApps.length === 0) return null;
    
    const activeApp = slotApps.find(a => ['Confirmed', 'Rescheduled', 'Pending'].includes(a.status));
    if (activeApp) return activeApp;
    
    const completedApp = slotApps.find(a => a.status === 'Completed');
    if (completedApp) return completedApp;

    return slotApps[0]; 
  };

  const renderMonthView = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const dayOfWeek = (startOfMonth.getDay() + 6) % 7;
    const calendarDays = Array.from({ length: 42 }, (_, i) => {
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), i - dayOfWeek + 1);
    });

    return (
      <div className="flex-1 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark overflow-hidden flex flex-col shadow-xl">
        <div className="grid grid-cols-7 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50">
          {days.map(d => (
            <div key={d} className="py-5 text-center text-xs font-black uppercase tracking-widest text-slate-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-border-light dark:divide-border-dark">
          {calendarDays.map((date, i) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayAppointments = appointments.filter(a => a.date === dateStr);
            const isToday = date.toDateString() === new Date().toDateString();
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isPast = isPastDate(dateStr);
            
            return (
              <div 
                key={i} 
                onDragOver={(e) => !isPast && e.preventDefault()}
                onDrop={() => isCurrentMonth && !isPast && onDrop(dateStr, "09:00")}
                onClick={() => {
                  if (isCurrentMonth && !isPast) {
                    setNewAptData({ ...newAptData, date: dateStr });
                    setIsCreating(true);
                  } else if (isPast) {
                    alert("No se pueden agendar citas en el pasado.");
                  }
                }}
                className={`p-3 min-h-[120px] transition-all relative group ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-900/10 opacity-40' : 'hover:bg-primary/[0.02] cursor-pointer'} ${isPast ? 'bg-slate-100/50 dark:bg-slate-900/20 cursor-not-allowed grayscale-[0.5]' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`flex items-center justify-center size-8 rounded-xl text-sm font-black transition-all ${isToday ? 'bg-primary text-white shadow-lg' : 'text-slate-900 dark:text-white group-hover:text-primary'}`}>
                    {date.getDate()}
                  </span>
                  {isCurrentMonth && !isPast && (
                    <div className="size-8 rounded-xl bg-primary text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-75 group-hover:scale-100">
                      <span className="material-symbols-outlined text-lg font-bold">add</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  {dayAppointments.slice(0, 3).map(apt => (
                    <div
                      key={apt.id}
                      draggable={apt.status !== 'Cancelled' && apt.status !== 'Completed'}
                      onDragStart={(e) => { 
                        if (apt.status === 'Cancelled' || apt.status === 'Completed') return e.preventDefault();
                        e.stopPropagation(); 
                        setDraggedAptId(apt.id); 
                      }}
                      onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); }}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-sm border border-white/10 truncate transition-transform hover:scale-105 ${getStatusColor(apt.status)}`}
                    >
                      {apt.time} - {apt.patientName} ({apt.treatment})
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-[10px] font-bold text-slate-400 pl-1">+{dayAppointments.length - 3} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    return (
      <div className="flex-1 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark overflow-hidden flex flex-col shadow-xl">
        <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50">
          <div className="p-4"></div>
          {weekDays.map((d, i) => (
            <div key={i} className="py-4 text-center border-l border-border-light dark:border-border-dark">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{days[i]}</p>
              <p className={`text-lg font-bold ${d.toDateString() === new Date().toDateString() ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>{d.getDate()}</p>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {hours.map(h => (
            <div key={h} className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-border-light dark:border-border-dark min-h-[80px]">
              <div className="p-4 text-xs font-black text-slate-400 text-center flex items-center justify-center bg-slate-50/30 dark:bg-slate-900/10">
                {h}
              </div>
              {weekDays.map((d, i) => {
                const dateStr = d.toISOString().split('T')[0];
                const apt = getSlotAppointment(dateStr, h);
                const isPast = isPastDate(dateStr);
                return (
                  <div 
                    key={i} 
                    onDragOver={(e) => !isPast && e.preventDefault()}
                    onDrop={() => !isPast && onDrop(dateStr, h)}
                    onClick={() => { if (!isPast) { setNewAptData({...newAptData, date: dateStr, time: h}); setIsCreating(true); } }}
                    className={`border-l border-border-light dark:border-border-dark p-2 relative min-h-[80px] ${isPast ? 'bg-slate-100/30 dark:bg-slate-900/10 cursor-not-allowed' : 'hover:bg-primary/[0.02] cursor-pointer group'}`}
                  >
                    {apt ? (
                      <div 
                        draggable={apt.status !== 'Cancelled' && apt.status !== 'Completed'}
                        onDragStart={(e) => { 
                          if (apt.status === 'Cancelled' || apt.status === 'Completed') return e.preventDefault();
                          e.stopPropagation(); 
                          setDraggedAptId(apt.id); 
                        }}
                        onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); }}
                        className={`h-full w-full rounded-xl p-2 text-[10px] font-bold shadow-md transition-all hover:scale-[1.02] border border-white/10 ${getStatusColor(apt.status)}`}
                      >
                        <div className="truncate mb-1">{apt.time} - {apt.patientName}</div>
                        <div className="opacity-80 uppercase tracking-tighter text-[8px]">{apt.treatment}</div>
                      </div>
                    ) : (
                      !isPast && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined text-primary text-xl">add_circle</span>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayAppointments = appointments.filter(a => a.date === dateStr);
    const isPast = isPastDate(dateStr);
    
    return (
      <div className="flex-1 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark overflow-hidden flex flex-col shadow-xl">
        <div className="p-8 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50 dark:bg-slate-900/30">
            <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
              {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <div className="flex gap-2">
              <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase">{dayAppointments.length} Citas</span>
              {isPast && <span className="px-4 py-1.5 rounded-full bg-slate-200 text-slate-500 text-xs font-bold uppercase">Histórico</span>}
            </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {hours.map(h => {
            const apt = getSlotAppointment(dateStr, h);
            return (
              <div 
                key={h} 
                onDragOver={(e) => !isPast && e.preventDefault()}
                onDrop={() => !isPast && onDrop(dateStr, h)}
                onClick={() => { if(!isPast) { setNewAptData({...newAptData, time: h, date: dateStr}); setIsCreating(true); } }}
                className={`flex border-b border-border-light dark:border-border-dark transition-all min-h-[120px] ${isPast ? 'bg-slate-100/30 dark:bg-slate-900/10 cursor-not-allowed' : 'group cursor-pointer hover:bg-primary/[0.02]'}`}
              >
                <div className="w-28 p-8 text-sm font-black text-slate-400 border-r border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/10 text-center flex items-center justify-center">
                  {h}
                </div>
                <div className="flex-1 p-6">
                  {apt ? (
                    <div 
                      draggable={apt.status !== 'Cancelled' && apt.status !== 'Completed'}
                      onDragStart={(e) => { 
                        if (apt.status === 'Cancelled' || apt.status === 'Completed') return e.preventDefault();
                        e.stopPropagation(); 
                        setDraggedAptId(apt.id); 
                      }}
                      onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); }}
                      className={`p-6 rounded-[2rem] flex items-center justify-between ${getStatusColor(apt.status)} shadow-xl hover:scale-[1.01] transition-all border border-white/10 h-full`}
                    >
                      <div className="flex items-center gap-6">
                        <div className="size-14 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-xl">{apt.patientName[0]}</div>
                        <div>
                          <p className="text-xl font-bold">{apt.time} - {apt.patientName}</p>
                          <p className="text-xs opacity-90 uppercase font-black tracking-widest mt-1">{apt.treatment} (Médico: {apt.doctorName})</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {(apt.status !== 'Cancelled' && apt.status !== 'Completed') && <span className="material-symbols-outlined text-3xl opacity-50">drag_indicator</span>}
                      </div>
                    </div>
                  ) : (
                    !isPast && (
                      <div className="h-full flex items-center justify-start px-6 opacity-0 group-hover:opacity-100 transition-all">
                        <div className="flex items-center gap-3 text-primary font-bold">
                          <div className="size-10 rounded-full border-2 border-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">add</span>
                          </div>
                          <span className="uppercase tracking-widest text-xs">Agendar espacio {h}</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto w-full h-full flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-slate-900 dark:text-white text-5xl font-display font-black tracking-tight">Agenda Médica</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Optimización del flujo de pacientes y turnos.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 h-14 px-8 rounded-2xl bg-primary text-white font-bold hover:shadow-2xl hover:shadow-primary/30 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95"
        >
          <span className="material-symbols-outlined">add</span>
          <span>Nueva Cita</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 p-4 rounded-[2rem] bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-lg">
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-bg-dark rounded-[1.25rem] p-1.5 shadow-inner w-full lg:w-auto">
          {['day', 'week', 'month'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v as any)}
              className={`flex-1 lg:px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                view === v 
                  ? 'bg-white dark:bg-surface-dark text-primary shadow-md' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
          
          <div className="w-px h-8 bg-border-light dark:border-border-dark mx-2 hidden lg:block"></div>
          
          <div className="flex items-center gap-2 px-2">
            <select 
              value={currentDate.getMonth()} 
              onChange={(e) => {
                const next = new Date(currentDate);
                next.setMonth(parseInt(e.target.value));
                setCurrentDate(next);
              }}
              className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-xs font-bold text-slate-700 dark:text-white focus:ring-1 focus:ring-primary cursor-pointer py-2 pl-3"
            >
              {monthNames.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select 
              value={currentDate.getFullYear()} 
              onChange={(e) => {
                const next = new Date(currentDate);
                next.setFullYear(parseInt(e.target.value));
                setCurrentDate(next);
              }}
              className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-xs font-bold text-slate-700 dark:text-white focus:ring-1 focus:ring-primary cursor-pointer py-2 pr-3"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 bg-primary/10 text-primary text-xs font-black uppercase rounded-xl hover:bg-primary hover:text-white transition-all ml-1"
            >
              Hoy
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigateDate(-1)}
            className="size-12 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-bg-dark border border-border-light dark:border-border-dark hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
          >
             <span className="material-symbols-outlined">chevron_left</span>
          </button>
          
          <div className="flex flex-col items-center">
            <span className="text-slate-900 dark:text-white text-xl font-display font-bold leading-tight min-w-[140px] text-center">
              {view === 'month' ? monthNames[currentDate.getMonth()] : 
               view === 'week' ? `Semana ${Math.ceil(currentDate.getDate() / 7)}` : 
               `${currentDate.getDate()} de ${monthNames[currentDate.getMonth()]}`}
            </span>
            <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">{currentDate.getFullYear()}</span>
          </div>

          <button 
            onClick={() => navigateDate(1)}
            className="size-12 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-bg-dark border border-border-light dark:border-border-dark hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
          >
             <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>

      {selectedApt && (
        <AppointmentDetailModal 
          appointment={selectedApt}
          onClose={() => setSelectedApt(null)}
          patients={patients}
          doctors={doctors}
          onUpdateStatus={handleUpdateStatus}
          onCancelWithReplacement={handleCancelWithReplacement}
        />
      )}

      {isCreating && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-slate-900/60 modal-backdrop">
          <div className="bg-[#e9ecef] dark:bg-surface-dark w-full max-w-[480px] rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 border border-border-light dark:border-border-dark">
            <div className="p-10 pb-4 flex justify-between items-center">
              <h3 className="text-2xl font-display font-bold text-[#334155] dark:text-white">Agendar Cita</h3>
              <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-4xl">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateAppointment} className="p-10 pt-6 space-y-8">
              <div>
                <label className="text-[11px] font-black uppercase text-[#94a3b8] tracking-widest block mb-3 ml-2">
                  Paciente <span className="text-danger">*</span>
                </label>
                <input 
                  autoFocus type="text" placeholder="Nombre completo del paciente"
                  value={newAptData.patientName}
                  onChange={e => setNewAptData({...newAptData, patientName: e.target.value})}
                  className="w-full bg-[#f1f5f9]/80 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-[1.75rem] px-8 py-5 text-base font-medium text-black dark:text-white focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[11px] font-black uppercase text-[#94a3b8] tracking-widest block mb-3 ml-2">
                    Fecha <span className="text-danger">*</span>
                  </label>
                  <input 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]}
                    value={newAptData.date}
                    onChange={e => setNewAptData({...newAptData, date: e.target.value})}
                    className="w-full bg-[#f1f5f9]/80 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-[1.75rem] px-6 py-5 text-base font-bold text-black dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-[#94a3b8] tracking-widest block mb-3 ml-2">
                    Hora <span className="text-danger">*</span>
                  </label>
                  <input 
                    type="time" value={newAptData.time}
                    onChange={e => setNewAptData({...newAptData, time: e.target.value})}
                    className="w-full bg-[#f1f5f9]/80 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-[1.75rem] px-6 py-5 text-base font-bold text-black dark:text-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-[#94a3b8] tracking-widest block mb-3 ml-2">Tratamiento</label>
                <select 
                  value={newAptData.treatment}
                  onChange={e => setNewAptData({...newAptData, treatment: e.target.value})}
                  className="w-full bg-[#f1f5f9]/80 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-[1.75rem] px-8 py-5 text-base font-medium text-black dark:text-white appearance-none transition-all"
                >
                  <option>Consulta General</option>
                  <option>Limpieza Dental</option>
                  <option>Ortodoncia</option>
                  <option>Cirugía Maxilofacial</option>
                  <option>Revisión Periódica</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-[#94a3b8] tracking-widest block mb-3 ml-2">
                  Médico Responsable <span className="text-danger">*</span>
                </label>
                <select 
                  value={newAptData.doctorId}
                  onChange={e => {
                    const doc = doctors.find(d => d.id === e.target.value);
                    setNewAptData({...newAptData, doctorId: e.target.value, doctorName: doc?.name || ''});
                  }}
                  className="w-full bg-[#f1f5f9]/80 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-[1.75rem] px-8 py-5 text-base font-medium text-black dark:text-white appearance-none transition-all"
                >
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialty})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-6 rounded-[2.25rem] bg-[#f1f5f9] dark:bg-slate-800 font-bold text-[#64748b] hover:bg-slate-200 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-6 rounded-[2.25rem] bg-[#4285f4] text-white font-bold shadow-2xl hover:brightness-110 transition-all">Confirmar Cita</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
