
import React, { useRef, useState } from 'react';
import { Doctor, FileAttachment } from '../../types';

interface DoctorDocsProps {
  editDocData: Doctor;
  setEditDocData: (data: Doctor) => void;
  isEditing: boolean;
}

export const DoctorDocs: React.FC<DoctorDocsProps> = ({ editDocData, setEditDocData, isEditing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingDoc, setViewingDoc] = useState<FileAttachment | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newDoc: FileAttachment = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name, type: file.type, size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        date: new Date().toISOString().split('T')[0], url: URL.createObjectURL(file)
      };
      setEditDocData({ ...editDocData, docs: [...(editDocData.docs || []), newDoc] });
    }
  };

  return (
    <>
        <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3"><span className="material-symbols-outlined text-sm">folder_managed</span> Repositorio de Documentación</h4>
                {isEditing && <button onClick={() => fileInputRef.current?.click()} className="h-14 px-8 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl transition-all hover:scale-105"><span className="material-symbols-outlined text-2xl">upload</span> Subir</button>}
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {editDocData.docs?.map(file => (
                    <div key={file.id} className="p-8 bg-white dark:bg-bg-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-6 shadow-sm group hover:border-primary transition-all">
                        <div className="size-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors"><span className="material-symbols-outlined text-3xl">description</span></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-base font-black truncate text-slate-800 dark:text-white leading-tight">{file.name}</p>
                            <p className="text-[11px] text-slate-400 font-black uppercase mt-1 tracking-widest">{file.date} • {file.size}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setViewingDoc(file)} className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-slate-400"><span className="material-symbols-outlined text-2xl">visibility</span></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        
        {viewingDoc && (
            <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark w-full max-w-5xl h-[85vh] rounded-[3.5rem] overflow-hidden flex flex-col relative shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/20">
                <header className="px-10 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center gap-4"><span className="material-symbols-outlined text-primary text-3xl">description</span><h3 className="font-black text-lg uppercase tracking-tight text-slate-800 dark:text-white">{viewingDoc.name}</h3></div>
                    <button onClick={() => setViewingDoc(null)} className="size-12 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors"><span className="material-symbols-outlined text-4xl">close</span></button>
                </header>
                <div className="flex-1 bg-slate-100 dark:bg-bg-dark flex items-center justify-center overflow-hidden">
                    {viewingDoc.type.includes('image') ? <img src={viewingDoc.url} alt={viewingDoc.name} className="max-w-full max-h-full object-contain shadow-2xl" /> : <iframe src={viewingDoc.url} className="w-full h-full border-none bg-white" title={viewingDoc.name}></iframe>}
                </div>
            </div>
            </div>
        )}
    </>
  );
};
