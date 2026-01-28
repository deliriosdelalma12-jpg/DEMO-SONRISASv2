
import React, { useState, useMemo, useEffect } from 'react';
import { Appointment, Task, User, Patient, Doctor, ClinicSettings } from '../types';
import AppointmentDetailModal from '../components/AppointmentDetailModal';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DataField } from '../components/shared/DataField';

interface DashboardProps {
  settings: ClinicSettings;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  patients: Patient[];
  doctors: Doctor[];
  currentUser: User; 
  systemUsers: User[];
}

const Dashboard: React.FC<DashboardProps> = ({ settings, appointments, setAppointments, tasks, setTasks, patients, doctors, currentUser, systemUsers }) => {
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('ALL');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const userRole = settings?.roles?.find(r => r.id === currentUser?.role);
  const isAdmin = userRole?.permissions.includes('view_all_data');

  useEffect(() => {
    if (!isAdmin && doctors.find(d => d.id === currentUser?.id)) {
      setSelectedDoctorId(currentUser?.id || 'ALL');
    }
  }, [isAdmin, currentUser, doctors]);

  const filteredAppointments = useMemo(() => {
    return selectedDoctorId === 'ALL' ? appointments : appointments.filter(a => a.doctorId === selectedDoctorId);
  }, [appointments, selectedDoctorId]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (!isAdmin) {
      list = tasks.filter(t => t.assignedToId === currentUser.id);
    } else if (selectedDoctorId !== 'ALL') {
      list = tasks.filter(t => t.assignedToId === selectedDoctorId);
    }
    return list;
  }, [tasks, selectedDoctorId, isAdmin, currentUser]);

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
    if (!settings?.globalSchedule) return [];
    
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
        const isDayActive = settings.globalSchedule?.[name]?.morning?.active || settings.globalSchedule?.[name]?.afternoon?.active;
        if (isDayActive) {
            const count = filteredAppointments.filter(a => a.date === checkDayStr && a.status !== 'Cancelled').length;
            data.push({ name: name.substring(0, 3), fullDate: checkDay.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), citas: count });
        }
    });
    return data;
  }, [filteredAppointments, settings?.globalSchedule]);

  const toggleTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleUpdateTask = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTask(null);
  };

  const handleDeleteTask = (id: string) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta tarea?")) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTask(null);
  };

  const handleCreateTask = (newTaskData: Partial<Task>) => {
    const task: Task = {
        id: 'T' + Date.now(),
        title: newTaskData.title || 'Nueva Tarea',
        description: newTaskData.description || '',
        completed: false,
        priority: newTaskData.priority || 'Medium',
        sub: newTaskData.sub || 'General',
        assignedToId: newTaskData.assignedToId || currentUser.id,
        createdById: currentUser.id,
        createdByName: currentUser.name
    };
    setTasks(prev => [task, ...prev]);
    setIsCreatingTask(false);
  };

  const handleDragStart = (id: string) => {
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedTaskId || draggedTaskId === targetId) return;
    setTasks(prev => {
      const newList = [...prev];
      const draggedIdx = newList.findIndex(t => t.id === draggedTaskId);
      const targetIdx = newList.findIndex(t => t.id === targetId);
      const [draggedItem] = newList.splice(draggedIdx, 1);
      newList.splice(targetIdx, 0, draggedItem);
      return newList;
    });
    setDraggedTaskId(null);
  };

  if (!settings) return null;

  return (
    <div className="w-full flex flex-col p-6 gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">{settings.labels?.dashboardTitle || 'Dashboard'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Visión Global en Tiempo Real</p>
        </div>
        <div className="bg-white dark:bg-surface-dark p-2 rounded-lg border border-border-light dark:border-border-dark flex items-center gap-3 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Supervisión:</span>
          <select value={selectedDoctorId} disabled={!isAdmin} onChange={(e) => setSelectedDoctorId(e.target.value)} className="bg-transparent border-none p-0 text-xs font-bold focus:ring-0 w-48 text-primary cursor-pointer">
              <option value="ALL">Toda la Clínica</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark h-[350px]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Ocupación Semanal</h3>
                    </div>
                </div>
                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs><linearGradient id="cDashboard" x1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                            <Tooltip cursor={{ stroke: '#3b82f6', strokeWidth: 2 }} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}} />
                            <Area type="monotone" dataKey="citas" stroke="#3b82f6" strokeWidth={4} fill="url(#cDashboard)" animationDuration={1000} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark flex flex-col min-h-[400px]">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2"><span className="size-2 bg-success rounded-full animate-pulse"></span> Próximas Citas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 h-0 overflow-hidden">
                    <div className="flex flex-col bg-slate-50/50 dark:bg-bg-dark/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">HOY</span>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {todayApts.length > 0 ? todayApts.map(apt => (
                                <div key={apt.id} onClick={() => setSelectedApt(apt)} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2"><span className="text-sm font-black text-slate-800 dark:text-white group-hover:text-primary transition-colors">{apt.time}</span><span className={`size-2 rounded-full ${apt.status === 'Confirmed' ? 'bg-success' : 'bg-warning'}`}></span></div>
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{apt.patientName}</p>
                                </div>
                            )) : <div className="flex-1 flex flex-col items-center justify-center opacity-40 italic"><span className="material-symbols-outlined text-3xl mb-2">event_available</span><p className="text-[10px] font-bold uppercase">Sin actividad</p></div>}
                        </div>
                    </div>
                    <div className="flex flex-col bg-slate-50/50 dark:bg-bg-dark/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">MAÑANA</span>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {tomorrowApts.length > 0 ? tomorrowApts.map(apt => (
                                <div key={apt.id} onClick={() => setSelectedApt(apt)} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2"><span className="text-sm font-black text-slate-800 dark:text-white group-hover:text-primary transition-colors">{apt.time}</span><span className={`size-2 rounded-full ${apt.status === 'Confirmed' ? 'bg-success' : 'bg-warning'}`}></span></div>
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{apt.patientName}</p>
                                </div>
                            )) : <div className="flex-1 flex flex-col items-center justify-center opacity-40 italic"><span className="material-symbols-outlined text-3xl mb-2">event_upcoming</span><p className="text-[10px] font-bold uppercase">Sin agenda</p></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-border-light dark:border-border-dark flex flex-col h-full shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">assignment_turned_in</span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Tareas del Equipo</h3>
              </div>
              <button onClick={() => setIsCreatingTask(true)} className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm">
                 <span className="material-symbols-outlined text-xl">add</span>
              </button>
           </div>
           
           <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2" onDragOver={handleDragOver}>
              {filteredTasks.length > 0 ? filteredTasks.map((task) => {
                const assignedDoc = systemUsers.find(u => u.id === task.assignedToId);
                const isBeingDragged = draggedTaskId === task.id;
                
                return (
                    <div 
                        key={task.id} 
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(task.id)}
                        onClick={() => setSelectedTask(task)} 
                        className={`group flex items-start gap-4 p-4 rounded-xl transition-all cursor-grab active:cursor-grabbing relative overflow-hidden border-2
                          ${isBeingDragged ? 'opacity-20 border-dashed border-primary' : 'bg-slate-50 dark:bg-bg-dark border-transparent hover:border-primary/20 hover:bg-white dark:hover:bg-slate-800/50 hover:shadow-md'}
                        `}
                    >
                        <div onClick={(e) => toggleTask(task.id, e)} className={`mt-0.5 size-5 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${task.completed ? 'bg-success border-success text-white' : 'border-slate-300 hover:border-primary bg-white'}`}>
                            {task.completed && <span className="material-symbols-outlined text-xs font-black">check</span>}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold leading-tight truncate ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>{task.title}</p>
                            <div className="flex justify-between items-center mt-3">
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${task.priority === 'High' ? 'bg-danger/10 text-danger' : task.priority === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>{task.priority}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{assignedDoc?.name?.split(' ')[0] || '---'}</span>
                            </div>
                        </div>
                    </div>
                );
              }) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-center gap-4 py-20">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Sin tareas pendientes</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailModal 
            task={selectedTask} 
            onClose={() => setSelectedTask(null)} 
            onSave={handleUpdateTask} 
            onDelete={handleDeleteTask} 
            currentUser={currentUser} 
            systemUsers={systemUsers}
            isAdmin={isAdmin}
            settings={settings}
        />
      )}

      {isCreatingTask && (
        <CreateTaskModal 
            onClose={() => setIsCreatingTask(false)} 
            onSave={handleCreateTask} 
            systemUsers={systemUsers} 
            isAdmin={isAdmin} 
            currentUser={currentUser}
        />
      )}

      {selectedApt && (
        <AppointmentDetailModal settings={settings} appointment={selectedApt} onClose={() => setSelectedApt(null)} onUpdateStatus={(id, s) => setAppointments(prev => prev.map(a => a.id === id ? {...a, status: s} : a))} patients={patients} doctors={doctors} />
      )}
    </div>
  );
};

