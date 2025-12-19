
import React, { useState } from 'react';
import { Appointment, Task } from '../types';

interface DashboardProps {
  appointments: Appointment[];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const Dashboard: React.FC<DashboardProps> = ({ appointments, tasks, setTasks }) => {
  const [newTaskText, setNewTaskText] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const stats = [
    { icon: 'event_available', label: 'Citas de hoy', value: '24', change: '+2%', color: 'text-success' },
    { icon: 'person_add', label: 'Pacientes nuevos', value: '12', change: '+12%', color: 'text-success' },
    { icon: 'payments', label: 'Ingresos del mes', value: '$42.5k', change: '+5%', color: 'text-success' },
    { icon: 'timer', label: 'Tiempo prom.', value: '24m', change: '0%', color: 'text-slate-400' },
  ];

  const toggleTask = (id: string) => {
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
      priority: 'Medium'
    };
    setTasks([newTask, ...tasks]);
    setNewTaskText('');
    setIsAddingTask(false);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="p-10 max-w-[1600px] mx-auto w-full space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-slate-900 dark:text-white">Buenos días, Dr. Vega</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Resumen de actividad para hoy, 24 de Octubre.</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-surface-dark rounded-2xl p-4 border border-border-light dark:border-border-dark shadow-sm">
           <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">calendar_today</span>
           </div>
           <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fecha</p>
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
            <button className="text-sm font-bold text-primary hover:underline">Ver todas</button>
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
                    <tr key={apt.id} className="group hover:bg-bg-light dark:hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-primary">
                            {apt.patientName[0]}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">{apt.patientName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-300">{apt.time}</td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase">{apt.treatment}</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          apt.status === 'Confirmed' ? 'bg-success text-white' : 
                          apt.status === 'Cancelled' ? 'bg-danger text-white' : 
                          'bg-warning text-white'
                        }`}>{apt.status}</span>
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
                className={`p-2 rounded-xl transition-all ${isAddingTask ? 'bg-danger text-white rotate-45' : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'}`}
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
                <button type="submit" className="w-full py-3 bg-primary text-white font-bold rounded-2xl hover:brightness-110 transition-all">Añadir Tarea</button>
              </form>
            )}

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {tasks.length === 0 && <p className="text-center text-slate-400 py-10 italic">No hay tareas pendientes.</p>}
              {tasks.map((task) => (
                <div key={task.id} className="group flex items-start gap-4 p-5 rounded-2xl bg-bg-light dark:bg-bg-dark border border-transparent hover:border-primary/30 transition-all">
                  <button 
                    onClick={() => toggleTask(task.id)}
                    className={`mt-1 size-5 rounded-lg border-2 flex items-center justify-center transition-colors ${
                      task.completed ? 'bg-success border-success text-white' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {task.completed && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate transition-all ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{task.text}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{task.sub}</p>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-danger hover:bg-danger/10 rounded-lg transition-all">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
