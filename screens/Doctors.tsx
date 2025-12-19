
import React from 'react';
import { Doctor } from '../types';

const Doctors: React.FC = () => {
  const doctors: Doctor[] = [
    { name: "Dr. Juan Pérez", specialty: "Odontología", status: "Active", img: "https://picsum.photos/200/200?random=20" },
    { name: "Dra. Ana García", specialty: "Ortodoncia", status: "Active", img: "https://picsum.photos/200/200?random=21" },
    { name: "Dr. Luis Rodríguez", specialty: "Cirugía Maxilofacial", status: "Vacation", img: "https://picsum.photos/200/200?random=22" },
    { name: "Dra. Sarah Jenkins", specialty: "Endodoncia", status: "Active", img: "https://picsum.photos/200/200?random=23" },
  ];

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-3xl font-black tracking-tight">Nuestros Médicos</h2>
        <button className="px-6 py-2.5 rounded-full bg-primary text-background-dark font-bold hover:bg-primary-dark transition-all">Registrar Médico</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {doctors.map((doc, i) => (
          <div key={i} className="bg-surface-dark rounded-2xl border border-border-dark p-6 flex flex-col gap-4 shadow-xl group hover:border-primary/50 transition-all relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-cover bg-center border-2 border-border-dark group-hover:border-primary/30 transition-all" style={{ backgroundImage: `url("${doc.img}")` }}></div>
              <div>
                <h3 className="text-white font-bold text-lg group-hover:text-primary transition-colors">{doc.name}</h3>
                <p className="text-primary text-xs font-bold uppercase tracking-widest">{doc.specialty}</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black mt-2 uppercase ${
                  doc.status === 'Active' ? 'bg-primary/10 text-primary' : 'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {doc.status === 'Active' ? 'Activo' : 'En Vacaciones'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border-dark">
              <button className="flex items-center justify-center gap-2 h-9 rounded-full bg-background-dark border border-border-dark text-white text-xs font-bold hover:bg-border-dark transition-colors">Perfil</button>
              <button className="flex items-center justify-center gap-2 h-9 rounded-full bg-primary text-background-dark text-xs font-bold hover:bg-primary-dark transition-colors">Horarios</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Doctors;
