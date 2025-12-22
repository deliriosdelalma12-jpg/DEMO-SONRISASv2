
import React, { useState, useRef, useEffect } from 'react';
import { ClinicSettings, User, ClinicService, RoleDefinition, PermissionId, Doctor, DaySchedule, CountryRegion } from '../../types';

interface SettingsCompanyProps {
  settings: ClinicSettings;
  setSettings: React.Dispatch<React.SetStateAction<ClinicSettings>>;
  systemUsers: User[];
  setSystemUsers: React.Dispatch<React.SetStateAction<User[]>>;
  doctors?: Doctor[];
  setDoctors?: React.Dispatch<React.SetStateAction<Doctor[]>>;
}

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const REGIONS: { code: CountryRegion, label: string }[] = [
    { code: 'ES', label: 'España' }, { code: 'MX', label: 'México' }, { code: 'US', label: 'Estados Unidos' },
    { code: 'CO', label: 'Colombia' }, { code: 'AR', label: 'Argentina' }, { code: 'BZ', label: 'Belice' },
    { code: 'CR', label: 'Costa Rica' }, { code: 'SV', label: 'El Salvador' }, { code: 'GT', label: 'Guatemala' },
    { code: 'HN', label: 'Honduras' }, { code: 'NI', label: 'Nicaragua' }, { code: 'PA', label: 'Panamá' }
];

const DEFAULT_LOGO = "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/hospital.svg";

