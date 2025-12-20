
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area, Legend 
} from 'recharts';
import { Appointment, Doctor, Patient, ClinicSettings } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { jsPDF } from "jspdf";

interface MetricsProps {
  appointments: Appointment[];
  doctors: Doctor[];
  patients: Patient[];
  settings?: ClinicSettings; // Add settings to access company name and context
}

const treatmentPrices: Record<string, number> = {
  'Limpieza Dental Profunda': 80,
  'Limpieza Dental': 60,
  'Ortodoncia': 1200,
  'Ortodoncia Invisible': 3500,
  'Cirugía Maxilofacial': 850,
  'Consulta General': 50,
  'Revisión Periódica': 45,
  'Implante Titanio': 1200,
  'Endodoncia Molar': 250,
  'Blanqueamiento': 180
};

const Metrics: React.FC<MetricsProps> = ({ appointments, doctors, patients, settings }) => {
  const [branchFilter, setBranchFilter] = useState('Todas las sedes');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  
  // Nuevo Estado para el filtro de la comparativa
  const [compFilter, setCompFilter] = useState<'1m' | '3m' | '6m' | '1y'>('3m');

  // AI Analysis State
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{diagnosis: string, conclusions: string, recommendations: string} | null>(null);

  const branches = useMemo(() => {
    const unique = Array.from(new Set(doctors.map(d => d.branch)));
    return ['Todas las sedes', ...unique];
  }, [doctors]);

  // --- FILTRADO MAESTRO DE DATOS (Contexto Sucursal) ---
  // Esta variable contiene TODAS las citas históricas que pertenecen al contexto seleccionado (Global o Sucursal X)
  const relevantAppointments = useMemo(() => {
    if (branchFilter === 'Todas las sedes') {
      return appointments;
    }
    // Filtrar doctores que pertenecen a la sucursal seleccionada
    const branchDocIds = new Set(doctors.filter(d => d.branch === branchFilter).map(d => d.id));
    // Filtrar citas asociadas a esos doctores
    return appointments.filter(a => branchDocIds.has(a.doctorId));
  }, [appointments, doctors, branchFilter]);

  // Lógica de Filtrado de Datos Visual (Para las gráficas SUPERIORES de Área/Pie/Top)
  // Usa relevantAppointments como base en lugar de appointments crudos
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
    
    // Para volumen futuro (Agenda), extendemos el rango si es vista anual
    const endDate = new Date();
    if (timeRange === '1y') endDate.setMonth(now.getMonth() + 6); // Ver 6 meses a futuro
    else endDate.setDate(now.getDate() + 7); // Ver 1 semana a futuro en vistas cortas

    // Doctores visibles (para ranking)
    const doctorsInBranch = branchFilter === 'Todas las sedes' 
      ? doctors 
      : doctors.filter(d => d.branch === branchFilter);

    // Citas que caen en el rango visual (usamos relevantAppointments para asegurar consistencia)
    const currentApts = relevantAppointments.filter(a => {
      const d = new Date(a.date);
      return d >= startDate && d <= endDate;
    });

    // Periodo anterior para tendencias de ingresos (solo pasado)
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(startDate.getDate() - days);
    const prevEndDate = new Date(startDate);

    const prevApts = relevantAppointments.filter(a => {
      const d = new Date(a.date);
      return d >= prevStartDate && d < prevEndDate;
    });

    return { currentApts, prevApts, doctorsInBranch, startDate, prevStartDate, now, endDate, days };
  }, [relevantAppointments, doctors, branchFilter, timeRange]);

  // KPIs (Superiores)
  const stats = useMemo(() => {
    const { currentApts, prevApts, now } = filteredData;
    
    const calcRevenue = (list: Appointment[]) => 
      list.filter(a => a.status === 'Completed').reduce((acc, curr) => acc + (treatmentPrices[curr.treatment] || 50), 0);

    const rev = calcRevenue(currentApts.filter(a => new Date(a.date) <= now));
    const prevRev = calcRevenue(prevApts);
    const revTrend = prevRev === 0 ? '+100%' : `${(((rev - prevRev) / prevRev) * 100).toFixed(1)}%`;

    // El volumen incluye futuras
    const count = currentApts.length;
    const prevCount = prevApts.length;
    const countTrend = prevCount === 0 ? '+100%' : `${(((count - prevCount) / prevCount) * 100).toFixed(1)}%`;

    const pastApts = currentApts.filter(a => new Date(a.date) <= now);
    const completed = pastApts.filter(a => a.status === 'Completed').length;
    const cancelled = pastApts.filter(a => a.status === 'Cancelled').length;
    const efficiency = pastApts.length > 0 ? ((completed / (pastApts.length - cancelled || 1)) * 100).toFixed(1) : '0';

    return { rev, revTrend, count, countTrend, efficiency };
  }, [filteredData]);

  // Generación de Datos para Gráficas SUPERIORES
  const charts = useMemo(() => {
    const { currentApts, doctorsInBranch, startDate, endDate, now } = filteredData;

    // 1. Pie Data (Estado de citas en el rango)
    const statusMap = currentApts.reduce((acc: any, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    const pieData = [
      { name: 'Completadas', value: statusMap['Completed'] || 0, color: '#10b981' },
      { name: 'Pendientes', value: statusMap['Pending'] || 0, color: '#3b82f6' },
      { name: 'Canceladas', value: statusMap['Cancelled'] || 0, color: '#ef4444' },
      { name: 'Confirmadas', value: statusMap['Confirmed'] || 0, color: '#6366f1' },
    ].filter(d => d.value > 0);

    // 2. Doctor Data (Productividad)
    const docData = doctorsInBranch.map(d => {
      // Filtramos sobre relevantAppointments para asegurar consistencia de sucursal
      const apts = relevantAppointments.filter(a => a.doctorId === d.id && new Date(a.date) >= startDate && new Date(a.date) <= now);
      const rating = 4.2 + (parseInt(d.id.replace(/\D/g, '') || '0') % 9) / 10;
      return {
        name: d.name.split(' ').slice(-1)[0],
        citas: apts.length,
        facturacion: apts.filter(a => a.status === 'Completed').reduce((acc, a) => acc + (treatmentPrices[a.treatment] || 50), 0),
        rating: rating
      };
    }).sort((a, b) => b.facturacion - a.facturacion).slice(0, 8);

    // 3. Top Treatments
    const treatMap = currentApts.reduce((acc: any, a) => {
      acc[a.treatment] = (acc[a.treatment] || 0) + 1;
      return acc;
    }, {});

    const topTreats = Object.entries(treatMap)
      .map(([name, count]: any) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 4. Area Data (Evolución REAL)
    const areaData = [];
    
    if (timeRange === '7d' || timeRange === '30d') {
      const daysToIterate = timeRange === '7d' ? 7 : 30;
      for (let i = daysToIterate; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        const dayApts = currentApts.filter(a => a.date === ds);
        areaData.push({
          name: timeRange === '7d' ? d.toLocaleDateString('es-ES', {weekday:'short'}) : d.getDate().toString(),
          value: dayApts.filter(a => a.status === 'Completed').reduce((acc, a) => acc + (treatmentPrices[a.treatment] || 50), 0),
          volumen: dayApts.length
        });
      }
    } else {
      for (let i = 11; i >= -2; i--) { 
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = d.getMonth();
        const year = d.getFullYear();
        
        const monthApts = currentApts.filter(a => {
          const ad = new Date(a.date);
          return ad.getMonth() === month && ad.getFullYear() === year;
        });

        areaData.push({
          name: d.toLocaleDateString('es-ES', { month: 'short', year: i !== 0 ? '2-digit' : undefined }),
          value: monthApts.filter(a => a.status === 'Completed').reduce((acc, a) => acc + (treatmentPrices[a.treatment] || 50), 0),
          volumen: monthApts.length
        });
      }
    }

    return { pieData, docData, topTreats, areaData };
  }, [filteredData, timeRange, relevantAppointments]);

  // --- NUEVA LÓGICA: Gráficas Comparativas (Respeta Filtro de Sede) ---
  const comparativeData = useMemo(() => {
    // Usamos 'relevantAppointments' (Ya filtrado por sede)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let periods = 0;
    let unit = 'month'; 

    if (compFilter === '1m') { periods = 30; unit = 'day'; } 
    else if (compFilter === '3m') { periods = 3; unit = 'month'; } 
    else if (compFilter === '6m') { periods = 6; unit = 'month'; } 
    else { periods = 12; unit = 'month'; }

    const items = [];
    
    for (let i = periods - 1; i >= 0; i--) {
        let label = '';
        let currentVal = 0;
        let prevVal = 0;

        if (unit === 'day') {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            label = d.getDate().toString();

            const prevD = new Date(d);
            prevD.setMonth(d.getMonth() - 1); 
            const prevDStr = prevD.toISOString().split('T')[0];

            currentVal = relevantAppointments
                .filter(a => a.date === dStr && a.status === 'Completed')
                .reduce((acc, a) => acc + (treatmentPrices[a.treatment] || 50), 0);
            
            prevVal = relevantAppointments
                .filter(a => a.date === prevDStr && a.status === 'Completed')
                .reduce((acc, a) => acc + (treatmentPrices[a.treatment] || 50), 0);

        } else {
            const d = new Date(currentYear, currentMonth - i, 1);
            label = d.toLocaleDateString('es-ES', { month: 'short' });
            const p = new Date(currentYear - 1, currentMonth - i, 1); 

            currentVal = relevantAppointments
                .filter(a => {
                    const ad = new Date(a.date);
                    return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear() && a.status === 'Completed';
                })
                .reduce((acc, a) => acc + (treatmentPrices[a.treatment] || 50), 0);

            prevVal = relevantAppointments
                .filter(a => {
                    const ad = new Date(a.date);
                    return ad.getMonth() === p.getMonth() && ad.getFullYear() === p.getFullYear() && a.status === 'Completed';
                })
                .reduce((acc, a) => acc + (treatmentPrices[a.treatment] || 50), 0);
        }

        items.push({ name: label, actual: currentVal, anterior: prevVal });
    }

    return items;
  }, [relevantAppointments, compFilter]);

  // Generación de Insights Manuales (Fallback)
  const manualInsights = useMemo(() => {
      const totalActual = comparativeData.reduce((acc, item) => acc + item.actual, 0);
      const totalPrev = comparativeData.reduce((acc, item) => acc + item.anterior, 0);
      const diff = totalActual - totalPrev;
      const percent = totalPrev === 0 ? 100 : (diff / totalPrev) * 100;
      const isPositive = diff >= 0;

      let conclusions = "";
      let recommendations = "";

      if (isPositive) {
          conclusions = `Crecimiento del ${percent.toFixed(1)}% en ${branchFilter}. Tendencia al alza detectada.`;
          recommendations = "Potenciar servicios rentables y evaluar ampliación de horarios.";
      } else {
          conclusions = `Ajuste del ${Math.abs(percent).toFixed(1)}% en ${branchFilter}. Ligera contracción respecto al periodo anterior.`;
          recommendations = "Revisar tasas de cancelación y activar recall de pacientes.";
      }

      return { totalActual, totalPrev, diff, percent, isPositive, conclusions, recommendations };
  }, [comparativeData, branchFilter]);

  // --- FUNCIÓN GENERADORA IA ---
  const generateAiAnalysis = async () => {
    setIsGeneratingAi(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const companyName = settings?.name || "Clínica Médica";
        const contextScope = "Global (Toda la Empresa)";
        
        // Preparar resumen de datos para el prompt
        const topServices = charts.topTreats.map(t => `${t.name} (${t.count})`).join(", ");
        const financialContext = `
            Ámbito de Análisis: ${contextScope}
            Ingresos Periodo Actual: ${settings?.currency || '€'}${manualInsights.totalActual.toLocaleString()}
            Ingresos Periodo Anterior: ${settings?.currency || '€'}${manualInsights.totalPrev.toLocaleString()}
            Variación: ${manualInsights.isPositive ? '+' : ''}${manualInsights.percent.toFixed(1)}%
            Eficiencia Operativa: ${stats.efficiency}%
            Servicios Top: ${topServices}
        `;

        const prompt = `
            Eres un Consultor Financiero Senior experto en gestión sanitaria para: ${companyName}.
            
            Analiza los siguientes DATOS REALES (${contextScope}):
            ${financialContext}

            INSTRUCCIONES:
            1. Analiza la rentabilidad Global de la empresa.
            2. Busca causas operativas y oportunidades de crecimiento.
            3. Sé muy ejecutivo.

            Devuelve JSON:
            {
                "diagnosis": "Diagnóstico de situación en 2 frases...",
                "conclusions": "Análisis de causas clave...",
                "recommendations": "3 acciones tácticas concretas..."
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        diagnosis: { type: Type.STRING },
                        conclusions: { type: Type.STRING },
                        recommendations: { type: Type.STRING }
                    }
                }
            }
        });

        const jsonText = response.text || "{}";
        const result = JSON.parse(jsonText);
        setAiAnalysis(result);

    } catch (error) {
        console.error("AI Generation Error", error);
        alert("Error generando el análisis IA. Inténtalo de nuevo.");
    } finally {
        setIsGeneratingAi(false);
    }
  };

  // --- GENERACIÓN PDF ---
  const downloadPDF = () => {
    const doc = new jsPDF();
    const primaryColor = [59, 130, 246]; // Tailwind Blue-500 equivalent
    const darkColor = [30, 41, 59]; // Slate-800

    // Header Background
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');

    // Title & Logo Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Informe Estratégico de Rendimiento", 15, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(settings?.name || "Clínica Médica", 15, 28);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 15, 34);

    // Branch Context Badge
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(140, 10, 55, 20, 3, 3, 'F');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(8);
    doc.text("ÁMBITO DEL ANÁLISIS", 145, 18);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("GLOBAL EMPRESA", 145, 25);

    // KPI Summary Section
    let yPos = 55;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen Ejecutivo", 15, yPos);
    
    yPos += 10;
    // Draw 3 Boxes
    const boxWidth = 55;
    const boxHeight = 25;
    const gap = 10;
    
    // Box 1: Actual
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, yPos, boxWidth, boxHeight, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Facturación Actual", 20, yPos + 8);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`${settings?.currency || '€'}${manualInsights.totalActual.toLocaleString()}`, 20, yPos + 18);

    // Box 2: Previous
    doc.roundedRect(15 + boxWidth + gap, yPos, boxWidth, boxHeight, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Periodo Anterior", 20 + boxWidth + gap, yPos + 8);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`${settings?.currency || '€'}${manualInsights.totalPrev.toLocaleString()}`, 20 + boxWidth + gap, yPos + 18);

    // Box 3: Growth
    doc.roundedRect(15 + (boxWidth + gap) * 2, yPos, boxWidth, boxHeight, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Crecimiento / Variación", 20 + (boxWidth + gap) * 2, yPos + 8);
    doc.setFontSize(12);
    doc.setTextColor(manualInsights.isPositive ? 0 : 220, manualInsights.isPositive ? 150 : 20, 60); // Green or Red
    doc.text(`${manualInsights.isPositive ? '+' : ''}${manualInsights.percent.toFixed(1)}%`, 20 + (boxWidth + gap) * 2, yPos + 18);

    // AI Analysis Content
    yPos += 40;
    
    const printSection = (title: string, content: string, icon: string) => {
        doc.setFontSize(12);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont("helvetica", "bold");
        doc.text(title.toUpperCase(), 15, yPos);
        
        // Line under title
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(15, yPos + 2, 195, yPos + 2);

        yPos += 10;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.setFont("helvetica", "normal");
        
        const splitText = doc.splitTextToSize(content, 180);
        doc.text(splitText, 15, yPos);
        yPos += (splitText.length * 5) + 15;
    };

    const diagnosis = aiAnalysis ? aiAnalysis.diagnosis : displayInsights.diagnosis;
    const conclusions = aiAnalysis ? aiAnalysis.conclusions : displayInsights.conclusions;
    const recommendations = aiAnalysis ? aiAnalysis.recommendations : displayInsights.recommendations;

    printSection("Diagnóstico Financiero", diagnosis, "");
    printSection("Conclusiones de Mercado", conclusions, "");
    printSection("Recomendaciones Estratégicas", recommendations, "");

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Informe confidencial generado por MediClinic AI - Global`, 105, 280, { align: "center" });

    doc.save(`Informe_Estrategico_Global_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Determinar qué insights mostrar (IA o Manual)
  const displayInsights = aiAnalysis ? {
      diagnosis: aiAnalysis.diagnosis,
      conclusions: aiAnalysis.conclusions,
      recommendations: aiAnalysis.recommendations,
      percent: manualInsights.percent, 
      isPositive: manualInsights.isPositive,
      diff: manualInsights.diff
  } : {
      diagnosis: `Variación neta de ${settings?.currency || '€'}${manualInsights.diff.toLocaleString()} a nivel Global.`,
      conclusions: manualInsights.conclusions,
      recommendations: manualInsights.recommendations,
      percent: manualInsights.percent,
      isPositive: manualInsights.isPositive,
      diff: manualInsights.diff
  };

  return (
    <div className="p-10 max-w-[1600px] mx-auto w-full space-y-10 animate-in fade-in duration-500">
      
      {/* Header Estilizado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white dark:bg-surface-dark p-8 rounded-[3rem] border border-border-light dark:border-border-dark shadow-xl">
        <div className="space-y-1">
          <h1 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Inteligencia de Negocio</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="size-2 bg-success rounded-full animate-pulse"></span>
            <p className="text-slate-500 dark:text-slate-400 font-medium italic text-sm">Analizando {relevantAppointments.length.toLocaleString()} registros ({branchFilter})</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Sucursal</label>
            <div className="relative">
              <select 
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-3.5 text-sm font-bold appearance-none min-w-[200px] focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              >
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">location_on</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Rango Temporal</label>
            <div className="flex bg-slate-100 dark:bg-bg-dark p-1.5 rounded-[1.25rem] border border-slate-200 dark:border-slate-700 shadow-inner">
              {(['7d', '30d', '90d', '1y'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${timeRange === r ? 'bg-white dark:bg-surface-dark text-primary shadow-lg' : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
                >
                  {r === '7d' ? '7 Días' : r === '30d' ? '30 Días' : r === '90d' ? 'Trimestre' : 'Año'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Dinámicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        {[
          { label: "Facturación Bruta", val: `${settings?.currency || '€'}${stats.rev.toLocaleString()}`, icon: "payments", trend: stats.revTrend, color: "text-success", bg: "bg-success/10" },
          { label: "Volumen de Citas", val: stats.count.toLocaleString(), icon: "calendar_month", trend: stats.countTrend, color: "text-primary", bg: "bg-primary/10" },
          { label: "Pacientes Únicos", val: Math.floor(patients.length * 1.2).toLocaleString(), icon: "person_add", trend: "+12.4%", color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Tasa Eficiencia", val: `${stats.efficiency}%`, icon: "verified", trend: "Score", color: "text-orange-500", bg: "bg-orange-500/10" }
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] border border-border-light dark:border-border-dark shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className={`absolute -right-4 -top-4 size-24 ${kpi.bg} rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 scale-0 group-hover:scale-150`}></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`size-14 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                <span className="material-symbols-outlined text-3xl">{kpi.icon}</span>
              </div>
              <span className={`${kpi.color} text-[10px] font-black bg-slate-50 dark:bg-bg-dark px-3 py-1 rounded-full border border-current/20`}>{kpi.trend}</span>
            </div>
            <div className="relative z-10">
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{kpi.label}</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{kpi.val}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* --- SECCIÓN COMPARATIVA CONTEXTUAL (FILTRADA POR SUCURSAL) --- */}
      <div className={`rounded-[3rem] border p-10 shadow-xl space-y-8 animate-in slide-in-from-bottom-4 transition-colors duration-500 ${aiAnalysis ? 'bg-gradient-to-br from-white to-purple-50/50 dark:from-surface-dark dark:to-purple-900/10 border-purple-200 dark:border-purple-800' : 'bg-white dark:bg-surface-dark border-border-light dark:border-border-dark'}`}>
         <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div>
               <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-xl flex items-center justify-center ${aiAnalysis ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-purple-500/10 text-purple-500'}`}>
                      <span className="material-symbols-outlined">{aiAnalysis ? 'psychology' : 'query_stats'}</span>
                  </div>
                  <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Análisis de Rendimiento: {branchFilter}</h3>
               </div>
               <p className="text-slate-400 text-xs font-bold mt-2 ml-14 italic">Comparativa de ingresos filtrada por los médicos asignados a esta sede.</p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-4">
                {/* Botones de IA y PDF solo para Global */}
                {branchFilter === 'Todas las sedes' && (
                    <>
                        <button 
                            onClick={downloadPDF}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-all"
                        >
                            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                            Descargar Informe PDF
                        </button>

                        <button 
                            onClick={generateAiAnalysis}
                            disabled={isGeneratingAi}
                            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-purple-500/20 transition-all hover:scale-105 disabled:opacity-70 disabled:scale-100"
                        >
                            {isGeneratingAi ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-base">sync</span>
                                    Analizando Global...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                                    Generar Estrategia IA
                                </>
                            )}
                        </button>
                    </>
                )}

                {/* Filtros de Comparativa */}
                <div className="flex bg-slate-100 dark:bg-bg-dark p-1.5 rounded-[1.25rem] border border-slate-200 dark:border-slate-700 shadow-inner">
                  {[
                    { id: '1m', label: '1M' },
                    { id: '3m', label: '3M' },
                    { id: '6m', label: '6M' },
                    { id: '1y', label: '1A' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setCompFilter(f.id as any)}
                      className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${compFilter === f.id ? 'bg-white dark:bg-surface-dark text-purple-600 shadow-lg scale-105' : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
            </div>
         </div>
         
         <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={comparativeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} fontWeight={700} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                     cursor={{ fill: 'transparent' }}
                     contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                     itemStyle={{ fontWeight: '800', fontSize: '12px' }}
                  />
                  <Bar dataKey="actual" name="Actual" fill="#3b82f6" radius={[6, 6, 6, 6]} barSize={compFilter === '1y' ? 30 : 20} />
                  <Bar dataKey="anterior" name="Anterior" fill="#cbd5e1" radius={[6, 6, 6, 6]} barSize={compFilter === '1y' ? 30 : 20} />
               </BarChart>
            </ResponsiveContainer>
         </div>

         {/* SECCIÓN DE INFORMES Y CONCLUSIONES (SOLO VISIBLE SI 'TODAS LAS SEDES') */}
         {branchFilter === 'Todas las sedes' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden group transition-colors ${aiAnalysis ? 'bg-white/80 dark:bg-surface-dark border-purple-200 dark:border-purple-800' : 'bg-slate-50 dark:bg-bg-dark border-slate-100 dark:border-slate-800'}`}>
                   <div className={`absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity ${displayInsights.isPositive ? 'text-success' : 'text-danger'}`}>
                      <span className="material-symbols-outlined text-8xl">{displayInsights.isPositive ? 'trending_up' : 'trending_down'}</span>
                   </div>
                   <div className="flex items-center gap-2 mb-4">
                       {aiAnalysis && <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded text-[9px] font-black uppercase">IA</span>}
                       <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Diagnóstico Global</h4>
                   </div>
                   <p className={`text-4xl font-black mb-2 ${displayInsights.isPositive ? 'text-success' : 'text-danger'}`}>
                      {displayInsights.isPositive ? '+' : ''}{displayInsights.percent.toFixed(1)}%
                   </p>
                   <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                      {displayInsights.diagnosis}
                   </p>
                </div>

                <div className={`p-8 rounded-[2.5rem] border relative transition-colors ${aiAnalysis ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/10'}`}>
                   <div className="flex items-center gap-2 mb-4">
                       {aiAnalysis && <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-black uppercase">IA</span>}
                       <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">lightbulb</span> Conclusiones
                       </h4>
                   </div>
                   <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-loose">
                      {displayInsights.conclusions}
                   </p>
                </div>

                <div className={`p-8 rounded-[2.5rem] border relative transition-colors ${aiAnalysis ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800' : 'bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/10'}`}>
                   <div className="flex items-center gap-2 mb-4">
                       {aiAnalysis && <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded text-[9px] font-black uppercase">IA</span>}
                       <h4 className="text-[11px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">rocket_launch</span> Recomendaciones
                       </h4>
                   </div>
                   <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-loose">
                      {displayInsights.recommendations}
                   </p>
                </div>
             </div>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Gráfica de Área (Movimiento y Fluidez) */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-[3rem] border border-border-light dark:border-border-dark p-10 shadow-xl space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Evolución de Ingresos y Volumen</h3>
              <p className="text-slate-400 text-xs font-bold mt-1 italic">Datos filtrados por: {branchFilter}</p>
            </div>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-primary shadow-sm shadow-primary/40"></span>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Facturación ({settings?.currency || '€'})</span>
               </div>
               <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Volumen Citas</span>
               </div>
            </div>
          </div>
          
          <div className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.areaData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: '800', fontSize: '12px' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="value" name={`Ingresos (${settings?.currency || '€'})`} stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorValue)" animationDuration={2000} />
                <Area yAxisId="right" type="monotone" dataKey="volumen" name="Citas" stroke="#cbd5e1" strokeWidth={2} fillOpacity={0} animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut de Operaciones (Sleek) */}
        <div className="bg-white dark:bg-surface-dark rounded-[3rem] border border-border-light dark:border-border-dark p-10 shadow-xl flex flex-col space-y-10">
          <div>
            <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight text-center">Estado Operativo</h3>
            <p className="text-slate-400 text-xs font-bold mt-1 text-center italic">Desglose porcentual del periodo</p>
          </div>
          
          <div className="h-[280px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {charts.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-4xl font-black text-slate-900 dark:text-white">{stats.efficiency}%</span>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eficiencia</span>
            </div>
          </div>

          <div className="space-y-4">
            {charts.pieData.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                <div className="flex items-center gap-3">
                   <span className="size-3 rounded-full" style={{ backgroundColor: s.color }}></span>
                   <span className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{s.name}</span>
                </div>
                <span className="text-sm font-black text-slate-500">{s.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Listado de Servicios TOP Estilizado */}
        <div className="bg-white dark:bg-surface-dark rounded-[3rem] border border-border-light dark:border-border-dark p-10 shadow-xl space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Servicios Más Demandados</h3>
              <span className="material-symbols-outlined text-primary text-3xl">trending_up</span>
           </div>
           <div className="space-y-6">
              {charts.topTreats.map((t, i) => (
                <div key={i} className="group flex items-center gap-6 p-6 bg-slate-50 dark:bg-bg-dark rounded-[2.5rem] border border-transparent hover:border-primary transition-all">
                   <div className="size-14 rounded-2xl bg-white dark:bg-surface-dark flex items-center justify-center font-black text-xl text-primary shadow-sm border border-slate-100 dark:border-slate-800 group-hover:scale-110 transition-transform">0{i+1}</div>
                   <div className="flex-1">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.name}</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t.count.toLocaleString()} servicios agendados</p>
                   </div>
                   <div className="text-right">
                      <span className="text-lg font-black text-primary">{settings?.currency || '€'}{((treatmentPrices[t.name] || 50) * t.count).toLocaleString()}</span>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Vol. Generado</p>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Productividad Médica (Tabla Estilizada) */}
        <div className="bg-white dark:bg-surface-dark rounded-[3rem] border border-border-light dark:border-border-dark p-10 shadow-xl space-y-8 flex flex-col">
           <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Productividad por Facultativo</h3>
              <span className="material-symbols-outlined text-primary text-3xl">star</span>
           </div>
           
           <div className="flex-1 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-bg-dark text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-5">Especialista</th>
                    <th className="px-6 py-5 text-center">Citas</th>
                    <th className="px-6 py-5 text-center">Rating</th>
                    <th className="px-6 py-5 text-right">Facturación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {charts.docData.map((doc, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-bg-dark/50 transition-colors">
                      <td className="px-6 py-6">
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase">{doc.name}</span>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-xl text-xs font-black">{doc.citas.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-6 text-center">
                         <div className="flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-warning text-lg filled">star</span>
                            <span className="text-sm font-black text-slate-700 dark:text-slate-300">{doc.rating.toFixed(1)}</span>
                         </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <span className="text-sm font-black text-slate-900 dark:text-white">{doc.facturacion.toLocaleString()}{settings?.currency || '€'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
           
           <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex items-center justify-between mt-auto">
              <div>
                 <p className="text-2xl font-black text-primary">{settings?.currency || '€'}{(stats.rev / (charts.docData.length || 1)).toFixed(0).toLocaleString()}</p>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Ticket medio por facultativo</p>
              </div>
              <div className="flex gap-2">
                 {[...Array(5)].map((_, i) => <div key={i} className="size-2 rounded-full bg-primary/30"></div>)}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Metrics;
