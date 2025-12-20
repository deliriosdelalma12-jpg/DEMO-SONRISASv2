
import React from 'react';
import { Branch } from '../../types';
import { DataField } from '../shared/DataField';

interface BranchContactProps {
  editBranchData: Branch;
  setEditBranchData: (data: Branch) => void;
  isEditing: boolean;
}

export const BranchContact: React.FC<BranchContactProps> = ({ editBranchData, setEditBranchData, isEditing }) => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
        <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-10"><span className="material-symbols-outlined text-sm">contact_phone</span> Canales de Contacto</h4>
            <div className="grid grid-cols-1 gap-8">
                <DataField label="Teléfono Principal" value={editBranchData.phone} onChange={(v: string) => isEditing && setEditBranchData({...editBranchData, phone: v})} editing={isEditing} />
                <DataField label="Email Sucursal" value={editBranchData.email} onChange={(v: string) => isEditing && setEditBranchData({...editBranchData, email: v})} editing={isEditing} />
            </div>
        </div>
    </div>
  );
};
