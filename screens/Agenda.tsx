
import React, { useState, useMemo } from 'react';
import { Appointment, AppointmentStatus, Patient, Doctor, DaySchedule, ClinicSettings, Branch } from '../types';
import AppointmentDetailModal from '../components/AppointmentDetailModal';
import { DataField } from '../components/shared/DataField';

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
  const [view, setView] = useState<'day' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [doctorFilter, setDoctorFilter] = useState<string>('ALL');
  const [globalSearch, setGlobalSearch] = useState<string>(''); // BUSCADOR MAESTRO
  const [localSearch, setLocalSearch] = useState<string>('');   // BUSCADOR DENTRO DEL DÍA
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const daysHeader = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const [newAptData, setNewAptData] = useState({
    patientName: '', treatment: 'Consulta General', date: new Date().toISOString().split('T')[0], time: '09:00', doctorId: doctors[0]?.id || '', doctorName: doctors[0]?.name || '', branch: doctors[0]?.branch || 'Centro'
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = adjustedFirstDay - 1; i >= 0; i--) { days.push({ day: prevMonthDays - i, month: month - 1, year, current: false }); }
    for (let i = 1; i <= daysInMonth; i++) { days.push({ day: i, month, year, current: true }); }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) { days.push({ day: i, month: month + 1, year, current: false }); }
    return days;
  };

  // FILTRADO CORE (Sin incluir búsqueda para mantener la estructura visual)
  const baseFilteredAppointments = useMemo(() => {
    return appointments.filter(a => {
        const matchBranch = (branchFilter === 'ALL') ? true : a.branch === branchFilter;
        const matchDoctor = doctorFilter === 'ALL' ? true : a.doctorId === doctorFilter;
        return matchBranch && matchDoctor;
    });
  }, [appointments, branchFilter, doctorFilter]);

  const uniqueBranches = useMemo(() => {
      const b = new Set(doctors.map(d => d.branch));
      if (branches.length > 0) branches.forEach(br => b.add(br.name));
      return Array.from(b);
  }, [doctors, branches]);

  const handleNavigate = (dir: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);
    if (dir === 'today') { setCurrentDate(new Date()); return; }
    if (view === 'month') newDate.setMonth(currentDate.getMonth() + (dir === 'next' ? 1 : -1));
    else newDate.setDate(currentDate.getDate() + (dir === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const handleUpdateStatus = (id: string, status: AppointmentStatus, newDate?: string, newTime?: string, doctorId?: string, doctorName?: string) => {
    setAppointments(prev => prev.map(apt => apt.id === id ? { 
        ...apt, status, date: newDate || apt.date, time: newTime || apt.time, 
        doctorId: doctorId || apt.doctorId, doctorName: doctorName || apt.doctorName 
    } : apt));
    setSelectedApt(null);
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const newApt: Appointment = {
      id: 'APT-' + Date.now() + Math.random().toString(36).substr(2, 4),
      patientId: 'P-WEB',
      doctorName: newAptData.doctorName, doctorId: newAptData.doctorId,
      patientName: newAptData.patientName.trim(), treatment: newAptData.treatment,
      date: newAptData.date, time: newAptData.time, branch: newAptData.branch, status: 'Confirmed'
    };
    setAppointments(prev => [...prev, newApt]);
    setIsCreating(false);
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);
    const aptId = e.dataTransfer.getData("appointmentId");
    if (aptId) {
        setAppointments(prev => prev.map(a => a.id === aptId ? { ...a, date: dateStr, status: 'Reprogramada' } : a));
    }
  };

  const getStatusStyle = (status: AppointmentStatus) => {
    switch (status) {
      case 'Confirmed': return { bg: 'bg-emerald-500', text: 'text-emerald-700', label: 'Confirmada', light: 'bg-emerald-50 border-emerald-200' };
      case 'Reprogramada': return { bg: 'bg-amber-400', text: 'text-amber-700', label: 'Reprogramada', light: 'bg-amber-50 border-amber-200' };
      case 'Cancelled': return { bg: 'bg-rose-500', text: 'text-rose-700', label: 'Cancelada', light: 'bg-rose-50 border-rose-200' };
      case 'Completed': return { bg: 'bg-blue-500', text: 'text-blue-700', label: 'Atendida', light: 'bg-blue-50 border-blue-200' };
      default: return { bg: 'bg-slate-400', text: 'text-slate-700', label: 'Pendiente', light: 'bg-slate-100 border-slate-200' };
    }
  };

  const renderMonthView = () => {
    const calendarDays = getDaysInMonth(currentDate);
    const s = globalSearch.toLowerCase().trim();

    return (
      <div className="flex-1 grid grid-cols-7 border-t border-slate-100 dark:border-slate-800">
        {daysHeader.map(d => (
          <div key={d} className="p-5 text-center border-b border-r border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">{d}</span>
          </div>
        ))}
        {calendarDays.map((d, i) => {
          const dateStr = `${d.year}-${(d.month + 1).toString().padStart(2, '0')}-${d.day.toString().padStart(2, '0')}`;
          const dayApts = baseFilteredAppointments.filter(a => a.date === dateStr).sort((a,b) => a.time.localeCompare(b.time));
          
          // Lógica de iluminación si hay coincidencias de búsqueda
          const hasMatches = s !== '' && dayApts.some(a => 
            a.patientName.toLowerCase().includes(s) || 
            a.treatment.toLowerCase().includes(s)
          );

          // Filtrar citas a mostrar en la mini-lista según búsqueda
          const displayApts = s === '' ? dayApts : dayApts.filter(a => 
            a.patientName.toLowerCase().includes(s) || 
            a.treatment.toLowerCase().includes(s)
          );

          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          return (
            <div 
              key={i} 
              onDragOver={(e) => { e.preventDefault(); setDragOverDate(dateStr); }}
              onDragLeave={() => setDragOverDate(null)}
              onDrop={(e) => handleDrop(e, dateStr)}
              className={`min-h-[200px] p-6 border-b border-r border-slate-100 dark:border-slate-800 transition-all relative flex flex-col group 
                ${!d.current ? 'bg-slate-50/20 dark:bg-slate-900/10 grayscale' : 'bg-white dark:bg-surface-dark'} 
                ${dragOverDate === dateStr ? 'bg-primary/5 ring-4 ring-primary/20 ring-inset' : ''} 
                ${hasMatches ? 'ring-4 ring-primary/40 ring-inset bg-primary/5 z-20 shadow-[0_0_30px_rgba(59,130,246,0.2)] animate-pulse' : ''}
                hover:z-10`}
            >
              <div className="flex justify-between items-start mb-6">
                <span className={`text-4xl font-display font-black leading-none transition-transform group-hover:scale-110 ${isToday ? 'text-primary' : 'text-slate-200 dark:text-slate-800 group-hover:text-slate-900 dark:group-hover:text-white'} ${hasMatches ? 'text-primary scale-110' : ''}`}>{d.day}</span>
                {dayApts.length > 0 && (
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-lg transition-colors ${hasMatches ? 'bg-primary text-white' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'}`}>
                        {dayApts.length} Turnos
                    </span>
                )}
              </div>
              
              <div className="flex-1 space-y-1.5 overflow-hidden mb-4">
                {displayApts.slice(0, 4).map(apt => {
                  const style = getStatusStyle(apt.status);
                  return (
                    <div 
                      key={apt.id} 
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("appointmentId", apt.id)}
                      onClick={() => setSelectedApt(apt)}
                      className={`group/apt px-2.5 py-1.5 rounded-lg border border-transparent hover:border-primary cursor-pointer transition-all flex items-center gap-2 overflow-hidden animate-in fade-in 
                        ${hasMatches ? 'bg-white dark:bg-slate-800 shadow-md scale-105' : 'bg-slate-50 dark:bg-slate-800/40'}`}
                    >
                      <div className={`w-1.5 h-6 rounded-full shrink-0 ${style.bg} shadow-sm`}></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-slate-800 dark:text-white truncate leading-none mb-0.5 uppercase tracking-tighter">{apt.patientName}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{apt.time} • {apt.treatment}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {dayApts.length > 0 && (
                <button 
                    onClick={() => { setExpandedDay(dateStr); setLocalSearch(globalSearch); }}
                    className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl -translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 ${hasMatches ? 'bg-primary text-white opacity-100' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 opacity-0'}`}
                >
                    {hasMatches ? 'Coincidencias' : 'Ver Todo'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderExpandedDayView = () => {
    if (!expandedDay) return null;
    const dayApts = baseFilteredAppointments.filter(a => a.date === expandedDay).sort((a,b) => a.time.localeCompare(b.time));
    const s = localSearch.toLowerCase().trim();
    const displayApts = s === '' ? dayApts : dayApts.filter(a => 
        a.patientName.toLowerCase().includes(s) || 
        a.treatment.toLowerCase().includes(s)
    );
    const displayDate = new Date(expandedDay);

    return (
        <div className="fixed inset-0 z-[250] bg-slate-50 dark:bg-bg-dark flex flex-col animate-in slide-in-from-bottom-10 duration-500 overflow-hidden">
            <header className="p-12 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center bg-white/90 dark:bg-bg-dark/90 backdrop-blur-3xl shrink-0 gap-8">
                <div className="flex items-center gap-10">
                    <div className="size-24 rounded-[2rem] bg-primary text-white flex flex-col items-center justify-center shadow-2xl shadow-primary/30 rotate-2">
                        <span className="text-4xl font-black leading-none">{displayDate.getDate()}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest mt-1">{displayDate.toLocaleDateString('es-ES', { month: 'short' })}</span>
                    </div>
                    <div>
                        <h2 className="text-5xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{displayDate.toLocaleDateString('es-ES', { weekday: 'long' })}</h2>
                        <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-[0.4em] flex items-center gap-3">
                            <span className="size-2 bg-success rounded-full animate-ping"></span>
                            Monitorización Operativa • {dayApts.length} Servicios
                        </p>
                    </div>
                </div>

                <div className="flex flex-1 max-w-2xl w-full gap-4">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-2xl">search</span>
                        <input 
                            type="text"
                            placeholder="Buscar en esta jornada (Paciente o Servicio)..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] py-5 pl-16 pr-8 text-lg font-bold shadow-inner focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        />
                    </div>
                    <button 
                        onClick={() => { setExpandedDay(null); setLocalSearch(''); }}
                        className="h-16 px-10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center gap-3 shadow-2xl border border-slate-100 dark:border-slate-700"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span> Salir
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-16 space-y-8 custom-scrollbar">
                {displayApts.length > 0 ? displayApts.map(apt => {
                    const style = getStatusStyle(apt.status);
                    const isMatch = s !== '' && (apt.patientName.toLowerCase().includes(s) || apt.treatment.toLowerCase().includes(s));

                    return (
                        <div 
                            key={apt.id} 
                            onClick={() => setSelectedApt(apt)}
                            className={`bg-white dark:bg-surface-dark border rounded-[3rem] p-12 flex flex-col xl:flex-row items-center gap-16 hover:border-primary transition-all cursor-pointer shadow-xl group relative overflow-hidden 
                                ${isMatch ? 'border-primary ring-4 ring-primary/10 animate-in zoom-in-95' : 'border-slate-100 dark:border-slate-800'}`}
                        >
                            <div className={`absolute top-0 left-0 w-3 h-full ${style.bg}`}></div>
                            
                            <div className="text-center xl:w-40 group-hover:scale-110 transition-transform">
                                <p className={`text-6xl font-display font-black leading-none tracking-tighter ${isMatch ? 'text-primary' : 'text-slate-800 dark:text-white'}`}>{apt.time}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Turno Local</p>
                            </div>

                            <div className="flex-1 space-y-6 w-full">
                                <div className="flex flex-wrap gap-3">
                                    <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${style.bg} ${style.light.replace('bg-', 'text-').replace('50', '500')}`}>
                                        {style.label}
                                    </span>
                                    <span className="px-6 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">EXP: {apt.patientId}</span>
                                    {isMatch && <span className="px-6 py-2 bg-primary text-white rounded-full text-[9px] font-black uppercase tracking-widest animate-bounce">Coincidencia</span>}
                                </div>
                                <h3 className={`text-5xl font-display font-black uppercase tracking-tighter leading-none transition-colors ${isMatch ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>{apt.patientName}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-50 dark:border-slate-800">
                                    <div className="flex items-center gap-5">
                                        <div className={`size-12 rounded-2xl flex items-center justify-center shadow-inner ${isMatch ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}><span className="material-symbols-outlined text-2xl">medical_services</span></div>
                                        <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Servicio</p><p className={`text-base font-bold ${isMatch ? 'text-primary' : 'text-slate-800 dark:text-white'}`}>{apt.treatment}</p></div>
                                    </div>
                                    <div className="flex items-center gap-5">
                                        <div className="size-12 rounded-2xl bg-orange-400/10 text-orange-500 flex items-center justify-center shadow-inner"><span className="material-symbols-outlined text-2xl">stethoscope</span></div>
                                        <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Especialista</p><p className="text-base font-bold text-slate-800 dark:text-white">{apt.doctorName}</p></div>
                                    </div>
                                    <div className="flex items-center gap-5">
                                        <div className="size-12 rounded-2xl bg-indigo-400/10 text-indigo-500 flex items-center justify-center shadow-inner"><span className="material-symbols-outlined text-2xl">apartment</span></div>
                                        <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sucursal</p><p className="text-base font-bold text-slate-800 dark:text-white">{apt.branch}</p></div>
                                    </div>
                                </div>
                            </div>

                            <button className="size-20 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-xl">
                                <span className="material-symbols-outlined text-4xl">chevron_right</span>
                            </button>
                        </div>
                    );
                }) : (
                    <div className="py-32 text-center opacity-40 flex flex-col items-center gap-6">
                        <span className="material-symbols-outlined text-8xl">search_off</span>
                        <p className="font-black text-2xl uppercase tracking-widest">Sin coincidencias para "{localSearch}"</p>
                    </div>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full p-10 gap-10 animate-in fade-in duration-700 bg-bg-light dark:bg-bg-dark">
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-center gap-10">
            <div className="flex flex-col md:flex-row items-center gap-10 w-full xl:w-auto">
                <div>
                    <h1 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{settings.labels.agendaTitle}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-base font-medium italic">Sincronización CORE v3.5 • Latencia Zero</p>
                </div>
                <div className="flex bg-white dark:bg-surface-dark p-2 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl">
                   {(['month', 'day'] as const).map(v => (
                       <button key={v} onClick={() => setView(v)} className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-primary text-white shadow-2xl shadow-primary/30 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>{v === 'month' ? 'Mensual' : 'Hoy'}</button>
                   ))}
                </div>
            </div>

            {/* BUSCADOR MAESTRO DE AGENDA */}
            <div className="flex-1 max-w-xl w-full relative group">
                <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-primary text-2xl group-focus-within:scale-110 transition-transform">search</span>
                <input 
                    type="text" 
                    placeholder="Buscador inteligente: Paciente o Servicio..." 
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="w-full h-16 bg-white dark:bg-surface-dark border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] py-4 pl-16 pr-6 text-sm font-black uppercase tracking-wider shadow-2xl focus:ring-8 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                />
                {globalSearch && (
                    <button onClick={() => setGlobalSearch('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"><span className="material-symbols-outlined">cancel</span></button>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 w-full xl:w-auto">
                <div className="flex items-center gap-2 bg-white dark:bg-surface-dark px-3 py-2 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl">
                    <button onClick={() => handleNavigate('prev')} className="size-12 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-all"><span className="material-symbols-outlined text-3xl">chevron_left</span></button>
                    <span className="text-sm font-black uppercase text-slate-900 dark:text-white px-10 min-w-[200px] text-center tracking-[0.2em]">{view === 'month' ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}` : currentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                    <button onClick={() => handleNavigate('next')} className="size-12 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-all"><span className="material-symbols-outlined text-3xl">chevron_right</span></button>
                </div>
                <button onClick={() => setIsCreating(true)} className="h-16 px-12 bg-primary text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-[0_20px_40px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-4"><span className="material-symbols-outlined text-2xl">add_circle</span> Nuevo Registro</button>
            </div>
        </div>

        {/* FILTROS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 bg-white dark:bg-surface-dark p-10 rounded-[4rem] border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Sucursal</label>
                <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-[1.5rem] px-6 py-5 text-xs font-bold focus:ring-4 focus:ring-primary/10 transition-all">
                    <option value="ALL">Todas las Sedes</option>
                    {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
            </div>
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Especialista</label>
                <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-[1.5rem] px-6 py-5 text-xs font-bold focus:ring-4 focus:ring-primary/10 transition-all">
                    <option value="ALL">Todo el Equipo</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}
                </select>
            </div>
            <div className="md:col-span-2 flex items-end">
                <div className="flex flex-wrap items-center gap-10 ml-auto pr-10">
                    <div className="flex items-center gap-3"><div className="size-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30"></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirmada</span></div>
                    <div className="flex items-center gap-3"><div className="size-4 rounded-full bg-amber-400 shadow-lg shadow-amber-400/30"></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reprogramada</span></div>
                    <div className="flex items-center gap-3"><div className="size-4 rounded-full bg-rose-500 shadow-lg shadow-rose-500/30"></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anulada</span></div>
                </div>
            </div>
        </div>

        {/* CALENDAR BODY */}
        <div className="flex-1 bg-white dark:bg-surface-dark rounded-[4rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            {view === 'month' ? renderMonthView() : <div className="flex-1 overflow-y-auto">{/* Día View render */}</div>}
        </div>

        {/* FULL SCREEN EXPANDED VIEW */}
        {renderExpandedDayView()}

        {/* MODALES */}
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

        {isCreating && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-2xl animate-in zoom-in duration-300">
                <div className="bg-white dark:bg-surface-dark w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden border border-white/20">
                    <header className="p-12 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                        <h3 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Agendar Turno</h3>
                        <button onClick={() => setIsCreating(false)} className="size-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center transition-all border border-slate-200 dark:border-slate-700 shadow-md"><span className="material-symbols-outlined text-4xl">close</span></button>
                    </header>
                    <form onSubmit={handleCreateAppointment} className="p-12 space-y-10">
                        <DataField label="Paciente" value={newAptData.patientName} editing={true} onChange={(v: string) => setNewAptData({...newAptData, patientName: v})} placeholder="Nombre y apellidos" required />
                        <div className="grid grid-cols-2 gap-8">
                            <DataField label="Fecha" value={newAptData.date} editing={true} type="date" onChange={(v: string) => setNewAptData({...newAptData, date: v})} required />
                            <DataField label="Hora" value={newAptData.time} editing={true} type="time" onChange={(v: string) => setNewAptData({...newAptData, time: v})} required />
                        </div>
                        <DataField label="Médico" value={newAptData.doctorId} editing={true} type="select" options={doctors.map(d => ({ value: d.id, label: d.name }))} onChange={(v: string) => { const d = doctors.find(doc => doc.id === v); setNewAptData({...newAptData, doctorId: v, doctorName: d?.name || '', branch: d?.branch || 'Centro'}); }} required />
                        <button type="submit" className="w-full h-24 bg-primary text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.4em] shadow-[0_25px_50px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-95 transition-all mt-6">Confirmar Registro</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default Agenda;
