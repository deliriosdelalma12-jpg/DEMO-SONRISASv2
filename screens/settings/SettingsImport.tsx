
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Patient, Doctor, Branch } from '../../types';

interface SettingsImportProps {
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  doctors: Doctor[];
  setDoctors: React.Dispatch<React.SetStateAction<Doctor[]>>;
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
}

const SettingsImport: React.FC<SettingsImportProps> = ({ 
  patients, setPatients, 
  doctors, setDoctors, 
  branches, setBranches 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFileWithAI = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image', 
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type } },
              { text: "Analiza este documento y extrae listas de pacientes, médicos y sucursales en formato JSON." }
            ]
          },
          config: { responseMimeType: "application/json" }
        });
        setImportPreview(JSON.parse(response.text || "{}"));
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-10 space-y-10">
      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
          <span className="material-symbols-outlined text-3xl text-primary">cloud_upload</span>
          <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Importación Inteligente</h3>
        </div>
        <div className="p-10 flex flex-col items-center gap-6">
          <button onClick={() => fileInputRef.current?.click()} className="px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs">Seleccionar Archivo</button>
          <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button onClick={processFileWithAI} disabled={!file || isProcessing} className="h-16 px-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase">
            {isProcessing ? "Procesando..." : "Analizar con IA"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default SettingsImport;
