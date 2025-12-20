
import React, { useMemo } from 'react';
import { Doctor, Appointment } from '../../types';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DoctorStatsProps {
  editDocData: Doctor;
  appointments: Appointment[];
}

export const DoctorStats: React.FC<DoctorStatsProps> = ({ editDocData, appointments }) => {
  
  // Cálculo de Métricas y Datos Simulados para la Gráfica
  const stats = useMemo(() => {
    const docApts = appointments.filter(a => a.doctorId === editDocData.id);
    const completed = docApts.filter(a => a.status === 'Completed').length;
    const uniquePatients = new Set(docApts.map(a => a.patientId)).size;
    
    // Generar un índice de "semilla" basado en el ID del doctor para que los datos parezcan únicos pero consistentes
    const seed = parseInt(editDocData.id.replace(/\D/g, '') || '1');
    
    const satisfaction = completed > 0 ? Math.min(99, 92 + (seed % 7)) : 0;
    const avgTime = completed > 0 ? (15 + (seed % 15)) : 0;
    
    // Simulación de tendencias (Fake trends for UI demo)
    const trends = {
        patients: seed % 2 === 0 ? 12 : 5,
        appointments: seed % 2 === 0 ? 8 : -2,
        satisfaction: 1.5,
        time: -2 // Menos tiempo es mejor
    };

    // Generar datos para la gráfica (Últimos 6 meses)
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const chartData = months.map((m, i) => ({
        name: m,
        citas: Math.floor(10 + (seed * 2) + (Math.random() * 15) + (i * 2)), // Tendencia ligeramente ascendente
        ingresos: Math.floor(1000 + (seed * 100) + (Math.random() * 500))
    }));

    return { uniquePatients, completed, satisfaction, avgTime, trends, chartData };
  }, [editDocData, appointments]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div>
                <h4 className="text-xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Analítica de Impacto</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Rendimiento operativo y calidad de servicio</p>
            </div>
            <button className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-base">download</span> Exportar PDF
            </button>
        </div>

        {/* KPI CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Pacientes */}
            <div className="p-6 rounded-lg bg-white dark:bg-bg-dark border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-6xl text-blue-500">groups</span></div>
                <div className="relative z-10">
                    <div className="size-10 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4"><span className="material-symbols-outlined text-xl">groups</span></div>
                    <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.uniquePatients}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Pacientes Únicos</p>
                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 w-fit px-2 py-1 rounded-md">
                        <span className="material-symbols-outlined text-xs">trending_up</span> +{stats.trends.patients}% este mes
                    </div>
                </div>
            </div>

            {/* Card 2: Citas */}
            <div className="p-6 rounded-lg bg-white dark:bg-bg-dark border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 transition-all relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-6xl text-purple-500">event_available</span></div>
                <div className="relative z-10">
                    <div className="size-10 rounded-md bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4"><span className="material-symbols-outlined text-xl">event_available</span></div>
                    <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.completed}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Citas Finalizadas</p>
                    <div className={`mt-4 flex items-center gap-1 text-[10px] font-bold w-fit px-2 py-1 rounded-md ${stats.trends.appointments >= 0 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
                        <span className="material-symbols-outlined text-xs">{stats.trends.appointments >= 0 ? 'trending_up' : 'trending_down'}</span> {stats.trends.appointments > 0 ? '+' : ''}{stats.trends.appointments}% vs objetivo
                    </div>
                </div>
            </div>

            {/* Card 3: Satisfacción */}
            <div className="p-6 rounded-lg bg-white dark:bg-bg-dark border border-slate-200 dark:border-slate-800 hover:border-orange-400/50 transition-all relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-6xl text-orange-400">verified</span></div>
                <div className="relative z-10">
                    <div className="size-10 rounded-md bg-orange-400/10 text-orange-400 flex items-center justify-center mb-4"><span className="material-symbols-outlined text-xl">verified</span></div>
                    <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.satisfaction}%</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">NPS / Satisfacción</p>
                    <div className="mt-4 w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-orange-400 h-full rounded-full" style={{width: `${stats.satisfaction}%`}}></div>
                    </div>
                </div>
            </div>

            {/* Card 4: Tiempo Medio */}
            <div className="p-6 rounded-lg bg-white dark:bg-bg-dark border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 transition-all relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-6xl text-emerald-500">timer</span></div>
                <div className="relative z-10">
                    <div className="size-10 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4"><span className="material-symbols-outlined text-xl">timer</span></div>
                    <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.avgTime} <span className="text-sm text-slate-400 font-bold">min</span></p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Tiempo en Consulta</p>
                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400 w-fit px-2 py-1 rounded-md">
                        <span className="material-symbols-outlined text-xs">bolt</span> {Math.abs(stats.trends.time)}% más eficiente
                    </div>
                </div>
            </div>
        </div>

        {/* CHART SECTION & ADDITIONAL INFO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Chart */}
            <div className="lg:col-span-2 p-8 rounded-lg bg-white dark:bg-bg-dark border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h5 className="font-black text-slate-800 dark:text-white text-lg">Evolución de Citas</h5>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Último Semestre</p>
                    </div>
                    <div className="flex gap-2">
                        <span className="size-3 rounded-full bg-primary animate-pulse"></span>
                        <span className="text-[10px] font-bold text-primary uppercase">Actividad</span>
                    </div>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCitasDoc" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 'bold'}} dy={10} />
                            <Tooltip 
                                contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'none', padding: '12px'}} 
                                itemStyle={{color: '#3b82f6', fontWeight: 'bold', fontSize: '12px'}}
                                formatter={(value: any) => [`${value} Pacientes`, 'Volumen']}
                            />
                            <Area type="monotone" dataKey="citas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCitasDoc)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Side Stats / Highlights */}
            <div className="p-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-5 -mb-5"></div>
                
                <div className="relative z-10">
                    <div className="size-10 rounded-md bg-white/20 flex items-center justify-center mb-6 backdrop-blur-md">
                        <span className="material-symbols-outlined text-xl">trophy</span>
                    </div>
                    <h5 className="font-black text-2xl uppercase tracking-tight leading-none mb-2">Top Performer</h5>
                    <p className="text-xs font-medium text-blue-100 opacity-90">Este doctor se encuentra en el <span className="font-black text-white">Top 15%</span> de eficiencia de la clínica.</p>
                </div>

                <div className="relative z-10 mt-8 space-y-4">
                    <div className="bg-white/10 rounded-md p-3 flex items-center justify-between backdrop-blur-sm border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Retención</span>
                        <span className="text-sm font-black">88%</span>
                    </div>
                    <div className="bg-white/10 rounded-md p-3 flex items-center justify-between backdrop-blur-sm border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Puntualidad</span>
                        <span className="text-sm font-black">9.5/10</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
