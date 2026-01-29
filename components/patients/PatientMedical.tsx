
import React, { useState } from 'react';
import { Patient } from '../../types';

interface PatientMedicalProps {
  editData: Patient;
  setEditData: (data: Patient) => void;
  isEditing: boolean;
}

const PillSection = ({ title, icon, pills = [], onAdd, onRemove, isEditing, color = 'primary' }: any) => {
  const [inputValue, setInputValue] = useState('');
  
  // Aseguramos que pills sea siempre un array para evitar "pills.length is not a function" o similar
  const safePills = Array.isArray(pills) ? pills : [];

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

  const colorClasses: Record<string, string> = {
    danger: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30',
    primary: 'bg-primary/5 text-primary border-primary/20 dark:bg-primary/10 dark:text-primary-light dark:border-primary/30',
    warning: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30',
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'
  };

  return (
    <div className="bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] border border-slate-200 dark:border-border-dark shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <h4 className={`text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 ${color === 'danger' ? 'text-rose-500' : 'text-primary'}`}>
          <span className="material-symbols-outlined text-lg">{icon}</span> {title}
        </h4>
        <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-400 uppercase tracking-widest">{safePills.length} Registros</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {safePills.map((pill: string, idx: number) => (
          <div key={idx} className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${colorClasses[color] || colorClasses.primary}`}>
            <span>{pill}</span>
            {isEditing && (
              <button onClick={() => onRemove(idx)} className="size-4 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[10px] font-black">close</span>
              </button>
            )}
          </div>
        ))}
        {safePills.length === 0 && (
          <p className="text-xs text-slate-400 font-medium italic py-2">Ningún registro informado.</p>
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
  
  const addPill = (field: keyof Patient, val: string) => {
    const current = Array.isArray(editData[field]) ? (editData[field] as string[]) : [];
    if (!current.includes(val)) {
        setEditData({ ...editData, [field]: [...current, val] });
    }
  };

  const removePill = (field: keyof Patient, idx: number) => {
    const current = Array.isArray(editData[field]) ? (editData[field] as string[]) : [];
    setEditData({ ...editData, [field]: current.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 pb-20">
        
        {/* SECCIÓN CRÍTICA: ALERGIAS */}
        <PillSection 
          title="Alergias e Intolerancias" 
          icon="warning" 
          pills={editData.allergies} 
          isEditing={isEditing}
          color="danger"
          onAdd={(val: string) => addPill('allergies', val)}
          onRemove={(idx: number) => removePill('allergies', idx)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <PillSection 
              title="Patologías y Crónicos" 
              icon="health_metrics" 
              pills={editData.pathologies} 
              isEditing={isEditing}
              onAdd={(val: string) => addPill('pathologies', val)}
              onRemove={(idx: number) => removePill('pathologies', idx)}
            />
            <PillSection 
              title="Cirugías y Operaciones" 
              icon="surgical" 
              pills={editData.surgeries} 
              isEditing={isEditing}
              onAdd={(val: string) => addPill('surgeries', val)}
              onRemove={(idx: number) => removePill('surgeries', idx)}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <PillSection 
              title="Medicación Actual" 
              icon="prescriptions" 
              pills={editData.medications} 
              isEditing={isEditing}
              color="warning"
              onAdd={(val: string) => addPill('medications', val)}
              onRemove={(idx: number) => removePill('medications', idx)}
            />
            <PillSection 
              title="Estilo de Vida y Hábitos" 
              icon="ecg_heart" 
              pills={editData.habits} 
              isEditing={isEditing}
              color="success"
              onAdd={(val: string) => addPill('habits', val)}
              onRemove={(idx: number) => removePill('habits', idx)}
            />
        </div>

        <PillSection 
          title="Antecedentes Familiares" 
          icon="family_history" 
          pills={editData.familyHistory} 
          isEditing={isEditing}
          onAdd={(val: string) => addPill('familyHistory', val)}
          onRemove={(idx: number) => removePill('familyHistory', idx)}
        />

        <div className="bg-white dark:bg-surface-dark p-10 rounded-[3rem] border border-slate-200 dark:border-border-dark shadow-sm">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-8"><span className="material-symbols-outlined text-sm">assignment</span> Observaciones Clínicas Generales</h4>
            <textarea 
                disabled={!isEditing} 
                value={editData.medicalHistory || ""} 
                onChange={(e) => setEditData({...editData, medicalHistory: e.target.value})} 
                className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-sm font-bold min-h-[160px] focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none leading-relaxed" 
                placeholder="Añadir notas clínicas adicionales..."
            />
        </div>
    </div>
  );
};
