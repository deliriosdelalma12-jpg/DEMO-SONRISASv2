
import React, { useState, useRef, useEffect } from 'react';
import { ClinicSettings, User, ClinicService, RoleDefinition, Doctor, CountryRegion, Branch, DaySchedule } from '../../types';

interface SettingsCompanyProps {
  settings: ClinicSettings;
  setSettings: React.Dispatch<React.SetStateAction<ClinicSettings>>;
  systemUsers: User[];
  setSystemUsers: React.Dispatch<React.SetStateAction<User[]>>;
  doctors?: Doctor[];
  setDoctors?: React.Dispatch<React.SetStateAction<Doctor[]>>;
  branches?: Branch[];
  setBranches?: React.Dispatch<React.SetStateAction<Branch[]>>;
}

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const REGIONS: { code: CountryRegion, label: string }[] = [
    { code: 'ES', label: 'España' }, { code: 'MX', label: 'México' }, { code: 'US', label: 'Estados Unidos' },
    { code: 'CO', label: 'Colombia' }, { code: 'AR', label: 'Argentina' }, { code: 'BZ', label: 'Belice' },
    { code: 'CR', label: 'Costa Rica' }, { code: 'SV', label: 'El Salvador' }, { code: 'GT', label: 'Guatemala' },
    { code: 'HN', label: 'Honduras' }, { code: 'NI', label: 'Nicaragua' }, { code: 'PA', label: 'Panamá' }
];

const DEFAULT_SCHEDULE: Record<string, DaySchedule> = {
    'Lunes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
    'Martes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
    'Miércoles': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
    'Jueves': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
    'Viernes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
    'Sábado': { morning: { start: '09:00', end: '13:00', active: true }, afternoon: { start: '00:00', end: '00:00', active: false } },
    'Domingo': { morning: { start: '00:00', end: '00:00', active: false }, afternoon: { start: '00:00', end: '00:00', active: false } }
};

