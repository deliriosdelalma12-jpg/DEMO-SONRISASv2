
import React from 'react';
import { Doctor, Branch } from '../../types';
import { DataField } from '../shared/DataField';

interface DoctorProfileProps {
  editDocData: Doctor;
  setEditDocData: (data: Doctor) => void;
  isEditing: boolean;
  branchOptions: { value: string, label: string }[];
}

export const DoctorProfile: React.FC<DoctorProfileProps> = ({ editDocData, setEditDocData, isEditing, branchOptions }) => {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
        <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-10"><span className="material-symbols-outlined text-sm">badge</span> Información del Facultativo</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <DataField label="Nombre Completo" value={editDocData.name} onChange={(v:any) => isEditing && setEditDocData({...editDocData, name: v})} editing={isEditing} required={true} />
                <DataField label="Especialidad Principal" value={editDocData.specialty} onChange={(v:any) => isEditing && setEditDocData({...editDocData, specialty: v})} editing={isEditing} required={true} />
                <DataField label="Sede / Sucursal" value={editDocData.branch} onChange={(v:any) => isEditing && setEditDocData({...editDocData, branch: v})} editing={isEditing} type="select" options={branchOptions} />
                <DataField label="Email de Empresa" value={editDocData.corporateEmail} onChange={(v:any) => isEditing && setEditDocData({...editDocData, corporateEmail: v})} editing={isEditing} required={true} />
                <DataField label="Teléfono de Contacto" value={editDocData.phone} onChange={(v:any) => isEditing && setEditDocData({...editDocData, phone: v})} editing={isEditing} />
                <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Estado Operativo</label>
                    {isEditing ? (
                    <div className="relative">
                        <select value={editDocData.status} onChange={(e) => setEditDocData({...editDocData, status: e.target.value as any})} className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all appearance-none">
                        <option value="Active">Activo / Disponible</option>
                        <option value="Vacation">Vacaciones</option>
                        <option value="Inactive">Inactivo</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">unfold_more</span>
                    </div>
                    ) : (
                    <div className="bg-white/40 dark:bg-white/5 border border-transparent rounded-2xl px-5 py-3.5 flex items-center min-h-[50px]">
                        <span className={`text-sm font-black uppercase leading-none ${editDocData.status === 'Active' ? 'text-success' : 'text-warning'}`}>{editDocData.status === 'Active' ? 'EN SERVICIO' : editDocData.status}</span>
                    </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
