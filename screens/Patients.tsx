
import React, { useState } from 'react';
import { Patient } from '../types';

interface PatientsProps {
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
}

const Patients: React.FC<PatientsProps> = ({ patients, setPatients }) => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'medical' | 'files'>('info');

  const openFicha = (p: Patient) => {
    setSelectedPatient(p);
    setActiveTab('info');
  };

  return (
    <div className="p-10 max-w-[1600px] mx-auto w-full space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 dark:text-white">Gestión de Pacientes</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Expedientes clínicos y seguimiento detallado.</p>
        </div>
        <button className="h-14 px-8 flex items-center gap-3 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-all">
          <span className="material-symbols-outlined">person_add</span>
          <span>Nuevo Registro</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {patients.map((p) => (
          <div 
            key={p.id} 
            onClick={() => openFicha(p)}
            className="group bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-[2.5rem] p-8 cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-2"
          >
            <div className="flex flex-col items-center text-center gap-4 mb-8">
              <div className="size-24 rounded-[2rem] bg-cover bg-center border-4 border-bg-light dark:border-bg-dark shadow-lg" style={{ backgroundImage: `url("${p.img}")` }}></div>
              <div>
                <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{p.name}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ID: {p.id}</p>
              </div>
            </div>
            <div className="space-y-4 pt-6 border-t border-border-light dark:border-border-dark">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                <span className="material-symbols-outlined text-primary text-[20px]">call</span>
                <span>{p.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
                <span className="truncate">Cita: Hace 2 semanas</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Patient Detail Modal (Ficha) */}
      {selectedPatient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 bg-slate-900/60 modal-backdrop">
          <div className="bg-bg-light dark:bg-bg-dark w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark animate-in zoom-in duration-300">
            <header className="p-10 bg-white dark:bg-surface-dark border-b border-border-light dark:border-border-dark flex items-center justify-between">
              <div className="flex items-center gap-6">
                 <div className="size-20 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url("${selectedPatient.img}")` }}></div>
                 <div>
                    <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white">{selectedPatient.name}</h2>
                    <p className="text-sm font-bold text-primary">{selectedPatient.id} • {selectedPatient.age}</p>
                 </div>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="size-12 rounded-2xl bg-bg-light dark:bg-bg-dark flex items-center justify-center text-slate-400 hover:text-danger transition-colors">
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </header>

            <nav className="flex px-10 border-b border-border-light dark:border-border-dark bg-white/50 dark:bg-surface-dark/50">
               {['info', 'history', 'medical', 'files'].map((t) => (
                 <button 
                  key={t}
                  onClick={() => setActiveTab(t as any)}
                  className={`px-8 py-5 text-sm font-bold capitalize transition-all relative ${activeTab === t ? 'text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                 >
                   {t === 'info' ? 'Datos Generales' : t === 'history' ? 'Historial de Citas' : t === 'medical' ? 'Anamnesis' : 'Documentos'}
                   {activeTab === t && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"></div>}
                 </button>
               ))}
            </nav>

            <div className="flex-1 overflow-y-auto p-10">
               {activeTab === 'info' && (
                 <div className="grid grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4">
                    <div className="space-y-8">
                       <div className="bg-white dark:bg-surface-dark p-8 rounded-3xl border border-border-light dark:border-border-dark">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Información Personal</h4>
                          <dl className="grid grid-cols-1 gap-6">
                            <div><dt className="text-[10px] uppercase font-black text-slate-400">Teléfono</dt><dd className="text-lg font-bold text-slate-900 dark:text-white">{selectedPatient.phone}</dd></div>
                            <div><dt className="text-[10px] uppercase font-black text-slate-400">Email</dt><dd className="text-lg font-bold text-slate-900 dark:text-white">{selectedPatient.email}</dd></div>
                            <div><dt className="text-[10px] uppercase font-black text-slate-400">Dirección</dt><dd className="text-lg font-bold text-slate-900 dark:text-white">{selectedPatient.address}</dd></div>
                          </dl>
                       </div>
                    </div>
                    <div className="bg-white dark:bg-surface-dark p-8 rounded-3xl border border-border-light dark:border-border-dark">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Resumen Médico</h4>
                        <p className="text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300">{selectedPatient.medicalHistory}</p>
                    </div>
                 </div>
               )}
               {activeTab === 'files' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Archivos Adjuntos</h4>
                      <button className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary rounded-2xl font-bold hover:bg-primary hover:text-white transition-all">
                        <span className="material-symbols-outlined">upload_file</span> Subir Archivo
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {/* Mock files */}
                       <div className="p-6 rounded-3xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark flex items-center gap-6 group hover:border-primary transition-all">
                          <div className="size-16 rounded-2xl bg-danger/10 text-danger flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl">picture_as_pdf</span>
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="font-bold text-slate-900 dark:text-white truncate">Radiografía_Dental_Oct.pdf</p>
                             <p className="text-xs text-slate-400">1.2 MB • 20 Oct 2023</p>
                          </div>
                          <button className="p-3 text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">download</span></button>
                       </div>
                    </div>
                 </div>
               )}
            </div>
            
            <footer className="p-8 bg-white dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex justify-end gap-4">
               <button className="px-10 py-4 rounded-2xl border border-border-light dark:border-border-dark font-bold text-slate-500 hover:bg-bg-light dark:hover:bg-bg-dark transition-all">Imprimir Expediente</button>
               <button className="px-10 py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-all">Agendar Nueva Cita</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;