const SettingsCompany: React.FC<SettingsCompanyProps> = ({ settings, setSettings, systemUsers, setSystemUsers, doctors, setDoctors, branches, setBranches }) => {
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');
  const [newServiceDuration, setNewServiceDuration] = useState<string>('30');
  
  const [newRoleName, setNewRoleName] = useState('');
  
  // SCHEDULE STATE
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('GLOBAL'); 
  
  // User Management State
  const [newUser, setNewUser] = useState({ name: '', username: '', role: '', avatar: 'https://i.pravatar.cc/150?u=new' });
  
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    
    // SINCRONIZACIÓN MAESTRA: Al cambiar el nombre comercial de la clínica, 
    // se actualiza automáticamente el nombre que la IA utiliza para identificarse.
    setSettings(prev => ({ 
        ...prev, 
        name: newName, 
        aiPhoneSettings: { 
            ...prev.aiPhoneSettings, 
            aiCompanyName: newName, // Sincroniza el nombre de la clínica en la IA
            configVersion: Date.now() 
        } 
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

  // Helper to generate text string for openingHours based on schedule object
  const generateOpeningHoursString = (schedule: Record<string, DaySchedule>, type: 'continuous' | 'split'): string => {
      const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
      const monday = schedule['Lunes'];
      if (!monday) return "Consultar";
      
      const morning = monday.morning.active ? `${monday.morning.start}-${monday.morning.end}` : '';
      const afternoon = monday.afternoon.active ? `${monday.afternoon.start}-${monday.afternoon.end}` : '';
      
      if (type === 'split' && morning && afternoon) return `L-V ${morning} / ${afternoon}`;
      if (morning) return `L-V ${morning}`;
      return "Consultar";
  };

  // DETERMINAR TIPO DE JORNADA ACTIVA (GLOBAL O SUCURSAL)
  const currentScheduleType = selectedScheduleId === 'GLOBAL'
    ? settings.scheduleType
    : (branches?.find(b => b.id === selectedScheduleId)?.scheduleType || settings.scheduleType); 

  // DETERMINAR OBJETO DE HORARIO ACTIVO
  const activeSchedule = selectedScheduleId === 'GLOBAL' 
    ? settings.globalSchedule 
    : (branches?.find(b => b.id === selectedScheduleId)?.schedule || settings.globalSchedule);

  const updateScheduleType = (type: 'continuous' | 'split') => {
    if (selectedScheduleId === 'GLOBAL') {
        setSettings(prev => ({ ...prev, scheduleType: type }));
    } else {
        if (setBranches) {
            setBranches(prev => prev.map(b => {
                if (b.id === selectedScheduleId) {
                    const currentSched = b.schedule || settings.globalSchedule;
                    const newHours = generateOpeningHoursString(currentSched, type);
                    return { ...b, scheduleType: type, openingHours: newHours };
                }
                return b;
            }));
        }
    }
  };

  const handleScheduleChange = (day: string, shift: 'morning' | 'afternoon', field: 'start' | 'end' | 'active', value: any) => {
    // 1. Determine target object (Create a deep copy structure to modify)
    let currentSchedule = selectedScheduleId === 'GLOBAL' 
        ? { ...settings.globalSchedule } 
        : { ...(branches?.find(b => b.id === selectedScheduleId)?.schedule || settings.globalSchedule) };

    // 2. Update specific field safely
    currentSchedule = {
        ...currentSchedule,
        [day]: {
            ...currentSchedule[day],
            [shift]: {
                ...currentSchedule[day][shift],
                [field]: value
            }
        }
    };

    // 3. Persist Changes & Update Opening Hours Text automatically
    const targetType = selectedScheduleId === 'GLOBAL' ? settings.scheduleType : (branches?.find(b => b.id === selectedScheduleId)?.scheduleType || 'split');
    const newOpeningHoursStr = generateOpeningHoursString(currentSchedule, targetType);

    if (selectedScheduleId === 'GLOBAL') {
        setSettings(prev => ({ ...prev, globalSchedule: currentSchedule }));
    } else {
        if (setBranches) {
            setBranches(prev => prev.map(b => {
                if (b.id === selectedScheduleId) {
                    return { 
                        ...b, 
                        schedule: currentSchedule, 
                        openingHours: newOpeningHoursStr 
                    };
                }
                return b;
            }));
        }
    }
  };

  const copyGlobalToAllBranches = () => {
      if (!setBranches || !window.confirm("¿Seguro que deseas sobrescribir el horario de TODAS las sucursales con el horario Global?")) return;
      const globalStr = generateOpeningHoursString(settings.globalSchedule, settings.scheduleType);
      setBranches(prev => prev.map(b => ({
          ...b,
          schedule: settings.globalSchedule,
          scheduleType: settings.scheduleType, // Also sync the schedule type
          openingHours: globalStr
      })));
      alert("Horario global replicado a todas las sucursales.");
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
      
      {/* 1. IDENTIDAD Y LOCALIZACIÓN */}
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial IA (Sincronizado)</label>
                    <input type="text" value={settings.name} onChange={handleCompanyNameChange} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20" />
                  </div>
              </div>
              
              {/* LOCATION FIELDS */}
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
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Moneda del Sistema</label>
                <select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold"><option value="€">Euro (€)</option><option value="$">Dólar ($)</option></select>
              </div>
           </div>

           <div className="flex flex-col items-center justify-center gap-4">
              <div className="size-48 bg-slate-50 dark:bg-bg-dark rounded-[2.5rem] flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                  <img src={settings.logo} className="w-full h-full object-contain p-6" alt="Logo" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-black text-[10px] uppercase">Cambiar Logo</div>
              </div>
              <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoChange} />
           </div>
        </div>
      </section>

      {/* 2. GESTIÓN HORARIA */}
      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
        <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="size-12 rounded-xl bg-orange-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">schedule</span></div>
            <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestión Horaria</h3>
          </div>
          {selectedScheduleId === 'GLOBAL' && settings.branchCount > 1 && (
              <button onClick={copyGlobalToAllBranches} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                  <span className="material-symbols-outlined text-sm">content_copy</span> Replicar a todas
              </button>
          )}
        </div>
        <div className="p-10 space-y-8">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Jornada</label>
                    <div className="flex bg-slate-100 dark:bg-bg-dark p-1.5 rounded-[1.5rem] w-fit">
                        <button onClick={() => updateScheduleType('continuous')} className={`px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentScheduleType === 'continuous' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-slate-400 hover:text-slate-600'}`}>Continuo</button>
                        <button onClick={() => updateScheduleType('split')} className={`px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentScheduleType === 'split' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-slate-400 hover:text-slate-600'}`}>Partido</button>
                    </div>
                </div>
                {settings.branchCount > 1 && branches && (
                    <div className="flex flex-col gap-3 flex-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ámbito de Configuración</label>
                        <div className="relative">
                            <select 
                                value={selectedScheduleId} 
                                onChange={(e) => setSelectedScheduleId(e.target.value)} 
                                className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-[1.5rem] px-6 py-3.5 text-xs font-bold text-slate-900 dark:text-white appearance-none cursor-pointer focus:ring-4 focus:ring-primary/10 transition-all"
                            >
                                <option value="GLOBAL">📅 Horario Global (Maestro)</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>🏢 {b.name} ({b.city})</option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">unfold_more</span>
                        </div>
                    </div>
                )}
            </div>

            <div className={`border rounded-[2.5rem] overflow-hidden transition-all ${selectedScheduleId !== 'GLOBAL' ? 'border-primary/30 ring-4 ring-primary/5' : 'border-slate-200 dark:border-slate-800'}`}>
                <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-800">
                    {WEEK_DAYS.map((day) => {
                        const daySchedule = activeSchedule[day] || DEFAULT_SCHEDULE[day];
                        const isActive = daySchedule.morning.active || daySchedule.afternoon.active;

                        return (
                            <div key={day} className={`p-6 flex flex-col md:flex-row items-center gap-6 transition-colors ${isActive ? 'bg-white dark:bg-surface-dark' : 'bg-slate-50 dark:bg-bg-dark opacity-75'}`}>
                                <div className="w-32 flex items-center gap-3">
                                    <button 
                                        onClick={() => {
                                            const newState = !isActive;
                                            handleScheduleChange(day, 'morning', 'active', newState);
                                            if (currentScheduleType === 'split') handleScheduleChange(day, 'afternoon', 'active', newState);
                                        }}
                                        className={`size-10 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-success/10 text-success' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}
                                    >
                                        <span className="material-symbols-outlined">{isActive ? 'check' : 'close'}</span>
                                    </button>
                                    <span className={`font-black uppercase text-xs tracking-widest ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{day}</span>
                                </div>
                                {isActive && (
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-bg-dark p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="size-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center"><span className="material-symbols-outlined text-lg">wb_sunny</span></div>
                                            <input type="time" value={daySchedule.morning.start} onChange={e => handleScheduleChange(day, 'morning', 'start', e.target.value)} className="bg-transparent border-none text-sm font-bold text-center w-20 focus:ring-0 p-0" />
                                            <span className="text-slate-300 font-bold">-</span>
                                            <input type="time" value={daySchedule.morning.end} onChange={e => handleScheduleChange(day, 'morning', 'end', e.target.value)} className="bg-transparent border-none text-sm font-bold text-center w-20 focus:ring-0 p-0" />
                                        </div>
                                        {currentScheduleType === 'split' && (
                                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-bg-dark p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <div className="size-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center"><span className="material-symbols-outlined text-lg">nights_stay</span></div>
                                                <input type="time" value={daySchedule.afternoon.start} onChange={e => handleScheduleChange(day, 'afternoon', 'start', e.target.value)} className="bg-transparent border-none text-sm font-bold text-center w-20 focus:ring-0 p-0" />
                                                <span className="text-slate-300 font-bold">-</span>
                                                <input type="time" value={daySchedule.afternoon.end} onChange={e => handleScheduleChange(day, 'afternoon', 'end', e.target.value)} className="bg-transparent border-none text-sm font-bold text-center w-20 focus:ring-0 p-0" />
                                            </div>
                                        )}
                                    </div>
                                )}
                                {!isActive && <div className="flex-1 text-center py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Cerrado</div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </section>
      
      {/* SECCIONES: SERVICIOS, ROLES Y USUARIOS (SE MANTIENEN IGUAL) */}
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
    </div>
  );
};

export default SettingsCompany;
