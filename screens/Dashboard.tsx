
import React, { useState, useMemo } from 'react';
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

const Dashboard: React.FC<DashboardProps> = ({ appointments, setAppointments, tasks, setTasks, patients, doctors }) => {
  const navigate = useNavigate();
  const [newTaskText, setNewTaskText] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Lógica Dinámica de KPIs para hoy
  const todayStr = new Date().toISOString().split('T')[0];
  const todayApts = appointments.filter(a => a.date === todayStr);
  const monthApts = appointments.filter(a => a.date.startsWith(todayStr.substring(0, 7)));
  
  const monthRevenue = monthApts
    .filter(a => a.status === 'Completed')
    .reduce((acc, curr) => acc + (treatmentPrices[curr.treatment] || 50), 0);

  const stats = [
    { icon: 'event_available', label: 'Citas de hoy', value: todayApts.length.toString(), change: '+5%', color: 'text-success' },
    { icon: 'person_add', label: 'Pacientes registrados', value: patients.length.toString(), change: 'Total', color: 'text-primary' },
    { icon: 'payments', label: 'Ingresos del mes', value: `€${(monthRevenue / 1000).toFixed(1)}k`, change: '+12%', color: 'text-success' },
    { icon: 'timer', label: 'Tiempo prom. cita', value: '28m', change: '-4m', color: 'text-blue-400' },
  ];

  // Resto del componente idéntico para mantener funcionalidad de tareas y citas...
  // (Omitido por brevedad pero asegurando que consuma las props correctamente)
  
  // Re-implementación básica de toggle y delete para que funcione
  const toggleTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks([{ id: Math.random().toString(), text: newTaskText, sub: 'Ahora', completed: false, priority: 'Medium' }, ...tasks]);
    setNewTaskText('');
    setIsAddingTask(false);
  };

  return (
    <div className="p-10 max-w-[1600px] mx-auto w-full space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Panel de Control Operativo</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium italic">Resumen de sincronización clínica para hoy.</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-surface-dark rounded-2xl p-4 border border-border-light dark:border-border-dark shadow-sm">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">calendar_today</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sincronización</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

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
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Próximas Citas (Tiempo Real)</h2>
            <button onClick={() => navigate('/agenda')} className="text-xs font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-2">Ver Agenda Completa <span className="material-symbols-outlined text-sm">arrow_forward</span></button>
          </div>
          <div className="overflow-hidden rounded-[3rem] border-2 border-border-light dark:border-border-dark bg-white dark:bg-surface-dark shadow-xl">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-border-light dark:border-border-dark">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Paciente</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Servicio</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {appointments.filter(a => new Date(a.date) >= new Date()).slice(0, 6).map((apt) => (
                  <tr key={apt.id} onClick={() => setSelectedApt(apt)} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">{apt.patientName[0]}</div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-white uppercase text-sm">{apt.patientName}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{apt.time} • Médico: {apt.doctorName.split(' ').slice(-1)[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-4 py-1.5 bg-primary/5 text-primary text-[9px] font-black rounded-xl uppercase tracking-widest border border-primary/10">{apt.treatment}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${apt.status === 'Confirmed' ? 'bg-success text-white' : 'bg-slate-400 text-white'}`}>
                        {apt.status === 'Completed' ? 'Atendido' : apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8 bg-white dark:bg-surface-dark p-10 rounded-[3rem] border-2 border-border-light dark:border-border-dark shadow-xl">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Pendientes</h3>
              <button onClick={() => setIsAddingTask(!isAddingTask)} className={`size-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${isAddingTask ? 'bg-danger text-white rotate-45' : 'bg-primary text-white shadow-primary/30'}`}>
                <span className="material-symbols-outlined">add</span>
              </button>
           </div>

           {isAddingTask && (
             <form onSubmit={addTask} className="animate-in slide-in-from-top-4 space-y-4">
                <input autoFocus value={newTaskText} onChange={e => setNewTaskText(e.target.value)} placeholder="¿Nueva tarea hoy?" className="w-full bg-slate-50 dark:bg-bg-dark border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" />
             </form>
           )}

           <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="group flex items-start gap-4 p-5 rounded-3xl bg-slate-50 dark:bg-bg-dark border border-transparent hover:border-primary/20 transition-all">
                   <button onClick={(e) => toggleTask(task.id, e)} className={`mt-1 size-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-success border-success text-white' : 'border-slate-300'}`}>
                      {task.completed && <span className="material-symbols-outlined text-xs font-black">check</span>}
                   </button>
                   <div className="flex-1">
                      <p className={`text-sm font-bold uppercase tracking-tight ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>{task.text}</p>
                      <p className="text-[9px] text-slate-400 font-black tracking-widest mt-1 uppercase">Prioridad: {task.priority}</p>
                   </div>
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
