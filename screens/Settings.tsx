
import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="p-6 md:p-10 max-w-[1000px] mx-auto space-y-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black text-white tracking-tight">Configuración del Sistema</h2>
        <p className="text-text-secondary">Administra los parámetros globales de tu clínica.</p>
      </div>

      <section className="rounded-2xl border border-border-dark bg-surface-dark overflow-hidden shadow-xl">
        <div className="p-6 border-b border-border-dark bg-[#1a2318]">
          <h4 className="text-lg font-bold text-white">Datos de la Clínica</h4>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase text-text-secondary tracking-widest">Nombre Comercial</label>
            <input
              className="w-full rounded-xl bg-background-dark border-none text-white font-medium px-4 py-3 focus:ring-1 focus:ring-primary"
              type="text"
              defaultValue="DentalSoft Clínica Integral"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase text-text-secondary tracking-widest">Teléfono de Contacto</label>
            <input
              className="w-full rounded-xl bg-background-dark border-none text-white font-medium px-4 py-3 focus:ring-1 focus:ring-primary"
              type="text"
              defaultValue="+52 55 1234 5678"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase text-text-secondary tracking-widest">Correo Electrónico</label>
            <input
              className="w-full rounded-xl bg-background-dark border-none text-white font-medium px-4 py-3 focus:ring-1 focus:ring-primary"
              type="email"
              defaultValue="contacto@dentalsoft.com"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase text-text-secondary tracking-widest">Zona Horaria</label>
            <select className="w-full rounded-xl bg-background-dark border-none text-white font-medium px-4 py-3 focus:ring-1 focus:ring-primary appearance-none">
               <option>Madrid (GMT+1)</option>
               <option>Mexico City (GMT-6)</option>
               <option>New York (GMT-5)</option>
            </select>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-4">
        <button className="px-8 py-3 rounded-full border border-border-dark text-white font-bold hover:bg-border-dark transition-all">Cancelar</button>
        <button className="px-8 py-3 rounded-full bg-primary text-background-dark font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-transform">Guardar Cambios</button>
      </div>
    </div>
  );
};

export default Settings;
