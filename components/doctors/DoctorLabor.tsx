
import React, { useMemo } from 'react';
import { Doctor } from '../../types';
import { DataField } from '../shared/DataField';

interface DoctorLaborProps {
  editDocData: Doctor;
  setEditDocData: (data: Doctor) => void;
  isEditing: boolean;
}

export const DoctorLabor: React.FC<DoctorLaborProps> = ({ editDocData, setEditDocData, isEditing }) => {
  
  const realTimeVacationStats = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    let consumed = 0;
    (editDocData.vacationHistory || []).forEach(v => {
      if (v.status === 'Rechazada') return;
      const start = new Date(v.start); const end = new Date(v.end);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const currentCheck = new Date(d); currentCheck.setHours(0,0,0,0);
        if (currentCheck <= today) consumed++;
      }
    });
    const totalAllowed = editDocData.vacationDaysTotal || 30;
    return { consumed, balance: totalAllowed - consumed, totalAllowed };
  }, [editDocData]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
        <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-10"><span className="material-symbols-outlined text-sm">work</span> Gestión de Recursos Humanos</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <DataField label="Relación Laboral" value={editDocData.contractType || ''} onChange={(v:any) => isEditing && setEditDocData({...editDocData, contractType: v})} type="select" options={['Indefinido - Jornada Completa', 'Indefinido - Media Jornada', 'Autónomo / Colaborador', 'Temporal']} editing={isEditing} />
                <DataField label="Precio Hora (€)" value={editDocData.hourlyRate || 0} onChange={(v:any) => isEditing && setEditDocData({...editDocData, hourlyRate: v})} type="number" editing={isEditing} />
                <DataField label="Horas Extras" value={editDocData.overtimeHours || 0} onChange={(v:any) => isEditing && setEditDocData({...editDocData, overtimeHours: v})} type="number" editing={isEditing} />
                <DataField label="Cómputo Mes" value={editDocData.totalHoursWorked || 0} onChange={(v:any) => isEditing && setEditDocData({...editDocData, totalHoursWorked: v})} type="number" editing={isEditing} />
            </div>
        </div>
        <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm space-y-10">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3"><span className="material-symbols-outlined text-sm">beach_access</span> Consumo de Vacaciones</h4>
            <div className="flex justify-between items-center bg-slate-50 dark:bg-bg-dark p-6 rounded-3xl">
                <div><p className="text-4xl font-black">{realTimeVacationStats.balance}</p><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Días Disponibles</p></div>
                <div className="text-right"><p className="text-2xl font-black text-slate-500">{realTimeVacationStats.consumed}</p><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Consumidos</p></div>
            </div>
        </div>
    </div>
  );
};
