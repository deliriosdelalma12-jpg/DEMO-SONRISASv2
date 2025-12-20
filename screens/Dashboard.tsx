
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
  currentUser?: User; // Pass current user for permission checks
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
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'High'|'Medium'|'Low'>('Medium');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  
  // PERMISSIONS CHECK
  const userRole = settings.roles.find(r => r.id === currentUser?.role);
  const canViewAllData = userRole?.permissions.includes('view_all_data');
  
  // If user cannot view all data, force selection to themselves (if they are a doctor)
  const isDoctor = doctors.find(d => d.id === currentUser?.id);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('ALL');

  useEffect(() => {
    if (!canViewAllData && isDoctor) {
      setSelectedDoctorId(isDoctor.id);
    } else if (!canViewAllData && !isDoctor) {
        // If not a doctor and can't view all data, theoretically shouldn't happen or see empty
        // keeping ALL for now but list will be filtered potentially if we wanted strict ownership
    }
  }, [canViewAllData, isDoctor]);

  // Drag and Drop refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // --- DATA FILTERING ---
  const filteredAppointments = useMemo(() => {
    return selectedDoctorId === 'ALL' 
      ? appointments 
      : appointments.filter(a => a.doctorId === selectedDoctorId);
  }, [appointments, selectedDoctorId]);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const todayApts = filteredAppointments.filter(a => a.date === todayStr);
  const tomorrowApts = filteredAppointments.filter(a => a.date === tomorrowStr);
  
  const monthApts = filteredAppointments.filter(a => a.date.startsWith(todayStr.substring(0, 7)));
  
  const monthRevenue = monthApts
    .filter(a => a.status === 'Completed')
    .reduce((acc, curr) => acc + (treatmentPrices[curr.treatment] || 50), 0);

  // Stats calculation
  const stats = [
    { icon: 'event_available', label: 'Citas Hoy', value: todayApts.length.toString(), change: 'Activas', color: 'text-success' },
    { icon: 'event_upcoming', label: 'Citas Mañana', value: tomorrowApts.length.toString(), change: 'Previsto', color: 'text-primary' },
    { icon: 'payments', label: 'Ingresos Mes', value: `${settings.currency}${(monthRevenue / 1000).toFixed(1)}k`, change: 'Estimado', color: 'text-success' },
    { icon: 'groups', label: 'Pacientes', value: selectedDoctorId === 'ALL' ? patients.length.toString() : new Set(filteredAppointments.map(a => a.patientId)).size.toString(), change: 'Cartera', color: 'text-blue-400' },
  ];

  // Chart Data: Last 7 days activity for selected doctor(s)
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const count = filteredAppointments.filter(a => a.date === dStr).length;
      data.push({
        name: d.toLocaleDateString('es-ES', { weekday: 'short' }),
        citas: count
      });
    }
    return data;
  }, [filteredAppointments]);

  // --- TASK LOGIC ---
  const handleSortTasks = () => {
    const priorityMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
    const sorted = [...tasks].sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]);
    setTasks(sorted);
  };

  const handleDragStart = (e: React.DragEvent, position: number) => {
    dragItem.current = position;
  };

  const handleDragEnter = (e: React.DragEvent, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = () => {
    const copyListItems = [...tasks];
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const dragItemContent = copyListItems[dragItem.current];
      copyListItems.splice(dragItem.current, 1);
      copyListItems.splice(dragOverItem.current, 0, dragItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      setTasks(copyListItems);
    }
  };

  const toggleTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setTasks([{ 
      id: Math.random().toString(), 
      title: newTaskTitle, 
      description: newTaskDesc,
      sub: 'Ahora', 
      completed: false, 
      priority: newTaskPriority 
    }, ...tasks]);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setIsAddingTask(false);
  };

  return (
    <div className="p-10 max-w-[1600px] mx-auto w-full space-y-10 animate-in fade-in duration-500">
      
      {/* HEADER & FILTER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">{settings.labels.dashboardTitle}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium italic">
            {selectedDoctorId === 'ALL' ? 'Vista General de la Clínica' : `Panel de Control: ${doctors.find(d => d.id === selectedDoctorId)?.name}`}
          </p>
        </div>
        
        {/* Only show filter if can view all data, otherwise show locked indicator */}
        <div className="flex items-center gap-4 bg-white dark:bg-surface-dark p-2 rounded-2xl shadow-sm border border-border-light dark:border-border-dark">
          <div className="px-4 py-2 bg-slate-100 dark:bg-bg-dark rounded-xl">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
              {canViewAllData ? 'Filtrar por Médico' : 'Vista Restringida'}
            </p>
            <select 
              value={selectedDoctorId}
              disabled={!canViewAllData}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className={`bg-transparent border-none p-0 text-sm font-bold focus:ring-0 w-48 ${!canViewAllData ? 'text-slate-400 cursor-not-allowed' : 'text-slate-800 dark:text-white cursor-pointer'}`}
            >
              <option value="ALL">Todos los Médicos</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className={`size-10 rounded-xl flex items-center justify-center ${canViewAllData ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
            <span className="material-symbols-outlined">{canViewAllData ? 'filter_list' : 'lock'}</span>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] border-2 border-border-light dark:border-border-dark shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-8xl">{stat.icon}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
            <div className="flex items-baseline gap-3 mt-3">
              <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stat.value}</h3>
              <span className={`text-xs font-black ${stat.color} bg-slate-50 dark:bg-bg-dark px-3 py-1 rounded-full border border-current/20`}>{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        
        {/* LEFT COLUMN: Charts & Appointment Split */}
        <div className="xl:col-span-2 space-y-10">
          
          {/* Chart Section */}
          <div className="bg-white dark:bg-surface-dark p-8 rounded-[3rem] border border-border-light dark:border-border-dark shadow-lg">
             <div className="flex items-center justify-between mb-6 px-4">
                <h3 className="text-xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Rendimiento Semanal</h3>
                <div className="flex gap-2">
                   <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase">Citas Atendidas</span>
                </div>
             </div>
             <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCitas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} 
                      itemStyle={{fontWeight: 'bold', color: '#3b82f6'}}
                    />
                    <Area type="monotone" dataKey="citas" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorCitas)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* SPLIT APPOINTMENTS: Today & Tomorrow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Today */}
            <div className="space-y-4">
               <div className="flex items-center justify-between px-2">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <span className="size-2 rounded-full bg-success animate-pulse"></span> Hoy
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">{todayStr}</span>
               </div>
               <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark p-2 shadow-lg min-h-[300px]">
                  {todayApts.length > 0 ? todayApts.map(apt => (
                    <div key={apt.id} onClick={() => setSelectedApt(apt)} className="group flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-bg-dark rounded-[2rem] cursor-pointer transition-all border-b border-dashed border-slate-100 dark:border-slate-800 last:border-0">
                       <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0 shadow-sm">{apt.time}</div>
                       <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{apt.patientName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{apt.treatment}</p>
                       </div>
                       <div className={`size-3 rounded-full ${apt.status === 'Completed' ? 'bg-success' : apt.status === 'Confirmed' ? 'bg-primary' : 'bg-slate-300'}`}></div>
                    </div>
                  )) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                       <span className="material-symbols-outlined text-4xl">event_available</span>
                       <p className="text-xs font-bold uppercase">Sin citas hoy</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Tomorrow */}
            <div className="space-y-4">
               <div className="flex items-center justify-between px-2">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-400"></span> Mañana
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">{tomorrowStr}</span>
               </div>
               <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark p-2 shadow-lg min-h-[300px]">
                  {tomorrowApts.length > 0 ? tomorrowApts.map(apt => (
                    <div key={apt.id} onClick={() => setSelectedApt(apt)} className="group flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-bg-dark rounded-[2rem] cursor-pointer transition-all border-b border-dashed border-slate-100 dark:border-slate-800 last:border-0">
                       <div className="size-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">{apt.time}</div>
                       <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{apt.patientName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{apt.treatment}</p>
                       </div>
                    </div>
                  )) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                       <span className="material-symbols-outlined text-4xl">event_upcoming</span>
                       <p className="text-xs font-bold uppercase">Sin citas mañana</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Advanced Task List */}
        <div className="bg-white dark:bg-surface-dark p-8 rounded-[3rem] border-2 border-border-light dark:border-border-dark shadow-xl flex flex-col h-full">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Tareas</h3>
              <div className="flex gap-2">
                <button onClick={handleSortTasks} className="size-10 rounded-xl bg-slate-100 dark:bg-bg-dark text-slate-500 hover:text-primary transition-colors flex items-center justify-center" title="Ordenar por Prioridad">
                   <span className="material-symbols-outlined">sort</span>
                </button>
                <button onClick={() => setIsAddingTask(!isAddingTask)} className={`size-10 rounded-xl flex items-center justify-center transition-all shadow-lg ${isAddingTask ? 'bg-danger text-white rotate-45' : 'bg-primary text-white shadow-primary/30'}`}>
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
           </div>

           {isAddingTask && (
             <form onSubmit={addTask} className="mb-6 p-6 bg-slate-50 dark:bg-bg-dark rounded-[2rem] border border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-4 space-y-4 shadow-inner">
                <div>
                  <input autoFocus value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Título de la tarea" className="w-full bg-white dark:bg-surface-dark border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none mb-2" />
                  <textarea 
                    value={newTaskDesc} 
                    onChange={e => setNewTaskDesc(e.target.value.slice(0, 100))} 
                    placeholder="Descripción breve (max 100 car.)" 
                    className="w-full bg-white dark:bg-surface-dark border-none rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none h-20 resize-none" 
                  />
                  <div className="text-[10px] text-right text-slate-400 mt-1">{newTaskDesc.length}/100</div>
                </div>
                <div className="flex justify-between items-center">
                   <div className="flex gap-2">
                      {['High', 'Medium', 'Low'].map((p) => (
                        <button key={p} type="button" onClick={() => setNewTaskPriority(p as any)} className={`size-8 rounded-full text-[10px] font-black uppercase flex items-center justify-center border-2 transition-all ${newTaskPriority === p ? (p === 'High' ? 'border-danger bg-danger text-white' : p === 'Medium' ? 'border-warning bg-warning text-white' : 'border-success bg-success text-white') : 'border-slate-200 text-slate-400'}`}>
                           {p[0]}
                        </button>
                      ))}
                   </div>
                   <button type="submit" className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20">Crear</button>
                </div>
             </form>
           )}

           <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {tasks.map((task, index) => (
                <div 
                  key={task.id} 
                  draggable 
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="group flex items-start gap-3 p-5 rounded-[2rem] bg-slate-50 dark:bg-bg-dark border border-transparent hover:border-primary/20 hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative"
                >
                   <div className="mt-1 text-slate-300 group-hover:text-primary cursor-grab">
                      <span className="material-symbols-outlined text-lg">drag_indicator</span>
                   </div>
                   
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                         <p className={`text-sm font-black leading-tight ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>{task.title || task['text']}</p>
                         <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${task.priority === 'High' ? 'bg-danger/10 text-danger' : task.priority === 'Medium' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>{task.priority}</span>
                      </div>
                      {task.description && (
                        <p className={`text-xs font-medium mt-1.5 line-clamp-2 ${task.completed ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                          {task.description}
                        </p>
                      )}
                   </div>

                   <button onClick={(e) => toggleTask(task.id, e)} className={`mt-0.5 size-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${task.completed ? 'bg-success border-success text-white' : 'border-slate-300 hover:border-primary'}`}>
                      {task.completed && <span className="material-symbols-outlined text-sm font-black">check</span>}
                   </button>
                </div>
              ))}
           </div>
        </div>
      </div>

      {selectedApt && (
        <AppointmentDetailModal appointment={selectedApt} onClose={() => setSelectedApt(null)} onUpdateStatus={(id, s) => setAppointments(prev => prev.map(a => a.id === id ? {...a, status: s} : a))} patients={patients} doctors={doctors} />
      )}
    </div>
  );
};

export default Dashboard;
