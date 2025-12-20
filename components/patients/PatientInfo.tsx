
import React from 'react';
import { Patient } from '../../types';
import { DataField } from '../shared/DataField';

interface PatientInfoProps {
  editData: Patient;
  setEditData: (data: Patient) => void;
  isEditing: boolean;
}

export const PatientInfo: React.FC<PatientInfoProps> = ({ editData, setEditData, isEditing }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        
        {/* BLOQUE 1: DATOS PERSONALES */}
        <div className="bg-white dark:bg-surface-dark p-8 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-base">badge</span> Datos Personales
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DataField label="Nombre Completo" value={editData.name} editing={isEditing} onChange={(v: any) => setEditData({...editData, name: v})} required={true} />
                <DataField label="DNI / Pasaporte" value={editData.identityDocument} editing={isEditing} onChange={(v: any) => setEditData({...editData, identityDocument: v})} required={true} />
                <DataField label="Fecha Nacimiento" value={editData.birthDate} editing={isEditing} type="date" onChange={(v: any) => setEditData({...editData, birthDate: v})} />
                <DataField label="Género" value={editData.gender} editing={isEditing} type="select" options={['Masculino', 'Femenino', 'Otro']} onChange={(v: any) => setEditData({...editData, gender: v, img: v === 'Masculino' ? 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Felix&backgroundColor=e2e8f0' : v === 'Femenino' ? 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Aneka&backgroundColor=e2e8f0' : 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Midnight&backgroundColor=e2e8f0'})} />
                <DataField label="Email" value={editData.email} editing={isEditing} onChange={(v: any) => setEditData({...editData, email: v})} />
                <DataField label="Teléfono" value={editData.phone} editing={isEditing} onChange={(v: any) => setEditData({...editData, phone: v})} />
            </div>
        </div>

        {/* BLOQUE 2: DATOS BIOMÉTRICOS */}
        <div className="bg-white dark:bg-surface-dark p-8 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-base">fitness_center</span> Datos Biométricos
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DataField label="Peso (kg)" value={editData.weight} editing={isEditing} onChange={(v: any) => setEditData({...editData, weight: v})} />
                <DataField label="Altura (cm)" value={editData.height} editing={isEditing} onChange={(v: any) => setEditData({...editData, height: v})} />
                <DataField label="Grupo Sanguíneo" value={editData.bloodType} editing={isEditing} type="select" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} onChange={(v: any) => setEditData({...editData, bloodType: v})} />
            </div>
        </div>
    </div>
  );
};
