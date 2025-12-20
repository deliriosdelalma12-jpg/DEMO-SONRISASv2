
import React, { useState, useRef, useEffect } from 'react';
import { Branch, Doctor } from '../types';

interface BranchesProps {
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  doctors: Doctor[];
  setDoctors?: React.Dispatch<React.SetStateAction<Doctor[]>>; // Added to update doctor assignments
}

const DataField = ({ label, value, onChange, type = "text", editing = true, placeholder = "" }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
      {label}
    </label>
    {editing ? (
      <input 
        type={type} 
        value={value} 
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
      />
    ) : (
      <div className="bg-white/40 dark:bg-white/5 border border-transparent rounded-2xl px-5 py-3.5 flex items-center min-h-[50px]">
        <span className="text-sm font-black text-slate-800 dark:text-white leading-none">{value || '---'}</span>
      </div>
    )}
  </div>
);

const Branches: React.FC<BranchesProps> = ({ branches, setBranches, doctors, setDoctors }) => {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'contact' | 'staff'>('info');
  
  const [editBranchData, setEditBranchData] = useState<Branch | null>(null);
  
  // Local state for doctors to handle assignments before saving
  const [tempDoctors, setTempDoctors] = useState<Doctor[]>([]);

  const [newBranchData, setNewBranchData] = useState<Branch>({
    id: '', name: '', address: '', city: '', zip: '', phone: '', email: '', 
    status: 'Active', coordinates: { lat: '', lng: '' }, img: 'https://img.freepik.com/foto-gratis/edificio-hospital-moderno_1127-3135.jpg', 
    openingHours: '09:00 - 20:00'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    setEditBranchData(branch);
    setTempDoctors(doctors); // Initialize tempDoctors with current global state
    setIsEditing(false);
    setActiveTab('info');
  };

  const handleSave = () => {
    if (editBranchData && selectedBranch) {
        setBranches(prev => prev.map(b => b.id === editBranchData.id ? editBranchData : b));
        
        // Update Global Doctors State if setDoctors is available
        if (setDoctors) {
            setDoctors(tempDoctors);
        }

        setSelectedBranch(editBranchData);
        setIsEditing(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchData.name.trim() || !newBranchData.address.trim()) {
        alert("Nombre y dirección son obligatorios");
        return;
    }
    const newBranch: Branch = {
        ...newBranchData,
        id: `B${Math.floor(Math.random() * 10000)}`
    };
    setBranches([...branches, newBranch]);
    setIsCreating(false);
    setNewBranchData({
        id: '', name: '', address: '', city: '', zip: '', phone: '', email: '', 
        status: 'Active', coordinates: { lat: '', lng: '' }, img: 'https://img.freepik.com/foto-gratis/edificio-hospital-moderno_1127-3135.jpg',
        openingHours: '09:00 - 20:00'
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'edit' | 'create') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'edit' && editBranchData) {
          setEditBranchData({ ...editBranchData, img: reader.result as string });
        } else {
          setNewBranchData({ ...newBranchData, img: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle doctor assignment in local state
  const toggleDoctorAssignment = (docId: string) => {
      if (!editBranchData) return;
      
      setTempDoctors(prev => prev.map(d => {
          if (d.id === docId) {
              // If currently assigned to THIS branch -> Unassign (or empty)
              if (d.branch === editBranchData.name) {
                  return { ...d, branch: 'Sin Asignar' };
              } 
              // If assigned to ANOTHER branch or Unassigned -> Assign to THIS branch
              else {
                  return { ...d, branch: editBranchData.name };
              }
          }
          return d;
      }));
  };

  const getBranchDoctors = (branchName: string, sourceDoctors: Doctor[]) => {
      return sourceDoctors.filter(d => d.branch === branchName);
  };

  return (
    <div className="p-10 max-w-[1600px] mx-auto w-full space-y-12 no-print">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Red de Sucursales</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium italic">Gestión de sedes, ubicaciones y recursos físicos.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="h-16 px-10 bg-primary text-white rounded-[2rem] font-bold shadow-2xl shadow-primary/30 hover:scale-105 transition-all flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl">add_business</span>
          <span className="text-lg uppercase tracking-tight">Nueva Sucursal</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {branches.map((branch) => (
          <div key={branch.id} onClick={() => handleOpenBranch(branch)} className="group bg-white dark:bg-surface-dark rounded-[3.5rem] overflow-hidden border border-border-light dark:border-border-dark cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all">
             <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: `url("${branch.img}")` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-6 left-8 text-white">
                   <h3 className="text-2xl font-display font-black uppercase tracking-tight">{branch.name}</h3>
                   <p className="text-xs font-medium opacity-80 flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span> {branch.city}</p>
                </div>
                <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${branch.status === 'Active' ? 'bg-success/20 text-success border border-success/30' : 'bg-warning/20 text-warning border border-warning/30'}`}>
                    {branch.status === 'Active' ? 'Operativa' : 'Mantenimiento'}
                </div>
             </div>
             <div className="p-8 space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personal Médico</span>
                    <div className="flex -space-x-3">
                        {getBranchDoctors(branch.name, doctors).slice(0, 4).map(d => (
                            <div key={d.id} className="size-8 rounded-full border-2 border-white dark:border-surface-dark bg-cover bg-center" style={{backgroundImage: `url('${d.img}')`}} title={d.name}></div>
                        ))}
                        {getBranchDoctors(branch.name, doctors).length > 4 && (
                            <div className="size-8 rounded-full border-2 border-white dark:border-surface-dark bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-500">+{getBranchDoctors(branch.name, doctors).length - 4}</div>
                        )}
                    </div>
                </div>
                
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                    <div className="flex flex-col gap-1">
                        <p className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
                            <span className="material-symbols-outlined text-primary text-2xl">call</span> 
                            {branch.phone}
                        </p>
                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 pl-1 truncate max-w-[200px]">
                            <span className="material-symbols-outlined text-sm">location_on</span> 
                            {branch.address}
                        </p>
                    </div>
                    <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-300 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                        <span className="material-symbols-outlined text-xl">arrow_forward</span>
                    </div>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* MODAL DETALLE SUCURSAL */}
      {selectedBranch && editBranchData && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
           <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-6xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark h-[92vh]">
              <header className="px-12 py-10 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-8">
                    <div className="relative group size-24 rounded-[2.5rem] shadow-xl overflow-hidden border-4 border-white dark:border-slate-700">
                       <img src={editBranchData.img} className="w-full h-full object-cover" alt="" />
                       {isEditing && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity" onClick={() => fileInputRef.current?.click()}>
                             <span className="material-symbols-outlined text-3xl">photo_camera</span>
                          </div>
                       )}
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'edit')} />
                    </div>
                    <div>
                       <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">{editBranchData.name}</h2>
                       <p className="text-sm font-bold text-slate-500 mt-2 flex items-center gap-2"><span className="material-symbols-outlined text-base">location_on</span> {editBranchData.address}, {editBranchData.city}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-6">
                    {isEditing ? (
                      <button onClick={handleSave} className="h-16 px-10 bg-primary text-white rounded-[2rem] font-black flex items-center gap-3 shadow-2xl shadow-primary/30 transition-all active:scale-95 text-xs uppercase tracking-widest"><span className="material-symbols-outlined text-2xl">save</span> Guardar Cambios</button>
                    ) : (
                      <button onClick={() => setIsEditing(true)} className="h-16 px-10 bg-white dark:bg-slate-800 text-primary border-2 border-primary/20 rounded-[2rem] font-black flex items-center gap-3 transition-all hover:bg-primary hover:text-white text-xs uppercase tracking-widest"><span className="material-symbols-outlined text-2xl">edit</span> Editar</button>
                    )}
                    <button onClick={() => setSelectedBranch(null)} className="size-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger transition-all shadow-md"><span className="material-symbols-outlined text-4xl">close</span></button>
                 </div>
              </header>

              <div className="flex-1 flex overflow-hidden">
                 <nav className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white/40 dark:bg-surface-dark/40 p-8 gap-3 shrink-0">
                    {[
                      { id: 'info', label: 'Info General', icon: 'info' },
                      { id: 'location', label: 'Ubicación y Coords', icon: 'map' },
                      { id: 'contact', label: 'Datos de Contacto', icon: 'contact_phone' },
                      { id: 'staff', label: 'Personal Asignado', icon: 'groups' }
                    ].map(t => (
                      <button 
                        key={t.id} 
                        onClick={() => setActiveTab(t.id as any)}
                        className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-xl translate-x-2' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-primary'}`}
                      >
                        <span className="material-symbols-outlined text-2xl">{t.icon}</span> {t.label}
                      </button>
                    ))}
                 </nav>

                 <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-transparent space-y-12">
                    
                    {activeTab === 'info' && (
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
                                    <DataField label="Horario Apertura" value={editBranchData.openingHours} onChange={(v: string) => isEditing && setEditBranchData({...editBranchData, openingHours: v})} editing={isEditing} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'location' && (
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
                    )}

                    {activeTab === 'contact' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                            <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
                                <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-10"><span className="material-symbols-outlined text-sm">contact_phone</span> Canales de Contacto</h4>
                                <div className="grid grid-cols-1 gap-8">
                                    <DataField label="Teléfono Principal" value={editBranchData.phone} onChange={(v: string) => isEditing && setEditBranchData({...editBranchData, phone: v})} editing={isEditing} />
                                    <DataField label="Email Sucursal" value={editBranchData.email} onChange={(v: string) => isEditing && setEditBranchData({...editBranchData, email: v})} editing={isEditing} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'staff' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3"><span className="material-symbols-outlined text-sm">groups</span> Equipo Asignado</h4>
                                {isEditing && <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">Selecciona para asignar/desasignar</span>}
                            </div>
                            
                            {/* Render Logic: If editing, show ALL doctors to select. If viewing, show only assigned. */}
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
                                            {/* Status Indicator for Edit Mode */}
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
                    )}

                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CREAR SUCURSAL */}
      {isCreating && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
           <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark h-auto max-h-[90vh]">
              <header className="px-10 py-8 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                 <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Alta de Sucursal</h2>
                 <button onClick={() => setIsCreating(false)} className="size-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger shadow-md transition-all"><span className="material-symbols-outlined text-3xl">close</span></button>
              </header>
              <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
                 <div className="flex gap-8 items-center">
                    <div className="size-32 shrink-0 rounded-[2rem] bg-slate-200 dark:bg-slate-800 overflow-hidden relative group cursor-pointer" onClick={() => newFileInputRef.current?.click()}>
                        <img src={newBranchData.img} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined">photo_camera</span></div>
                        <input type="file" ref={newFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'create')} />
                    </div>
                    <div className="flex-1 space-y-6">
                        <DataField label="Nombre Sucursal" value={newBranchData.name} onChange={(v: string) => setNewBranchData({...newBranchData, name: v})} editing={true} placeholder="Ej: Clínica Oeste" />
                        <DataField label="Gerente" value={newBranchData.manager} onChange={(v: string) => setNewBranchData({...newBranchData, manager: v})} editing={true} />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-8">
                    <DataField label="Dirección" value={newBranchData.address} onChange={(v: string) => setNewBranchData({...newBranchData, address: v})} editing={true} />
                    <DataField label="Ciudad" value={newBranchData.city} onChange={(v: string) => setNewBranchData({...newBranchData, city: v})} editing={true} />
                    <DataField label="Teléfono" value={newBranchData.phone} onChange={(v: string) => setNewBranchData({...newBranchData, phone: v})} editing={true} />
                    <DataField label="Horario" value={newBranchData.openingHours} onChange={(v: string) => setNewBranchData({...newBranchData, openingHours: v})} editing={true} />
                 </div>
                 <button type="submit" className="w-full h-16 bg-primary text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all">Registrar Sucursal</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Branches;
