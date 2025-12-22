
import React, { useState } from 'react';
import { Patient } from '../../types';

interface PatientMedicalProps {
  editData: Patient;
  setEditData: (data: Patient) => void;
  isEditing: boolean;
}

const PillSection = ({ title, icon, pills, onAdd, onRemove, isEditing, color = 'primary' }: any) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (!inputValue.trim()) return;
    onAdd(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="bg-white/70 dark:bg-surface-dark/60 p-8 rounded-[2.5rem] border border-white dark:border-border-dark shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3">
          <span className="material-symbols-outlined text-lg">{icon}</span> {title}
        </h4>
        <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-400 uppercase tracking-widest">{pills.length} Registros</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {pills.map((pill: string, idx: number) => (
          <div key={idx} className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${color === 'danger' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-primary/5 text-primary border-primary/20'}`}>
            <span>{pill}</span>
            {isEditing && (
              <button onClick={() => onRemove(idx)} className="size-4 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[10px] font-black">close</span>
              </button>
            )}
          </div>
        ))}
        {pills.length === 0 && !isEditing && (
          <p className="text-xs text-slate-400 font-medium italic">Sin registros informados.</p>
        )}
      </div>

      {isEditing && (
        <div className="relative mt-4">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Añadir ${title.toLowerCase()}...`}
            className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none pr-14"
          />
          <button 
            onClick={handleAdd}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-10 bg-primary text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-xl">add</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const PatientMedical: React.FC<PatientMedicalProps> = ({ editData, setEditData, isEditing }) => {
  
  const updatePills = (field: keyof Patient, newPills: string[]) => {
    setEditData({ ...editData, [field]: newPills });
  };

  const addPill = (field: keyof Patient, val: string) => {
    const current = (editData[field] as string[]) || [];
    if (!current.includes(val)) {
        updatePills(field, [...current, val]);
    }
  };

  const removePill = (field: keyof Patient, idx: number) => {
    const current = (editData[field] as string[]) || [];
    updatePills(field, current.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 pb-20">
        
        {/* SECCIÓN CRÍTICA: ALERGIAS */}
        <PillSection 
          title="Alergias e Intolerancias" 
          icon="warning" 
          pills={editData.allergies || []} 
          isEditing={isEditing}
          color="danger"
          onAdd={(val: string) => addPill('allergies', val)}
          onRemove={(idx: number) => removePill('allergies', idx)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ENFERMEDADES CRÓNICAS */}
            <PillSection 
              title="Patologías y Crónicos" 
              icon="health_metrics" 
              pills={editData.pathologies || []} 
              isEditing={isEditing}
              onAdd={(val: string) => addPill('pathologies', val)}
              onRemove={(idx: number) => removePill('pathologies', idx)}
            />

            {/* OPERACIONES / CIRUGÍAS */}
            <PillSection 
              title="Cirugías y Operaciones" 
              icon="surgical" 
              pills={editData.surgeries || []} 
              isEditing={isEditing}
              onAdd={(val: string) => addPill('surgeries', val)}
              onRemove={(idx: number) => removePill('surgeries', idx)}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* MEDICACIÓN ACTUAL */}
            <PillSection 
              title="Medicación Actual" 
              icon="prescriptions" 
              pills={editData.medications || []} 
              isEditing={isEditing}
              onAdd={(val: string) => addPill('medications', val)}
              onRemove={(idx: number) => removePill('medications', idx)}
            />

            {/* HÁBITOS */}
            <PillSection 
              title="Estilo de Vida y Hábitos" 
              icon="ecg_heart" 
              pills={editData.habits || []} 
              isEditing={isEditing}
              onAdd={(val: string) => addPill('habits', val)}
              onRemove={(idx: number) => removePill('habits', idx)}
            />
        </div>

        {/* ANTECEDENTES FAMILIARES */}
        <PillSection 
          title="Antecedentes Familiares" 
          icon="family_history" 
          pills={editData.familyHistory || []} 
          isEditing={isEditing}
          onAdd={(val: string) => addPill('familyHistory', val)}
          onRemove={(idx: number) => removePill('familyHistory', idx)}
        />

        {/* NOTA GENERAL (TEXTO LIBRE) */}
        <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-8"><span className="material-symbols-outlined text-sm">assignment</span> Observaciones Clínicas Generales</h4>
            <textarea 
                disabled={!isEditing} 
                value={editData.medicalHistory} 
                onChange={(e) => setEditData({...editData, medicalHistory: e.target.value})} 
                className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-sm font-bold min-h-[200px] focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none leading-relaxed" 
                placeholder="Añadir notas clínicas adicionales, observaciones de comportamiento o detalles que no encajen en las píldoras..."
            />
        </div>
    </div>
  );
};
