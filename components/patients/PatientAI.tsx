
import React, { useState, useRef, useEffect } from 'react';
import { Patient, ClinicSettings } from '../../types';
import { GoogleGenAI } from "@google/genai";
import { jsPDF } from "jspdf";

interface PatientAIProps {
  editData: Patient;
  clinicSettings: ClinicSettings;
}

export const PatientAI: React.FC<PatientAIProps> = ({ editData, clinicSettings }) => {
  const [aiReport, setAiReport] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiChat, setAiChat] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiChat]);

  const generateClinicalReport = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        INFORME CLÍNICO ESTRATÉGICO
        Paciente: ${editData.name}
        Biometría: ${editData.weight}kg, ${editData.height}cm
        Antecedentes: ${editData.medicalHistory || 'No informados'}
        
        Analiza este paciente basándote en los protocolos de la clínica ${clinicSettings.name}.
        Genera un informe detallado que incluya:
        1. Análisis de riesgos.
        2. Recomendaciones preventivas.
      `;
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt,
        config: { systemInstruction: "Eres un consultor clínico senior." }
      });
      setAiReport(response.text || '');
    } catch (e) { setAiReport('Error al generar análisis.'); } finally { setIsAnalyzing(false); }
  };

  const sendQuestionToAi = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setAiChat(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Consulta sobre el paciente ${editData.name}: ${msg}`,
        config: { systemInstruction: `Eres el consultor IA de ${clinicSettings.name}.` }
      });
      setAiChat(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (e) { setAiChat(prev => [...prev, { role: 'model', text: 'Error.' }]); }
  };

  return (
    <div className="flex flex-col gap-8 h-full animate-in fade-in slide-in-from-right-4 pb-12">
        <div className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-primary/10 shadow-2xl overflow-hidden flex flex-col shrink-0">
            <header className="px-10 py-8 bg-primary/5 border-b border-primary/10 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30"><span className="material-symbols-outlined text-3xl">psychology</span></div>
                    <div><h4 className="font-display font-black text-2xl uppercase tracking-tight leading-none">Consultoría Clínica IA</h4></div>
                </div>
                <button disabled={isAnalyzing} onClick={generateClinicalReport} className="px-10 py-4 bg-primary text-white rounded-2xl font-black shadow-xl uppercase text-[10px] tracking-widest hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50">{isAnalyzing ? 'Analizando...' : 'Generar Informe IA'}</button>
            </header>
            <div className="p-10 min-h-[300px] flex flex-col relative bg-slate-50/50 dark:bg-bg-dark/20">
                <div className="w-full whitespace-pre-wrap text-sm font-medium text-slate-700 dark:text-slate-300 leading-loose italic max-h-[400px] overflow-y-auto pr-6 custom-scrollbar pb-16">{aiReport || 'Sin informe generado.'}</div>
            </div>
        </div>
        <div className="flex-1 min-h-[500px] bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar bg-slate-50/20">
                {aiChat.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-6 rounded-[2.5rem] text-sm font-bold shadow-xl leading-relaxed ${m.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-tl-none text-slate-700 dark:text-slate-200'}`}>{m.text}</div>
                    </div>
                ))}
                <div ref={chatEndRef}></div>
            </div>
            <div className="p-8 bg-white dark:bg-surface-dark border-t border-slate-100 dark:border-slate-800">
                <div className="relative">
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendQuestionToAi()} placeholder={`Preguntar sobre el historial de ${editData.name.split(' ')[0]}...`} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-[2rem] py-5 pl-8 pr-20 text-sm font-bold focus:ring-4 focus:ring-primary/10 shadow-inner transition-all" />
                    <button onClick={sendQuestionToAi} className="absolute right-3 top-1/2 -translate-y-1/2 size-12 bg-primary text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-xl shadow-primary/20"><span className="material-symbols-outlined text-2xl">send</span></button>
                </div>
            </div>
        </div>
    </div>
  );
};
