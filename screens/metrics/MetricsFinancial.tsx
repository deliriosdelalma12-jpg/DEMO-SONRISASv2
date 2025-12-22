
import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, ComposedChart, Line, Cell, ScatterChart, Scatter, ReferenceLine, Legend, PieChart, Pie
} from 'recharts';
import { ClinicSettings, Branch, Appointment, Doctor, Patient } from '../../types';
import { GoogleGenAI, Type } from "@google/genai";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface MetricsFinancialProps {
  settings: ClinicSettings;
  branches?: Branch[];
  appointments?: Appointment[];
  doctors?: Doctor[];
  patients?: Patient[];
}

// --- DATA ENGINE: HISTORIAL DE 12 MESES ROBUSTO ---
const INITIAL_HISTORY = [
  { month: 'Jul 23', revenue: 210000, expenses: 165000, ebitda: 45000, margin: 21.4, staff: 85000, ops: 45000, marketing: 20000, structure: 15000, cash: 40000, appts: 450 },
  { month: 'Ago 23', revenue: 195000, expenses: 160000, ebitda: 35000, margin: 17.9, staff: 85000, ops: 40000, marketing: 15000, structure: 20000, cash: 32000, appts: 410 },
  { month: 'Sep 23', revenue: 240000, expenses: 175000, ebitda: 65000, margin: 27.1, staff: 88000, ops: 52000, marketing: 20000, structure: 15000, cash: 55000, appts: 520 },
  { month: 'Oct 23', revenue: 235000, expenses: 172000, ebitda: 63000, margin: 26.8, staff: 88000, ops: 50000, marketing: 18000, structure: 16000, cash: 50000, appts: 505 },
  { month: 'Nov 23', revenue: 255000, expenses: 180000, ebitda: 75000, margin: 29.4, staff: 90000, ops: 55000, marketing: 20000, structure: 15000, cash: 62000, appts: 540 },
  { month: 'Dic 23', revenue: 280000, expenses: 195000, ebitda: 85000, margin: 30.3, staff: 95000, ops: 60000, marketing: 25000, structure: 15000, cash: 70000, appts: 600 },
  { month: 'Ene 24', revenue: 245000, expenses: 185000, ebitda: 60000, margin: 24.5, staff: 92000, ops: 50000, marketing: 22000, structure: 21000, cash: 45000, appts: 490 },
  { month: 'Feb 24', revenue: 250000, expenses: 182000, ebitda: 68000, margin: 27.2, staff: 92000, ops: 51000, marketing: 20000, structure: 19000, cash: 52000, appts: 500 },
  { month: 'Mar 24', revenue: 275000, expenses: 190000, ebitda: 85000, margin: 30.9, staff: 95000, ops: 58000, marketing: 22000, structure: 15000, cash: 68000, appts: 560 },
  { month: 'Abr 24', revenue: 260000, expenses: 188000, ebitda: 72000, margin: 27.7, staff: 95000, ops: 54000, marketing: 18000, structure: 21000, cash: 58000, appts: 530 },
  { month: 'May 24', revenue: 290000, expenses: 200000, ebitda: 90000, margin: 31.0, staff: 98000, ops: 62000, marketing: 25000, structure: 15000, cash: 75000, appts: 590 },
  { month: 'Jun 24', revenue: 310000, expenses: 210000, ebitda: 100000, margin: 32.2, staff: 102000, ops: 68000, marketing: 25000, structure: 15000, cash: 82000, appts: 630 },
];

