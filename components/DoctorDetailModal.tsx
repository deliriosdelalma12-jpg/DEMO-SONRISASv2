
import React, { useState, useRef, useMemo } from 'react';
import { Doctor, Appointment, Branch } from '../types';
import { DoctorProfile } from './doctors/DoctorProfile';
import { DoctorSchedule } from './doctors/DoctorSchedule';
import { DoctorLabor } from './doctors/DoctorLabor';
import { DoctorStats } from './doctors/DoctorStats';
import { DoctorDocs } from './doctors/DoctorDocs';

interface DoctorDetailModalProps {
  doctor: Doctor;
  appointments: Appointment[];
  onClose: () => void;
  onSave: (updatedDoctor: Doctor) => void;
  branches?: Branch[];
}

const DoctorDetailModal: React.FC<DoctorDetailModalProps> = ({ doctor, appointments, onClose, onSave, branches = [] }) => {
  const [activeTab, setActiveTab] = useState<'perfil' | 'horario' | 'laboral' | 'rendimiento' | 'docs'>('perfil');
  const [isEditing, setIsEditing] = useState(false);
  const [editDocData, setEditDocData] = useState<Doctor>(doctor);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = () => {
    if (!editDocData.name?.trim()) { alert("Nombre requerido"); return; }
    onSave(editDocData);
    setIsEditing(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditDocData({ ...editDocData, img: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const branchOptions = useMemo(() => branches.length > 0 ? branches.map(b => ({ value: b.name, label: b.name })) : [{value: 'Centro', label: 'Centro'}], [branches]);

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
      <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-[92vw] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark h-[92vh]">
        <header className="px-10 py-8 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="size-20 rounded-lg bg-cover bg-center border-2 border-white dark:border-slate-700 shadow-sm" style={{ backgroundImage: `url("${editDocData.img}")` }}>
                {isEditing && (
                  <div className="absolute inset-0 bg-primary/60 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer" onClick={() => editAvatarInputRef.current?.click()}>
                    <span className="material-symbols-outlined text-2xl">photo_camera</span>
                  </div>
                )}
              </div>
              <input type="file" ref={editAvatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">{editDocData.name}</h2>
              <div className="flex items-center gap-4 mt-1">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-md text-[10px] font-black uppercase tracking-[0.2em]">{editDocData.specialty}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isEditing ? (
              <button onClick={handleSaveProfile} className="h-12 px-8 bg-primary text-white rounded-md font-black flex items-center gap-2 transition-all active:scale-95"><span className="material-symbols-outlined text-xl">save</span> Guardar Cambios</button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="h-12 px-8 bg-white border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white rounded-md font-black flex items-center gap-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-800"><span className="material-symbols-outlined text-xl">edit</span> Editar Expediente</button>
            )}
            <button onClick={onClose} className="size-12 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-danger transition-all"><span className="material-symbols-outlined text-2xl">close</span></button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <nav className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white/40 dark:bg-surface-dark/40 p-6 gap-2 shrink-0">
            {[
              { id: 'perfil', label: 'Info Profesional', icon: 'account_circle' },
              { id: 'horario', label: 'Horario y Turnos', icon: 'schedule' },
              { id: 'laboral', label: 'Laboral y RRHH', icon: 'badge' },
              { id: 'rendimiento', label: 'Rendimiento', icon: 'analytics' },
              { id: 'docs', label: 'Documentación', icon: 'folder_managed' }
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex items-center gap-4 px-5 py-3 rounded-md text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-primary'}`}><span className="material-symbols-outlined text-xl">{t.icon}</span> {t.label}</button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10 bg-transparent">
            {activeTab === 'perfil' && <DoctorProfile editDocData={editDocData} setEditDocData={setEditDocData} isEditing={isEditing} branchOptions={branchOptions} />}
            {activeTab === 'horario' && <DoctorSchedule editDocData={editDocData} setEditDocData={setEditDocData} isEditing={isEditing} />}
            {activeTab === 'laboral' && <DoctorLabor editDocData={editDocData} setEditDocData={setEditDocData} isEditing={isEditing} />}
            {activeTab === 'rendimiento' && <DoctorStats editDocData={editDocData} appointments={appointments} />}
            {activeTab === 'docs' && <DoctorDocs editDocData={editDocData} setEditDocData={setEditDocData} isEditing={isEditing} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDetailModal;
