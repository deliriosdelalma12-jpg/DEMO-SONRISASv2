
import React from 'react';

const Services: React.FC = () => {
  const services = [
    { n: "Limpieza Dental Profunda", c: "Odontología", p: "$60.00", icon: "cleaning_services" },
    { n: "Consulta General", c: "Medicina Gral.", p: "$45.00", icon: "stethoscope" },
    { n: "Sesión Fisioterapia", c: "Rehabilitación", p: "$55.00", icon: "rehabilitation" },
    { n: "Blanqueamiento Zoom", c: "Odontología", p: "$250.00", icon: "flare" },
    { n: "Extracción Simple", c: "Cirugía", p: "$80.00", icon: "medical_services" },
    { n: "Rayos X Panorámicos", c: "Radiología", p: "$40.00", icon: "radiology" },
  ];

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-[1200px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-3xl font-black tracking-tight">Catálogo de Servicios</h2>
        <button className="bg-surface-dark border border-border-dark text-white px-6 py-2.5 rounded-full font-bold hover:border-primary transition-all">Editar Catálogo</button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border-dark bg-surface-dark shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-dark bg-[#1a2318]">
              <th className="p-5 text-xs font-bold uppercase tracking-widest text-text-secondary">Servicio</th>
              <th className="p-5 text-xs font-bold uppercase tracking-widest text-text-secondary">Categoría</th>
              <th className="p-5 text-xs font-bold uppercase tracking-widest text-text-secondary">Precio</th>
              <th className="p-5 text-xs font-bold uppercase tracking-widest text-text-secondary text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dark">
            {services.map((s, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors group">
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">{s.icon}</span>
                    <span className="font-bold text-white text-sm">{s.n}</span>
                  </div>
                </td>
                <td className="p-5">
                  <span className="px-3 py-1 rounded-full bg-border-dark text-[10px] font-black uppercase text-text-secondary">{s.c}</span>
                </td>
                <td className="p-5">
                  <span className="font-black text-primary text-sm">{s.p}</span>
                </td>
                <td className="p-5 text-right">
                  <button className="text-text-secondary hover:text-white transition-colors">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Services;
