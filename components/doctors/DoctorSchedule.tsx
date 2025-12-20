
import React from 'react';
import { Doctor } from '../../types';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

interface DoctorScheduleProps {
  editDocData: Doctor;
  setEditDocData: (data: Doctor) => void;
  isEditing: boolean;
}

const ScheduleRow = ({ day, schedule, onChange, editing }: any) => {
  const safeSchedule = schedule || {
    morning: { start: '09:00', end: '14:00', active: true },
    afternoon: { start: '16:00', end: '20:00', active: true }
  };

  return (
    <div className="bg-white/60 dark:bg-bg-dark/40 p-6 rounded-[2.5rem] border border-white dark:border-border-dark flex flex-col md:flex-row items-center gap-8 shadow-sm">
      <div className="w-32 shrink-0"><p className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-widest">{day}</p></div>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        {['morning', 'afternoon'].map((shift) => (
          <div key={shift} className="flex items-center gap-4 bg-white/80 dark:bg-surface-dark p-4 rounded-[1.75rem] border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className={`size-12 rounded-2xl flex items-center justify-center ${shift === 'morning' ? 'bg-primary/10 text-primary' : 'bg-orange-400/10 text-orange-400'}`}><span className="material-symbols-outlined text-2xl">{shift === 'morning' ? 'wb_sunny' : 'nights_stay'}</span></div>
            <div className="flex-1 flex items-center gap-2">
              {editing ? (
                <div className="flex items-center gap-2 w-full">
                  <input type="time" value={safeSchedule[shift].start} onChange={e => onChange(day, shift, 'start', e.target.value)} className="bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold w-full text-center" />
                  <span className="text-slate-400 font-bold">-</span>
                  <input type="time" value={safeSchedule[shift].end} onChange={e => onChange(day, shift, 'end', e.target.value)} className="bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold w-full text-center" />
                </div>
              ) : (
                <span className="text-sm font-black text-slate-700 dark:text-slate-300 ml-2">{safeSchedule[shift].start} - {safeSchedule[shift].end}</span>
              )}
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{shift === 'morning' ? 'MAÑANA' : 'TARDE'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DoctorSchedule: React.FC<DoctorScheduleProps> = ({ editDocData, setEditDocData, isEditing }) => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
        <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-10"><span className="material-symbols-outlined text-sm">calendar_month</span> Cronograma Semanal</h4>
            <div className="grid grid-cols-1 gap-6">
                {DAYS.map(day => (
                    <ScheduleRow key={day} day={day} schedule={editDocData.schedule?.[day]} editing={isEditing} onChange={(d:string, s:string, p:string, v:string) => {
                        const newSched = {...editDocData.schedule};
                        if (newSched[d]) { (newSched[d] as any)[s][p] = v; setEditDocData({...editDocData, schedule: newSched}); }
                    }} />
                ))}
            </div>
        </div>
    </div>
  );
};
