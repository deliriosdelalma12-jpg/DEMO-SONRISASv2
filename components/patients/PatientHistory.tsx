
import React, { useState, useMemo } from 'react';
import { Appointment, Patient } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList } from 'recharts';

interface PatientHistoryProps {
  patient: Patient;
  appointments: Appointment[];
}

export const PatientHistory: React.FC<PatientHistoryProps> = ({ patient, appointments }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // --- DATA PROCESSING ---
  const patientAppointments = useMemo(() => {
    return appointments
      .filter(a => a.patientId === patient.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, patient.id]);

  const stats = useMemo(() => {
    const total = patientAppointments.length;
    const cancelled = patientAppointments.filter(a => a.status === 'Cancelled').length;
    const completed = patientAppointments.filter(a => a.status === 'Completed').length;
    const future = patientAppointments.filter(a => new Date(a.date) > new Date() && a.status !== 'Cancelled').length;
    
    const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;
    
    let riskLevel: 'Bajo' | 'Medio' | 'Alto' = 'Bajo';
    if (cancellationRate > 30) riskLevel = 'Alto';
    else if (cancellationRate > 15) riskLevel = 'Medio';

    return { total, cancelled, completed, future, cancellationRate, riskLevel };
  }, [patientAppointments]);

  const chartData = useMemo(() => {
    const total = stats.total || 1; // Prevent division by zero
    const data = [
      { 
        name: 'Completadas', 
        value: stats.completed, 
        color: '#10b981',
        pct: `${Math.round((stats.completed / total) * 100)}%`
      },
      { 
        name: 'Canceladas', 
        value: stats.cancelled, 
        color: '#ef4444',
        pct: `${Math.round((stats.cancelled / total) * 100)}%`
      },
      { 
        name: 'Futuras', 
        value: stats.future, 
        color: '#3b82f6',
        pct: `${Math.round((stats.future / total) * 100)}%` 
      },
    ];
    return data;
  }, [stats]);

  const filteredList = useMemo(() => {
    if (filterStatus === 'ALL') return patientAppointments;
    return patientAppointments.filter(a => a.status === filterStatus);
  }, [patientAppointments, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'Completed': return 'bg-violet-500/10 text-violet-600 border-violet-200';
      case 'Cancelled': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'Rescheduled': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const getFilterStyle = (status: string, active: boolean) => {
    const base = "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border";
    
    if (status === 'ALL') {
        return active 
            ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' 
            : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200 dark:bg-slate-800 dark:hover:border-slate-700';
    }
    if (status === 'Confirmed') {
        return active 
            ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' 
            : 'bg-emerald-50 text-emerald-600 border-transparent hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400';
    }
    if (status === 'Completed') {
        return active 
            ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-500/20' 
            : 'bg-violet-50 text-violet-600 border-transparent hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400';
    }
    if (status === 'Cancelled') {
        return active 
            ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20' 
            : 'bg-red-50 text-red-600 border-transparent hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400';
    }
    if (status === 'Rescheduled') {
        return active 
            ? 'bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-400/20' 
            : 'bg-amber-50 text-amber-600 border-transparent hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400';
    }
    return base;
  };

  const getLabel = (s: string) => {
      if (s === 'ALL') return 'Todas';
      if (s === 'Confirmed') return 'Confirmada';
      if (s === 'Completed') return 'Completada';
      if (s === 'Cancelled') return 'Cancelada';
      if (s === 'Rescheduled') return 'Reconfirmada';
      return s;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 pb-12">
      
      {/* SECTION 1: RISK SCORE (FULL WIDTH & CENTERED) */}
      <div className={`p-10 rounded-[3rem] border-4 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all ${
            stats.riskLevel === 'Alto' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900' :
            stats.riskLevel === 'Medio' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900' :
            'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900'
      }`}>
            <div className="relative z-10 flex flex-col items-center gap-2">
                <div className={`p-4 rounded-full mb-2 ${
                    stats.riskLevel === 'Alto' ? 'bg-red-100 text-red-600' : 
                    stats.riskLevel === 'Medio' ? 'bg-amber-100 text-amber-600' : 
                    'bg-emerald-100 text-emerald-600'
                }`}>
                    <span className="material-symbols-outlined text-5xl">
                        {stats.riskLevel === 'Alto' ? 'warning' : stats.riskLevel === 'Medio' ? 'history' : 'verified_user'}
                    </span>
                </div>
                <h4 className="text-sm font-black uppercase tracking-[0.3em] opacity-60">Probabilidad de Asistencia</h4>
                <p className="text-5xl font-display font-black mb-2">{stats.riskLevel}</p>
                <div className="flex items-center gap-3 bg-white/60 dark:bg-black/20 px-6 py-2 rounded-full">
                    <span className="text-xs font-bold">Tasa de Cancelación Histórica:</span>
                    <span className="text-xl font-black">{stats.cancellationRate.toFixed(1)}%</span>
                </div>
            </div>
            {stats.riskLevel === 'Alto' && (
                <div className="mt-6 bg-red-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest animate-pulse shadow-lg shadow-red-500/20">
                    ⚠️ Cliente problemático. Confirmar asistencia 24h antes.
                </div>
            )}
      </div>

      {/* SECTION 2: STATS & CHART (SIDE BY SIDE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Stats Numbers */}
        <div className="bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
            <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-700">
                <div className="px-4 text-center">
                    <p className="text-4xl font-black text-slate-800 dark:text-white">{stats.total}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Citas Totales</p>
                </div>
                <div className="px-4 text-center">
                    <p className="text-4xl font-black text-blue-500">{stats.future}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Programadas</p>
                </div>
                <div className="px-4 text-center">
                    <p className="text-4xl font-black text-emerald-500">{stats.completed}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Asistidas</p>
                </div>
            </div>
        </div>

        {/* Chart with Percentages */}
        <div className="bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Distribución Porcentual</h4>
             <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} width={80} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <LabelList dataKey="pct" position="right" style={{ fill: '#64748b', fontSize: '11px', fontWeight: 'bold' }} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </div>
        </div>
      </div>

      {/* SECTION 3: APPOINTMENT LIST & FILTERS */}
      <div className="bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
         <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">list_alt</span> Historial Detallado
            </h4>
            <div className="flex flex-wrap justify-center gap-2">
                {['ALL', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled'].map(status => (
                    <button 
                        key={status} 
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${getFilterStyle(status, filterStatus === status)}`}
                    >
                        {getLabel(status)}
                    </button>
                ))}
            </div>
         </div>

         <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {filteredList.length > 0 ? filteredList.map(apt => {
                const isFuture = new Date(apt.date) > new Date() && apt.status !== 'Cancelled' && apt.status !== 'Completed';
                return (
                    <div key={apt.id} className={`p-5 rounded-2xl border flex items-center justify-between transition-all hover:scale-[1.01] ${isFuture ? 'bg-white dark:bg-surface-dark border-primary/30 shadow-md ring-1 ring-primary/10' : 'bg-slate-50 dark:bg-bg-dark border-slate-100 dark:border-slate-800 opacity-90'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`size-12 rounded-xl flex items-center justify-center font-black text-xs uppercase flex-col leading-none ${isFuture ? 'bg-primary/10 text-primary' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                <span>{new Date(apt.date).getDate()}</span>
                                <span className="text-[8px] opacity-70">{new Date(apt.date).toLocaleDateString('es-ES', { month: 'short' })}</span>
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{apt.treatment}</p>
                                <p className="text-xs text-slate-500 font-medium">{apt.time} • {apt.doctorName}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border ${getStatusColor(apt.status)}`}>
                                {getLabel(apt.status)}
                            </span>
                            {isFuture && <p className="text-[9px] font-bold text-primary mt-1.5 uppercase tracking-wide">Próximamente</p>}
                        </div>
                    </div>
                );
            }) : (
                <div className="py-12 text-center opacity-40">
                    <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
                    <p className="font-black text-sm uppercase">No se encontraron citas</p>
                </div>
            )}
         </div>
      </div>

    </div>
  );
};
