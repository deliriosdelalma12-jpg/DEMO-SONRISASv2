
import React from 'react';
import { Branch } from '../../types';
import { DataField } from '../shared/DataField';

interface BranchLocationProps {
  editBranchData: Branch;
  setEditBranchData: (data: Branch) => void;
  isEditing: boolean;
}

export const BranchLocation: React.FC<BranchLocationProps> = ({ editBranchData, setEditBranchData, isEditing }) => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
        <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-10"><span className="material-symbols-outlined text-sm">map</span> Coordenadas y Dirección</h4>
            <div className="space-y-8">
                <DataField label="Dirección Completa" value={editBranchData.address} onChange={(v: string) => isEditing && setEditBranchData({...editBranchData, address: v})} editing={isEditing} />
                <div className="grid grid-cols-2 gap-8">
                    <DataField label="Ciudad" value={editBranchData.city} onChange={(v: string) => isEditing && setEditBranchData({...editBranchData, city: v})} editing={isEditing} />
                    <DataField label="Código Postal" value={editBranchData.zip} onChange={(v: string) => isEditing && setEditBranchData({...editBranchData, zip: v})} editing={isEditing} />
                </div>
                <div className="p-6 bg-slate-50 dark:bg-bg-dark rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-4">Geolocalización (Lat / Lng)</label>
                    <div className="grid grid-cols-2 gap-8">
                        <DataField label="Latitud" value={editBranchData.coordinates.lat} onChange={(v: string) => isEditing && setEditBranchData({...editBranchData, coordinates: {...editBranchData.coordinates, lat: v}})} editing={isEditing} placeholder="Ej: 40.416775" />
                        <DataField label="Longitud" value={editBranchData.coordinates.lng} onChange={(v: string) => isEditing && setEditBranchData({...editBranchData, coordinates: {...editBranchData.coordinates, lng: v}})} editing={isEditing} placeholder="Ej: -3.703790" />
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
