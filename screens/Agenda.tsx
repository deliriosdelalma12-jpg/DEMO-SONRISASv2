
import React, { useState, useMemo } from 'react';
import { Appointment, AppointmentStatus, Patient, Doctor, DaySchedule, ClinicSettings } from '../types';
import AppointmentDetailModal from '../components/AppointmentDetailModal';

interface AgendaProps {
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  patients: Patient[];
  doctors: Doctor[];
  globalSchedule: Record<string, DaySchedule>;
  settings: ClinicSettings; // To access appointment policy & branchCount
}

const Agenda: React.FC<AgendaProps> = ({ appointments, setAppointments, patients, doctors, globalSchedule, settings }) => {
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [draggedAptId, setDraggedAptId] = useState<string | null>(null);
  
  // NEW: State for the "See More" modal
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  
  // NEW: Branch Filter State
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  
  const [isCreating, setIsCreating] = useState(false);
  const [newAptData, setNewAptData] = useState({
    patientName: '',
    treatment: 'Consulta General',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    doctorId: doctors[0]?.id || '',
    doctorName: doctors[0]?.name || '',
    branch: doctors[0]?.branch || 'Centro' // Default branch
  });

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const hours = Array.from({ length: 14 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);
  const years = Array.from({ length: 10 }, (_, i) => 2020 + i);

  // --- FILTERED APPOINTMENTS ---
  const filteredAppointments = useMemo(() => {
    if (branchFilter === 'ALL' || settings.branchCount <= 1) {
        return appointments;
    }
    return appointments.filter(a => a.branch === branchFilter);
  }, [appointments, branchFilter, settings.branchCount]);

  // --- BRANCH OPTIONS ---
  const uniqueBranches = useMemo(() => {
      const branches = new Set(doctors.map(d => d.branch));
      return Array.from(branches);
  }, [doctors]);

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'Confirmed': return 'bg-success text-white';
      // Fix: Changed 'Rescheduled' to 'Reprogramada' to match AppointmentStatus type
      case 'Reprogramada': return 'bg-warning text-white';
      case 'Cancelled': return 'bg-danger text-white';
      case 'Pending': return 'bg-slate-400 text-white';
      case 'Completed': return 'bg-primary text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  // Helper to check if clinic is open at a specific time
  const isClinicOpen = (dateStr: string, timeStr: string): boolean => {
    if (!globalSchedule) return true; // Fallback if no schedule
    const date = new Date(dateStr);
    const dayIndex = date.getDay(); // 0 is Sunday, 1 is Monday
    // Map JS getDay to our schedule keys
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = dayNames[dayIndex];
    const schedule = globalSchedule[dayName];

    if (!schedule) return false; // Closed if no schedule for day

    // Check Morning
    if (schedule.morning.active) {
        if (timeStr >= schedule.morning.start && timeStr < schedule.morning.end) return true;
    }
    // Check Afternoon
    if (schedule.afternoon.active) {
        if (timeStr >= schedule.afternoon.start && timeStr < schedule.afternoon.end) return true;
    }

    return false;
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

    // CHECK SCHEDULE
    if (!isClinicOpen(newAptData.date, newAptData.time)) {
        alert("⛔ LA CLÍNICA ESTÁ CERRADA en ese horario según la configuración operativa.");
        return;
    }

    // CALCULATE INITIAL STATUS BASED ON POLICY
    const today = new Date();
    today.setHours(0,0,0,0);
    const appointmentDate = new Date(newAptData.date);
    const diffTime = appointmentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Policy Rule: If booked > threshold days in advance -> Pending. Else -> Confirmed (if auto-confirm enabled).
    // Default fallback: Confirmed.
    let initialStatus: AppointmentStatus = 'Confirmed';
    
    if (settings.appointmentPolicy) {
        if (diffDays >= settings.appointmentPolicy.leadTimeThreshold) {
            initialStatus = 'Pending';
        } else if (settings.appointmentPolicy.autoConfirmShortNotice) {
            initialStatus = 'Confirmed';
        }
    }

    // Auto-assign branch if only 1 exists, otherwise take form value
    const finalBranch = settings.branchCount > 1 ? newAptData.branch : (doctors.find(d => d.id === newAptData.doctorId)?.branch || 'Centro');

    const newApt: Appointment = {
      id: Math.random().toString(36).substr(2, 9),
      patientId: 'P' + Math.floor(Math.random() * 1000),
      doctorName: newAptData.doctorName,
      doctorId: newAptData.doctorId,
      patientName: newAptData.patientName.trim(),
      treatment: newAptData.treatment,
      date: newAptData.date,
      time: newAptData.time,
      branch: finalBranch, // Use resolved branch
      status: initialStatus
    };
    
    setAppointments(prev => [...prev, newApt]);
    setIsCreating(false);
    
    // Alert user if status is pending
    if (initialStatus === 'Pending') {
        alert(`ℹ️ Cita agendada como PENDIENTE.\n\nSe requiere confirmación del paciente ${settings.appointmentPolicy.confirmationWindow}h antes.`);
    }

    setNewAptData({ 
      ...newAptData, 
      patientName: '', 
      date: new Date().toISOString().split('T')[0], 
      time: '09:00',
      doctorId: doctors[0]?.id || '',
      doctorName: doctors[0]?.name || '',
      branch: doctors[0]?.branch || 'Centro'
    });
  };

  const handleUpdateStatus = (id: string, status: AppointmentStatus, newDate?: string, newTime?: string, doctorId?: string, doctorName?: string) => {
    // If updating time, check schedule
    if (newDate && newTime && !isClinicOpen(newDate, newTime)) {
        alert("⛔ No se puede reprogramar: La clínica está cerrada en ese horario.");
        return;
    }

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
        doctorName: original.doctorName,
        branch: original.branch || 'Centro'
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
        branch: original.branch || 'Centro',
        status: 'Confirmed' // Replacement assumes immediate confirmation
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

    // CHECK SCHEDULE
    if (!isClinicOpen(dateStr, timeStr)) {
        alert("⛔ ACCIÓN DENEGADA: La clínica está cerrada en ese horario.");
        setDraggedAptId(null);
        return;
    }
    
    // Fix: Changed 'Rescheduled' to 'Reprogramada' to match AppointmentStatus type
    handleUpdateStatus(draggedAptId, 'Reprogramada', dateStr, timeStr);
    setDraggedAptId(null);
  };

  const isPastDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  const getSlotAppointment = (dateStr: string, timeHour: string) => {
    const slotApps = filteredAppointments.filter(a => a.date === dateStr && a.time.startsWith(timeHour.substring(0, 2)));
    if (slotApps.length === 0) return null;
    
    // Fix: Changed 'Rescheduled' to 'Reprogramada' to match AppointmentStatus type in the active status list
    const activeApp = slotApps.find(a => ['Confirmed', 'Reprogramada', 'Pending'].includes(a.status));
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
        <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-border-light dark:border-border-dark">
          {calendarDays.map((date, i) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayAppointments = filteredAppointments.filter(a => a.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
            const isToday = date.toDateString() === new Date().toDateString();
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isPast = isPastDate(dateStr);
            
            return (
              <div 
                key={i} 
                onDragOver={(e) => !isPast && e.preventDefault()}
                // ALLOW DROP even if not isCurrentMonth, as long as it's not past.
                onDrop={() => !isPast && onDrop(dateStr, "09:00")}
                onClick={() => {
                  if (!isPast) {
                    // Click allows creating on "preview" days too
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
                  {!isPast && (
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
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-sm border border-white/10 truncate transition-transform hover:scale-105 flex flex-col gap-0.5 ${getStatusColor(apt.status)}`}
                    >
                      <span className="truncate">{apt.time} - {apt.patientName}</span>
                      {settings.branchCount > 1 && (
                        <span className="text-[8px] opacity-75 truncate uppercase tracking-tight block border-t border-white/20 pt-0.5 mt-0.5">{apt.branch}</span>
                      )}
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDay(dateStr);
                      }}
                      className="text-[10px] font-bold text-slate-500 pl-1 cursor-pointer hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-1 transition-colors mt-1"
                    >
                      +{dayAppointments.length - 3} más
                    </div>
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
                const open = isClinicOpen(dateStr, h);

                return (
                  <div 
                    key={i} 
                    onDragOver={(e) => !isPast && e.preventDefault()}
                    onDrop={() => !isPast && onDrop(dateStr, h)}
                    onClick={() => { 
                        if (!isPast) { 
                            if (open) {
                                setNewAptData({...newAptData, date: dateStr, time: h}); 
                                setIsCreating(true); 
                            } else {
                                alert("Clínica Cerrada");
                            }
                        } 
                    }}
                    className={`border-l border-border-light dark:border-border-dark p-2 relative min-h-[80px] ${!open ? 'bg-slate-100 dark:bg-slate-800/30 opacity-60 bg-stripes' : (isPast ? 'bg-slate-100/30 dark:bg-slate-900/10 cursor-not-allowed' : 'hover:bg-primary/[0.02] cursor-pointer group')}`}
                  >
                    {!open && !apt && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[8px] font-black text-slate-300 uppercase -rotate-45">Cerrado</span>
                        </div>
                    )}
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
                        {settings.branchCount > 1 && (
                            <div className="opacity-70 font-black uppercase text-[8px] mt-1 pt-1 border-t border-white/20 truncate">{apt.branch}</div>
                        )}
                      </div>
                    ) : (
                      !isPast && open && (
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
    const dayAppointments = filteredAppointments.filter(a => a.date === dateStr);
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
            const open = isClinicOpen(dateStr, h);

            return (
              <div 
                key={h} 
                onDragOver={(e) => !isPast && e.preventDefault()}
                onDrop={() => !isPast && onDrop(dateStr, h)}
                onClick={() => { 
                    if(!isPast) { 
                        if(open) {
                            setNewAptData({...newAptData, time: h, date: dateStr}); 
                            setIsCreating(true); 
                        } else {
                            alert("Clínica Cerrada en este horario");
                        }
                    } 
                }}
                className={`flex border-b border-border-light dark:border-border-dark transition-all min-h-[120px] ${!open ? 'bg-slate-100 dark:bg-slate-900/50 opacity-70' : (isPast ? 'bg-slate-100/30 dark:bg-slate-900/10 cursor-not-allowed' : 'group cursor-pointer hover:bg-primary/[0.02]')}`}
              >
                <div className="w-28 p-8 text-sm font-black text-slate-400 border-r border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/10 text-center flex items-center justify-center">
                  {h}
                </div>
                <div className="flex-1 p-6 relative">
                  {!open && !apt && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-4xl font-black text-slate-200 dark:text-slate-800 uppercase tracking-[1em] -rotate-6">Cerrado</span>
                      </div>
                  )}
                  {apt ? (
                    <div 
                      draggable={apt.status !== 'Cancelled' && apt.status !== 'Completed'}
                      onDragStart={(e) => { 
                        if (apt.status === 'Cancelled' || apt.status === 'Completed') return e.preventDefault();
                        e.stopPropagation(); 
                        setDraggedAptId(apt.id); 
                      }}
                      onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); }}
                      className={`p-6 rounded-[2rem] flex items-center justify-between ${getStatusColor(apt.status)} shadow-xl hover:scale-[1.01] transition-all border border-white/10 h-full relative z-10`}
                    >
                      <div className="flex items-center gap-6">
                        <div className="size-14 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-xl">{apt.patientName[0]}</div>
                        <div>
                          <p className="text-xl font-bold">{apt.time} - {apt.patientName}</p>
                          <p className="text-xs opacity-90 uppercase font-black tracking-widest mt-1">{apt.treatment} (Médico: {apt.doctorName})</p>
                          {settings.branchCount > 1 && (
                             <p className="text-[10px] font-bold bg-white/20 w-fit px-2 py-0.5 rounded mt-2 uppercase tracking-wider">{apt.branch}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {(apt.status !== 'Cancelled' && apt.status !== 'Completed') && <span className="material-symbols-outlined text-3xl opacity-50">drag_indicator</span>}
                      </div>
                    </div>
                  ) : (
                    !isPast && open && (
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
    <div className="p-8 max-w-[1600px] mx-auto w-full h-full flex flex-col gap-8 relative">
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

        {/* BRANCH FILTER (Only if > 1 branch) */}
        {settings.branchCount > 1 && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-bg-dark p-1.5 rounded-[1.25rem] shadow-inner">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-3">Filtrar:</span>
                <select 
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-slate-800 dark:text-white focus:ring-0 cursor-pointer py-2 pl-1 pr-8"
                >
                    <option value="ALL">Todas las Sucursales</option>
                    {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
            </div>
        )}
        
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

      {/* --- EXPANDED DAY MODAL (SEE MORE) --- */}
      {expandedDay && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setExpandedDay(null)}>
          <div 
            className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[2.5rem] shadow-2xl border border-border-light dark:border-border-dark overflow-hidden flex flex-col max-h-[600px] animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {new Date(expandedDay).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {filteredAppointments.filter(a => a.date === expandedDay).length} Citas Programadas
                </p>
              </div>
              <button 
                onClick={() => setExpandedDay(null)}
                className="size-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-danger transition-all"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
              {filteredAppointments
                .filter(a => a.date === expandedDay)
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((apt) => (
                  <div 
                    key={apt.id}
                    onClick={() => { setSelectedApt(apt); setExpandedDay(null); }}
                    className={`p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] border border-transparent hover:shadow-md ${
                      apt.status === 'Cancelled' ? 'bg-slate-50 dark:bg-slate-800/50 opacity-60' : 
                      'bg-white dark:bg-bg-dark border-slate-100 dark:border-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center w-12">
                        <p className="text-sm font-black text-slate-700 dark:text-white">{apt.time}</p>
                      </div>
                      <div className="w-px h-8 bg-slate-100 dark:bg-slate-700"></div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">{apt.patientName}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">{apt.treatment}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${getStatusColor(apt.status)}`}>
                      {apt.status === 'Confirmed' ? 'CONF' : apt.status === 'Pending' ? 'PEND' : apt.status === 'Completed' ? 'OK' : apt.status === 'Reprogramada' ? 'REPRO' : 'CANC'}
                    </span>
                  </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedApt && (
        <AppointmentDetailModal 
          appointment={selectedApt}
          onClose={() => setSelectedApt(null)}
          patients={patients}
          doctors={doctors}
          settings={settings}
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
              
              {/* BRANCH SELECTION (CONDITIONAL) */}
              {settings.branchCount > 1 && (
                  <div>
                    <label className="text-[11px] font-black uppercase text-[#94a3b8] tracking-widest block mb-3 ml-2">Sucursal</label>
                    <select 
                      value={newAptData.branch}
                      onChange={e => setNewAptData({...newAptData, branch: e.target.value})}
                      className="w-full bg-[#f1f5f9]/80 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-[1.75rem] px-8 py-5 text-base font-medium text-black dark:text-white appearance-none transition-all"
                    >
                      {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
              )}

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
