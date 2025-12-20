
import React from 'react';
import { Branch, Doctor } from '../../types';

interface BranchStaffProps {
  editBranchData: Branch;
  isEditing: boolean;
  doctors: Doctor[];
  tempDoctors: Doctor[];
  setTempDoctors: React.Dispatch<React.SetStateAction<Doctor[]>>;
}

export const BranchStaff: React.FC<BranchStaffProps> = ({ editBranchData, isEditing, doctors, tempDoctors, setTempDoctors }) => {
  
  const getBranchDoctors = (branchName: string, sourceDoctors: Doctor[]) => {
      return sourceDoctors.filter(d => d.branch === branchName);
  };

  const toggleDoctorAssignment = (docId: string) => {
      setTempDoctors(prev => prev.map(d => {
          if (d.id === docId) {
              if (d.branch === editBranchData.name) {
                  return { ...d, branch: 'Sin Asignar' };
              } else {
                  return { ...d, branch: editBranchData.name };
              }
          }
          return d;
      }));
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
        <div className="flex justify-between items-center">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3"><span className="material-symbols-outlined text-sm">groups</span> Equipo Asignado</h4>
            {isEditing && <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">Selecciona para asignar/desasignar</span>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {(isEditing ? tempDoctors : getBranchDoctors(editBranchData.name, doctors)).map(doc => {
                const isAssignedToThis = doc.branch === editBranchData.name;
                const isAssignedToOther = doc.branch && doc.branch !== editBranchData.name && doc.branch !== 'Sin Asignar';
                
                return (
                    <div 
                        key={doc.id} 
                        onClick={() => isEditing && toggleDoctorAssignment(doc.id)}
                        className={`
                            relative p-6 rounded-[2.5rem] border transition-all flex items-center gap-6 overflow-hidden
                            ${isEditing ? 'cursor-pointer hover:shadow-md' : ''}
                            ${isAssignedToThis 
                                ? 'bg-white dark:bg-bg-dark border-primary ring-2 ring-primary/20 shadow-lg' 
                                : isAssignedToOther 
                                    ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-70 grayscale-[0.5] hover:opacity-100 hover:grayscale-0' 
                                    : 'bg-white dark:bg-bg-dark border-dashed border-slate-300 dark:border-slate-700 opacity-60 hover:opacity-100'}
                        `}
                    >
                        {isEditing && (
                            <div className={`absolute top-4 right-4 size-6 rounded-full flex items-center justify-center border-2 ${isAssignedToThis ? 'bg-primary border-primary text-white' : 'border-slate-300 bg-white dark:bg-slate-800'}`}>
                                {isAssignedToThis && <span className="material-symbols-outlined text-sm font-bold">check</span>}
                            </div>
                        )}

                        <div className="size-16 rounded-2xl bg-cover bg-center border-2 border-white shadow-md shrink-0" style={{backgroundImage: `url('${doc.img}')`}}></div>
                        <div className="min-w-0">
                            <p className="font-black text-slate-900 dark:text-white text-sm truncate">{doc.name}</p>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1 truncate">{doc.specialty}</p>
                            {isEditing && (
                                <p className="text-[9px] text-slate-400 mt-2 font-medium truncate">
                                    {isAssignedToThis ? 'Asignado aquí' : (isAssignedToOther ? `En: ${doc.branch}` : 'Sin asignar')}
                                </p>
                            )}
                            {!isEditing && (
                                <p className="text-[9px] text-slate-400 mt-1">{doc.status === 'Active' ? '🟢 Disponible' : '🟠 No Disponible'}</p>
                            )}
                        </div>
                    </div>
                );
            })}
            
            {(!isEditing && getBranchDoctors(editBranchData.name, doctors).length === 0) && (
                <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem]">
                    <span className="material-symbols-outlined text-4xl mb-2">group_off</span>
                    <p className="italic font-medium text-sm">No hay médicos asignados a esta sede.</p>
                </div>
            )}
        </div>
    </div>
  );
};
