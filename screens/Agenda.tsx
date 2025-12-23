
import React, { useState, useMemo, useEffect } from 'react';
import { Appointment, AppointmentStatus, Patient, Doctor, DaySchedule, ClinicSettings, Branch } from '../types';
import AppointmentDetailModal from '../components/AppointmentDetailModal';

interface AgendaProps {
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  patients: Patient[];
  doctors: Doctor[];
  globalSchedule: Record<string, DaySchedule>;
  settings: ClinicSettings;
  branches?: Branch[];
}

const Agenda: React.FC<AgendaProps> = ({ appointments, setAppointments, patients, doctors, globalSchedule, settings, branches = [] }) => {
  // --- VIEW STATE ---
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // --- FILTERS STATE ---
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [doctorFilter, setDoctorFilter] = useState<string>('ALL');

  // --- MODAL STATES ---
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null); // For Occupied Appointments
  const [freeSlotsDay, setFreeSlotsDay] = useState<string | null>(null); // For Free Slots
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // --- RADAR STATE ---
  const [radarDoctorId, setRadarDoctorId] = useState<string>('ANY');
  const [radarDate, setRadarDate] = useState(new Date());

  // --- NEW APPOINTMENT FORM STATE ---
  const [newAptData, setNewAptData] = useState({
    patientName: '',
    treatment: 'Consulta General',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    doctorId: doctors[0]?.id || '',
    doctorName: doctors[0]?.name || '',
    branch: doctors[0]?.branch || 'Centro'
  });

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const hours = Array.from({ length: 13 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`); // 08:00 to 20:00
  const years = Array.from({ length: 10 }, (_, i) => 2020 + i);

  // Sync radar date
  useEffect(() => {
      if (isRadarOpen) setRadarDate(new Date(currentDate));
  }, [isRadarOpen]);

  // --- FILTER LOGIC ---
  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
        const matchBranch = (branchFilter === 'ALL' || settings.branchCount <= 1) ? true : a.branch === branchFilter;
        const matchDoctor = doctorFilter === 'ALL' ? true : a.doctorId === doctorFilter;
        return matchBranch && matchDoctor;
    });
  }, [appointments, branchFilter, doctorFilter, settings.branchCount]);

  const uniqueBranches = useMemo(() => {
      const b = new Set(doctors.map(d => d.branch));
      if (branches.length > 0) branches.forEach(br => b.add(br.name));
      return Array.from(b);
  }, [doctors, branches]);

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

  // --- MASTER SCHEDULE CHECK ---
  const isClinicOpen = (dateStr: string, timeStr: string, targetBranchName?: string): boolean => {
    const date = new Date(dateStr);
    const dayIndex = date.getDay(); 
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = dayNames[dayIndex];

    let activeSchedule = globalSchedule;
    let effectiveBranchName = targetBranchName;
    if (!effectiveBranchName && branchFilter !== 'ALL') effectiveBranchName = branchFilter;

    if (effectiveBranchName && branches.length > 0) {
        const branchConfig = branches.find(b => b.name === effectiveBranchName);
        if (branchConfig && branchConfig.schedule) activeSchedule = branchConfig.schedule;
    }

    const dayConfig = activeSchedule[dayName];
    if (!dayConfig) return false;

    const inRange = (t: string, start: string, end: string) => t >= start && t < end;
    if (dayConfig.morning.active && inRange(timeStr, dayConfig.morning.start, dayConfig.morning.end)) return true;
    if (dayConfig.afternoon.active && inRange(timeStr, dayConfig.afternoon.start, dayConfig.afternoon.end)) return true;

    return false;
  };

  // --- AVAILABILITY RADAR LOGIC ---
  const freeSlots = useMemo(() => {
    if (!isRadarOpen) return [];
    const slots = [];
    const today = new Date(); today.setHours(0,0,0,0);
    const targetYear = radarDate.getFullYear();
    const targetMonth = radarDate.getMonth();
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(targetYear, targetMonth, day);
        if (d < today) continue;
        const dateStr = d.toISOString().split('T')[0];
        
        const daySlots = {
            date: dateStr,
            dayName: d.toLocaleDateString('es-ES', { weekday: 'long' }),
            dayNumber: d.getDate(),
            month: d.toLocaleDateString('es-ES', { month: 'short' }),
            morning: [] as string[],
            afternoon: [] as string[]
        };

        let radarBranchContext = undefined;
        if (radarDoctorId !== 'ANY') {
            const doc = doctors.find(d => d.id === radarDoctorId);
            if (doc) radarBranchContext = doc.branch;
        } else if (branchFilter !== 'ALL') {
            radarBranchContext = branchFilter;
        }

        for (let h = 8; h <= 20; h++) {
            const timeStr = `${h.toString().padStart(2, '0')}:00`;
            if (!isClinicOpen(dateStr, timeStr, radarBranchContext)) continue;

            let isOccupied = false;
            if (radarDoctorId !== 'ANY') {
                isOccupied = appointments.some(a => a.date === dateStr && a.time === timeStr && a.doctorId === radarDoctorId && a.status !== 'Cancelled');
            } else {
                const availableDoctors = doctors.filter(doc => branchFilter === 'ALL' || doc.branch === branchFilter);
                const appointmentsAtSlot = appointments.filter(a => a.date === dateStr && a.time === timeStr && a.status !== 'Cancelled' && (branchFilter === 'ALL' || a.branch === branchFilter)).length;
                if (appointmentsAtSlot >= availableDoctors.length) isOccupied = true;
            }

            if (!isOccupied) {
                if (h < 15) daySlots.morning.push(timeStr);
                else daySlots.afternoon.push(timeStr);
            }
        }
        if (daySlots.morning.length > 0 || daySlots.afternoon.length > 0) slots.push(daySlots);
    }
    return slots;
  }, [isRadarOpen, radarDoctorId, branchFilter, appointments, doctors, globalSchedule, radarDate, branches]);

  // --- GET SPECIFIC FREE SLOTS FOR A DAY (For "Lib" Button) ---
  const getFreeSlotsForDay = (dateStr: string) => {
      const free: string[] = [];
      
      let targetBranch = undefined;
      if (branchFilter !== 'ALL') targetBranch = branchFilter;

      // Filter doctors available for this context
      const availableDocs = doctors.filter(doc => {
          if (doctorFilter !== 'ALL' && doc.id !== doctorFilter) return false;
          if (branchFilter !== 'ALL' && doc.branch !== branchFilter) return false;
          return true;
      });

      hours.forEach(time => {
          // Check clinic global/branch open status
          if (!isClinicOpen(dateStr, time, targetBranch)) return;

          // Check if there is capacity
          // Capacity = Number of available doctors * 1 (assuming 1 slot per hour per doc)
          // Occupied = Appointments at this time for these doctors
          
          const appointmentsAtSlot = appointments.filter(a => 
              a.date === dateStr && 
              a.time === time && 
              a.status !== 'Cancelled' &&
              (doctorFilter === 'ALL' || a.doctorId === doctorFilter) &&
              (branchFilter === 'ALL' || a.branch === branchFilter)
          ).length;

          if (appointmentsAtSlot < availableDocs.length) {
              free.push(time);
          }
      });
      return free;
  };

  // --- ACTIONS ---
  const handleRadarSlotClick = (date: string, time: string) => {
      let targetDocId = radarDoctorId;
      let targetDocName = '';
      let targetBranch = 'Centro';

      if (targetDocId === 'ANY') {
          const availableDoc = doctors.find(d => {
             const docBranchMatches = branchFilter === 'ALL' || d.branch === branchFilter;
             const isFree = !appointments.some(a => a.date === date && a.time === time && a.doctorId === d.id && a.status !== 'Cancelled');
             return docBranchMatches && isFree;
          });
          if (availableDoc) {
              targetDocId = availableDoc.id; targetDocName = availableDoc.name; targetBranch = availableDoc.branch;
          }
      } else {
          const doc = doctors.find(d => d.id === targetDocId);
          targetDocName = doc?.name || ''; targetBranch = doc?.branch || 'Centro';
      }

      setNewAptData({ ...newAptData, date: date, time: time, doctorId: targetDocId !== 'ANY' ? targetDocId : '', doctorName: targetDocName, branch: targetBranch });
      setIsRadarOpen(false);
      setFreeSlotsDay(null); // Close free slots modal if open
      setIsCreating(true);
  };

  const navigateDate = (direction: number) => {
    const next = new Date(currentDate);
    if (view === 'month') next.setMonth(currentDate.getMonth() + direction);
    else if (view === 'week') next.setDate(currentDate.getDate() + (direction * 7));
    else next.setDate(currentDate.getDate() + direction);
    setCurrentDate(next);
  };

  const navigateRadarDate = (direction: number) => {
      const next = new Date(radarDate);
      next.setMonth(radarDate.getMonth() + direction);
      setRadarDate(next);
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAptData.patientName.trim() || !newAptData.doctorId || !newAptData.date || !newAptData.time) { alert("Faltan datos obligatorios."); return; }
    if (newAptData.date < new Date().toISOString().split('T')[0]) { alert("No se pueden agendar citas en el pasado."); return; }

    const resolvedBranch = settings.branchCount > 1 ? newAptData.branch : (doctors.find(d => d.id === newAptData.doctorId)?.branch || 'Centro');
    if (!isClinicOpen(newAptData.date, newAptData.time, resolvedBranch)) { alert(`⛔ IMPOSIBLE AGENDAR: La sucursal ${resolvedBranch} está cerrada.`); return; }

    const newApt: Appointment = {
      id: Math.random().toString(36).substr(2, 9),
      patientId: 'P' + Math.floor(Math.random() * 1000),
      doctorName: newAptData.doctorName, doctorId: newAptData.doctorId,
      patientName: newAptData.patientName.trim(), treatment: newAptData.treatment,
      date: newAptData.date, time: newAptData.time, branch: resolvedBranch, status: 'Confirmed'
    };
    setAppointments(prev => [...prev, newApt]);
    setIsCreating(false);
    setNewAptData({ ...newAptData, patientName: '', date: new Date().toISOString().split('T')[0], time: '09:00', doctorId: doctors[0]?.id || '', doctorName: doctors[0]?.name || '', branch: doctors[0]?.branch || 'Centro' });
  };

  const handleUpdateStatus = (id: string, status: AppointmentStatus, newDate?: string, newTime?: string, doctorId?: string, doctorName?: string) => {
    if (newDate && newTime) {
        const currentApt = appointments.find(a => a.id === id);
        if (!isClinicOpen(newDate, newTime, currentApt?.branch)) { alert(`⛔ ERROR: Sucursal cerrada.`); return; }
    }
    setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, status, date: newDate || apt.date, time: newTime || apt.time, doctorId: doctorId || apt.doctorId, doctorName: doctorName || apt.doctorName } : apt));
    setSelectedApt(null);
  };

  const getSlotAppointment = (dateStr: string, timeHour: string) => {
    const slotApps = filteredAppointments.filter(a => a.date === dateStr && a.time.startsWith(timeHour.substring(0, 2)));
    if (slotApps.length === 0) return null;
    const activeApp = slotApps.find(a => ['Confirmed', 'Reprogramada', 'Pending'].includes(a.status));
    if (activeApp) return activeApp;
    const completedApp = slotApps.find(a => a.status === 'Completed');
    if (completedApp) return completedApp;
    return slotApps[0]; 
  };

  const isPastDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  // --- RENDERERS ---
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const calendarDays = [];
    
    const firstDayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1; 
    for (let i = firstDayIndex; i > 0; i--) { calendarDays.push({ date: new Date(year, month, 1 - i), isCurrentMonth: false }); }
    while (date.getMonth() === month) { calendarDays.push({ date: new Date(date), isCurrentMonth: true }); date.setDate(date.getDate() + 1); }
    const remainingDays = 42 - calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) { calendarDays.push({ date: new Date(year, month + 1, i), isCurrentMonth: false }); }

    // Calc capacity base on filters
    const availableDocsCount = doctorFilter === 'ALL' ? doctors.length : 1;
    const dailySlotsPerDoc = hours.length; // 13 slots (8 to 20)
    const dailyCapacity = dailySlotsPerDoc * availableDocsCount;

    return (
      <div className="flex-1 bg-white dark:bg-surface-dark rounded-[2rem] border border-border-light dark:border-border-dark shadow-xl overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{day}</div>
            ))}
        </div>
        <div className="flex-1 grid grid-cols-7 grid-rows-6">
            {calendarDays.map((dayObj, idx) => {
                const dateStr = dayObj.date.toISOString().split('T')[0];
                const dayApts = filteredAppointments
                    .filter(a => a.date === dateStr && a.status !== 'Cancelled')
                    .sort((a, b) => a.time.localeCompare(b.time));
                
                const isToday = new Date().toDateString() === dayObj.date.toDateString();
                const occupiedCount = dayApts.length;
                const freeCount = Math.max(0, dailyCapacity - occupiedCount);

                return (
                    <div 
                        key={idx} 
                        className={`border-b border-r border-border-light dark:border-border-dark p-2 flex flex-col gap-1 transition-colors relative group min-h-[120px] ${!dayObj.isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        onClick={() => { if(dayApts.length > 0) setExpandedDay(dateStr); }}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-bold size-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white shadow-md' : dayObj.isCurrentMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>
                                {dayObj.date.getDate()}
                            </span>
                            {/* STATS DE OCUPACIÓN Y HUECOS (BOTONES CLICABLES) */}
                            <div className="flex items-center gap-1.5">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); if(occupiedCount > 0) setExpandedDay(dateStr); }} 
                                    className="text-[10px] font-black text-white bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded-lg uppercase tracking-tight shadow-sm transition-all hover:scale-105"
                                    title="Ver citas ocupadas"
                                >
                                    Oc: {occupiedCount}
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setFreeSlotsDay(dateStr); }} 
                                    className="text-[10px] font-black text-white bg-emerald-500 hover:bg-emerald-600 px-2 py-1 rounded-lg uppercase tracking-tight shadow-sm transition-all hover:scale-105"
                                    title="Ver huecos libres"
                                >
                                    Lib: {freeCount}
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                            {dayApts.slice(0, 5).map(apt => (
                                <div 
                                    key={apt.id} 
                                    onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); }}
                                    className={`pl-1.5 pr-1 py-1 rounded-md text-[9px] cursor-pointer hover:scale-[1.02] hover:shadow-sm border-l-[3px] transition-all flex items-center justify-between gap-1.5 ${getStatusColor(apt.status)}`}
                                >
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        <span className="font-black opacity-80 shrink-0">{apt.time}</span>
                                        <span className="font-bold truncate">{apt.patientName}</span>
                                    </div>
                                    <span className="shrink-0 text-[8px] font-black uppercase opacity-60 bg-white/30 px-1 rounded">{apt.doctorName.split(' ')[1] || 'Doc'}</span>
                                </div>
                            ))}
                            {dayApts.length > 5 && (
                                <div className="mt-auto text-[9px] font-black text-slate-400 text-center bg-slate-100 dark:bg-slate-800 rounded-md py-0.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700">
                                    + {dayApts.length - 5} más
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
    const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); return d; });

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
              <div className="p-4 text-xs font-black text-slate-400 text-center flex items-center justify-center bg-slate-50/30 dark:bg-slate-900/10">{h}</div>
              {weekDays.map((d, i) => {
                const dateStr = d.toISOString().split('T')[0];
                const apt = getSlotAppointment(dateStr, h);
                const isPast = isPastDate(dateStr);
                const isOpen = isClinicOpen(dateStr, h, branchFilter === 'ALL' ? undefined : branchFilter);

                return (
                  <div key={i} onClick={() => { if (!isPast) { if (isOpen) { setNewAptData({...newAptData, date: dateStr, time: h}); setIsCreating(true); } else { alert("Clínica Cerrada"); } } }} className={`border-l border-border-light dark:border-border-dark p-2 relative min-h-[80px] ${!isOpen ? 'bg-slate-100 dark:bg-slate-800/30 opacity-60' : (isPast ? 'bg-slate-100/30 dark:bg-slate-900/10 cursor-not-allowed' : 'hover:bg-primary/[0.02] cursor-pointer group')}`}>
                    {!isOpen && !apt && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-[8px] font-black text-slate-300 uppercase -rotate-45">Cerrado</span></div>}
                    {apt ? (
                      <div onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); }} className={`h-full w-full rounded-xl p-2 text-[10px] font-bold shadow-md transition-all hover:scale-[1.02] border border-white/10 ${getStatusColor(apt.status)} flex flex-col justify-between`}>
                        <div className="truncate mb-1">{apt.time} - {apt.patientName}</div>
                        <div className="flex justify-between items-center pt-1 border-t border-white/10 mt-1">
                            <span className="opacity-80 uppercase tracking-tighter text-[8px] truncate max-w-[60%]">{apt.treatment}</span>
                            <span className="font-black uppercase text-[8px] bg-white/20 px-1 rounded">{apt.doctorName.split(' ')[1]}</span>
                        </div>
                      </div>
                    ) : (!isPast && isOpen && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-primary text-xl">add_circle</span></div>)}
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
            <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">{currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            <div className="flex gap-2">
              <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase">{dayAppointments.length} Citas</span>
              {isPast && <span className="px-4 py-1.5 rounded-full bg-slate-200 text-slate-500 text-xs font-bold uppercase">Histórico</span>}
            </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {hours.map(h => {
            const apt = getSlotAppointment(dateStr, h);
            const isOpen = isClinicOpen(dateStr, h, branchFilter === 'ALL' ? undefined : branchFilter);
            return (
              <div key={h} onClick={() => { if(!isPast) { if(isOpen) { setNewAptData({...newAptData, time: h, date: dateStr}); setIsCreating(true); } else { alert("Clínica Cerrada en este horario"); } } }} className={`flex border-b border-border-light dark:border-border-dark transition-all min-h-[120px] ${!isOpen ? 'bg-slate-100 dark:bg-slate-900/50 opacity-70' : (isPast ? 'bg-slate-100/30 dark:bg-slate-900/10 cursor-not-allowed' : 'group cursor-pointer hover:bg-primary/[0.02]')}`}>
                <div className="w-28 p-8 text-sm font-black text-slate-400 border-r border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/10 text-center flex items-center justify-center">{h}</div>
                <div className="flex-1 p-6 relative">
                  {!isOpen && !apt && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-4xl font-black text-slate-200 dark:text-slate-800 uppercase tracking-[1em] -rotate-6">Cerrado</span></div>}
                  {apt ? (
                    <div onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); }} className={`p-6 rounded-[2rem] flex items-center justify-between ${getStatusColor(apt.status)} shadow-xl hover:scale-[1.01] transition-all border border-white/10 h-full relative z-10`}>
                      <div className="flex items-center gap-6">
                        <div className="size-14 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-xl">{apt.patientName[0]}</div>
                        <div>
                            <p className="text-xl font-bold">{apt.time} - {apt.patientName}</p>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs opacity-90 uppercase font-black tracking-widest">{apt.treatment}</p>
                                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Dr. {apt.doctorName}</span>
                            </div>
                            {settings.branchCount > 1 && <p className="text-[10px] font-bold bg-white/20 w-fit px-2 py-0.5 rounded mt-2 uppercase tracking-wider">{apt.branch}</p>}
                        </div>
                      </div>
                    </div>
                  ) : (!isPast && isOpen && <div className="h-full flex items-center justify-start px-6 opacity-0 group-hover:opacity-100 transition-all"><div className="flex items-center gap-3 text-primary font-bold"><div className="size-10 rounded-full border-2 border-primary flex items-center justify-center"><span className="material-symbols-outlined text-lg">add</span></div><span className="uppercase tracking-widest text-xs">Agendar espacio {h}</span></div></div>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full p-6 gap-6 animate-in fade-in duration-500">
        
        {/* Header and Controls */}
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">{settings.labels.agendaTitle}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium italic">Gestión de citas y disponibilidad.</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setIsRadarOpen(true)} className="flex items-center gap-2 h-12 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-primary">radar</span>
                        <span className="uppercase text-xs tracking-widest">Radar Disp.</span>
                    </button>
                    <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 h-12 px-6 rounded-xl bg-primary text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all">
                        <span className="material-symbols-outlined">add</span>
                        <span className="uppercase text-xs tracking-widest">Nueva Cita</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 rounded-[2rem] bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-md">
                {/* View Switcher & Date Nav */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-bg-dark rounded-[1.5rem] p-1.5 w-full lg:w-auto">
                    {['day', 'week', 'month'].map((v) => (
                        <button key={v} onClick={() => setView(v as any)} className={`flex-1 lg:flex-none px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white dark:bg-surface-dark text-primary shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>{v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}</button>
                    ))}
                    <div className="w-px h-8 bg-border-light dark:border-border-dark mx-2 hidden lg:block"></div>
                    <div className="flex items-center gap-2 px-2">
                        <button onClick={() => navigateDate(-1)} className="size-8 flex items-center justify-center hover:bg-white dark:hover:bg-surface-dark rounded-full transition-colors"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-lg hover:bg-primary hover:text-white transition-all">Hoy</button>
                        <button onClick={() => navigateDate(1)} className="size-8 flex items-center justify-center hover:bg-white dark:hover:bg-surface-dark rounded-full transition-colors"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
                    </div>
                    <span className="text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider px-2">
                        {view === 'month' ? monthNames[currentDate.getMonth()] : view === 'week' ? `Semana ${Math.ceil(currentDate.getDate() / 7)}` : `${currentDate.getDate()} ${monthNames[currentDate.getMonth()]}`} <span className="text-primary">{currentDate.getFullYear()}</span>
                    </span>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 w-full lg:w-auto">
                    {settings.branchCount > 1 && (
                        <div className="relative flex-1 lg:flex-none">
                            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white appearance-none cursor-pointer pr-10 focus:ring-2 focus:ring-primary/20"><option value="ALL">Todas las Sucursales</option>{uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}</select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">unfold_more</span>
                        </div>
                    )}
                    <div className="relative flex-1 lg:flex-none">
                        <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white appearance-none cursor-pointer pr-10 focus:ring-2 focus:ring-primary/20"><option value="ALL">Todos los Doctores</option>{doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">unfold_more</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 flex flex-col">
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
        </div>

        {/* Radar Modal (Month View) */}
        {isRadarOpen && (
            <div className="fixed inset-0 z-[180] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white dark:bg-surface-dark w-[95vw] h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/20">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-6"><div className="size-16 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg animate-pulse"><span className="material-symbols-outlined text-3xl">radar</span></div><div><h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Radar de Disponibilidad</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Escaneando huecos libres...</p></div></div>
                        <div className="flex items-center gap-4 bg-slate-100 dark:bg-bg-dark p-2 rounded-2xl"><button onClick={() => navigateRadarDate(-1)} className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 hover:text-primary shadow-sm transition-all"><span className="material-symbols-outlined">chevron_left</span></button><div className="text-center min-w-[140px]"><p className="text-lg font-black uppercase text-slate-900 dark:text-white leading-none">{monthNames[radarDate.getMonth()]}</p><p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{radarDate.getFullYear()}</p></div><button onClick={() => navigateRadarDate(1)} className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 hover:text-primary shadow-sm transition-all"><span className="material-symbols-outlined">chevron_right</span></button></div>
                        <div className="flex items-center gap-6"><select value={radarDoctorId} onChange={(e) => setRadarDoctorId(e.target.value)} className="bg-white dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary outline-none shadow-sm"><option value="ANY">Cualquier Médico Disponible</option>{doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}</select><button onClick={() => setIsRadarOpen(false)} className="size-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-danger transition-all hover:scale-105 shadow-sm"><span className="material-symbols-outlined text-2xl">close</span></button></div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-12 bg-slate-100 dark:bg-bg-dark custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                            {freeSlots.length > 0 ? freeSlots.map((day, idx) => (
                                <div key={idx} className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full hover:border-primary/50 transition-all group hover:shadow-xl">
                                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800"><div className="size-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center"><span className="text-xl font-black text-slate-800 dark:text-white leading-none">{day.dayNumber}</span><span className="text-[9px] font-black text-slate-400 uppercase">{day.month}</span></div><p className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">{day.dayName}</p></div>
                                    <div className="space-y-6 flex-1">
                                        {day.morning.length > 0 && (<div><p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-base">wb_sunny</span> Mañana</p><div className="grid grid-cols-3 gap-2">{day.morning.map(time => (<button key={time} onClick={() => handleRadarSlotClick(day.date, time)} className="py-2.5 rounded-xl bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-primary hover:text-white hover:border-primary transition-all text-center">{time}</button>))}</div></div>)}
                                        {day.afternoon.length > 0 && (<div><p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-base">nights_stay</span> Tarde</p><div className="grid grid-cols-3 gap-2">{day.afternoon.map(time => (<button key={time} onClick={() => handleRadarSlotClick(day.date, time)} className="py-2.5 rounded-xl bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-primary hover:text-white hover:border-primary transition-all text-center">{time}</button>))}</div></div>)}
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-40"><span className="material-symbols-outlined text-8xl mb-4">event_busy</span><p className="text-xl font-bold uppercase tracking-widest">No hay disponibilidad en este mes</p></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Expanded Day Modal (Occupied Appointments) */}
        {expandedDay && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setExpandedDay(null)}>
            <div 
                className="bg-white dark:bg-surface-dark w-[98vw] max-w-[1800px] rounded-[3rem] shadow-2xl border border-border-light dark:border-border-dark overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-6">
                    <div className="size-16 rounded-2xl bg-blue-500 text-white flex flex-col items-center justify-center shadow-lg">
                        <span className="text-2xl font-black leading-none">{new Date(expandedDay).getDate()}</span>
                        <span className="text-[10px] font-black uppercase">{new Date(expandedDay).toLocaleDateString('es-ES', { month: 'short' })}</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {new Date(expandedDay).toLocaleDateString('es-ES', { weekday: 'long' })}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Citas Ocupadas • {filteredAppointments.filter(a => a.date === expandedDay).length} Registros
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
                
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/50 dark:bg-bg-dark/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                    {filteredAppointments
                        .filter(a => a.date === expandedDay)
                        .sort((a, b) => a.time.localeCompare(b.time))
                        .map((apt) => (
                        <div 
                            key={apt.id}
                            onClick={() => { setSelectedApt(apt); setExpandedDay(null); }}
                            className={`p-8 rounded-[2.5rem] flex flex-col gap-6 cursor-pointer transition-all hover:scale-[1.02] border hover:shadow-xl group relative overflow-hidden ${
                            apt.status === 'Cancelled' ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 opacity-60' : 
                            'bg-white dark:bg-surface-dark border-white dark:border-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${getStatusColor(apt.status)}`}>
                                    {apt.status}
                                </span>
                                <span className="text-3xl font-black text-slate-900 dark:text-white">{apt.time}</span>
                            </div>
                            
                            <div className="flex-1 flex flex-col justify-center gap-3">
                                <div className="size-16 rounded-2xl bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors flex items-center justify-center font-bold text-3xl text-slate-500 uppercase mb-2">
                                    {apt.patientName.charAt(0)}
                                </div>
                                <p className="text-xl font-black text-slate-900 dark:text-white leading-tight line-clamp-2">{apt.patientName}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide truncate">{apt.treatment}</p>
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-3">
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

        {/* Free Slots Day Modal (Single Day View) */}
        {freeSlotsDay && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setFreeSlotsDay(null)}>
            <div 
                className="bg-white dark:bg-surface-dark w-[98vw] max-w-[1800px] rounded-[3rem] shadow-2xl border border-border-light dark:border-border-dark overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-6">
                    <div className="size-16 rounded-2xl bg-emerald-500 text-white flex flex-col items-center justify-center shadow-lg">
                        <span className="text-2xl font-black leading-none">{new Date(freeSlotsDay).getDate()}</span>
                        <span className="text-[10px] font-black uppercase">{new Date(freeSlotsDay).toLocaleDateString('es-ES', { month: 'short' })}</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {new Date(freeSlotsDay).toLocaleDateString('es-ES', { weekday: 'long' })}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Huecos Libres • Selecciona para agendar rápidamente
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => setFreeSlotsDay(null)}
                    className="size-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-danger transition-all hover:scale-105"
                >
                    <span className="material-symbols-outlined text-2xl">close</span>
                </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/50 dark:bg-bg-dark/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
                        {getFreeSlotsForDay(freeSlotsDay).map((time) => (
                            <button
                                key={time}
                                onClick={() => handleRadarSlotClick(freeSlotsDay, time)}
                                className="p-6 rounded-[2rem] bg-white dark:bg-surface-dark border border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-500 hover:bg-emerald-500 hover:text-white group transition-all shadow-sm flex flex-col items-center justify-center gap-2 aspect-square"
                            >
                                <span className="material-symbols-outlined text-emerald-500 group-hover:text-white text-3xl mb-1 transition-colors">add_circle</span>
                                <span className="text-2xl font-black text-slate-800 dark:text-white group-hover:text-white transition-colors">{time}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white/80 transition-colors">Disponible</span>
                            </button>
                        ))}
                        {getFreeSlotsForDay(freeSlotsDay).length === 0 && (
                            <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-40">
                                <span className="material-symbols-outlined text-8xl mb-4">event_busy</span>
                                <p className="text-xl font-bold uppercase tracking-widest">No hay huecos libres este día</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            </div>
        )}

        {/* Create Appointment Modal */}
        {isCreating && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 modal-backdrop">
            <div className="bg-[#e9ecef] dark:bg-surface-dark w-full max-w-[480px] rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 border border-border-light dark:border-border-dark">
                <div className="p-10 pb-4 flex justify-between items-center"><h3 className="text-2xl font-display font-bold text-[#334155] dark:text-white">Agendar Cita</h3><button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined text-4xl">close</span></button></div>
                <form onSubmit={handleCreateAppointment} className="p-10 pt-6 space-y-8">
                <div><label className="text-[11px] font-black uppercase text-[#94a3b8] tracking-widest block mb-3 ml-2">Paciente <span className="text-danger">*</span></label><input autoFocus type="text" placeholder="Nombre completo del paciente" value={newAptData.patientName} onChange={e => setNewAptData({...newAptData, patientName: e.target.value})} className="w-full bg-[#f1f5f9]/80 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-[1.75rem] px-8 py-5 text-base font-medium text-black dark:text-white focus:ring-4 focus:ring-primary/10 transition-all" /></div>
                {settings.branchCount > 1 && (<div><label className="text-[11px] font-black uppercase text-[#94a3b8] tracking-widest block mb-3 ml-2">Sucursal</label><select value={newAptData.branch} onChange={e => setNewAptData({...newAptData, branch: e.target.value})} className="w-full bg-[#f1f5f9]/80 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-[1.75rem] px-8 py-5 text-base font-medium text-black dark:text-white appearance-none transition-all">{uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}</select></div>)}
                <div className="grid grid-cols-2 gap-6">
                    <div><label className="text-[11px] font-black uppercase text-[#94a3b8] tracking-widest block mb-3 ml-2">Fecha <span className="text-danger">*</span></label><input type="date" min={new Date().toISOString().split('T')[0]} value={newAptData.date} onChange={e => setNewAptData({...newAptData, date: e.target.value})} className="w-full bg-[#f1f5f9]/80 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-[1.75rem] px-6 py-5 text-base font-bold text-black dark:text-white transition-all" /></div>
                    <div><label className="text-[11px] font-black uppercase text-[#94a3b8] tracking-widest block mb-3 ml-2">Hora <span className="text-danger">*</span></label><input type="time" value={newAptData.time} onChange={e => setNewAptData({...newAptData, time: e.target.value})} className="w-full bg-[#f1f5f9]/80 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-[1.75rem] px-6 py-5 text-base font-bold text-black dark:text-white transition-all" /></div>
                </div>
                <div><label className="text-[11px] font-black uppercase text-[#94a3b8] tracking-widest block mb-3 ml-2">Tratamiento</label><select value={newAptData.treatment} onChange={e => setNewAptData({...newAptData, treatment: e.target.value})} className="w-full bg-[#f1f5f9]/80 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-[1.75rem] px-8 py-5 text-base font-medium text-black dark:text-white appearance-none transition-all"><option>Consulta General</option><option>Limpieza Dental</option><option>Ortodoncia</option><option>Cirugía Maxilofacial</option><option>Revisión Periódica</option></select></div>
                <div><label className="text-[11px] font-black uppercase text-[#94a3b8] tracking-widest block mb-3 ml-2">Médico Responsable <span className="text-danger">*</span></label><select value={newAptData.doctorId} onChange={e => { const doc = doctors.find(d => d.id === e.target.value); setNewAptData({...newAptData, doctorId: e.target.value, doctorName: doc?.name || ''}); }} className="w-full bg-[#f1f5f9]/80 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-[1.75rem] px-8 py-5 text-base font-medium text-black dark:text-white appearance-none transition-all">{doctors.map(doc => (<option key={doc.id} value={doc.id}>{doc.name} ({doc.specialty})</option>))}</select></div>
                <div className="flex gap-4 pt-6"><button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-6 rounded-[2.25rem] bg-[#f1f5f9] dark:bg-slate-800 font-bold text-[#64748b] hover:bg-slate-200 transition-all">Cancelar</button><button type="submit" className="flex-1 py-6 rounded-[2.25rem] bg-[#4285f4] text-white font-bold shadow-2xl hover:brightness-110 transition-all">Confirmar Cita</button></div>
                </form>
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
