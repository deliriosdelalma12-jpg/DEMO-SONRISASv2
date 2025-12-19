
import React, { useState, useEffect } from 'react';
import { ClinicSettings, UserRole, RolePermissions, User, ClinicService } from '../types';
import { COLOR_TEMPLATES } from '../App';

interface SettingsProps {
  settings: ClinicSettings;
  setSettings: React.Dispatch<React.SetStateAction<ClinicSettings>>;
  onToggleTheme: () => void;
  darkMode: boolean;
  systemUsers: User[];
  setSystemUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings, onToggleTheme, darkMode, systemUsers, setSystemUsers }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados para inputs dinámicos de especialidades y servicios
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');

  const [formUser, setFormUser] = useState<Partial<User>>({
    role: 'Recepción',
    status: 'Activo',
    img: 'https://i.pravatar.cc/150?u=' + Math.random()
  });

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingUserId(null);
    setFormUser({
      role: 'Recepción',
      status: 'Activo',
      img: 'https://i.pravatar.cc/150?u=' + Math.random()
    });
  };

  const handleEditInit = (user: User) => {
    setFormUser(user);
    setEditingUserId(user.id);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Gestión de Especialidades
  const addSpecialty = () => {
    if (!newSpecialty.trim() || settings.specialties.includes(newSpecialty.trim())) return;
    setSettings(prev => ({
      ...prev,
      specialties: [...prev.specialties, newSpecialty.trim()]
    }));
    setNewSpecialty('');
  };

  const removeSpecialty = (spec: string) => {
    setSettings(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== spec)
    }));
  };

  // Gestión de Servicios
  const addService = () => {
    if (!newServiceName.trim() || !newServicePrice) return;
    const service: ClinicService = {
      id: 'S' + Math.floor(Math.random() * 10000),
      name: newServiceName.trim(),
      price: parseFloat(newServicePrice)
    };
    setSettings(prev => ({
      ...prev,
      services: [...prev.services, service]
    }));
    setNewServiceName('');
    setNewServicePrice('');
  };

  const removeService = (id: string) => {
    setSettings(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id)
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormUser(prev => ({ ...prev, img: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePermission = (roleId: UserRole, permissionKey: keyof RolePermissions) => {
    setSettings(prev => ({
      ...prev,
      roles: prev.roles.map(r => 
        r.id === roleId 
          ? { ...r, permissions: { ...r.permissions, [permissionKey]: !r.permissions[permissionKey] } }
          : r
      )
    }));
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUser.username || !formUser.name || !formUser.corporateEmail) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }

    if (editingUserId) {
      setSystemUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, ...formUser } as User : u));
    } else {
      const userToAdd: User = {
        id: 'U' + Math.floor(Math.random() * 10000),
        username: formUser.username!,
        password: formUser.password || '123456',
        name: formUser.name!,
        role: formUser.role as UserRole,
        jobTitle: formUser.jobTitle || 'Empleado',
        phone: formUser.phone || '',
        identityDocument: formUser.identityDocument || '',
        corporateEmail: formUser.corporateEmail!,
        status: formUser.status as 'Activo' | 'Inactivo',
        img: formUser.img || 'https://i.pravatar.cc/150'
      };
      setSystemUsers(prev => [...prev, userToAdd]);
    }
    resetForm();
  };

  const deleteUser = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar permanentemente este usuario del sistema?")) {
      setSystemUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  return (
    <div className="p-10 max-w-[1400px] mx-auto space-y-16 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col gap-2">
        <h1 className="text-5xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Panel Maestro de Control</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium italic text-lg text-balance">Configura la infraestructura visual, operativa y el catálogo de servicios de tu red clínica.</p>
      </header>

      <div className="grid grid-cols-1 gap-12">

        {/* SECCIÓN 1: CONFIGURACIÓN DE NEGOCIO (BLOQUE EMPRESA) */}
        <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-2xl transition-all">
           <div className="p-10 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-6">
             <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                 <span className="material-symbols-outlined text-4xl">business_center</span>
             </div>
             <div>
                <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Modelo de Negocio y Servicios</h3>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Personalización comercial y sectorial de la plataforma</p>
             </div>
           </div>

           <div className="p-12 space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                 {/* Sector y Descripción */}
                 <div className="space-y-8">
                    <div className="flex flex-col gap-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Sector de Actividad</label>
                       <div className="relative">
                          <select 
                            value={settings.sector}
                            onChange={e => setSettings({...settings, sector: e.target.value})}
                            className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer"
                          >
                            <option value="Odontología">Odontología y Salud Dental</option>
                            <option value="Fisioterapia">Fisioterapia y Rehabilitación</option>
                            <option value="Psicología">Psicología y Salud Mental</option>
                            <option value="Estética">Medicina Estética</option>
                            <option value="Veterinaria">Hospital Veterinario</option>
                            <option value="Podología">Podología</option>
                            <option value="General">Clínica Multidisciplinar</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">category</span>
                       </div>
                    </div>
                    <div className="flex flex-col gap-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Descripción del Negocio / Misión</label>
                       <textarea 
                          value={settings.description}
                          onChange={e => setSettings({...settings, description: e.target.value})}
                          placeholder="Describe tu clínica..."
                          className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-[1.75rem] px-8 py-6 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all outline-none shadow-sm h-32 resize-none"
                       />
                    </div>
                 </div>

                 {/* Especialidades */}
                 <div className="space-y-8">
                    <div className="flex flex-col gap-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Especialidades Clínicas</label>
                       <div className="flex gap-3">
                          <input 
                            type="text"
                            value={newSpecialty}
                            onChange={e => setNewSpecialty(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && addSpecialty()}
                            placeholder="Ej: Cirugía Oral"
                            className="flex-1 bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10"
                          />
                          <button 
                            onClick={addSpecialty}
                            className="size-14 bg-primary text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
                          >
                             <span className="material-symbols-outlined">add</span>
                          </button>
                       </div>
                       <div className="flex flex-wrap gap-2 pt-2">
                          {settings.specialties.map(spec => (
                            <div key={spec} className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 group transition-all hover:bg-primary/20">
                               {spec}
                               <button onClick={() => removeSpecialty(spec)} className="text-danger opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-xs">close</span></button>
                            </div>
                          ))}
                          {settings.specialties.length === 0 && <p className="text-xs italic text-slate-400">No hay especialidades definidas.</p>}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Catálogo de Servicios y Precios */}
              <div className="space-y-8 border-t-2 border-slate-50 dark:border-slate-800 pt-10">
                 <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Catálogo de Servicios y Precios</label>
                    <span className="text-[9px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">Base de Precios Real</span>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-900/30 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800">
                    <div className="md:col-span-7 flex flex-col gap-2">
                       <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Nombre del Servicio</label>
                       <input 
                         type="text" 
                         value={newServiceName}
                         onChange={e => setNewServiceName(e.target.value)}
                         className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10" 
                         placeholder="Ej: Consulta de Valoración"
                       />
                    </div>
                    <div className="md:col-span-3 flex flex-col gap-2">
                       <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Precio (€)</label>
                       <input 
                         type="number" 
                         value={newServicePrice}
                         onChange={e => setNewServicePrice(e.target.value)}
                         className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10" 
                         placeholder="0.00"
                       />
                    </div>
                    <div className="md:col-span-2">
                       <button 
                         onClick={addService}
                         className="w-full h-14 bg-success text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-success/30 hover:scale-105 transition-all flex items-center justify-center gap-2"
                       >
                          <span className="material-symbols-outlined">price_check</span> Añadir
                       </button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {settings.services.map(s => (
                       <div key={s.id} className="p-6 bg-white dark:bg-surface-dark border-2 border-slate-100 dark:border-slate-800 rounded-3xl flex items-center justify-between group hover:border-primary transition-all shadow-sm">
                          <div className="min-w-0">
                             <p className="text-sm font-black text-slate-800 dark:text-white truncate uppercase tracking-tight">{s.name}</p>
                             <p className="text-xl font-display font-black text-primary mt-1">€{s.price.toLocaleString()}</p>
                          </div>
                          <button 
                            onClick={() => removeService(s.id)}
                            className="size-10 bg-danger/10 text-danger rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-danger hover:text-white"
                          >
                             <span className="material-symbols-outlined">delete</span>
                          </button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </section>
        
        {/* SECCIÓN 2: GESTIÓN DE USUARIOS DEL SISTEMA */}
        <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-2xl transition-all">
           <div className="p-10 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-4">
             <div className="flex items-center gap-6">
                <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-4xl">group_add</span>
                </div>
                <div>
                   <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestión de Usuarios y Acceso</h3>
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Control de identidades y privilegios del personal</p>
                </div>
             </div>
             <button 
               onClick={() => isFormOpen ? resetForm() : setIsFormOpen(true)}
               className={`h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl ${
                 isFormOpen ? 'bg-danger text-white' : 'bg-primary text-white shadow-primary/30'
               }`}
             >
               <span className="material-symbols-outlined">{isFormOpen ? 'close' : 'person_add'}</span>
               {isFormOpen ? 'Cancelar' : 'Añadir Usuario'}
             </button>
           </div>
           
           {isFormOpen && (
             <div className="p-12 bg-slate-100/50 dark:bg-bg-dark/50 border-b-2 border-border-light dark:border-border-dark animate-in slide-in-from-top-6 duration-500">
                <form onSubmit={handleSaveUser} className="max-w-5xl mx-auto space-y-10">
                   <div className="flex flex-col md:flex-row gap-12 items-start">
                      {/* Avatar Upload */}
                      <div className="flex flex-col items-center gap-4 shrink-0">
                         <div className="size-44 rounded-[3rem] bg-cover bg-center border-4 border-white dark:border-slate-700 shadow-2xl relative group overflow-hidden transition-all hover:scale-105" style={{ backgroundImage: `url("${formUser.img}")` }}>
                            <label className="absolute inset-0 bg-primary/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex flex-col items-center justify-center text-white">
                               <span className="material-symbols-outlined text-4xl">photo_camera</span>
                               <span className="text-[10px] font-black uppercase mt-2">Cambiar Foto</span>
                               <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                            </label>
                         </div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avatar del empleado</p>
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-6">
                            <div className="flex flex-col gap-2">
                               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Nombre de Usuario (Login)</label>
                               <input required type="text" value={formUser.username || ''} onChange={e => setFormUser({...formUser, username: e.target.value})} className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 shadow-sm" placeholder="ej: jsmith_recep" />
                            </div>
                            <div className="flex flex-col gap-2 relative">
                               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Contraseña de Acceso</label>
                               <input required type={showPassword ? 'text' : 'password'} value={formUser.password || ''} onChange={e => setFormUser({...formUser, password: e.target.value})} className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 shadow-sm" placeholder="••••••••" />
                               <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 bottom-4 text-slate-400 hover:text-primary transition-colors">
                                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                               </button>
                            </div>
                            <div className="flex flex-col gap-2">
                               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Nombre Completo</label>
                               <input required type="text" value={formUser.name || ''} onChange={e => setFormUser({...formUser, name: e.target.value})} className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 shadow-sm" placeholder="John Smith" />
                            </div>
                            <div className="flex flex-col gap-2">
                               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Identificación (DNI/NIE)</label>
                               <input type="text" value={formUser.identityDocument || ''} onChange={e => setFormUser({...formUser, identityDocument: e.target.value})} className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 shadow-sm" placeholder="12345678X" />
                            </div>
                         </div>
                         <div className="space-y-6">
                            <div className="flex flex-col gap-2">
                               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Email Corporativo</label>
                               <input required type="email" value={formUser.corporateEmail || ''} onChange={e => setFormUser({...formUser, corporateEmail: e.target.value})} className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 shadow-sm" placeholder="j.smith@mediclinic.com" />
                            </div>
                            <div className="flex flex-col gap-2">
                               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Teléfono Corporativo</label>
                               <input type="tel" value={formUser.phone || ''} onChange={e => setFormUser({...formUser, phone: e.target.value})} className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 shadow-sm" placeholder="+34 600 000 000" />
                            </div>
                            <div className="flex flex-col gap-2">
                               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Cargo / Especialidad</label>
                               <input type="text" value={formUser.jobTitle || ''} onChange={e => setFormUser({...formUser, jobTitle: e.target.value})} className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 shadow-sm" placeholder="Especialista Senior" />
                            </div>
                            <div className="flex flex-col gap-2">
                               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Rol Asignado (Nivel de Acceso)</label>
                               <div className="relative">
                                  <select 
                                    value={formUser.role} 
                                    onChange={e => setFormUser({...formUser, role: e.target.value as UserRole})} 
                                    className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 shadow-sm appearance-none cursor-pointer"
                                  >
                                    <option value="Admin">Administrador</option>
                                    <option value="Doctor">Doctor / Especialista</option>
                                    <option value="Recepción">Recepción / Gestión</option>
                                    <option value="Enfermería">Enfermería / Auxiliar</option>
                                  </select>
                                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="p-8 bg-primary/5 rounded-[2.5rem] border-2 border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                         <div className="size-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-2xl">verified_user</span>
                         </div>
                         <div>
                            <p className="text-sm font-black text-primary uppercase leading-tight">Acceso Gestionado por RBAC</p>
                            <p className="text-xs text-slate-500 font-medium">Los permisos se ajustarán automáticamente al perfil de <span className="font-bold">{formUser.role}</span>.</p>
                         </div>
                      </div>
                      <div className="flex gap-4">
                        <button type="submit" className="h-16 px-12 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                           <span className="material-symbols-outlined">{editingUserId ? 'save' : 'how_to_reg'}</span>
                           {editingUserId ? 'Actualizar Perfil' : 'Dar de Alta Usuario'}
                        </button>
                      </div>
                   </div>
                </form>
             </div>
           )}

           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/30 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2 dark:border-slate-800">
                  <tr>
                    <th className="px-10 py-6">Identidad</th>
                    <th className="px-10 py-6">Cargo Laboral</th>
                    <th className="px-10 py-6">Rol de Sistema</th>
                    <th className="px-10 py-6">Contacto</th>
                    <th className="px-10 py-6">Estado</th>
                    <th className="px-10 py-6 text-right">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {systemUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="size-14 rounded-2xl bg-cover bg-center border-2 border-white shadow-md transition-transform group-hover:scale-110" style={{ backgroundImage: `url("${user.img}")` }}></div>
                          <div className="flex flex-col">
                            <span className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">{user.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">@{user.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                         <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{user.jobTitle}</span>
                      </td>
                      <td className="px-10 py-6">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                          user.role === 'Admin' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-sm' : 
                          user.role === 'Doctor' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 
                          'bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700 shadow-sm'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                         <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-slate-500 italic">{user.corporateEmail}</span>
                            <span className="text-[10px] font-black text-slate-400">{user.phone}</span>
                         </div>
                      </td>
                      <td className="px-10 py-6">
                         <div className="flex items-center gap-2">
                            <span className={`size-2 rounded-full ${user.status === 'Activo' ? 'bg-success' : 'bg-danger'} animate-pulse`}></span>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${user.status === 'Activo' ? 'text-success' : 'text-danger'}`}>{user.status}</span>
                         </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                         <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            <button 
                              onClick={() => handleEditInit(user)}
                              className="size-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all shadow-sm border border-transparent hover:border-primary/20"
                              title="Editar Usuario"
                            >
                              <span className="material-symbols-outlined text-2xl">edit_square</span>
                            </button>
                            <button 
                              onClick={() => deleteUser(user.id)} 
                              className="size-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-danger hover:bg-danger/10 transition-all shadow-sm border border-transparent hover:border-danger/20"
                              title="Eliminar Usuario"
                            >
                              <span className="material-symbols-outlined text-2xl">delete_forever</span>
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </section>

        {/* SECCIÓN 3: IDENTIDAD Y MARCA */}
        <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-2xl">
           <div className="p-10 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-4">
             <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-4xl">branding_watermark</span>
             </div>
             <div>
                <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Identidad y Marca Blanca</h3>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Configura el branding global de la plataforma</p>
             </div>
           </div>
           
           <div className="p-12 space-y-12">
              <div className="flex flex-col md:flex-row gap-12 items-center">
                 <div className="relative group shrink-0">
                    <div className="size-56 rounded-[3rem] bg-white dark:bg-bg-dark border-4 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner p-6 transition-all group-hover:border-primary/50">
                       {settings.logo ? (
                         <img src={settings.logo} className="w-full h-full object-contain" alt="Logo Actual" />
                       ) : (
                         <span className="material-symbols-outlined text-8xl text-slate-300">image</span>
                       )}
                    </div>
                    <label className="absolute inset-0 flex flex-col items-center justify-center bg-primary/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-[3rem] text-white">
                       <span className="material-symbols-outlined text-5xl mb-3">upload_file</span>
                       <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cambiar Isotipo</span>
                       <input type="file" onChange={handleLogoChange} className="hidden" accept="image/*" />
                    </label>
                 </div>
                 <div className="flex-1 space-y-8">
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block tracking-widest ml-2">Título Global de la Aplicación</label>
                      <input 
                        type="text" 
                        value={settings.name} 
                        onChange={e => setSettings({...settings, name: e.target.value})} 
                        className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-[1.75rem] px-8 py-6 text-2xl font-black text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/20 transition-all outline-none shadow-sm" 
                        placeholder="Ej: Clínica Dental Premium"
                      />
                    </div>
                    <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-start gap-4">
                       <span className="material-symbols-outlined text-primary text-3xl">info</span>
                       <p className="text-xs text-slate-500 leading-relaxed font-medium italic">
                          <span className="font-black text-primary uppercase">Nota de Branding:</span> Los cambios aplicados aquí se sincronizarán en tiempo real para todos los puestos de trabajo de la red.
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* SECCIÓN 4: APARIENCIA Y TEMAS */}
        <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-2xl">
           <div className="p-10 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-4">
             <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-4xl">palette</span>
             </div>
             <div>
                <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Experiencia Visual</h3>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Configuración de interfaz y paleta de colores</p>
             </div>
           </div>
           
           <div className="p-12 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest ml-2">Esquema de Color por Defecto</label>
                    <div className="flex bg-slate-100 dark:bg-bg-dark p-2.5 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800">
                       <button 
                         onClick={() => { setSettings({...settings, defaultTheme: 'light'}); if(darkMode) onToggleTheme(); }}
                         className={`flex-1 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-4 ${!darkMode ? 'bg-white dark:bg-surface-dark text-primary shadow-2xl scale-105 z-10' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         <span className="material-symbols-outlined text-2xl">light_mode</span> Modo Diurno
                       </button>
                       <button 
                         onClick={() => { setSettings({...settings, defaultTheme: 'dark'}); if(!darkMode) onToggleTheme(); }}
                         className={`flex-1 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-4 ${darkMode ? 'bg-white dark:bg-surface-dark text-primary shadow-2xl scale-105 z-10' : 'text-slate-400 hover:text-slate-200'}`}
                       >
                         <span className="material-symbols-outlined text-2xl">dark_mode</span> Modo Nocturno
                       </button>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest ml-2">Identidad Cromática Corporativa</label>
                    <div className="grid grid-cols-5 gap-5">
                       {COLOR_TEMPLATES.map(t => (
                         <button 
                           key={t.id}
                           onClick={() => setSettings({...settings, colorTemplate: t.id})}
                           className={`group relative size-16 rounded-[1.75rem] transition-all hover:scale-110 active:scale-95 flex items-center justify-center shadow-lg ${settings.colorTemplate === t.id ? 'ring-4 ring-offset-4 dark:ring-offset-bg-dark ring-primary' : ''}`}
                           style={{ backgroundColor: t.primary }}
                           title={t.name}
                         >
                            {settings.colorTemplate === t.id && (
                              <span className="material-symbols-outlined text-white font-black text-3xl">check</span>
                            )}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* SECCIÓN 5: ROLES Y PERMISOS */}
        <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-2xl">
           <div className="p-10 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-4">
             <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-4xl">shield_person</span>
             </div>
             <div>
                <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Seguridad y Privilegios</h3>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Configuración granular de permisos por nivel de usuario</p>
             </div>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-slate-50 dark:bg-slate-900/30 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b-2 dark:border-slate-800">
                 <tr>
                   <th className="px-10 py-6">Definición de Rol</th>
                   <th className="px-10 py-6 text-center">Visualizar</th>
                   <th className="px-10 py-6 text-center">Crear</th>
                   <th className="px-10 py-6 text-center">Modificar</th>
                   <th className="px-10 py-6 text-center">Eliminar</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {settings.roles.map(role => (
                   <tr key={role.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                     <td className="px-10 py-8">
                       <div className="flex flex-col">
                          <span className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">{role.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Categoría Técnica: {role.id}</span>
                       </div>
                     </td>
                     {(['visualize', 'create', 'modify', 'delete'] as const).map(perm => (
                       <td key={perm} className="px-10 py-8 text-center">
                         <button 
                           onClick={() => togglePermission(role.id, perm)}
                           className={`size-14 rounded-2xl transition-all flex items-center justify-center mx-auto shadow-xl hover:scale-110 active:scale-95 ${
                             role.permissions[perm] 
                               ? 'bg-primary/10 text-primary border border-primary/20' 
                               : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border border-transparent'
                           }`}
                         >
                           <span className={`material-symbols-outlined text-3xl ${role.permissions[perm] ? 'verified_user' : 'lock_open'}`}>
                             {role.permissions[perm] ? 'verified_user' : 'lock_open'}
                           </span>
                         </button>
                       </td>
                     ))}
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </section>

      </div>

      <footer className="flex justify-end pt-12">
         <button className="h-24 px-20 bg-primary text-white rounded-[3rem] font-black text-2xl uppercase tracking-tighter shadow-[0_20px_60px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-6 group">
            <span className="material-symbols-outlined text-4xl group-hover:rotate-12 transition-transform">save</span> Guardar Configuración Maestra
         </button>
      </footer>
    </div>
  );
};

export default Settings;