const TaskDetailModal = ({ task, onClose, onSave, onDelete, currentUser, systemUsers, isAdmin, settings }: any) => {
    const [editData, setEditData] = useState<Task>(task);
    const canDelete = task.createdById === currentUser.id;

    return (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-surface-dark w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-border-light dark:border-border-dark flex flex-col max-h-[90vh]">
                <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Ficha de Tarea</h3>
                    <button onClick={onClose} className="size-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all"><span className="material-symbols-outlined text-2xl">close</span></button>
                </header>
                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                    <DataField label="Título de la Tarea" value={editData.title} editing={true} onChange={(v: string) => setEditData({...editData, title: v})} />
                    <div className="grid grid-cols-2 gap-6">
                        <DataField label="Prioridad" value={editData.priority} editing={true} type="select" options={[{value: 'High', label: 'Alta'}, {value: 'Medium', label: 'Media'}, {value: 'Low', label: 'Baja'}]} onChange={(v: any) => setEditData({...editData, priority: v})} />
                        <DataField label="Estado" value={editData.completed} editing={true} type="select" options={[{value: true, label: 'Completada'}, {value: false, label: 'Pendiente'}]} onChange={(v: any) => setEditData({...editData, completed: v === 'true' || v === true})} />
                    </div>
                </div>
                <footer className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    {canDelete && <button onClick={() => onDelete(task.id)} className="h-12 px-6 rounded-xl bg-rose-50 text-rose-500 font-bold uppercase text-[10px] tracking-widest hover:bg-rose-500 hover:text-white transition-all">Borrar</button>}
                    <button onClick={() => onSave(editData)} className="h-12 px-10 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest">Guardar</button>
                </footer>
            </div>
        </div>
    );
};

const CreateTaskModal = ({ onClose, onSave, systemUsers, isAdmin, currentUser }: any) => {
    const [newData, setNewData] = useState<Partial<Task>>({
        title: '', description: '', priority: 'Medium', assignedToId: currentUser.id, sub: 'General'
    });

    return (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-surface-dark w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-border-light dark:border-border-dark flex flex-col">
                <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Nueva Tarea</h3>
                    <button onClick={onClose} className="size-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all"><span className="material-symbols-outlined text-2xl">close</span></button>
                </header>
                <div className="p-8 space-y-6">
                    <DataField label="Título" value={newData.title} editing={true} onChange={(v: string) => setNewData({...newData, title: v})} required />
                    <DataField label="Prioridad" value={newData.priority} editing={true} type="select" options={[{value: 'High', label: 'Alta'}, {value: 'Medium', label: 'Media'}, {value: 'Low', label: 'Baja'}]} onChange={(v: any) => setNewData({...newData, priority: v})} />
                </div>
                <footer className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    <button onClick={() => onSave(newData)} disabled={!newData.title} className="h-12 px-10 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50">Crear Tarea</button>
                </footer>
            </div>
        </div>
    );
};

export default Dashboard;
