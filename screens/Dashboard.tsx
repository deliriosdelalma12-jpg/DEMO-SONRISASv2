
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointment, Task, AppointmentStatus, User, Patient, Doctor } from '../types';
import AppointmentDetailModal from '../components/AppointmentDetailModal';

interface DashboardProps {
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  patients: Patient[];
  doctors: Doctor[];
}

const Dashboard: React.FC<DashboardProps> = ({ appointments, setAppointments, tasks, setTasks, patients, doctors }) => {
  const navigate = useNavigate();
  const [newTaskText, setNewTaskText] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Mock Team for delegation
  const team: User[] = [
    { id: '1', name: 'Dr. Carlos Vega', role: 'Admin' },
    { id: '2', name: 'Miguel Rodriguez', role: 'Recepción' },
    { id: '3', name: 'Dra. Sarah Jenkins', role: 'Doctor' },
    { id: '4', name: 'Ana Lucia Torres', role: 'Enfermería' },
  ];

  // Current User (simulated)
  const currentUser: User = team[0]; // Admin for testing

  const stats = [
    { icon: 'event_available', label: 'Citas de hoy', value: '24', change: '+2%', color: 'text-success' },
    { icon: 'person_add', label: 'Pacientes nuevos', value: '12', change: '+12%', color: 'text-success' },
    { icon: 'payments', label: 'Ingresos del mes', value: '$42.5k', change: '+5%', color: 'text-success' },
    { icon: 'timer', label: 'Tiempo prom.', value: '24m', change: '0%', color: 'text-slate-400' },
  ];

  const toggleTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: Math.random().toString(),
      text: newTaskText,
      sub: 'Añadido ahora',
      completed: false,
      priority: 'Medium',
      assigneeId: currentUser.id,
      assigneeName: currentUser.name
    };
    setTasks([newTask, ...tasks]);
    setNewTaskText('');
    setIsAddingTask(false);
  };

  const updateTaskDetails = (id: string, text: string, assigneeId: string) => {
    const assignee = team.find(u => u.id === assigneeId);
    setTasks(prev => prev.map(t => t.id === id ? { 
      ...t, 
      text, 
      assigneeId, 
      assigneeName: assignee?.name || 'Unassigned' 
    } : t));
    setSelectedTask(null);
  };

  const deleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateAptStatus = (id: string, status: AppointmentStatus, newDate?: string, newTime?: string, doctorId?: string, doctorName?: string) => {
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

    // 1. Mark original as cancelled
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'Cancelled' } : a));
    setSelectedApt(null);

    // 2. Handle replacement
    if (replacement === 'NEW') {
      alert('Funcionalidad de reemplazo iniciada para nuevo paciente. Navega a la Agenda para completar.');
    } else if (replacement) {
      const newApt: Appointment = {
        id: Math.random().toString(36).substr(2, 9),
        patientId: replacement.id,
        patientName: replacement.name,
        doctorName: original.doctorName,
        doctorId: original.doctorId,
        date: original.date,
        time: original.time,
        treatment: 'Consulta General (Reemplazo)',
        status: 'Confirmed'
      };
      setAppointments(prev => [...prev, newApt]);
    }
  };

  const getStatusLabel = (status: AppointmentStatus) => {
    switch (status) {
      case 'Confirmed': return 'Confirmada';
      case 'Rescheduled': return 'Reagendada';
      case 'Cancelled': return 'Cancelada';
      case 'Pending': return 'Pendiente';
      case 'Completed': return 'Atendido';
      default: return status;
    }
  };

  const getStatusClass = (status: AppointmentStatus) => {
    switch (status) {
      case 'Confirmed': return 'bg-success text-white';
      case 'Cancelled': return 'bg-danger text-white';
      case 'Rescheduled': return 'bg-warning text-white';
      case 'Completed': return 'bg-primary text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  return (
    <div className="p-10 max-w-[1600px] mx-auto w-full space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-slate-900 dark:text-white">Buenos días, {currentUser.name}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Resumen de actividad para hoy, 24 de Octubre.</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-surface-dark rounded-2xl p-4 border border-border-light dark:border-border-dark shadow-sm">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">calendar_today</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fecha Actual</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">24 Octubre, 2023</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-surface-dark p-6 rounded-3xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-7xl">{stat.icon}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">{stat.label}</p>
            <div className="flex items-baseline gap-3 mt-2">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
              <span className={`text-xs font-black ${stat.color} bg-bg-light dark:bg-bg-dark px-2.5 py-1 rounded-full`}>{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Próximas Citas</h2>
            <button 
              onClick={() => navigate('/agenda')}
              className="text-sm font-bold text-primary hover:underline flex items-center gap-1 group"
            >
              Ver todas 
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
          <div className="overflow-hidden rounded-3xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-bg-light dark:bg-slate-900/50 border-b border-border-light dark:border-border-dark">
                  <tr>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Paciente</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Hora</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Tratamiento</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {appointments.slice(0, 5).map((apt) => (
                    <tr 
                      key={apt.id} 
                      onClick={() => setSelectedApt(apt)}
                      className="group hover:bg-bg-light dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {apt.patientName[0]}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{apt.patientName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-300">{apt.time}</td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase border border-primary/10">{apt.treatment}</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm ${getStatusClass(apt.status)}`}>
                          {getStatusLabel(apt.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-dark rounded-3xl border border-border-light dark:border-border-dark shadow-xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">Tareas Urgentes</h3>
              <button 
                onClick={() => setIsAddingTask(!isAddingTask)}
                className={`p-2 rounded-xl transition-all shadow-md ${isAddingTask ? 'bg-danger text-white rotate-45' : 'bg-primary text-white hover:brightness-110'}`}
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>

            {isAddingTask && (
              <form onSubmit={addTask} className="mb-6 animate-in slide-in-from-top-4 duration-200">
                <input 
                  autoFocus
                  value={newTaskText}
                  onChange={e => setNewTaskText(e.target.value)}
                  placeholder="¿Qué hay que hacer?"
                  className="w-full bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary mb-3"
                />
                <button type="submit" className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl hover:brightness-110 transition-all shadow-lg shadow-primary/20">Añadir Tarea</button>
              </form>
            )}

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {tasks.length === 0 && <p className="text-center text-slate-400 py-10 italic">No hay tareas pendientes.</p>}
              {tasks.map((task) => (
                <div 
                  key={task.id} 
                  onClick={() => setSelectedTask(task)}
                  className="group flex items-start gap-4 p-5 rounded-2xl bg-bg-light dark:bg-bg-dark border border-transparent hover:border-primary/30 transition-all cursor-pointer shadow-sm hover:shadow-md"
                >
                  <button 
                    onClick={(e) => toggleTask(task.id, e)}
                    className={`mt-1 size-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      task.completed ? 'bg-success border-success text-white scale-110 shadow-sm' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {task.completed && <span className="material-symbols-outlined text-[16px] font-bold">check</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate transition-all ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{task.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-slate-400 font-medium">Asignado a: {task.assigneeName || currentUser.name}</p>
                      <span className="size-1 bg-slate-300 rounded-full"></span>
                      <p className="text-[10px] text-slate-400 font-medium">{task.sub}</p>
                    </div>
                  </div>
                  <button onClick={(e) => deleteTask(task.id, e)} className="opacity-0 group-hover:opacity-100 p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-all">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Task Edit / Delegation Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 modal-backdrop">
          <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-border-light dark:border-border-dark animate-in zoom-in duration-200">
            <div className="p-8 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">Gestionar Tarea</h3>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Descripción</label>
                  <textarea 
                    value={selectedTask.text}
                    onChange={(e) => setSelectedTask({...selectedTask, text: e.target.value})}
                    className="w-full bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary min-h-[100px]"
                  />
                </div>
                
                {/* Admin delegation section */}
                {currentUser.role === 'Admin' && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Derivar / Asignar a</label>
                    <select 
                      value={selectedTask.assigneeId || ''}
                      onChange={(e) => setSelectedTask({...selectedTask, assigneeId: e.target.value})}
                      className="w-full bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Seleccionar miembro...</option>
                      {team.map(member => (
                        <option key={member.id} value={member.id}>{member.name} ({member.role})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => { toggleTask(selectedTask.id, {stopPropagation: () => {}} as any); setSelectedTask(null); }}
                  className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
                    selectedTask.completed ? 'bg-slate-100 text-slate-500' : 'bg-success text-white'
                  }`}
                >
                  {selectedTask.completed ? 'Abrir Tarea' : 'Completar'}
                </button>
                <button 
                  onClick={() => updateTaskDetails(selectedTask.id, selectedTask.text, selectedTask.assigneeId || '')}
                  className="flex-1 py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedApt && (
        <AppointmentDetailModal 
          appointment={selectedApt}
          onClose={() => setSelectedApt(null)}
          onUpdateStatus={handleUpdateAptStatus}
          onCancelWithReplacement={handleCancelWithReplacement}
          patients={patients}
          doctors={doctors}
        />
      )}
    </div>
  );
};

export default Dashboard;
