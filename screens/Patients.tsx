
import React from 'react';
import { Patient } from '../types';

const Patients: React.FC = () => {
  const patients: Patient[] = [
    { id: '#48291', name: "Ana Martínez", age: "28 años", img: "https://picsum.photos/200/200?random=10", phone: "+34 600 000 100" },
    { id: '#48292', name: "Carlos Ruiz", age: "42 años", img: "https://picsum.photos/200/200?random=11", phone: "+34 600 000 200" },
    { id: '#48293', name: "Elena Gómez", age: "35 años", img: "https://picsum.photos/200/200?random=12", phone: "+34 600 000 300" },
    { id: '#48294', name: "Luis Fernandez", age: "50 años", img: "https://picsum.photos/200/200?random=13", phone: "+34 600 000 400" },
    { id: '#48295', name: "Sofia Vega", age: "22 años", img: "https://picsum.photos/200/200?random=14", phone: "+34 600 000 500" },
    { id: '#48296', name: "Miguel Angel", age: "45 años", img: "https://picsum.photos/200/200?random=15", phone: "+34 600 000 600" },
  ];

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Pacientes</h1>
        <button className="h-11 px-5 flex items-center gap-2 bg-primary text-background-dark rounded-full font-bold text-sm hover:bg-primary-dark transition-all">
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span>Nuevo Paciente</span>
        </button>
      </div>

      <div className="relative w-full md:max-w-[400px]">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary material-symbols-outlined">search</span>
        <input
          type="text"
          placeholder="Buscar por nombre, ID o teléfono..."
          className="w-full h-12 pl-12 pr-4 rounded-xl bg-surface-dark border border-border-dark text-white placeholder-text-secondary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {patients.map((p, i) => (
          <div key={i} className="group relative bg-surface-dark hover:bg-surface-dark-hover border border-border-dark rounded-2xl p-6 cursor-pointer transition-all duration-300">
            <div className="flex items-center gap-5 mb-4">
              <div className="size-16 rounded-full bg-cover bg-center border-2 border-transparent group-hover:border-primary/50 transition-all" style={{ backgroundImage: `url("${p.img}")` }}></div>
              <div>
                <h3 className="text-white font-bold text-xl leading-tight group-hover:text-primary transition-colors">{p.name}</h3>
                <p className="text-text-secondary text-sm">ID: {p.id} • {p.age}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4 border-t border-border-dark">
              <div className="flex items-center gap-3 text-sm text-text-secondary">
                <span className="material-symbols-outlined text-[18px] text-primary">phone</span>
                <span>{p.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-text-secondary">
                <span className="material-symbols-outlined text-[18px] text-primary">history</span>
                <span>Última visita: Hace 2 semanas</span>
              </div>
            </div>
            <div className="mt-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="flex-1 bg-border-dark text-white py-2 rounded-lg font-bold text-xs hover:bg-surface-dark-hover">Expediente</button>
              <button className="flex-1 bg-primary text-background-dark py-2 rounded-lg font-bold text-xs hover:bg-primary-dark">Nueva Cita</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Patients;
