
import React, { useState, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Legend, ComposedChart, Line
} from 'recharts';
import { ClinicSettings } from '../../types';
import { GoogleGenAI, Type } from "@google/genai";
import { jsPDF } from "jspdf";

interface MetricsFinancialProps {
  settings: ClinicSettings;
}

const MetricsFinancial: React.FC<MetricsFinancialProps> = ({ settings }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [financialData, setFinancialData] = useState<any>(null);
  const [aiReport, setAiReport] = useState<{
    financialExpert: string;
    operationalExpert: string;
    synthesis: string;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // --- AI: PARSE FINANCIAL DOCUMENTS ---
  const processDocuments = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const parts: any[] = [];

        // Convert files to inlineData for Gemini
        for (const file of files) {
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const res = reader.result as string;
                    resolve(res.split(',')[1]);
                };
                reader.readAsDataURL(file);
            });
            parts.push({
                inlineData: {
                    mimeType: file.type,
                    data: base64
                }
            });
        }

        const prompt = `
            Analyze these financial documents (Balance Sheets, Income Statements, Excel exports).
            Extract key financial metrics for a timeline (ideally monthly or quarterly).
            
            Strictly return JSON with this structure:
            {
                "timeline": [
                    { "period": "Q1 2024", "revenue": 120000, "cogs": 40000, "expenses": 30000, "netIncome": 50000, "grossMargin": 66.6, "netMargin": 41.6 }
                ],
                "byBranch": [
                    { "name": "Branch Name", "revenue": 50000, "profit": 10000, "margin": 20 }
                ],
                "byService": [
                    { "name": "Service Name", "revenue": 20000, "profit": 5000 }
                ]
            }
            If exact numbers aren't clear, estimate based on the visual graphs or tables provided. Ensure consistent data types.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Good for OCR/Documents
            contents: {
                role: 'user',
                parts: [...parts, { text: prompt }]
            },
            config: {
                responseMimeType: "application/json"
            }
        });

        if (response.text) {
            setFinancialData(JSON.parse(response.text));
        }

    } catch (e) {
        console.error(e);
        alert("Error procesando documentos. Asegúrate de que sean legibles.");
    } finally {
        setIsProcessing(false);
    }
  };

  // --- AI: GENERATE DUAL-AGENT REPORT ---
  const generateStrategicReport = async () => {
    if (!financialData) { alert("Primero procesa los documentos financieros."); return; }
    setIsProcessing(true);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const context = `
            CONTEXTO:
            - Empresa: ${settings.name}
            - Sector: ${settings.sector}
            - Región: ${settings.region}
            - Datos Financieros Extraídos: ${JSON.stringify(financialData)}
        `;

        const prompt = `
            ACTÚA COMO UN CONSEJO DE ADMINISTRACIÓN DE ÉLITE. Genera un informe estratégico BRUTAL.
            
            AGENTE 1: EXPERTO FINANCIERO DE WALL STREET
            - Analiza márgenes, EBITDA, y salud financiera.
            - Compara con estándares globales (USA/Europa) y locales (${settings.region}).
            - Usa Google Search para tendencias MACRO económicas actuales en el sector de ${settings.sector}.
            
            AGENTE 2: CEO EXPERTO EN OPERACIONES (${settings.sector})
            - Analiza la eficiencia operativa por sede/servicio.
            - Propone estrategias de crecimiento agresivo o consolidación.
            - Busca tendencias de consumo local en ${settings.region}.

            Salida JSON:
            {
                "financialExpert": "Análisis profundo...",
                "operationalExpert": "Estrategia operativa...",
                "synthesis": "Plan de acción conjunto..."
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: context + "\n" + prompt,
            tools: [{ googleSearch: {} }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        financialExpert: { type: Type.STRING },
                        operationalExpert: { type: Type.STRING },
                        synthesis: { type: Type.STRING }
                    }
                }
            }
        });

        setAiReport(JSON.parse(response.text || "{}"));

    } catch (e) {
        console.error(e);
        alert("Error generando el informe estratégico.");
    } finally {
        setIsProcessing(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(`Informe Financiero Maestro`, 20, 20);
    doc.setFontSize(12);
    doc.text(`${settings.name} - ${settings.sector}`, 20, 30);
    
    if (aiReport) {
        doc.setFontSize(14);
        doc.text("Análisis Financiero Global", 20, 50);
        doc.setFontSize(10);
        const splitFin = doc.splitTextToSize(aiReport.financialExpert, 170);
        doc.text(splitFin, 20, 60);
        
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Estrategia Operativa", 20, 20);
        doc.setFontSize(10);
        const splitOp = doc.splitTextToSize(aiReport.operationalExpert, 170);
        doc.text(splitOp, 20, 30);
    }
    
    doc.save(`Financial_Report_Master.pdf`);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="relative z-10 flex justify-between items-end">
                <div>
                    <h1 className="text-5xl font-display font-black uppercase tracking-tighter mb-2">Métrica Financiera</h1>
                    <p className="text-slate-400 font-medium text-lg">Inteligencia de Negocio & Análisis de Balances</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center gap-3 transition-all">
                        <span className="material-symbols-outlined">upload_file</span> Subir Balances (PDF/Excel)
                    </button>
                    <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
                    
                    <button onClick={processDocuments} disabled={isProcessing || files.length === 0} className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:shadow-none">
                        {isProcessing ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">smart_toy</span>} 
                        {isProcessing ? 'Analizando...' : 'Procesar Datos'}
                    </button>
                </div>
            </div>
            {files.length > 0 && (
                <div className="mt-8 flex gap-4 overflow-x-auto pb-2">
                    {files.map((f, i) => (
                        <div key={i} className="px-4 py-2 bg-black/40 rounded-lg border border-white/10 flex items-center gap-3 shrink-0">
                            <span className="material-symbols-outlined text-slate-400 text-sm">description</span>
                            <span className="text-xs font-bold text-slate-300">{f.name}</span>
                            <button onClick={() => removeFile(i)} className="text-slate-500 hover:text-red-400"><span className="material-symbols-outlined text-sm">close</span></button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* FINANCIAL DASHBOARD (Only shows if data exists) */}
        {financialData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                
                {/* 1. Main Financial Evolution */}
                <div className="col-span-full lg:col-span-2 bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Evolución de Resultados (P&L)</h3>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={financialData.timeline}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                                <YAxis yAxisId="right" orientation="right" stroke="#10b981" axisLine={false} tickLine={false} unit="%" />
                                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)'}} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="revenue" name="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar yAxisId="left" dataKey="expenses" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                                <Line yAxisId="left" type="monotone" dataKey="netIncome" name="Beneficio Neto" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
                                <Line yAxisId="right" type="monotone" dataKey="netMargin" name="Margen %" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Branch Profitability */}
                <div className="bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Rentabilidad por Sede</h3>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={financialData.byBranch} layout="vertical" margin={{left: 20}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="profit" name="Beneficio" fill="#8b5cf6" radius={[0, 10, 10, 0]} barSize={24}>
                                    {financialData.byBranch.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.margin > 20 ? '#10b981' : entry.margin > 10 ? '#f59e0b' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Service Profitability Cascade */}
                <div className="col-span-full xl:col-span-3 bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Contribución al Margen por Servicio</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={financialData.byService}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                                <Tooltip />
                                <Bar dataKey="profit" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-32 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] opacity-50">
                <span className="material-symbols-outlined text-8xl mb-4 text-slate-400">query_stats</span>
                <p className="text-2xl font-black text-slate-400 uppercase tracking-widest">Sube tus balances para visualizar métricas</p>
            </div>
        )}

        {/* AI STRATEGIC REPORT */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] -mr-32 -mt-32"></div>
            
            <div className="relative z-10 flex flex-col gap-8">
                <div className="flex justify-between items-center border-b border-white/10 pb-8">
                    <div>
                        <h2 className="text-3xl font-display font-black uppercase tracking-tight">Consejo Asesor IA</h2>
                        <p className="text-indigo-300 font-medium">Análisis de Mercado Global & Local ({settings.region})</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={generateStrategicReport} disabled={!financialData || isProcessing} className="px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            {isProcessing ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">psychology</span>} Generar Informe
                        </button>
                        {aiReport && (
                            <button onClick={downloadPDF} className="size-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all">
                                <span className="material-symbols-outlined">download</span>
                            </button>
                        )}
                    </div>
                </div>

                {aiReport ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-emerald-400">
                                <span className="material-symbols-outlined text-3xl">trending_up</span>
                                <h3 className="text-xl font-black uppercase tracking-widest">Experto Financiero</h3>
                            </div>
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-sm leading-loose text-slate-300 whitespace-pre-wrap font-medium">
                                {aiReport.financialExpert}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-orange-400">
                                <span className="material-symbols-outlined text-3xl">factory</span>
                                <h3 className="text-xl font-black uppercase tracking-widest">Experto Operativo ({settings.sector})</h3>
                            </div>
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-sm leading-loose text-slate-300 whitespace-pre-wrap font-medium">
                                {aiReport.operationalExpert}
                            </div>
                        </div>
                        <div className="col-span-full p-8 bg-indigo-500/10 rounded-3xl border border-indigo-500/30">
                            <h3 className="text-lg font-black uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2"><span className="material-symbols-outlined">verified</span> Síntesis Ejecutiva</h3>
                            <p className="text-sm leading-relaxed text-white font-medium">{aiReport.synthesis}</p>
                        </div>
                    </div>
                ) : (
                    <div className="py-20 text-center italic text-slate-500">
                        Genera el informe para obtener insights de alto nivel sobre tus datos financieros.
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default MetricsFinancial;
