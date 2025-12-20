
import React from 'react';
import { Patient } from '../../types';

interface PatientMedicalProps {
  editData: Patient;
  setEditData: (data: Patient) => void;
  isEditing: boolean;
}

export const PatientMedical: React.FC<PatientMedicalProps> = ({ editData, setEditData, isEditing }) => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
        <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-8"><span className="material-symbols-outlined text-sm">warning</span> Alergias e Intolerancias</h4>
            <textarea 
                disabled={!isEditing} 
                value={editData.allergies?.join(', ')} 
                onChange={(e) => setEditData({...editData, allergies: e.target.value.split(',').map(s => s.trim())})} 
                className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-sm font-bold min-h-[120px] focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none" 
                placeholder="Sin alergias conocidas"
            />
        </div>
        <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-8"><span className="material-symbols-outlined text-sm">assignment</span> Antecedentes de Interés</h4>
            <textarea 
                disabled={!isEditing} 
                value={editData.medicalHistory} 
                onChange={(e) => setEditData({...editData, medicalHistory: e.target.value})} 
                className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-sm font-bold min-h-[200px] focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none" 
                placeholder="Sin antecedentes relevantes"
            />
        </div>
    </div>
  );
};
