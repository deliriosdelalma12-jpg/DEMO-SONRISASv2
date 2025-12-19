
import React from 'react';

const Users: React.FC = () => {
  const users = [
    { n: "Dra. Sarah Jenkins", r: "Doctor", s: "Activo", last: "Hace 5 min" },
    { n: "Miguel Rodriguez", r: "Recepción", s: "Offline", last: "Ayer" },
    { n: "Juan Ramirez", r: "Admin", s: "Activo", last: "Ahora" },
    { n: "Ana Lucia Torres", r: "Enfermería", s: "Activo", last: "Hace 1 hora" },
  ];

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-[1200px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-white tracking-tight">Administración de Usuarios</h1>
        <button className="rounded-full h-11 px-8 bg-primary text-background-dark text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all">Nuevo Usuario</button>
      </div>

      <div className="bg-surface-dark border border-border-dark rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-[#131811]/50 border-b border-border-dark">
            <tr>
              <th className="p-5 text-xs font-black text-text-secondary uppercase tracking-widest">Usuario</th>
              <th className="p-5 text-xs font-black text-text-secondary uppercase tracking-widest">Rol</th>
              <th className="p-5 text-xs font-black text-text-secondary uppercase tracking-widest">Estado</th>
              <th className="p-5 text-xs font-black text-text-secondary uppercase tracking-widest text-right">Última Actividad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dark">
            {users.map((u, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors group">
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-border-dark flex items-center justify-center text-primary font-black text-xs">
                      {u.n.split(' ').map(name => name[0]).join('')}
                    </div>
                    <span className="font-bold text-white text-sm">{u.n}</span>
                  </div>
                </td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    u.r === 'Admin' ? 'bg-purple-900/30 text-purple-300' :
                    u.r === 'Doctor' ? 'bg-blue-900/30 text-blue-300' :
                    'bg-slate-900/30 text-slate-300'
                  }`}>
                    {u.r}
                  </span>
                </td>
                <td className="p-5">
                  <div className="flex items-center gap-2">
                    <div className={`size-1.5 rounded-full ${u.s === 'Activo' ? 'bg-primary' : 'bg-gray-600'}`}></div>
                    <span className={`text-xs font-bold ${u.s === 'Activo' ? 'text-primary' : 'text-text-secondary'}`}>{u.s}</span>
                  </div>
                </td>
                <td className="p-5 text-right text-xs text-text-secondary">{u.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
