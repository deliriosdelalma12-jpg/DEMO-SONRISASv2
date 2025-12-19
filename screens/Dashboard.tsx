
import React from 'react';
import { Appointment } from '../types';

const Dashboard: React.FC = () => {
  const stats = [
    { icon: 'event_available', label: 'Citas de hoy', value: '24', change: '+2%', color: 'text-primary' },
    { icon: 'person_add', label: 'Pacientes nuevos', value: '12', change: '+12%', color: 'text-primary' },
    { icon: 'payments', label: 'Ingresos del mes', value: '$42.5k', change: '+5%', color: 'text-primary' },
    { icon: 'timer', label: 'Tiempo prom.', value: '24m', change: '0%', color: 'text-gray-400' },
  ];

  const appointments: Appointment[] = [
    { id: 'PT-4920', patientName: 'Juan Pérez', patientId: '#48291', doctorName: 'Dr. Smith', time: '09:00 AM', treatment: 'Limpieza', status: 'Confirmed' },
    { id: 'PT-4922', patientName: 'Maria Garcia', patientId: '#48293', doctorName: 'Dra. Lopez', time: '10:30 AM', treatment: 'Consulta', status: 'Pending', avatar: 'https://picsum.photos/40/40?random=2' },
  ];

  return (
    <div className="p-6 md:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Buenos días, Dr. Vega</h1>
          <p className="text-text-secondary mt-2 text-base">Aquí está el resumen de tu agenda hoy.</p>
        </div>
        <div className="flex items-center bg-surface-dark rounded-full px-4 py-2 border border-border-dark shadow-sm">
          <span className="material-symbols-outlined text-primary mr-2 text-[20px]">calendar_today</span>
          <span className="text-sm font-medium text-white">Octubre 24, 2023</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-surface-dark p-6 rounded-2xl border border-border-dark shadow-sm hover:shadow-md hover:border-primary/20 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-white">{stat.icon}</span>
            </div>
            <div className="flex flex-col gap-1 relative z-10">
              <p className="text-text-secondary text-sm font-medium">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
                <span className={`inline-flex items-center text-xs font-bold ${stat.color === 'text-primary' ? 'text-primary bg-primary/10' : 'text-gray-400 bg-white/5'} px-2 py-0.5 rounded-full`}>
                  {stat.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Próximas Citas</h2>
            <button className="text-sm text-primary font-bold hover:underline">Ver todas</button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border-dark bg-surface-dark shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1a2418] border-b border-border-dark">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Paciente</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Doctor</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Hora</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Tratamiento</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark">
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="group hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {apt.avatar ? (
                            <img src={apt.avatar} className="size-8 rounded-full border border-border-dark" alt="" />
                          ) : (
                            <div className="size-8 rounded-full bg-blue-900 text-blue-200 flex items-center justify-center text-xs font-bold">
                              {apt.patientName.split(' ').map(n => n[0]).join('')}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-white">{apt.patientName}</p>
                            <p className="text-xs text-text-secondary">{apt.patientId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{apt.doctorName}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-bold text-white">{apt.time}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          apt.treatment === 'Limpieza' ? 'bg-purple-900/30 text-purple-300' : 'bg-blue-900/30 text-blue-300'
                        }`}>
                          {apt.treatment}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className={`size-1.5 rounded-full ${apt.status === 'Confirmed' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                          <span className={`text-sm font-medium ${apt.status === 'Confirmed' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {apt.status === 'Confirmed' ? 'Confirmada' : 'En sala'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-surface-dark rounded-2xl border border-border-dark shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Tareas Urgentes</h3>
              <button className="text-primary hover:bg-primary/10 p-1 rounded-md transition-colors">
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { icon: 'lab_profile', text: 'Revisar laboratorio #402', sub: 'Pendiente desde ayer', color: 'orange' },
                { icon: 'call', text: 'Llamar a seguro médico', sub: 'Autorización Paciente Luis G.', color: 'blue' },
                { icon: 'inventory_2', text: 'Stock de anestesia bajo', sub: 'Hacer pedido mensual', color: 'purple' }
              ].map((task, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background-dark/50 border border-transparent hover:border-primary/30 transition-colors cursor-pointer group">
                  <div className={`mt-0.5 p-1.5 rounded-lg ${
                    task.color === 'orange' ? 'text-orange-500 bg-orange-900/20' :
                    task.color === 'blue' ? 'text-blue-500 bg-blue-900/20' :
                    'text-purple-500 bg-purple-900/20'
                  }`}>
                    <span className="material-symbols-outlined text-[18px] block">{task.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{task.text}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{task.sub}</p>
                  </div>
                  <input className="rounded border-border-dark text-primary focus:ring-primary bg-transparent" type="checkbox" />
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
