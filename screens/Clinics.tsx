
import React from 'react';

const Clinics: React.FC = () => {
  const branches = [
    { name: "Dental Central", loc: "Av. Reforma 222, CDMX", status: "Operativa", phone: "+52 55 1234 5678", staff: 12 },
    { name: "Cardio Norte", loc: "Calle 10, Monterrey", status: "Mantenimiento", phone: "+52 81 2233 4455", staff: 8 },
    { name: "Pediatría Sur", loc: "Av. Insurgentes 45, CDMX", status: "Operativa", phone: "+52 55 9988 7766", staff: 15 }
  ];

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-[1400px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-white tracking-tight">Sucursales</h2>
        <button className="bg-primary text-background-dark px-6 py-2.5 rounded-full font-bold shadow-lg shadow-primary/20">Añadir Sucursal</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((c, i) => (
          <div key={i} className="p-6 rounded-2xl bg-surface-dark border border-border-dark hover:border-primary/50 transition-all group flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-white">apartment</span>
            </div>
            <div className="flex justify-between items-start">
              <div className="p-3 bg-border-dark rounded-xl text-primary"><span className="material-symbols-outlined text-3xl">local_hospital</span></div>
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                c.status === 'Operativa' ? 'bg-primary/10 text-primary' : 'bg-yellow-500/10 text-yellow-500'
              }`}>{c.status}</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-xl group-hover:text-primary transition-colors">{c.name}</h3>
              <p className="text-text-secondary text-sm mt-1">{c.loc}</p>
            </div>
            <div className="pt-4 border-t border-border-dark space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Teléfono:</span>
                <span className="text-white font-medium">{c.phone}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Personal:</span>
                <span className="text-white font-medium">{c.staff} empleados</span>
              </div>
            </div>
            <button className="mt-4 w-full py-2 bg-border-dark rounded-xl text-white text-xs font-bold hover:bg-surface-dark-hover transition-colors">Administrar Sucursal</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Clinics;
