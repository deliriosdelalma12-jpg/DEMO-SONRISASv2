
import React from 'react';
import { Branch } from '../../types';
import { DataField } from '../shared/DataField';

interface BranchInfoProps {
  editBranchData: Branch;
  setEditBranchData: (data: Branch) => void;
  isEditing: boolean;
}

export const BranchInfo: React.FC<BranchInfoProps> = ({ editBranchData, setEditBranchData, isEditing }) => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
        <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-10"><span className="material-symbols-outlined text-sm">business</span> Detalles de la Sede</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <DataField label="Nombre Sucursal" value={editBranchData.name} onChange={(v: string) => isEditing && setEditBranchData({...editBranchData, name: v})} editing={isEditing} />
                <DataField label="Responsable / Gerente" value={editBranchData.manager} onChange={(v: string) => isEditing && setEditBranchData({...editBranchData, manager: v})} editing={isEditing} />
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Estado Operativo</label>
                  {isEditing ? (
                    <div className="relative">
                      <select value={editBranchData.status} onChange={(e) => setEditBranchData({...editBranchData, status: e.target.value as any})} className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none appearance-none">
                        <option value="Active">Operativa</option>
                        <option value="Inactive">Inactiva</option>
                        <option value="Maintenance">Mantenimiento</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">unfold_more</span>
                    </div>
                  ) : (
                    <div className="bg-white/40 dark:bg-white/5 border border-transparent rounded-2xl px-5 py-3.5 flex items-center min-h-[50px]">
                      <span className={`text-sm font-black uppercase leading-none ${editBranchData.status === 'Active' ? 'text-success' : 'text-warning'}`}>{editBranchData.status === 'Active' ? 'OPERATIVA' : editBranchData.status}</span>
                    </div>
                  )}
                </div>
                <DataField label="Provincia / Estado" value={editBranchData.province || ''} onChange={(v: string) => isEditing && setEditBranchData({...editBranchData, province: v})} editing={isEditing} placeholder="Ej: Madrid" />
                <div className="flex flex-col gap-1 w-full">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Horario Apertura</label>
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md px-4 py-2.5 flex items-center justify-between min-h-[42px]">
                        <span className="text-sm font-bold text-slate-800 dark:text-white leading-none">{editBranchData.openingHours || '---'}</span>
                        {editBranchData.scheduleType && (
                            <span className="text-[9px] font-black uppercase tracking-widest bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">
                                {editBranchData.scheduleType === 'continuous' ? 'J. Continua' : 'J. Partida'}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
