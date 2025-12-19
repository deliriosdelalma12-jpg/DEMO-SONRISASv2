
import React from 'react';

const Agenda: React.FC = () => {
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const calendarDays = Array.from({ length: 35 }, (_, i) => i - 4); // Starting from Oct 2023

  return (
    <div className="p-4 md:p-8 lg:px-12 max-w-[1600px] mx-auto w-full flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-white text-[32px] font-bold tracking-tight">Agenda Médica</h1>
          <p className="text-text-secondary text-sm">Gestiona citas, disponibilidades y urgencias.</p>
        </div>
        <button className="flex items-center gap-2 h-10 px-6 rounded-full bg-primary text-background-dark text-sm font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Nueva Cita</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6 bg-surface-dark p-2 rounded-2xl border border-border-dark">
        <div className="flex bg-background-dark rounded-xl p-1 w-full lg:w-auto overflow-x-auto">
          <button className="px-6 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-white transition-colors">Día</button>
          <button className="px-6 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-white transition-colors">Semana</button>
          <button className="px-6 py-2 rounded-lg bg-border-dark text-white text-sm font-bold shadow-sm">Mes</button>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-full hover:bg-border-dark text-white transition-colors"><span className="material-symbols-outlined">chevron_left</span></button>
          <span className="text-white text-lg font-bold min-w-[140px] text-center">Octubre 2023</span>
          <button className="p-2 rounded-full hover:bg-border-dark text-white transition-colors"><span className="material-symbols-outlined">chevron_right</span></button>
        </div>
      </div>

      <div className="flex-1 bg-background-dark rounded-2xl border border-border-dark overflow-hidden flex flex-col shadow-xl min-h-[600px]">
        <div className="grid grid-cols-7 border-b border-border-dark bg-surface-dark">
          {days.map(d => (
            <div key={d} className="py-3 text-center text-sm font-medium text-text-secondary">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-5 flex-1 overflow-y-auto">
          {calendarDays.map((day, i) => {
            const isToday = day === 24;
            const hasEvents = [5, 12, 18, 24, 30].includes(day);
            const isCurrentMonth = day > 0 && day <= 31;
            
            return (
              <div key={i} className={`border-b border-r border-border-dark p-2 min-h-[120px] transition-colors group cursor-pointer hover:bg-surface-dark relative ${!isCurrentMonth ? 'opacity-30' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  {isCurrentMonth && (
                    <span className={`flex items-center justify-center size-7 rounded-full text-sm font-bold ${isToday ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-white'}`}>
                      {day}
                    </span>
                  )}
                  {isCurrentMonth && <button className="opacity-0 group-hover:opacity-100 text-primary transition-opacity"><span className="material-symbols-outlined text-lg">add_circle</span></button>}
                </div>
                {hasEvents && isCurrentMonth && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 bg-surface-dark hover:bg-border-dark p-1.5 rounded-lg border-l-2 border-primary">
                      <span className="text-[10px] font-bold text-text-secondary">09:00</span>
                      <span className="text-xs text-white truncate font-medium">Cita General</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Agenda;