const MetricsFinancial: React.FC<MetricsFinancialProps> = ({ settings, branches = [], appointments = [], doctors = [], patients = [] }) => {
  const [currentDataset, setCurrentDataset] = useState(INITIAL_HISTORY);
  const [comparisonRange, setComparisonRange] = useState<'Q1' | 'Q2' | 'FY'>('Q2');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- FILTROS INTELIGENTES ---
  const dashboardData = useMemo(() => {
    // Escala por sucursales si no es ALL
    let base = currentDataset;
    if (selectedBranchId !== 'ALL') {
      base = base.map(d => ({
        ...d,
        revenue: d.revenue * 0.4, // Simulación de peso por sucursal
        ebitda: d.ebitda * 0.35,
        expenses: d.expenses * 0.45,
        cash: d.cash * 0.4
      }));
    }

    const q1 = base.slice(6, 9); 
    const q2 = base.slice(9, 12);
    const active = comparisonRange === 'Q1' ? q1 : q2;
    const prev = comparisonRange === 'Q2' ? q1 : q1;

    const totals = {
      revenue: active.reduce((a, b) => a + b.revenue, 0),
      ebitda: active.reduce((a, b) => a + b.ebitda, 0),
      margin: (active.reduce((a, b) => a + b.margin, 0) / active.length).toFixed(1),
      cash: active[active.length - 1].cash,
      debt: 120000, // Simulada
      appts: active.reduce((a, b) => a + b.appts, 0)
    };

    const prevTotals = {
      revenue: prev.reduce((a, b) => a + b.revenue, 0),
      ebitda: prev.reduce((a, b) => a + b.ebitda, 0),
    };

    return { active, prev, totals, prevTotals };
  }, [currentDataset, comparisonRange, selectedBranchId]);

  // --- SEMÁFORO DE SALUD ---
  const healthStatus = useMemo(() => {
    const margin = parseFloat(dashboardData.totals.margin);
    if (margin > 25) return { color: 'text-success', label: 'Sano', bg: 'bg-success/10', icon: 'check_circle' };
    if (margin > 15) return { color: 'text-warning', label: 'Vigilable', bg: 'bg-warning/10', icon: 'error' };
    return { color: 'text-danger', label: 'Riesgo', bg: 'bg-danger/10', icon: 'warning' };
  }, [dashboardData]);

  // --- AI DOCUMENT FUSION & ANALYSIS ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const generateAIExecutiveAnalysis = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        ACTÚA COMO CFO Y COO. Analiza los documentos (${uploadedFiles.length} archivos) y el historial de la clínica ${settings.name}.
        DATOS ACTUALES: ${JSON.stringify(dashboardData.totals)}
        
        GENERA UN JSON ESTRATÉGICO:
        1. "pnlInsights": Comentario para el dueño sobre ingresos y gastos.
        2. "opsInsights": Eficiencia y productividad del equipo.
        3. "serviceRanking": 3 servicios rentables y 3 deficitarios con motivos.
        4. "decisions": 3 decisiones prioritarias.
        5. "actions": 3 mejoras inmediatas.
        6. "missingData": ¿Qué datos faltan para ser más precisos?
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      setAiAnalysis(JSON.parse(response.text));
    } catch (e) { console.error(e); } finally { setIsGenerating(false); }
  };

  // --- PDF MASTER EXPORT ---
  const downloadExecutivePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let y = 20;

    doc.setFontSize(22);
    doc.text(`INFORME ESTRATÉGICO: ${settings.name.toUpperCase()}`, 15, y);
    doc.setFontSize(10);
    doc.text(`Periodo: ${comparisonRange} | Generado por MediClinic AI`, 15, y + 10);
    y += 30;

    autoTable(doc, {
      startY: y,
      head: [['KPI Principal', 'Valor Actual', 'vs Anterior', 'Estado']],
      body: [
        ['Ingresos Totales', `${dashboardData.totals.revenue.toLocaleString()} ${settings.currency}`, `${((dashboardData.totals.revenue - dashboardData.prevTotals.revenue)/dashboardData.prevTotals.revenue * 100).toFixed(1)}%`, healthStatus.label],
        ['EBITDA Acumulado', `${dashboardData.totals.ebitda.toLocaleString()} ${settings.currency}`, '-', 'Ok'],
        ['Margen Neto', `${dashboardData.totals.margin}%`, '-', 'Estable'],
        ['Deuda / EBITDA', `${(dashboardData.totals.debt / dashboardData.totals.ebitda).toFixed(1)}x`, '-', 'Seguro'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Analisis_Ejecutivo_${settings.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-32">
      
      {/* 1. DOCUMENT INGESTION (TOP LOCK) */}
      <div className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center gap-6 shadow-sm">
        <div className="text-center">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 mx-auto shadow-inner">
            <span className="material-symbols-outlined text-3xl">upload_file</span>
          </div>
          <h2 className="text-xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Centro de Ingesta Inteligente</h2>
          <p className="text-slate-500 font-medium italic text-xs mt-1">Sube facturas, balances o Excels bancarios para actualizar el cerebro financiero.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center max-w-xl">
          {uploadedFiles.map((f, i) => (
            <div key={i} className="px-3 py-1.5 bg-slate-50 dark:bg-bg-dark rounded-xl text-[9px] font-black uppercase text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-2 animate-in zoom-in">
              <span className="material-symbols-outlined text-xs text-primary">description</span> {f.name}
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button onClick={() => fileInputRef.current?.click()} className="h-11 px-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-50 transition-all">Seleccionar Docs</button>
          <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button 
            onClick={generateAIExecutiveAnalysis} 
            disabled={isGenerating} 
            className="h-11 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-2xl flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-30"
          >
            {isGenerating ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">auto_awesome</span>}
            Generar Análisis de Dirección
          </button>
        </div>
      </div>

      {/* 2. FILTROS DINÁMICOS */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
           <h1 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Sala de Dirección Estratégica</h1>
           <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Dashboard unificado CFO & COO para la toma de decisiones.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sede:</span>
              <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} className="bg-transparent border-none text-sm font-bold text-primary focus:ring-0 cursor-pointer">
                <option value="ALL">Red Global</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
           </div>
           <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periodo:</span>
              <select value={comparisonRange} onChange={(e) => setComparisonRange(e.target.value as any)} className="bg-transparent border-none text-sm font-bold text-primary focus:ring-0 cursor-pointer">
                <option value="Q1">Q1 (Ene-Mar)</option>
                <option value="Q2">Q2 (Abr-Jun)</option>
              </select>
           </div>
           <button onClick={downloadExecutivePDF} className="h-12 px-6 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">download</span> PDF
           </button>
        </div>
      </div>

      {/* 3. VISIÓN GENERAL (BLOQUE 1 - SALUD DEL NEGOCIO) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Health Traffic Light */}
        <div className={`col-span-1 p-8 rounded-[3rem] border-4 flex flex-col items-center justify-center text-center shadow-xl transition-all ${healthStatus.bg.replace('/10', '/30')} ${healthStatus.color.replace('text-', 'border-')}`}>
           <div className={`p-4 rounded-full mb-4 ${healthStatus.bg} ${healthStatus.color}`}>
              <span className="material-symbols-outlined text-6xl">{healthStatus.icon}</span>
           </div>
           <h4 className="text-[11px] font-black uppercase tracking-[0.4em] opacity-60">Estado de Salud</h4>
           <p className={`text-4xl font-display font-black uppercase tracking-tighter ${healthStatus.color}`}>{healthStatus.label}</p>
           <p className="mt-4 text-[10px] font-bold text-slate-500 leading-relaxed uppercase">Capacidad de aguante actual:<br/><span className="text-slate-800 dark:text-white font-black">4.2 meses sin ingresos</span></p>
        </div>

        {/* Major KPIs */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { label: 'Ingresos Totales', val: `${dashboardData.totals.revenue.toLocaleString()} ${settings.currency}`, diff: `${((dashboardData.totals.revenue - dashboardData.prevTotals.revenue)/dashboardData.prevTotals.revenue * 100).toFixed(1)}%`, icon: 'payments' },
             { label: 'EBITDA Operativo', val: `${dashboardData.totals.ebitda.toLocaleString()} ${settings.currency}`, diff: '8.2%', icon: 'insights' },
             { label: 'Margen de Beneficio', val: `${dashboardData.totals.margin}%`, diff: 'OBJ: 20%', icon: 'percent' },
           ].map((kpi, idx) => (
             <div key={idx} className="bg-white dark:bg-surface-dark p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-5xl">{kpi.icon}</span></div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{kpi.label}</p>
                <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">{kpi.val}</h3>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-bg-dark rounded-lg text-[10px] font-black text-primary">
                  <span className="material-symbols-outlined text-xs">analytics</span> {kpi.diff} vs anterior
                </div>
                <div className="mt-4 p-3 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-relaxed">Interpretación: Este dato mide el dinero libre generado por la operación pura de su clínica.</p>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* 4. BLOQUE FINANCIERO PROFUNDO (CFO MODE) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-12 opacity-10"><span className="material-symbols-outlined text-[120px]">account_balance</span></div>
           <div className="relative z-10 space-y-10">
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="text-3xl font-display font-black uppercase tracking-tight">Tendencias P&L a 12 Meses</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 italic">Análisis comparativo de crecimiento vs estructura de costes</p>
                 </div>
                 <div className="flex gap-6">
                    <div className="flex items-center gap-2"><span className="size-3 bg-primary rounded-full"></span><span className="text-[10px] font-bold uppercase">Ingresos</span></div>
                    <div className="flex items-center gap-2"><span className="size-3 bg-white/20 rounded-full"></span><span className="text-[10px] font-bold uppercase">Gastos</span></div>
                 </div>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentDataset}>
                    <defs>
                      <linearGradient id="colRevFin" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(v) => `${v/1000}k`} />
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '16px'}} />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={4} fill="url(#colRevFin)" />
                    <Area type="monotone" dataKey="expenses" stroke="rgba(255,255,255,0.2)" strokeWidth={2} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                 <p className="text-sm font-medium italic text-slate-300">
                    <span className="text-primary font-black">CFO Alerta:</span> Se detecta una estacionalidad positiva en el mes de Diciembre, con una caída de margen en Enero por aumento de costes fijos (Structure +25%).
                 </p>
              </div>
           </div>
        </div>

        <div className="bg-white dark:bg-surface-dark p-12 rounded-[4rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-10 flex flex-col">
           <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Anatomía de los Costes</h3>
           <div className="flex-1 w-full flex flex-col justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={[
                    { name: 'Personal', value: dashboardData.active[0].staff, color: '#3b82f6' },
                    { name: 'Operativos', value: dashboardData.active[0].ops, color: '#10b981' },
                    { name: 'Marketing', value: dashboardData.active[0].marketing, color: '#f59e0b' },
                    { name: 'Estructura', value: dashboardData.active[0].structure, color: '#6366f1' },
                  ]} innerRadius={60} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                    {[0,1,2,3].map((i) => <Cell key={i} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-4 mt-8">
                 {[
                   { label: 'Personal (Nóminas)', p: '42%', c: 'bg-blue-500' },
                   { label: 'Marketing / Captación', p: '12%', c: 'bg-orange-500' },
                   { label: 'Coste Fijo Estructura', p: '20%', c: 'bg-indigo-500' }
                 ].map((item, i) => (
                   <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-2"><div className={`size-2 rounded-full ${item.c}`}></div><span className="text-[10px] font-black uppercase text-slate-500">{item.label}</span></div>
                      <span className="text-xs font-black text-slate-800 dark:text-white">{item.p}</span>
                   </div>
                 ))}
              </div>
           </div>
           <div className="p-6 bg-slate-50 dark:bg-bg-dark rounded-3xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-relaxed">
                Ayuda Financiera: El gasto de personal sobre ingresos está en límites sanos (&lt;45%). No obstante, el marketing muestra un ROI decreciente este trimestre.
              </p>
           </div>
        </div>
      </div>

      {/* 5. BLOQUE OPERATIVO & RENTABILIDAD (COO MODE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* Services Profitability */}
         <div className="bg-white dark:bg-surface-dark p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Rentabilidad por Servicio</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Margen Real vs Tiempo Operativo</p>
               </div>
               <span className="material-symbols-outlined text-primary text-3xl">precision_manufacturing</span>
            </div>
            <div className="space-y-6">
               {[
                 { n: 'Implante Titanio Premium', m: 72, r: 'Alta', h: '450€/h', c: 'text-success' },
                 { n: 'Ortodoncia Invisible', m: 58, r: 'Media-Alta', h: '320€/h', c: 'text-blue-500' },
                 { n: 'Limpieza Dental Básica', m: 12, r: 'Baja', h: '80€/h', c: 'text-danger' },
                 { n: 'Endodoncia Molar', m: 35, r: 'Media', h: '190€/h', c: 'text-warning' }
               ].map((s, i) => (
                 <div key={i} className="p-5 bg-slate-50 dark:bg-bg-dark rounded-3xl border border-slate-100 dark:border-slate-800 group hover:border-primary transition-all">
                    <div className="flex justify-between items-start mb-3">
                       <p className="text-xs font-black uppercase text-slate-800 dark:text-white">{s.n}</p>
                       <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 shadow-sm ${s.c}`}>{s.r} Rentabilidad</span>
                    </div>
                    <div className="flex items-end justify-between">
                       <div className="flex-1 max-w-[200px]">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                             <div className="bg-primary h-full rounded-full" style={{width: `${s.m}%`}}></div>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest">{s.m}% Margen Real</p>
                       </div>
                       <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{s.h}</p>
                    </div>
                 </div>
               ))}
            </div>
            <div className="mt-8 p-6 bg-primary/5 rounded-3xl border border-primary/20">
               <p className="text-xs font-bold text-primary italic leading-relaxed">
                  Recomendación COO: Candidato a SUBIDA DE PRECIO detectado: "Limpieza Dental Básica". El margen es bajo para el tiempo de gabinete consumido. Optimizar costes de suministros.
               </p>
            </div>
         </div>

         {/* Branch Scaling Analysis */}
         <div className="bg-white dark:bg-surface-dark p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col">
            <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight mb-10">Desempeño por Sucursal</h3>
            <div className="flex-1 w-full min-h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                     <XAxis type="number" dataKey="revenue" name="Ingresos" unit="€" tick={{fontSize: 10}} tickFormatter={(v) => `${v/1000}k`} />
                     <YAxis type="number" dataKey="margin" name="Margen" unit="%" tick={{fontSize: 10}} domain={[0, 50]} />
                     <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                     <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Min', fontSize: 9, fill: '#ef4444' }} />
                     <Scatter name="Sedes" data={branches.map(b => ({ name: b.name, revenue: Math.random()*100000 + 150000, margin: Math.random()*30 + 10 }))} fill="#3b82f6">
                        {branches.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#f59e0b'} />
                        ))}
                     </Scatter>
                  </ScatterChart>
               </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-8">
               <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                  <span className="material-symbols-outlined text-success">stars</span>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Sucursal Estrella: <span className="font-black">Centro</span> - Lidera en ticket medio y eficiencia de agenda.</p>
               </div>
               <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                  <span className="material-symbols-outlined text-danger">trending_down</span>
                  <p className="text-xs font-bold text-rose-800 dark:text-rose-300">Sede Deficitaria: <span className="font-black">Norte</span> - Motivo detectado: Alta tasa de cancelaciones (22%).</p>
               </div>
            </div>
         </div>
      </div>

      {/* 6. BLOQUE FINAL: AUDITORÍA IA & DECISIONES RECOMENDADAS */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white rounded-[4rem] p-16 shadow-[0_50px_100px_rgba(0,0,0,0.4)] relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
         
         <div className="relative z-10 flex flex-col items-center gap-12">
            <div className="flex items-center gap-4 bg-white/5 px-8 py-3 rounded-full border border-white/10 backdrop-blur-md">
               <span className="size-3 bg-red-500 rounded-full animate-pulse"></span>
               <span className="text-xs font-black uppercase tracking-[0.3em]">Comité de Dirección MediClinic AI</span>
            </div>

            {!aiAnalysis ? (
              <div className="text-center space-y-8">
                <h2 className="text-5xl font-display font-black uppercase tracking-tighter max-w-4xl leading-tight">¿Necesitas una Auditoría Estratégica profunda?</h2>
                <p className="text-slate-400 text-xl font-medium max-w-2xl mx-auto italic">Solicita al CFO y COO virtual un plan de acción basado en los datos actuales.</p>
                <button 
                  onClick={generateAIExecutiveAnalysis} 
                  disabled={isGenerating} 
                  className="px-20 py-8 bg-white text-slate-900 rounded-[3rem] font-black uppercase text-xl tracking-tighter shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-105 transition-all flex items-center gap-6"
                >
                  {isGenerating ? <span className="material-symbols-outlined animate-spin text-4xl">sync</span> : <span className="material-symbols-outlined text-4xl">token</span>}
                  Convocar Junta Directiva
                </button>
              </div>
            ) : (
              <div className="w-full space-y-12 animate-in slide-in-from-bottom-10 duration-700">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="bg-white/5 border border-red-500/20 p-10 rounded-[3.5rem] backdrop-blur-sm relative group hover:border-red-500/50 transition-all">
                        <div className="absolute -top-8 left-10 size-20 bg-slate-900 border-4 border-red-500 rounded-3xl flex items-center justify-center shadow-2xl">
                           <span className="material-symbols-outlined text-red-500 text-4xl">account_balance</span>
                        </div>
                        <div className="mt-8">
                           <h4 className="text-red-400 font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-3">Análisis del CFO (Finanzas)</h4>
                           <p className="text-slate-200 text-lg leading-relaxed font-medium italic border-l-4 border-red-500/30 pl-8">"{aiAnalysis.pnlInsights}"</p>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-blue-500/20 p-10 rounded-[3.5rem] backdrop-blur-sm relative group hover:border-blue-500/50 transition-all">
                        <div className="absolute -top-8 left-10 size-20 bg-slate-900 border-4 border-blue-500 rounded-3xl flex items-center justify-center shadow-2xl">
                           <span className="material-symbols-outlined text-blue-500 text-4xl">settings_accessibility</span>
                        </div>
                        <div className="mt-8">
                           <h4 className="text-blue-400 font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-3">Análisis del COO (Operaciones)</h4>
                           <p className="text-slate-200 text-lg leading-relaxed font-medium italic border-l-4 border-blue-500/30 pl-8">"{aiAnalysis.opsInsights}"</p>
                        </div>
                    </div>
                 </div>

                 {/* DECISION BOARD */}
                 <div className="bg-emerald-500/10 border border-emerald-500/30 p-12 rounded-[4rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><span className="material-symbols-outlined text-9xl text-emerald-500">verified</span></div>
                    <h4 className="text-emerald-400 font-black uppercase tracking-[0.4em] text-[10px] mb-10 flex items-center gap-3">
                       <span className="material-symbols-outlined text-xl">fact_check</span> Plan de Acción Inmediato
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                       <div className="space-y-4">
                          <p className="text-xs font-black text-white uppercase border-b border-white/20 pb-2">3 Decisiones Prioritarias</p>
                          <ul className="text-slate-300 text-sm space-y-3 font-medium">
                             {aiAnalysis.decisions.map((d: string, i: number) => <li key={i} className="flex gap-3"><span className="text-emerald-500 font-black">{i+1}.</span> {d}</li>)}
                          </ul>
                       </div>
                       <div className="space-y-4">
                          <p className="text-xs font-black text-white uppercase border-b border-white/20 pb-2">3 Acciones de Mejora</p>
                          <ul className="text-slate-300 text-sm space-y-3 font-medium">
                             {aiAnalysis.actions.map((a: string, i: number) => <li key={i} className="flex gap-3"><span className="text-emerald-500 font-black">{i+1}.</span> {a}</li>)}
                          </ul>
                       </div>
                       <div className="space-y-4">
                          <p className="text-xs font-black text-white uppercase border-b border-white/20 pb-2">Datos Faltantes (Roadmap)</p>
                          <p className="text-slate-400 text-xs italic leading-loose">{aiAnalysis.missingData}</p>
                       </div>
                    </div>
                 </div>
              </div>
            )}
         </div>
      </div>

    </div>
  );
};

export default MetricsFinancial;