const SettingsCompany: React.FC<SettingsCompanyProps> = ({ settings, setSettings, systemUsers, setSystemUsers, doctors, setDoctors }) => {
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');
  const [newServiceDuration, setNewServiceDuration] = useState<string>('30');
  
  const [newRoleName, setNewRoleName] = useState('');
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // User Management State
  const [newUser, setNewUser] = useState({ name: '', username: '', role: '', avatar: 'https://i.pravatar.cc/150?u=new' });

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    const currentAiKey = settings.aiPhoneSettings.aiCompanyName;
    let updatedPrompt = settings.aiPhoneSettings.systemPrompt;
    let updatedGreeting = settings.aiPhoneSettings.initialGreeting;
    let updatedTest = settings.aiPhoneSettings.testSpeechText;

    if (currentAiKey && currentAiKey.trim().length > 2 && newName.trim().length > 2) {
        const escapedKey = currentAiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedKey, 'g');
        updatedPrompt = updatedPrompt.replace(regex, newName);
        updatedGreeting = updatedGreeting.replace(regex, newName);
        updatedTest = updatedTest.replace(regex, newName);
    }

    setSettings(prev => ({ 
        ...prev, name: newName, 
        aiPhoneSettings: { ...prev.aiPhoneSettings, aiCompanyName: newName, systemPrompt: updatedPrompt, initialGreeting: updatedGreeting, testSpeechText: updatedTest } 
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setSettings(prev => ({ ...prev, logo: event.target?.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const addService = () => {
    if (!newServiceName.trim() || !newServicePrice) return;
    const service: ClinicService = { 
      id: 'S' + Math.floor(Math.random() * 10000), name: newServiceName.trim(), 
      price: parseFloat(newServicePrice), duration: parseInt(newServiceDuration) || 30
    };
    setSettings(prev => ({ ...prev, services: [...prev.services, service] }));
    setNewServiceName(''); setNewServicePrice('');
  };

  const addRole = () => {
      if (!newRoleName.trim()) return;
      const role: RoleDefinition = { id: 'role_'+Date.now(), name: newRoleName, permissions: ['view_dashboard'], isSystem: false };
      setSettings(prev => ({ ...prev, roles: [...prev.roles, role] }));
      setNewRoleName('');
  };

  const addUser = () => {
      if(!newUser.name || !newUser.username || !newUser.role) return;
      const u: User = { id: 'U'+Date.now(), name: newUser.name, username: newUser.username, role: newUser.role, img: newUser.avatar };
      setSystemUsers(prev => [...prev, u]);
      setNewUser({ name: '', username: '', role: '', avatar: 'https://i.pravatar.cc/150?u=new' });
  };

  return (
    <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-left-4 duration-500 relative pb-20">
      
      {/* 1. BRAND IDENTITY */}
      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
        <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
          <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center"><span className="material-symbols-outlined">verified</span></div>
          <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Identidad y Localización</h3>
        </div>
        <div className="p-10 grid grid-cols-1 lg:grid-cols-3 gap-12">
           <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social</label>
                    <input type="text" value={settings.businessName} onChange={e => setSettings({...settings, businessName: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial (IA Aware)</label>
                    <input type="text" value={settings.name} onChange={handleCompanyNameChange} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" />
                  </div>
              </div>
              
              {/* LOCATION FIELDS - CRITICAL FOR AI HOLIDAYS */}
              <div className="p-6 bg-slate-50 dark:bg-bg-dark rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-6">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2"><span className="material-symbols-outlined text-sm">map</span> Configuración Regional (Festivos)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">País / Región</label>
                        <select value={settings.region || 'ES'} onChange={e => setSettings({...settings, region: e.target.value as CountryRegion})} className="w-full bg-white dark:bg-surface-dark border-none rounded-xl px-4 py-3 text-sm font-bold shadow-sm">
                            {REGIONS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Provincia / Estado</label>
                        <input type="text" value={settings.province || ''} onChange={e => setSettings({...settings, province: e.target.value})} placeholder="Ej: Madrid" className="w-full bg-white dark:bg-surface-dark border-none rounded-xl px-4 py-3 text-sm font-bold shadow-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ciudad / Localidad</label>
                        <input type="text" value={settings.city || ''} onChange={e => setSettings({...settings, city: e.target.value})} placeholder="Ej: Alcobendas" className="w-full bg-white dark:bg-surface-dark border-none rounded-xl px-4 py-3 text-sm font-bold shadow-sm" />
                      </div>
                  </div>
                  <p className="text-[9px] text-slate-400 italic">Esta información permite al asistente detectar automáticamente los días festivos locales, regionales y nacionales para bloquear la agenda.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Horario</label>
                    <div className="flex bg-slate-100 dark:bg-bg-dark p-1 rounded-xl">
                        <button onClick={() => setSettings({...settings, scheduleType: 'continuous'})} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all ${settings.scheduleType === 'continuous' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-slate-400'}`}>Continuo</button>
                        <button onClick={() => setSettings({...settings, scheduleType: 'split'})} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all ${settings.scheduleType === 'split' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-slate-400'}`}>Partido</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Moneda</label>
                    <select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold"><option value="€">Euro (€)</option><option value="$">Dólar ($)</option></select>
                  </div>
              </div>
           </div>

           <div className="flex flex-col items-center justify-center gap-4">
              <div className="size-40 bg-slate-50 dark:bg-bg-dark rounded-full flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                  <img src={settings.logo} className="w-full h-full object-contain p-4" alt="Logo" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-black text-[10px] uppercase">Cambiar Logo</div>
              </div>
              <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoChange} />
           </div>
        </div>
      </section>

      {/* 2. SERVICES MANAGEMENT */}
      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
         <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
            <div className="size-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">medical_services</span></div>
            <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Cartera de Servicios</h3>
         </div>
         <div className="p-10">
            <div className="flex flex-wrap gap-4 mb-8">
                <input type="text" placeholder="Nombre Tratamiento" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} className="flex-[2] bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold min-w-[200px]" />
                <input type="number" placeholder="Precio" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} className="flex-1 bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold min-w-[100px]" />
                <input type="number" placeholder="Mins" value={newServiceDuration} onChange={e => setNewServiceDuration(e.target.value)} className="w-24 bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" />
                <button onClick={addService} className="px-8 bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-600 transition-all">Añadir</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {settings.services.map(s => (
                    <div key={s.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-bg-dark/50">
                        <div><p className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{s.duration} min • {s.price} {settings.currency}</p></div>
                        <button onClick={() => setSettings(prev => ({...prev, services: prev.services.filter(i => i.id !== s.id)}))} className="text-slate-300 hover:text-danger"><span className="material-symbols-outlined">delete</span></button>
                    </div>
                ))}
            </div>
         </div>
      </section>

      {/* 3. ROLES & USERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
             <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
                <div className="size-12 rounded-xl bg-orange-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">admin_panel_settings</span></div>
                <h3 className="text-xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Roles y Permisos</h3>
             </div>
             <div className="p-8 space-y-6">
                <div className="flex gap-4"><input type="text" placeholder="Nuevo Rol..." value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className="flex-1 bg-slate-100 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-sm font-bold" /><button onClick={addRole} className="size-11 bg-orange-500 text-white rounded-xl flex items-center justify-center hover:scale-105"><span className="material-symbols-outlined">add</span></button></div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {settings.roles.map(r => (
                        <div key={r.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-bg-dark border border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-xs uppercase">{r.name}</span>
                            {!r.isSystem && <button onClick={() => setSettings(prev => ({...prev, roles: prev.roles.filter(x => x.id !== r.id)}))} className="text-slate-300 hover:text-danger"><span className="material-symbols-outlined text-lg">delete</span></button>}
                        </div>
                    ))}
                </div>
             </div>
          </section>

          <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
             <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
                <div className="size-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">group</span></div>
                <h3 className="text-xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Usuarios del Sistema</h3>
             </div>
             <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Nombre" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="bg-slate-100 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-xs font-bold" />
                    <input type="text" placeholder="Usuario" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="bg-slate-100 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-xs font-bold" />
                    <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="bg-slate-100 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-xs font-bold col-span-2">
                        <option value="">Seleccionar Rol...</option>
                        {settings.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <button onClick={addUser} className="col-span-2 bg-emerald-500 text-white py-3 rounded-xl font-black uppercase text-xs hover:bg-emerald-600 transition-all">Crear Usuario</button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {systemUsers.map(u => (
                        <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                            <div className="size-8 rounded-full bg-cover bg-center" style={{backgroundImage: `url('${u.img}')`}}></div>
                            <div className="flex-1"><p className="text-xs font-bold">{u.name}</p><p className="text-[9px] text-slate-400 uppercase">{settings.roles.find(r => r.id === u.role)?.name}</p></div>
                        </div>
                    ))}
                </div>
             </div>
          </section>
      </div>
    </div>
  );
};

export default SettingsCompany;
