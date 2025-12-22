
import React, { useState, useRef, useEffect } from 'react';
import { Patient, ClinicSettings } from '../../types';
import { GoogleGenAI } from "@google/genai";

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
        ANALISTA CLÍNICO AVANZADO - INFORME ESTRATÉGICO
        Paciente: ${editData.name}
        
        HISTORIAL ESTRUCTURADO (PÍLDORAS):
        - Alergias: ${editData.allergies?.join(', ') || 'Ninguna'}
        - Patologías: ${editData.pathologies?.join(', ') || 'Ninguna'}
        - Cirugías: ${editData.surgeries?.join(', ') || 'Ninguna'}
        - Medicación: ${editData.medications?.join(', ') || 'Ninguna'}
        - Hábitos: ${editData.habits?.join(', ') || 'Ninguna'}
        
        NOTAS ADICIONALES:
        ${editData.medicalHistory || 'Sin notas.'}
        
        INSTRUCCIONES:
        1. Analiza posibles interacciones o riesgos basados en el historial estructurado.
        2. Proporciona recomendaciones específicas para el equipo médico de ${clinicSettings.name}.
        3. Genera un resumen ejecutivo de salud.
      `;
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt,
        config: { systemInstruction: "Eres un consultor clínico senior experto en triaje y seguridad del paciente." }
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
      const prompt = `
        Contexto del Paciente ${editData.name}:
        Alergias: ${editData.allergies?.join(', ')}
        Meds: ${editData.medications?.join(', ')}
        
        Pregunta del Doctor: ${msg}
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: `Eres el consultor médico de apoyo de ${clinicSettings.name}. Tienes acceso total al expediente granular del paciente.` }
      });
      setAiChat(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (e) { setAiChat(prev => [...prev, { role: 'model', text: 'Error.' }]); }
  };

  return (
    <div className="flex flex-col gap-8 h-full animate-in fade-in slide-in-from-right-4 pb-12">
        <div className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-primary/10 shadow-2xl overflow-hidden flex flex-col shrink-0">
            <header className="px-10 py-8 bg-primary/5 border-b border-primary/10 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-3xl">psychology</span></div>
                    <div><h4 className="font-display font-black text-2xl uppercase tracking-tight leading-none">Consultoría Clínica IA</h4><p className="text-[9px] font-black text-primary uppercase mt-1">Procesando píldoras de historial médico...</p></div>
                </div>
                <button disabled={isAnalyzing} onClick={generateClinicalReport} className="px-10 py-4 bg-primary text-white rounded-2xl font-black shadow-xl uppercase text-[10px] tracking-widest hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50">{isAnalyzing ? 'Analizando...' : 'Generar Informe IA'}</button>
            </header>
            <div className="p-10 min-h-[300px] flex flex-col relative bg-slate-50/50 dark:bg-bg-dark/20">
                <div className="w-full whitespace-pre-wrap text-sm font-medium text-slate-700 dark:text-slate-300 leading-loose italic max-h-[400px] overflow-y-auto pr-6 custom-scrollbar pb-16">{aiReport || 'Sin informe generado. Pulsa en Generar para que la IA analice las píldoras del historial médico.'}</div>
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
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendQuestionToAi()} placeholder={`Preguntar sobre las contraindicaciones de ${editData.name.split(' ')[0]}...`} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-[2rem] py-5 pl-8 pr-20 text-sm font-bold focus:ring-4 focus:ring-primary/10 shadow-inner transition-all" />
                    <button onClick={sendQuestionToAi} className="absolute right-3 top-1/2 -translate-y-1/2 size-12 bg-primary text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-xl shadow-primary/20"><span className="material-symbols-outlined text-2xl">send</span></button>
                </div>
            </div>
        </div>
    </div>
  );
};
