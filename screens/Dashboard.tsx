
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointment, Task, User, Patient, Doctor, ClinicSettings } from '../types';
import AppointmentDetailModal from '../components/AppointmentDetailModal';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  settings: ClinicSettings;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  patients: Patient[];
  doctors: Doctor[];
  currentUser?: User; 
}

const Dashboard: React.FC<DashboardProps> = ({ settings, appointments, setAppointments, tasks, setTasks, patients, doctors, currentUser }) => {
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('ALL');

  const userRole = settings.roles.find(r => r.id === currentUser?.role);
  const canViewAllData = userRole?.permissions.includes('view_all_data');

  useEffect(() => {
    if (!canViewAllData && doctors.find(d => d.id === currentUser?.id)) {
      setSelectedDoctorId(currentUser?.id || 'ALL');
    }
  }, [canViewAllData, currentUser, doctors]);

  const filteredAppointments = useMemo(() => {
    return selectedDoctorId === 'ALL' ? appointments : appointments.filter(a => a.doctorId === selectedDoctorId);
  }, [appointments, selectedDoctorId]);

  const filteredTasks = useMemo(() => {
    if (selectedDoctorId === 'ALL') return tasks;
    return tasks.filter(t => t.assignedToId === selectedDoctorId);
  }, [tasks, selectedDoctorId]);

  // CORRECCIÓN DE FECHAS PARA FILTRADO ROBUSTO
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const todayApts = useMemo(() => 
    filteredAppointments.filter(a => a.date === todayStr && a.status !== 'Cancelled')
    .sort((a, b) => a.time.localeCompare(b.time)),
  [filteredAppointments, todayStr]);

  const tomorrowApts = useMemo(() => 
    filteredAppointments.filter(a => a.date === tomorrowStr && a.status !== 'Cancelled')
    .sort((a, b) => a.time.localeCompare(b.time)),
  [filteredAppointments, tomorrowStr]);

  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0,0,0,0);

    const weekDayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    weekDayNames.forEach((name, i) => {
        const checkDay = new Date(monday);
        checkDay.setDate(monday.getDate() + i);
        const checkDayStr = checkDay.toISOString().split('T')[0];
        
        // Respetar configuración de apertura
        const isDayActive = settings.globalSchedule?.[name]?.morning?.active || settings.globalSchedule?.[name]?.afternoon?.active;
        
        if (isDayActive) {
            const count = filteredAppointments.filter(a => a.date === checkDayStr && a.status !== 'Cancelled').length;
            data.push({ 
                name: name.substring(0, 3), 
                fullDate: checkDay.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                citas: count 
            });
        }
    });
    return data;
  }, [filteredAppointments, settings.globalSchedule]);

  const toggleTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div className="w-full flex flex-col p-6 gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">{settings.labels.dashboardTitle}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Visión Global en Tiempo Real</p>
        </div>
        <div className="bg-white dark:bg-surface-dark p-2 rounded-lg border border-border-light dark:border-border-dark flex items-center gap-3 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Filtro de Supervisión:</span>
          <select value={selectedDoctorId} disabled={!canViewAllData} onChange={(e) => setSelectedDoctorId(e.target.value)} className="bg-transparent border-none p-0 text-xs font-bold focus:ring-0 w-48 text-primary cursor-pointer">
              <option value="ALL">Toda la Clínica</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
            {/* GRÁFICA SEMANAL CON CURVAS REALES */}
            <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark h-[350px]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Ocupación Semanal Laboral</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 italic">Citas programadas por jornada</p>
                    </div>
                </div>
                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs><linearGradient id="cDashboard" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                            <Tooltip 
                                cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}} 
                                labelFormatter={(label, props) => props[0]?.payload.fullDate || label}
                            />
                            <Area type="monotone" dataKey="citas" stroke="#3b82f6" strokeWidth={4} fill="url(#cDashboard)" animationDuration={1000} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* LISTA DE PRÓXIMAS 48 HORAS */}
            <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark flex flex-col min-h-[400px]">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
                    <span className="size-2 bg-success rounded-full animate-pulse"></span> Próximas Citas (Hoy y Mañana)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 h-0 overflow-hidden">
                    <div className="flex flex-col bg-slate-50/50 dark:bg-bg-dark/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                            <span>HOY</span>
                            <span className="opacity-50">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                        </span>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {todayApts.length > 0 ? todayApts.map(apt => (
                                <div key={apt.id} onClick={() => setSelectedApt(apt)} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2"><span className="text-sm font-black text-slate-800 dark:text-white group-hover:text-primary transition-colors">{apt.time}</span><span className={`size-2 rounded-full ${apt.status === 'Confirmed' ? 'bg-success' : 'bg-warning'}`}></span></div>
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{apt.patientName}</p>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                                        <p className="text-[9px] text-slate-400 uppercase tracking-tight truncate max-w-[120px]">{apt.treatment}</p>
                                        <p className="text-[9px] font-black text-primary uppercase italic">Dr. {apt.doctorName.split(' ')[1]}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-40 italic">
                                    <span className="material-symbols-outlined text-3xl mb-2">event_available</span>
                                    <p className="text-[10px] font-bold uppercase">Sin actividad registrada</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col bg-slate-50/50 dark:bg-bg-dark/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                            <span>MAÑANA</span>
                            <span className="opacity-50">{tomorrow.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                        </span>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {tomorrowApts.length > 0 ? tomorrowApts.map(apt => (
                                <div key={apt.id} onClick={() => setSelectedApt(apt)} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2"><span className="text-sm font-black text-slate-800 dark:text-white group-hover:text-primary transition-colors">{apt.time}</span><span className={`size-2 rounded-full ${apt.status === 'Confirmed' ? 'bg-success' : 'bg-warning'}`}></span></div>
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{apt.patientName}</p>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                                        <p className="text-[9px] text-slate-400 uppercase tracking-tight truncate max-w-[120px]">{apt.treatment}</p>
                                        <p className="text-[9px] font-black text-primary uppercase italic">Dr. {apt.doctorName.split(' ')[1]}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-40 italic">
                                    <span className="material-symbols-outlined text-3xl mb-2">event_upcoming</span>
                                    <p className="text-[10px] font-bold uppercase">Sin actividad programada</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* TAREAS DE CONTROL CON MÉDICO ASIGNADO */}
        <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark flex flex-col h-full">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Pool de Tareas Operativas</h3>
           </div>
           <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {filteredTasks.map((task) => {
                const assignedDoc = doctors.find(d => d.id === task.assignedToId);
                return (
                    <div key={task.id} className="group flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-bg-dark border border-transparent hover:border-primary/20 transition-all">
                    <div onClick={(e) => toggleTask(task.id, e)} className={`mt-0.5 size-5 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${task.completed ? 'bg-success border-success text-white' : 'border-slate-300 hover:border-primary bg-white'}`}>
                        {task.completed && <span className="material-symbols-outlined text-xs font-black">check</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold leading-tight truncate ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>{task.title}</p>
                        <p className="text-[9px] text-slate-400 mt-1 line-clamp-1">{task.description}</p>
                        <div className="flex justify-between items-center mt-3">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${task.priority === 'High' ? 'bg-danger/10 text-danger' : 'bg-slate-200 text-slate-500'}`}>{task.priority}</span>
                            <div className="flex items-center gap-1.5">
                                {assignedDoc && <div className="size-4 rounded-full bg-cover bg-center" style={{backgroundImage: `url('${assignedDoc.img}')`}}></div>}
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{task.sub}</span>
                            </div>
                        </div>
                    </div>
                    </div>
                );
              })}
           </div>
        </div>
      </div>

      {selectedApt && (
        <AppointmentDetailModal settings={settings} appointment={selectedApt} onClose={() => setSelectedApt(null)} onUpdateStatus={(id, s) => setAppointments(prev => prev.map(a => a.id === id ? {...a, status: s} : a))} patients={patients} doctors={doctors} />
      )}
    </div>
  );
};

export default Dashboard;
