
import React, { useState, useRef } from 'react';
import { Branch, Doctor, Appointment } from '../types';
import { DataField } from '../components/shared/DataField';
import { BranchInfo } from '../components/branches/BranchInfo';
import { BranchLocation } from '../components/branches/BranchLocation';
import { BranchContact } from '../components/branches/BranchContact';
import { BranchStaff } from '../components/branches/BranchStaff';
import DoctorDetailModal from '../components/DoctorDetailModal';

interface BranchesProps {
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  doctors: Doctor[];
  setDoctors?: React.Dispatch<React.SetStateAction<Doctor[]>>;
  appointments: Appointment[];
}

const Branches: React.FC<BranchesProps> = ({ branches, setBranches, doctors, setDoctors, appointments }) => {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'contact' | 'staff'>('info');
  const [viewingDoctor, setViewingDoctor] = useState<Doctor | null>(null);
  
  const [editBranchData, setEditBranchData] = useState<Branch | null>(null);
  const [tempDoctors, setTempDoctors] = useState<Doctor[]>([]);

  const [newBranchData, setNewBranchData] = useState<Branch>({
    id: '', name: '', address: '', city: '', zip: '', phone: '', email: '', 
    status: 'Active', coordinates: { lat: '', lng: '' }, img: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=600&auto=format&fit=crop', 
    openingHours: '09:00 - 20:00'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenBranch = (branch: Branch, tab: 'info' | 'staff') => {
    setSelectedBranch(branch);
    setEditBranchData(branch);
    setTempDoctors(doctors); 
    setIsEditing(false);
    setActiveTab(tab);
  };

  const handleSave = () => {
    if (editBranchData && selectedBranch) {
        setBranches(prev => prev.map(b => b.id === editBranchData.id ? editBranchData : b));
        if (setDoctors) setDoctors(tempDoctors);
        setSelectedBranch(editBranchData);
        setIsEditing(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchData.name.trim() || !newBranchData.address.trim()) { alert("Nombre y dirección son obligatorios"); return; }
    const newBranch: Branch = { ...newBranchData, id: `B${Math.floor(Math.random() * 10000)}` };
    setBranches([...branches, newBranch]);
    setIsCreating(false);
    setNewBranchData({ id: '', name: '', address: '', city: '', zip: '', phone: '', email: '', status: 'Active', coordinates: { lat: '', lng: '' }, img: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=600&auto=format&fit=crop', openingHours: '09:00 - 20:00' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'edit' | 'create') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'edit' && editBranchData) setEditBranchData({ ...editBranchData, img: reader.result as string });
        else setNewBranchData({ ...newBranchData, img: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const getBranchDoctors = (branchName: string, sourceDoctors: Doctor[]) => sourceDoctors.filter(d => d.branch === branchName);

  return (
    <div className="w-full flex flex-col p-6 gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Red de Sucursales</h1><p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium italic">Gestión de sedes, ubicaciones y recursos físicos.</p></div>
        <button onClick={() => setIsCreating(true)} className="h-10 px-6 bg-primary text-white rounded-md font-bold hover:bg-primary-dark transition-all flex items-center gap-2"><span className="material-symbols-outlined text-xl">add_business</span><span className="text-xs uppercase tracking-tight">Nueva Sucursal</span></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {branches.map((branch) => (
        <div key={branch.id} className="group bg-white dark:bg-surface-dark rounded-lg overflow-hidden border border-border-light dark:border-border-dark shadow-sm hover:border-primary transition-all">
            <div className="h-40 bg-cover bg-center relative" style={{ backgroundImage: `url("${branch.img}")` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-6 text-white"><h3 className="text-xl font-display font-black uppercase tracking-tight">{branch.name}</h3><p className="text-[10px] font-medium opacity-80 flex items-center gap-1"><span className="material-symbols-outlined text-xs">location_on</span> {branch.city}</p></div>
                <div className={`absolute top-4 right-4 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest backdrop-blur-md ${branch.status === 'Active' ? 'bg-success/20 text-success border border-success/30' : 'bg-warning/20 text-warning border border-warning/30'}`}>{branch.status === 'Active' ? 'Operativa' : 'Mantenimiento'}</div>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Personal Médico</span>
                    <div className="flex -space-x-3">
                        {getBranchDoctors(branch.name, doctors).slice(0, 4).map(d => (
                            <div 
                                key={d.id} 
                                onClick={(e) => { e.stopPropagation(); setViewingDoctor(d); }}
                                className="size-8 rounded-full border-2 border-white dark:border-surface-dark bg-cover bg-center cursor-pointer hover:scale-110 transition-transform relative z-10" 
                                style={{backgroundImage: `url('${d.img}')`}} 
                                title={d.name}
                            ></div>
                        ))}
                        {getBranchDoctors(branch.name, doctors).length > 4 && (
                            <div className="size-8 rounded-full border-2 border-white dark:border-surface-dark bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-500">
                                +{getBranchDoctors(branch.name, doctors).length - 4}
                            </div>
                        )}
                    </div>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col gap-1 mb-4">
                        <p className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 tracking-tight"><span className="material-symbols-outlined text-primary text-xl">call</span> {branch.phone}</p>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 pl-1 truncate"><span className="material-symbols-outlined text-xs">location_on</span> {branch.address}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleOpenBranch(branch, 'staff')} className="py-2.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[9px] font-black uppercase text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-base">groups</span>
                            <span>Equipo</span>
                        </button>
                        <button onClick={() => handleOpenBranch(branch, 'info')} className="py-2.5 bg-primary/10 text-primary rounded-md text-[9px] font-black uppercase hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-base">info</span>
                            <span>Detalles</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        ))}
      </div>

      {selectedBranch && editBranchData && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
           <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-[92vw] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark h-[92vh]">
              <header className="px-12 py-10 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-8">
                    <div className="relative group size-24 rounded-lg shadow-xl overflow-hidden border-4 border-white dark:border-slate-700">
                       <img src={editBranchData.img} className="w-full h-full object-cover" alt="" />
                       {isEditing && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity" onClick={() => fileInputRef.current?.click()}><span className="material-symbols-outlined text-3xl">photo_camera</span></div>)}
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'edit')} />
                    </div>
                    <div><h2 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">{editBranchData.name}</h2><p className="text-sm font-bold text-slate-500 mt-2 flex items-center gap-2"><span className="material-symbols-outlined text-base">location_on</span> {editBranchData.address}, {editBranchData.city}</p></div>
                 </div>
                 <div className="flex items-center gap-6">
                    {isEditing ? <button onClick={handleSave} className="h-12 px-8 bg-primary text-white rounded-md font-black flex items-center gap-3 transition-all active:scale-95 text-xs uppercase tracking-widest"><span className="material-symbols-outlined text-xl">save</span> Guardar Cambios</button> : <button onClick={() => setIsEditing(true)} className="h-12 px-8 bg-white dark:bg-slate-800 text-primary border border-slate-200 dark:border-slate-700 rounded-md font-black flex items-center gap-3 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 text-xs uppercase tracking-widest"><span className="material-symbols-outlined text-xl">edit</span> Editar</button>}
                    <button onClick={() => setSelectedBranch(null)} className="size-12 rounded-md bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger transition-all border border-slate-200 dark:border-slate-700"><span className="material-symbols-outlined text-2xl">close</span></button>
                 </div>
              </header>
              <div className="flex-1 flex overflow-hidden">
                 <nav className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white/40 dark:bg-surface-dark/40 p-8 gap-3 shrink-0">
                    {[{ id: 'info', label: 'Info General', icon: 'info' }, { id: 'location', label: 'Ubicación y Coords', icon: 'map' }, { id: 'contact', label: 'Datos de Contacto', icon: 'contact_phone' }, { id: 'staff', label: 'Personal Asignado', icon: 'groups' }].map(t => (
                      <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex items-center gap-4 px-6 py-4 rounded-md text-[11px] font-black uppercase tracking-[0.15em] transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-primary'}`}><span className="material-symbols-outlined text-2xl">{t.icon}</span> {t.label}</button>
                    ))}
                 </nav>
                 <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-transparent space-y-12">
                    {activeTab === 'info' && <BranchInfo editBranchData={editBranchData} setEditBranchData={setEditBranchData} isEditing={isEditing} />}
                    {activeTab === 'location' && <BranchLocation editBranchData={editBranchData} setEditBranchData={setEditBranchData} isEditing={isEditing} />}
                    {activeTab === 'contact' && <BranchContact editBranchData={editBranchData} setEditBranchData={setEditBranchData} isEditing={isEditing} />}
                    {activeTab === 'staff' && <BranchStaff editBranchData={editBranchData} isEditing={isEditing} doctors={doctors} tempDoctors={tempDoctors} setTempDoctors={setTempDoctors} />}
                 </div>
              </div>
           </div>
        </div>
      )}

      {isCreating && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
           <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark h-auto max-h-[90vh]">
              <header className="px-10 py-8 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between"><h2 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Alta de Sucursal</h2><button onClick={() => setIsCreating(false)} className="size-10 rounded-md bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger border border-slate-200 dark:border-slate-700 transition-all"><span className="material-symbols-outlined text-2xl">close</span></button></header>
              <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
                 <div className="flex gap-8 items-center">
                    <div className="size-32 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden relative group cursor-pointer" onClick={() => newFileInputRef.current?.click()}><img src={newBranchData.img} className="w-full h-full object-cover" alt="" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined">photo_camera</span></div><input type="file" ref={newFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'create')} /></div>
                    <div className="flex-1 space-y-6"><DataField label="Nombre Sucursal" value={newBranchData.name} onChange={(v: string) => setNewBranchData({...newBranchData, name: v})} editing={true} placeholder="Ej: Clínica Oeste" /><DataField label="Gerente" value={newBranchData.manager} onChange={(v: string) => setNewBranchData({...newBranchData, manager: v})} editing={true} /></div>
                 </div>
                 <div className="grid grid-cols-2 gap-8"><DataField label="Dirección" value={newBranchData.address} onChange={(v: string) => setNewBranchData({...newBranchData, address: v})} editing={true} /><DataField label="Ciudad" value={newBranchData.city} onChange={(v: string) => setNewBranchData({...newBranchData, city: v})} editing={true} /><DataField label="Teléfono" value={newBranchData.phone} onChange={(v: string) => setNewBranchData({...newBranchData, phone: v})} editing={true} /><DataField label="Horario" value={newBranchData.openingHours} onChange={(v: string) => setNewBranchData({...newBranchData, openingHours: v})} editing={true} /></div>
                 <button type="submit" className="w-full h-14 bg-primary text-white rounded-md font-black uppercase tracking-widest hover:bg-primary-dark transition-all">Registrar Sucursal</button>
              </form>
           </div>
        </div>
      )}

      {/* POP-UP DEL DOCTOR SELECCIONADO */}
      {viewingDoctor && (
        <DoctorDetailModal 
          doctor={viewingDoctor} 
          appointments={appointments}
          onClose={() => setViewingDoctor(null)}
          onSave={(updatedDoc) => {
             if (setDoctors) setDoctors(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
             setViewingDoctor(null);
          }}
          branches={branches}
        />
      )}
    </div>
  );
};

export default Branches;
