
import React, { useRef } from 'react';
import { Patient, FileAttachment } from '../../types';

interface PatientFilesProps {
  editData: Patient;
  setEditData: (data: Patient) => void;
  isEditing: boolean;
}

export const PatientFiles: React.FC<PatientFilesProps> = ({ editData, setEditData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newFile: FileAttachment = {
        id: 'DOC-' + Math.floor(Math.random() * 100000),
        name: file.name, type: file.type,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        date: new Date().toISOString().split('T')[0], url: URL.createObjectURL(file)
      };
      setEditData({ ...editData, attachments: [newFile, ...(editData.attachments || [])] });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
         <div className="flex justify-between items-center">
            <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Repositorio Digital</h3>
            <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:scale-105 transition-all"><span className="material-symbols-outlined text-lg">upload_file</span> Subir Nuevo</button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {editData.attachments?.map((file: any) => (
                <div key={file.id} className="p-8 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-6 shadow-sm group hover:border-primary transition-all">
                    <div className="size-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors"><span className="material-symbols-outlined text-3xl">description</span></div>
                    <div className="flex-1 min-w-0"><p className="text-base font-black truncate text-slate-800 dark:text-white leading-tight">{file.name}</p><p className="text-[11px] text-slate-400 font-black uppercase mt-1 tracking-widest">{file.date} • {file.size}</p></div>
                    <a href={file.url} download={file.name} className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-primary hover:text-white transition-all flex items-center justify-center text-slate-400 shadow-sm"><span className="material-symbols-outlined text-2xl">download</span></a>
                </div>
            ))}
            {(!editData.attachments || editData.attachments.length === 0) && (
                <div className="col-span-full py-24 flex flex-col items-center gap-6 opacity-30 italic text-center">
                    <span className="material-symbols-outlined text-8xl">folder_off</span>
                    <p className="font-black text-xl uppercase tracking-widest">Sin documentos adjuntos</p>
                </div>
            )}
         </div>
    </div>
  );
};
