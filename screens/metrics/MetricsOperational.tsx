
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area, Legend, ComposedChart, Line
} from 'recharts';
import { Appointment, Doctor, Patient, ClinicSettings, Branch } from '../../types';
import { jsPDF } from "jspdf";

interface MetricsOperationalProps {
  appointments: Appointment[];
  doctors: Doctor[];
  patients: Patient[];
  settings: ClinicSettings; 
  branches?: Branch[];
}

const MetricsOperational: React.FC<MetricsOperationalProps> = ({ appointments, doctors, patients, settings, branches = [] }) => {
  const [branchFilter, setBranchFilter] = useState('Todas las sedes');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // --- HELPER: PRECIO DINÁMICO ---
  const getTreatmentPrice = (treatmentName: string): number => {
      const service = settings.services.find(s => s.name === treatmentName);
      return service ? service.price : 0;
  };

  // --- FILTERS & DATA PREPARATION ---
  const branchOptions = useMemo(() => {
    if (branches.length > 0) return ['Todas las sedes', ...branches.map(b => b.name)];
    const unique = Array.from(new Set(doctors.map(d => d.branch)));
    return ['Todas las sedes', ...unique];
  }, [doctors, branches]);

  const relevantAppointments = useMemo(() => {
    if (branchFilter === 'Todas las sedes') {
      return appointments;
    }
    // Filter by doctor branch strictly
    const branchDocIds = new Set(doctors.filter(d => d.branch === branchFilter).map(d => d.id));
    // Also filter by appointment branch if explicitly set
    return appointments.filter(a => branchDocIds.has(a.doctorId) || a.branch === branchFilter);
  }, [appointments, doctors, branchFilter]);

  const filteredData = useMemo(() => {
    const now = new Date();
    const getRangeDays = () => {
      if (timeRange === '7d') return 7;
      if (timeRange === '30d') return 30;
      if (timeRange === '90d') return 90;
      return 365;
    };
    const days = getRangeDays();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    
    const endDate = new Date(); 
    endDate.setHours(23, 59, 59, 999);

    const doctorsInBranch = branchFilter === 'Todas las sedes' ? doctors : doctors.filter(d => d.branch === branchFilter);
    
    const currentApts = relevantAppointments.filter(a => { 
        const d = new Date(a.date); 
        return d >= startDate && d <= endDate; 
    });

    const prevStartDate = new Date(startDate); 
    prevStartDate.setDate(startDate.getDate() - days);
    const prevEndDate = new Date(startDate);
    const prevApts = relevantAppointments.filter(a => { 
        const d = new Date(a.date); 
        return d >= prevStartDate && d < prevEndDate; 
    });

    return { currentApts, prevApts, doctorsInBranch, startDate, now, days };
  }, [relevantAppointments, doctors, branchFilter, timeRange]);

  // --- STATISTICS CALCULATION ---
  const stats = useMemo(() => {
    const { currentApts, prevApts } = filteredData;
    
    const calcRevenue = (list: Appointment[]) => list
        .filter(a => a.status === 'Completed')
        .reduce((acc, curr) => acc + getTreatmentPrice(curr.treatment), 0);
    
    const rev = calcRevenue(currentApts);
    const prevRev = calcRevenue(prevApts);
    const revTrend = prevRev === 0 ? 100 : ((rev - prevRev) / prevRev) * 100;

    const count = currentApts.length;
    const prevCount = prevApts.length;
    const countTrend = prevCount === 0 ? 100 : ((count - prevCount) / prevCount) * 100;

    const completed = currentApts.filter(a => a.status === 'Completed').length;
    const cancelled = currentApts.filter(a => a.status === 'Cancelled').length;
    const efficiency = (currentApts.length - cancelled) > 0 
        ? ((completed / (currentApts.length - cancelled)) * 100).toFixed(1) 
        : '0';

    return { rev, revTrend, count, countTrend, efficiency, cancelled };
  }, [filteredData, settings.services]);

  // --- CHARTS DATA ---
  const charts = useMemo(() => {
    const { currentApts, doctorsInBranch, now, days } = filteredData;

    // 1. Status Pie Chart
    const statusMap = currentApts.reduce((acc: any, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
    const pieData = [
        { name: 'Completadas', value: statusMap['Completed'] || 0, color: '#10b981' }, 
        { name: 'Pendientes', value: statusMap['Pending'] || 0, color: '#3b82f6' }, 
        { name: 'Canceladas', value: statusMap['Cancelled'] || 0, color: '#ef4444' }, 
        { name: 'Agendadas', value: (statusMap['Confirmed'] || 0) + (statusMap['Rescheduled'] || 0), color: '#6366f1' }
    ].filter(d => d.value > 0);

    // 2. Doctor Performance
    const docData = doctorsInBranch.map(d => {
      const apts = currentApts.filter(a => a.doctorId === d.id);
      const revenue = apts.filter(a => a.status === 'Completed').reduce((acc, a) => acc + getTreatmentPrice(a.treatment), 0);
      return { 
          name: d.name.split(' ').slice(-1)[0], 
          fullName: d.name,
          citas: apts.length, 
          facturacion: revenue,
          ticketMedio: apts.length > 0 ? Math.round(revenue / apts.length) : 0
      };
    }).sort((a, b) => b.facturacion - a.facturacion);

    // 3. Service Analysis
    const allServicesStats = settings.services.map(service => {
        const apts = currentApts.filter(a => a.treatment === service.name);
        const count = apts.length;
        const revenue = apts.filter(a => a.status === 'Completed').reduce((acc, a) => acc + service.price, 0);
        return { name: service.name, count, revenue };
    });

    const topServices = [...allServicesStats].sort((a, b) => b.count - a.count).slice(0, 5);
    const bottomServices = [...allServicesStats].sort((a, b) => a.count - b.count).slice(0, 5);

    // 4. Financial Evolution
    const areaData = [];
    const step = days > 60 ? 30 : (days > 7 ? 1 : 1);
    
    for (let i = days; i >= 0; i -= step) {
        const d = new Date(now); 
        d.setDate(d.getDate() - i);
        
        let label = '';
        let value = 0;
        let count = 0;

        if (step === 30) {
             label = d.toLocaleDateString('es-ES', { month: 'short' });
             const monthApts = currentApts.filter(a => {
                 const ad = new Date(a.date);
                 return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
             });
             value = monthApts.filter(a => a.status === 'Completed').reduce((acc, a) => acc + getTreatmentPrice(a.treatment), 0);
             count = monthApts.length;
        } else {
             const dStr = d.toISOString().split('T')[0];
             label = days === 7 ? d.toLocaleDateString('es-ES', { weekday: 'short' }) : d.getDate().toString();
             const dayApts = currentApts.filter(a => a.date === dStr);
             value = dayApts.filter(a => a.status === 'Completed').reduce((acc, a) => acc + getTreatmentPrice(a.treatment), 0);
             count = dayApts.length;
        }
        
        if (!areaData.find(ad => ad.name === label)) {
            areaData.push({ name: label, value, volumen: count });
        }
    }

    return { pieData, docData, topServices, bottomServices, areaData };
  }, [filteredData, settings.services]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Informe Operativo - ${branchFilter}`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Periodo: Últimos ${timeRange}`, 20, 30);
    doc.text(`Facturación Operativa: ${stats.rev} ${settings.currency}`, 20, 40);
    doc.text(`Citas Totales: ${stats.count}`, 20, 50);
    doc.text(`Eficiencia: ${stats.efficiency}%`, 20, 60);
    doc.save(`Operativa_${branchFilter}.pdf`);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white dark:bg-surface-dark p-8 rounded-[3rem] border border-border-light dark:border-border-dark shadow-xl">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Métrica Operativa</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="size-2 bg-success rounded-full animate-pulse"></span>
            <p className="text-slate-500 dark:text-slate-400 font-medium italic text-sm">Datos en tiempo real del sistema • {branchFilter}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <select 
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-3.5 text-sm font-bold appearance-none min-w-[200px] focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            >
              {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">location_on</span>
          </div>
          <div className="flex bg-slate-100 dark:bg-bg-dark p-1.5 rounded-[1.25rem] border border-slate-200 dark:border-slate-700 shadow-inner">
            {(['7d', '30d', '90d', '1y'] as const).map((r) => (
              <button key={r} onClick={() => setTimeRange(r)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${timeRange === r ? 'bg-white dark:bg-surface-dark text-primary shadow-lg' : 'text-slate-400'}`}>{r}</button>
            ))}
          </div>
          <button onClick={downloadPDF} className="size-12 rounded-2xl bg-primary/10 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-all"><span className="material-symbols-outlined">download</span></button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        {[ 
            { label: "Facturación Real", val: `${settings?.currency}${stats.rev.toLocaleString()}`, icon: "payments", color: "text-emerald-500", bg: "bg-emerald-500/10", trend: stats.revTrend }, 
            { label: "Volumen de Citas", val: stats.count.toLocaleString(), icon: "calendar_month", color: "text-blue-500", bg: "bg-blue-500/10", trend: stats.countTrend }, 
            { label: "Tasa de Cancelación", val: `${((stats.cancelled / (stats.count || 1)) * 100).toFixed(1)}%`, icon: "event_busy", color: "text-rose-500", bg: "bg-rose-500/10", invertTrend: true }, 
            { label: "Eficiencia Operativa", val: `${stats.efficiency}%`, icon: "precision_manufacturing", color: "text-amber-500", bg: "bg-amber-500/10" } 
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] border border-border-light dark:border-border-dark shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className={`absolute -right-4 -top-4 size-24 ${kpi.bg} rounded-full opacity-0 group-hover:opacity-100 transition-all scale-0 group-hover:scale-150`}></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={`size-14 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center shadow-inner`}><span className="material-symbols-outlined text-3xl">{kpi.icon}</span></div>
                {kpi.trend !== undefined && (
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${((kpi.trend >= 0 && !kpi.invertTrend) || (kpi.trend < 0 && kpi.invertTrend)) ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                        <span className="material-symbols-outlined text-xs">{kpi.trend >= 0 ? 'trending_up' : 'trending_down'}</span>
                        {Math.abs(kpi.trend).toFixed(1)}%
                    </span>
                )}
            </div>
            <div className="relative z-10"><p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{kpi.label}</p><h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{kpi.val}</h3></div>
          </div>
        ))}
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        
        {/* EVOLUTION */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-dark p-10 rounded-[3rem] border border-border-light dark:border-border-dark shadow-xl space-y-8">
          <div className="flex items-center justify-between">
             <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Ingresos por Servicios</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.areaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} tickFormatter={(value) => `${value/1000}k`} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} itemStyle={{color: '#3b82f6', fontWeight: 'bold'}} formatter={(value: number) => [`${value} ${settings.currency}`, 'Facturación']} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* STATUS */}
        <div className="bg-white dark:bg-surface-dark rounded-[3rem] border border-border-light dark:border-border-dark p-10 shadow-xl space-y-8 flex flex-col">
           <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Flujo de Citas</h3>
           <div className="flex-1 min-h-[250px] w-full relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={charts.pieData} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                   {charts.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                 </Pie>
                 <Tooltip />
                 <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold'}} />
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.count}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
             </div>
           </div>
        </div>

        {/* TOP SERVICES */}
        <div className="xl:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-surface-dark rounded-[3rem] border border-border-light dark:border-border-dark p-10 shadow-xl space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Top 5 Servicios</h3>
                    <span className="material-symbols-outlined text-success text-3xl">trending_up</span>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.topServices} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} width={130} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={20} name="Ventas" />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-surface-dark rounded-[3rem] border border-border-light dark:border-border-dark p-10 shadow-xl space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Bottom 5 Servicios</h3>
                    <span className="material-symbols-outlined text-orange-400 text-3xl">trending_down</span>
                </div>
                <div className="flex flex-col gap-4 h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {charts.bottomServices.map((service, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-bg-dark border border-slate-100 dark:border-slate-800">
                            <div className="size-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-black text-sm">{idx + 1}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">{service.name}</p>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-orange-400 h-full rounded-full" style={{width: `${Math.max(service.count * 5, 5)}%`}}></div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-black text-slate-900 dark:text-white">{service.count}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Ventas</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* TEAM PERFORMANCE */}
        <div className="xl:col-span-3 bg-white dark:bg-surface-dark rounded-[3rem] border border-border-light dark:border-border-dark p-10 shadow-xl space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Rendimiento del Equipo Médico</h3>
              <div className="flex gap-4">
                  <div className="flex items-center gap-2"><span className="size-3 bg-primary rounded-sm"></span><span className="text-[10px] font-bold text-slate-500 uppercase">Facturación</span></div>
                  <div className="flex items-center gap-2"><span className="size-3 bg-orange-400 rounded-full"></span><span className="text-[10px] font-bold text-slate-500 uppercase">Citas</span></div>
              </div>
           </div>
           <div className="h-[350px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <ComposedChart data={charts.docData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                 <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 'bold', fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={10} />
                 <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" tick={{fontSize: 11, fontWeight: 'bold', fill: '#3b82f6'}} axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                 <YAxis yAxisId="right" orientation="right" stroke="#fb923c" tick={{fontSize: 11, fontWeight: 'bold', fill: '#fb923c'}} axisLine={false} tickLine={false} />
                 <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} cursor={{fill: '#f8fafc'}} />
                 <Bar yAxisId="left" dataKey="facturacion" barSize={30} fill="#3b82f6" radius={[10, 10, 0, 0]} name="Facturación" />
                 <Line yAxisId="right" type="monotone" dataKey="citas" stroke="#fb923c" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} name="Citas" />
               </ComposedChart>
             </ResponsiveContainer>
           </div>
        </div>

      </div>
    </div>
  );
};

export default MetricsOperational;
