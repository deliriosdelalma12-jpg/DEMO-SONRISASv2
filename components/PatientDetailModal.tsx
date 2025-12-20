
import React, { useState } from 'react';
import { Patient, ClinicSettings, Doctor, Appointment } from '../types';
import { PatientInfo } from './patients/PatientInfo';
import { PatientMedical } from './patients/PatientMedical';
import { PatientFiles } from './patients/PatientFiles';
import { PatientAI } from './patients/PatientAI';
import { PatientHistory } from './patients/PatientHistory';

interface PatientDetailModalProps {
  patient: Patient;
  appointments: Appointment[]; // Added appointments prop
  clinicSettings: ClinicSettings;
  team: Doctor[];
  onClose: () => void;
  onSave: (updatedPatient: Patient) => void;
  onOpenDoctor?: (doctorId: string) => void;
  initialTab?: 'info' | 'medical' | 'files' | 'ai' | 'history';
}

const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ patient, appointments, clinicSettings, team, onClose, onSave, onOpenDoctor, initialTab = 'info' }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'medical' | 'files' | 'ai' | 'history'>(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Patient>(patient);

  const handleSave = () => {
    if (!editData.name?.trim() || !editData.identityDocument?.trim()) { 
        alert("Faltan datos obligatorios."); 
        return; 
    }
    const doc = team.find(d => d.id === editData.associatedDoctorId);
    onSave({ ...editData, associatedDoctorName: doc?.name || 'No asignado' });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300 overflow-y-auto">
      <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-[92vw] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark h-[92vh] my-auto">
        <header className="px-10 py-8 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-6">
                <div className="size-20 rounded-lg overflow-hidden border-2 border-white dark:border-slate-800 bg-slate-50 flex items-center justify-center shadow-sm">
                    <img src={editData.img} alt={editData.name} className="w-full h-full object-contain" />
                </div>
                <div>
                   <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{editData.name}</h2>
                   <div className="flex items-center gap-4 mt-2">
                     <span className="px-3 py-1 bg-primary/10 text-primary rounded-md text-[10px] font-black uppercase tracking-widest">EXP: {editData.id}</span>
                     {editData.associatedDoctorId && onOpenDoctor && (
                         <button onClick={() => onOpenDoctor(editData.associatedDoctorId!)} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group transition-colors">
                            <span className="material-symbols-outlined text-xs">stethoscope</span> Dr. Asignado <span className="material-symbols-outlined text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                         </button>
                     )}
                   </div>
                </div>
           </div>
           <div className="flex items-center gap-4">
                {isEditing ? (
                    <button onClick={handleSave} className="h-12 px-8 bg-primary text-white rounded-md font-black flex items-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest"><span className="material-symbols-outlined text-lg">save</span> Guardar</button>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="h-12 px-8 bg-white dark:bg-slate-800 text-primary border border-slate-200 dark:border-slate-700 rounded-md font-black flex items-center gap-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 text-xs uppercase tracking-widest"><span className="material-symbols-outlined text-lg">edit</span> Editar Ficha</button>
                )}
                <button onClick={onClose} className="size-12 rounded-md bg-white/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-danger transition-all"><span className="material-symbols-outlined text-2xl">close</span></button>
           </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            <nav className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white/40 dark:bg-surface-dark/40 p-6 gap-2 shrink-0">
                {[
                    { id: 'info', label: 'Biometría', icon: 'person' }, 
                    { id: 'medical', label: 'Historia Médica', icon: 'history_edu' }, 
                    { id: 'history', label: 'Historial Citas', icon: 'calendar_month' }, // NEW TAB
                    { id: 'files', label: 'Archivos / Docs', icon: 'folder_open' }, 
                    { id: 'ai', label: 'Consultor IA', icon: 'psychology' }
                ].map((t) => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex items-center gap-4 px-5 py-3 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-primary'}`}><span className="material-symbols-outlined text-xl">{t.icon}</span> {t.label}</button>
                ))}
            </nav>
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-transparent">
                {activeTab === 'info' && <PatientInfo editData={editData} setEditData={setEditData} isEditing={isEditing} />}
                {activeTab === 'medical' && <PatientMedical editData={editData} setEditData={setEditData} isEditing={isEditing} />}
                {activeTab === 'history' && <PatientHistory patient={editData} appointments={appointments} />}
                {activeTab === 'files' && <PatientFiles editData={editData} setEditData={setEditData} isEditing={isEditing} />}
                {activeTab === 'ai' && <PatientAI editData={editData} clinicSettings={clinicSettings} />}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailModal;
