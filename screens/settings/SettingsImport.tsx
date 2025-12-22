
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
  const [importPreview, setImportPreview] = useState<{
    patients: any[];
    doctors: any[];
    branches: any[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setImportPreview(null);
    }
  };

  const processFileWithAI = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      const prompt = `
        Analiza este documento (puede ser un Excel, PDF o imagen) y extrae listas de pacientes, médicos y sucursales.
        
        REGLAS DE EXTRACCIÓN:
        1. Identifica qué filas pertenecen a cada categoría basándote en los nombres de columna o el contexto.
        2. Mapea los campos lo mejor posible:
           - Pacientes: nombre, dni, telefono, email, fecha_nacimiento, direccion, historial_medico.
           - Médicos: nombre, especialidad, telefono, email, sede.
           - Sucursales: nombre, direccion, ciudad, telefono, encargado.
        3. Genera IDs únicos para los nuevos registros (ej: P-8821, D-102).
        4. Si un campo no existe en el documento, ignóralo o déjalo vacío.
        
        Devuelve estrictamente un JSON con esta estructura:
        {
          "patients": [],
          "doctors": [],
          "branches": []
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', // Excelente para OCR de documentos
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: file.type } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              patients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    identityDocument: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    email: { type: Type.STRING },
                    birthDate: { type: Type.STRING },
                    address: { type: Type.STRING },
                    medicalHistory: { type: Type.STRING }
                  }
                }
              },
              doctors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    specialty: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    corporateEmail: { type: Type.STRING },
                    branch: { type: Type.STRING }
                  }
                }
              },
              branches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    address: { type: Type.STRING },
                    city: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    manager: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      setImportPreview(result);
    } catch (error) {
      console.error("Error al procesar archivo:", error);
      alert("No se pudo procesar el archivo. Asegúrate de que el formato sea legible.");
    } finally {
      setIsProcessing(false);
    }
  };

  const commitImport = () => {
    if (!importPreview) return;

    // Actualizar Pacientes
    if (importPreview.patients.length > 0) {
      const newPatients: Patient[] = importPreview.patients.map(p => ({
        ...p,
        gender: 'Otro',
        img: `https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${p.name}`,
        history: [{ date: new Date().toISOString().split('T')[0], action: 'Importación', description: 'Registro importado vía archivo.' }]
      }));
      setPatients(prev => [...prev, ...newPatients]);
    }

    // Actualizar Médicos
    if (importPreview.doctors.length > 0) {
      const newDoctors: Doctor[] = importPreview.doctors.map(d => ({
        ...d,
        status: 'Active',
        role: 'doctor_role',
        img: `https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${d.name}`,
        docs: [],
        vacationDaysTotal: 30,
        vacationDaysTaken: 0,
        vacationHistory: [],
        attendanceHistory: []
      }));
      setDoctors(prev => [...prev, ...newDoctors]);
    }

    // Actualizar Sucursales
    if (importPreview.branches.length > 0) {
      const newBranches: Branch[] = importPreview.branches.map(b => ({
        ...b,
        status: 'Active',
        zip: '00000',
        coordinates: { lat: '0', lng: '0' },
        img: 'https://images.unsplash.com/photo-1538108149393-fbbd8189718c?q=80&w=800&auto=format&fit=crop'
      }));
      setBranches(prev => [...prev, ...newBranches]);
    }

    alert(`Importación completada con éxito:\n- ${importPreview.patients.length} Pacientes\n- ${importPreview.doctors.length} Médicos\n- ${importPreview.branches.length} Sucursales`);
    setImportPreview(null);
    setFile(null);
  };

  return (
    <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-right-4 duration-500 p-10">
      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
        <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
          <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined">cloud_upload</span></div>
          <div>
            <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Importación Inteligente</h3>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Sube archivos de tu ERP (PDF, Excel, Imágenes)</p>
          </div>
        </div>

        <div className="p-10 space-y-8">
          <div className="flex flex-col items-center justify-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] p-16 transition-all hover:border-primary/50 bg-slate-50/50 dark:bg-bg-dark/50">
            <span className="material-symbols-outlined text-7xl text-slate-300 dark:text-slate-700 mb-6">description</span>
            <div className="text-center space-y-2">
              <p className="text-lg font-black text-slate-900 dark:text-white uppercase">Arrastra tu archivo aquí</p>
              <p className="text-sm text-slate-500 font-medium italic">Gemini extraerá automáticamente los campos.</p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="mt-8 px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
            >
              Seleccionar Archivo
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.xls,.xlsx,.png,.jpg,.jpeg" />
            {file && <p className="mt-4 text-primary font-black uppercase text-[10px] tracking-widest flex items-center gap-2 animate-bounce"><span className="material-symbols-outlined text-sm">check_circle</span> {file.name}</p>}
          </div>

          <div className="flex justify-center">
            <button 
              onClick={processFileWithAI}
              disabled={!file || isProcessing}
              className="h-16 px-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase tracking-tighter text-lg shadow-2xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-4 transition-all"
            >
              {isProcessing ? (
                <>
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  <span>Analizando con IA...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">auto_awesome</span>
                  <span>Previsualizar Importación</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {importPreview && (
        <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-8">
          <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-between">
            <h3 className="text-xl font-display font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-tight">Resumen del Análisis IA</h3>
            <button 
              onClick={commitImport}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">done_all</span> Confirmar y Guardar Todo
            </button>
          </div>

          <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Pacientes Detectados</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-md font-black text-xs">{importPreview.patients.length}</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
                {importPreview.patients.map((p, i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-bg-dark rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-transparent hover:border-primary transition-all">
                    {p.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Médicos Detectados</span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded-md font-black text-xs">{importPreview.doctors.length}</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
                {importPreview.doctors.map((d, i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-bg-dark rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-transparent hover:border-primary transition-all">
                    {d.name} <span className="opacity-50">• {d.specialty}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sucursales Detectadas</span>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-md font-black text-xs">{importPreview.branches.length}</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
                {importPreview.branches.map((b, i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-bg-dark rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-transparent hover:border-primary transition-all">
                    {b.name} <span className="opacity-50">• {b.city}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default SettingsImport;
