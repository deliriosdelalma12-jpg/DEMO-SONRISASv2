
import React, { useState, useMemo, useRef, useEffect } from 'react';
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

const treatmentPrices: Record<string, number> = {
  'Limpieza Dental Profunda': 80,
  'Limpieza Dental': 60,
  'Ortodoncia': 1200,
  'Ortodoncia Invisible': 3500,
  'Cirugía Maxilofacial': 850,
  'Consulta General': 50,
  'Revisión Periódica': 45,
  'Implante Titanio': 1200,
  'Endodoncia Molar': 250,
  'Blanqueamiento': 180
};

const Dashboard: React.FC<DashboardProps> = ({ settings, appointments, setAppointments, tasks, setTasks, patients, doctors, currentUser }) => {
  const navigate = useNavigate();
  
  // Task Editing State
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  
  // Selected Appointment State
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  
  // Permissions & Filtering
  const userRole = settings.roles.find(r => r.id === currentUser?.role);
  const canViewAllData = userRole?.permissions.includes('view_all_data');
  const isDoctor = doctors.find(d => d.id === currentUser?.id);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('ALL');

  useEffect(() => {
    if (!canViewAllData && isDoctor) {
      setSelectedDoctorId(isDoctor.id);
    }
  }, [canViewAllData, isDoctor]);

  // --- FILTRADO GLOBAL (Appointments & Stats) ---
  const filteredAppointments = useMemo(() => {
    return selectedDoctorId === 'ALL' 
      ? appointments 
      : appointments.filter(a => a.doctorId === selectedDoctorId);
  }, [appointments, selectedDoctorId]);

  // --- FILTRADO DE TAREAS ---
  const filteredTasks = useMemo(() => {
    if (selectedDoctorId === 'ALL') {
        // Si es Admin y ve todo, ve todas las tareas
        return tasks;
    } else {
        // Filtra tareas asignadas al usuario/doctor seleccionado
        // También busca por coincidencia difusa en 'sub' (legacy support)
        const docName = doctors.find(d => d.id === selectedDoctorId)?.name || '';
        return tasks.filter(t => 
            t.assignedToId === selectedDoctorId || 
            (t.sub && docName && t.sub.toLowerCase().includes(docName.split(' ')[1]?.toLowerCase() || 'xyz'))
        );
    }
  }, [tasks, selectedDoctorId, doctors]);

  // --- APPOINTMENT LOGIC (TODAY & TOMORROW SEPARATED) ---
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  const todayApts = filteredAppointments.filter(a => 
    a.date === todayStr &&
    ['Confirmed', 'Rescheduled', 'Pending'].includes(a.status)
  ).sort((a, b) => a.time.localeCompare(b.time));

  const tomorrowApts = filteredAppointments.filter(a => 
    a.date === tomorrowStr &&
    ['Confirmed', 'Rescheduled', 'Pending'].includes(a.status)
  ).sort((a, b) => a.time.localeCompare(b.time));

  // --- STATS LOGIC ---
  const monthApts = filteredAppointments.filter(a => a.date.startsWith(todayStr.substring(0, 7)));
  const monthRevenue = monthApts
    .filter(a => a.status === 'Completed')
    .reduce((acc, curr) => acc + (treatmentPrices[curr.treatment] || 50), 0);

  const stats = [
    { icon: 'event_available', label: 'Citas Hoy/Mañana', value: (todayApts.length + tomorrowApts.length).toString(), change: 'Activas', color: 'text-success' },
    { icon: 'payments', label: 'Ingresos Mes', value: `${settings.currency}${(monthRevenue / 1000).toFixed(1)}k`, change: 'Estimado', color: 'text-primary' },
    { icon: 'groups', label: 'Pacientes', value: selectedDoctorId === 'ALL' ? patients.length.toString() : new Set(filteredAppointments.map(a => a.patientId)).size.toString(), change: 'Total', color: 'text-blue-400' },
  ];

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const count = filteredAppointments.filter(a => a.date === dStr).length;
      data.push({ name: d.toLocaleDateString('es-ES', { weekday: 'short' }), citas: count });
    }
    return data;
  }, [filteredAppointments]);

  // --- TASK ACTIONS ---
  const toggleTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleSaveTask = (task: Task) => {
    if (!task.title.trim()) return;
    
    // Auto-assign task to currently selected doctor filter if creating new, 
    // otherwise defaults to current user or unassigned.
    const assignId = isCreatingTask ? (selectedDoctorId === 'ALL' ? currentUser?.id : selectedDoctorId) : task.assignedToId;

    const taskToSave = { ...task, assignedToId: assignId };

    if (isCreatingTask) {
        setTasks([taskToSave, ...tasks]);
        setIsCreatingTask(false);
    } else {
        setTasks(prev => prev.map(t => t.id === task.id ? taskToSave : t));
        setEditingTask(null);
    }
  };

  const handleDeleteTask = (id: string) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      setEditingTask(null);
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('taskIndex', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('taskIndex'));
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const newTasks = [...tasks];
    const [movedTask] = newTasks.splice(sourceIndex, 1);
    newTasks.splice(targetIndex, 0, movedTask);
    setTasks(newTasks);
  };

  // Format nice dates
  const formatDateNice = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  return (
    <div className="w-full flex flex-col p-6 gap-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">{settings.labels.dashboardTitle}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">
            {selectedDoctorId === 'ALL' ? 'Vista General de la Clínica' : `Panel Personal: ${doctors.find(d => d.id === selectedDoctorId)?.name}`}
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-surface-dark p-1.5 rounded-lg border border-border-light dark:border-border-dark">
          <div className="px-3 py-1 bg-slate-50 dark:bg-bg-dark rounded-md">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Filtro Global</p>
            <select 
              value={selectedDoctorId}
              disabled={!canViewAllData}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className={`bg-transparent border-none p-0 text-xs font-bold focus:ring-0 w-40 ${!canViewAllData ? 'text-slate-400 cursor-not-allowed' : 'text-slate-800 dark:text-white cursor-pointer'}`}
            >
              <option value="ALL">Todos los Médicos</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-border-light dark:border-border-dark flex flex-col justify-between group relative overflow-hidden h-32">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-6xl">{stat.icon}</span></div>
            <div className="flex justify-between items-start relative z-10">
               <span className={`p-2 rounded-lg bg-slate-50 dark:bg-bg-dark ${stat.color}`}><span className="material-symbols-outlined text-xl">{stat.icon}</span></span>
               <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500 uppercase">{stat.change}</span>
            </div>
            <div className="relative z-10">
               <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{stat.value}</h3>
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN CONTENT GRID (NATURAL HEIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COL 1: CHART & APPOINTMENTS (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Chart Area */}
            <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-border-light dark:border-border-dark flex flex-col h-[280px]">
                <div className="flex justify-between items-center mb-2 shrink-0">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Actividad Semanal</h3>
                </div>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorCitas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={5} />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} itemStyle={{fontWeight: 'bold', color: '#3b82f6'}} />
                        <Area type="monotone" dataKey="citas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCitas)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Upcoming Appointments List (Today + Tomorrow Split) */}
            <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-border-light dark:border-border-dark flex flex-col min-h-[350px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <span className="size-2 bg-success rounded-full animate-pulse"></span> Próximas 48 Horas
                    </h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4 flex-1 h-0">
                    {/* COLUMN 1: TODAY */}
                    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-bg-dark/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">HOY</span>
                            <span className="text-[10px] font-bold text-slate-400">{formatDateNice(new Date())}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                            {todayApts.length > 0 ? todayApts.map(apt => (
                                <div key={apt.id} onClick={() => setSelectedApt(apt)} className="bg-white dark:bg-surface-dark p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-black text-slate-800 dark:text-white group-hover:text-primary transition-colors">{apt.time}</span>
                                        <span className={`size-2 rounded-full ${apt.status === 'Confirmed' ? 'bg-success' : 'bg-warning'}`}></span>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-1 truncate">{apt.patientName}</p>
                                    <p className="text-[9px] text-slate-400 truncate">{apt.treatment}</p>
                                </div>
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 opacity-60">
                                    <span className="material-symbols-outlined text-2xl">event_available</span>
                                    <p className="text-[9px] font-bold uppercase">Sin Citas Hoy</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUMN 2: TOMORROW */}
                    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-bg-dark/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">MAÑANA</span>
                            <span className="text-[10px] font-bold text-slate-400">{formatDateNice(tomorrowObj)}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                            {tomorrowApts.length > 0 ? tomorrowApts.map(apt => (
                                <div key={apt.id} onClick={() => setSelectedApt(apt)} className="bg-white dark:bg-surface-dark p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-black text-slate-800 dark:text-white group-hover:text-primary transition-colors">{apt.time}</span>
                                        <span className={`size-2 rounded-full ${apt.status === 'Confirmed' ? 'bg-success' : 'bg-warning'}`}></span>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-1 truncate">{apt.patientName}</p>
                                    <p className="text-[9px] text-slate-400 truncate">{apt.treatment}</p>
                                </div>
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 opacity-60">
                                    <span className="material-symbols-outlined text-2xl">event_upcoming</span>
                                    <p className="text-[9px] font-bold uppercase">Sin Citas Mañana</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* COL 2: TASKS (1/3 width) - Drag & Drop Enabled */}
        <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-border-light dark:border-border-dark flex flex-col">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Tareas Pendientes</h3>
              <button onClick={() => {
                  setEditingTask({ id: Math.random().toString(), title: '', description: '', content: '', priority: 'Medium', completed: false });
                  setIsCreatingTask(true);
              }} className="size-8 rounded-lg bg-primary text-white flex items-center justify-center hover:scale-105 transition-transform shadow-md">
                  <span className="material-symbols-outlined text-lg">add</span>
              </button>
           </div>

           <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {filteredTasks.length > 0 ? filteredTasks.map((task, index) => (
                <div 
                    key={task.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => setEditingTask(task)} 
                    className="group flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-bg-dark border border-transparent hover:border-primary/30 transition-all cursor-pointer active:cursor-grabbing hover:shadow-md relative"
                >
                   {/* Drag Handle Indicator (Visible on Hover) */}
                   <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 cursor-grab">
                        <span className="material-symbols-outlined text-sm">drag_indicator</span>
                   </div>

                   <div 
                        onClick={(e) => toggleTask(task.id, e)} 
                        className={`mt-0.5 size-4 rounded border flex items-center justify-center transition-all shrink-0 ml-3 ${task.completed ? 'bg-success border-success text-white' : 'border-slate-300 hover:border-primary'}`}
                   >
                      {task.completed && <span className="material-symbols-outlined text-[10px] font-black">check</span>}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold leading-tight truncate ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>{task.title}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{task.description}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${task.priority === 'High' ? 'bg-danger/10 text-danger' : task.priority === 'Medium' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>{task.priority}</span>
                        {task.sub && <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{task.sub}</span>}
                      </div>
                   </div>
                </div>
              )) : (
                  <div className="py-10 text-center text-slate-400">
                      <span className="material-symbols-outlined text-3xl mb-2 opacity-50">task_alt</span>
                      <p className="text-xs font-bold uppercase">Sin tareas asignadas</p>
                  </div>
              )}
           </div>
        </div>
      </div>

      {/* APPOINTMENT MODAL */}
      {selectedApt && (
        <AppointmentDetailModal appointment={selectedApt} onClose={() => setSelectedApt(null)} onUpdateStatus={(id, s) => setAppointments(prev => prev.map(a => a.id === id ? {...a, status: s} : a))} patients={patients} doctors={doctors} />
      )}

      {/* TASK EDIT/CREATE MODAL */}
      {(editingTask) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[2rem] shadow-2xl border border-border-light dark:border-border-dark overflow-hidden flex flex-col">
                <header className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-bg-dark flex justify-between items-center">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {isCreatingTask ? 'Nueva Tarea' : 'Detalles de Tarea'}
                    </h3>
                    <button onClick={() => { setEditingTask(null); setIsCreatingTask(false); }} className="text-slate-400 hover:text-danger transition-colors">
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </header>
                <div className="p-8 space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Título</label>
                        <input 
                            autoFocus={isCreatingTask}
                            value={editingTask.title} 
                            onChange={e => setEditingTask({...editingTask, title: e.target.value})} 
                            className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" 
                            placeholder="Título de la tarea"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Resumen (Vista Corta)</label>
                        <input 
                            value={editingTask.description || ''} 
                            onChange={e => setEditingTask({...editingTask, description: e.target.value})} 
                            className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none" 
                            placeholder="Breve descripción para la lista"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Detalles Completos</label>
                        <textarea 
                            value={editingTask.content || ''} 
                            onChange={e => setEditingTask({...editingTask, content: e.target.value})} 
                            className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium h-32 resize-none focus:ring-2 focus:ring-primary/20 outline-none custom-scrollbar" 
                            placeholder="Descripción detallada, instrucciones, notas..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Prioridad</label>
                            <div className="flex gap-2 mt-1">
                                {['High', 'Medium', 'Low'].map(p => (
                                    <button 
                                        key={p} 
                                        onClick={() => setEditingTask({...editingTask, priority: p as any})}
                                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${editingTask.priority === p 
                                            ? (p === 'High' ? 'bg-danger text-white border-danger' : p === 'Medium' ? 'bg-warning text-white border-warning' : 'bg-success text-white border-success') 
                                            : 'bg-white dark:bg-bg-dark border-slate-200 dark:border-slate-700 text-slate-400'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Asignado A</label>
                            <input 
                                value={editingTask.sub || ''} 
                                onChange={e => setEditingTask({...editingTask, sub: e.target.value})} 
                                className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none mt-1" 
                                placeholder="Departamento o Persona"
                            />
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-bg-dark flex gap-3">
                    {!isCreatingTask && (
                        <button onClick={() => handleDeleteTask(editingTask.id)} className="px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-danger font-bold hover:bg-danger hover:text-white transition-all">
                            <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                    )}
                    <button onClick={() => handleSaveTask(editingTask)} className="flex-1 py-3 bg-primary text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:scale-[1.02] transition-transform">
                        {isCreatingTask ? 'Crear Tarea' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
