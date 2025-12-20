
import React, { useState, useRef, useEffect } from 'react';
import { ClinicSettings, User, ClinicService, RoleDefinition, PermissionId, Doctor, DaySchedule } from '../../types';

interface SettingsCompanyProps {
  settings: ClinicSettings;
  setSettings: React.Dispatch<React.SetStateAction<ClinicSettings>>;
  systemUsers: User[];
  setSystemUsers: React.Dispatch<React.SetStateAction<User[]>>;
  doctors?: Doctor[];
  setDoctors?: React.Dispatch<React.SetStateAction<Doctor[]>>;
}

const AVAILABLE_PERMISSIONS: {id: PermissionId, label: string, group: string}[] = [
  { id: 'view_dashboard', label: 'Ver Panel Principal', group: 'Navegación' },
  { id: 'view_agenda', label: 'Ver Agenda', group: 'Navegación' },
  { id: 'view_patients', label: 'Ver Pacientes', group: 'Navegación' },
  { id: 'view_doctors', label: 'Ver Médicos', group: 'Navegación' },
  { id: 'view_branches', label: 'Ver Sucursales', group: 'Navegación' },
  { id: 'view_hr', label: 'Ver RRHH', group: 'Navegación' },
  { id: 'view_metrics', label: 'Ver Métricas', group: 'Navegación' },
  { id: 'view_settings', label: 'Ver Configuración', group: 'Navegación' },
  { id: 'view_all_data', label: 'Ver Datos Globales (Filtro)', group: 'Datos' },
  { id: 'can_edit', label: 'Permiso de Edición', group: 'Acciones' },
];

const MEDICAL_SPECIALTIES = [
  'Odontología General', 'Ortodoncia', 'Implantología', 'Cirugía Maxilofacial', 
  'Endodoncia', 'Periodoncia', 'Odontopediatría', 'Estética Dental', 
  'Medicina General', 'Fisioterapia', 'Dermatología'
];

const CLINIC_SECTORS = [
  'Clínica Dental', 'Centro Médico General', 'Fisioterapia y Rehabilitación', 
  'Estética y Dermatología', 'Salud Mental / Psicología', 'Veterinaria', 'Otro'
];

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const SettingsCompany: React.FC<SettingsCompanyProps> = ({ settings, setSettings, systemUsers, setSystemUsers, doctors, setDoctors }) => {
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');
  const [newServiceDuration, setNewServiceDuration] = useState<string>('30');
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  
  // NEW: State for Security Conflict Modal (User assigned)
  const [deleteConflict, setDeleteConflict] = useState<{ roleName: string; users: User[] } | null>(null);
  // NEW: State for Confirmation Modal (Fixes sandbox 'confirm' error)
  const [confirmDeleteRole, setConfirmDeleteRole] = useState<RoleDefinition | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // User Registration State
  const initialEmployeeState = {
    name: '', surname: '', dni: '', email: '', phone: '', address: '', city: '', zip: '', province: '',
    roleId: '', jobTitle: '', specialty: '', username: '', password: '', avatar: 'https://i.pravatar.cc/150?u=new_user'
  };
  const [newEmployee, setNewEmployee] = useState(initialEmployeeState);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isDoctorRoleSelected, setIsDoctorRoleSelected] = useState(false);
  const employeeAvatarRef = useRef<HTMLInputElement>(null);

  // --- EDIT USER STATE ---
  const [editingUser, setEditingUser] = useState<any | null>(null); // Holds the combined User + Doctor data
  const editAvatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const role = settings.roles.find(r => r.id === newEmployee.roleId);
    const isDoc = role ? (role.name.toLowerCase().includes('médico') || role.name.toLowerCase().includes('facultativo') || role.id.includes('doctor')) : false;
    setIsDoctorRoleSelected(isDoc);
  }, [newEmployee.roleId, settings.roles]);

  const addService = () => {
    if (!newServiceName.trim() || !newServicePrice) return;
    const service: ClinicService = { 
      id: 'S' + Math.floor(Math.random() * 10000), 
      name: newServiceName.trim(), 
      price: parseFloat(newServicePrice),
      duration: parseInt(newServiceDuration) || 30
    };
    setSettings(prev => ({ ...prev, services: [...prev.services, service] }));
    setNewServiceName(''); setNewServicePrice('');
  };

  const removeService = (id: string) => {
    setSettings(prev => ({ ...prev, services: prev.services.filter(s => s.id !== id) }));
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    const newRole: RoleDefinition = {
      id: 'role_' + Math.random().toString(36).substr(2, 9),
      name: newRoleName,
      isSystem: false,
      permissions: ['view_dashboard']
    };
    setSettings(prev => ({ ...prev, roles: [...prev.roles, newRole] }));
    setNewRoleName('');
    setEditingRole(newRole);
  };

  const handleDeleteRole = (id: string) => {
    const roleToDelete = settings.roles.find(r => r.id === id);
    if (!roleToDelete) return;
    
    if (roleToDelete.isSystem) { 
        return; // System roles cannot be deleted, UI hides button anyway
    }

    // SECURITY CHECK: Check if any user is using this role
    const usersWithRole = systemUsers.filter(u => u.role === id);
    
    if (usersWithRole.length > 0) {
        // Trigger Safety Modal (Users Assigned)
        setDeleteConflict({
            roleName: roleToDelete.name,
            users: usersWithRole
        });
        return;
    }

    // Trigger Custom Confirmation Modal (Replaces window.confirm)
    setConfirmDeleteRole(roleToDelete);
  };

  const finalizeRoleDeletion = () => {
    if (confirmDeleteRole) {
      setEditingRole(null);
      setSettings(prev => ({ ...prev, roles: prev.roles.filter(r => r.id !== confirmDeleteRole.id) }));
      setConfirmDeleteRole(null);
    }
  };

  const togglePermission = (permId: PermissionId) => {
    if (!editingRole) return;
    const hasPerm = editingRole.permissions.includes(permId);
    const updatedPerms = hasPerm ? editingRole.permissions.filter(p => p !== permId) : [...editingRole.permissions, permId];
    const updatedRole = { ...editingRole, permissions: updatedPerms };
    setEditingRole(updatedRole);
    setSettings(prev => ({ ...prev, roles: prev.roles.map(r => r.id === editingRole.id ? updatedRole : r) }));
  };

  const updateGlobalSchedule = (day: string, shift: 'morning' | 'afternoon', field: 'start' | 'end' | 'active', value: any) => {
    const currentSchedule = settings.globalSchedule || {};
    const daySchedule = currentSchedule[day] || { 
        morning: { start: '09:00', end: '14:00', active: true }, 
        afternoon: { start: '16:00', end: '20:00', active: true } 
    };

    const newDaySchedule = {
        ...daySchedule,
        [shift]: {
            ...daySchedule[shift],
            [field]: value
        }
    };

    setSettings(prev => ({
        ...prev,
        globalSchedule: {
            ...prev.globalSchedule,
            [day]: newDaySchedule
        }
    }));
  };

  const handleEmployeeAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewEmployee(prev => ({ ...prev, avatar: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const validateEmployeeForm = () => {
    const errors: {[key: string]: string} = {};
    const { name, surname, dni, email, roleId, username, password, specialty } = newEmployee;
    if (!name.trim()) errors.name = "Obligatorio";
    if (!surname.trim()) errors.surname = "Obligatorio";
    if (!dni.trim()) errors.dni = "Obligatorio";
    if (!email.trim()) errors.email = "Obligatorio";
    if (!roleId) errors.roleId = "Obligatorio";
    if (!username.trim()) errors.username = "Obligatorio";
    if (!password.trim()) errors.password = "Obligatorio";
    if (isDoctorRoleSelected && !specialty) errors.specialty = "Obligatorio";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateEmployee = () => {
    if (!validateEmployeeForm()) return;
    const { name, surname, email, roleId, username, specialty, avatar, phone } = newEmployee;
    const fullName = `${name} ${surname}`;
    const newId = `U${Math.floor(Math.random() * 10000)}`;

    const newUser: User = { id: newId, username, name: fullName, role: roleId, img: avatar };
    setSystemUsers(prev => [...prev, newUser]);

    if (isDoctorRoleSelected && setDoctors) {
      const newDoctor: Doctor = {
        id: `D${Math.floor(Math.random() * 10000)}`, name: fullName, role: roleId, specialty, status: 'Active',
        img: avatar, branch: 'Centro', phone, corporateEmail: email, docs: [],
        schedule: { 'Lunes': { morning: {start:'09:00',end:'14:00',active:true}, afternoon:{start:'16:00',end:'20:00',active:true} } } as any,
        vacationDaysTotal: 30, vacationDaysTaken: 0, vacationHistory: [], attendanceHistory: []
      };
      setDoctors(prev => [...prev, newDoctor]);
    }
    setNewEmployee(initialEmployeeState);
    setFormErrors({});
    alert(`Usuario ${username} creado con éxito.`);
  };

  const updateUserRole = (userId: string, newRoleId: string) => {
    setSystemUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRoleId } : u));
    if (setDoctors) setDoctors(prev => prev.map(d => d.id === userId ? { ...d, role: newRoleId } : d));
  };

  // --- EDIT USER LOGIC ---
  const handleOpenEditUser = (user: User) => {
    // Check if linked to a doctor
    const linkedDoctor = doctors?.find(d => d.id === user.id); 
    
    setEditingUser({
        ...user,
        // If doctor exists, merge doctor data, otherwise default or empty
        email: linkedDoctor?.corporateEmail || '',
        phone: linkedDoctor?.phone || '',
        specialty: linkedDoctor?.specialty || '',
        isLinkedDoctor: !!linkedDoctor
    });
  };

  const handleEditAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditingUser((prev: any) => ({ ...prev, img: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEditedUser = () => {
    if (!editingUser) return;

    // 1. Update System User
    setSystemUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        name: editingUser.name,
        username: editingUser.username,
        role: editingUser.role,
        img: editingUser.img
    } : u));

    // 2. Update Doctor Record if it exists
    if (editingUser.isLinkedDoctor && setDoctors) {
        setDoctors(prev => prev.map(d => d.id === editingUser.id ? {
            ...d,
            name: editingUser.name,
            role: editingUser.role,
            img: editingUser.img,
            corporateEmail: editingUser.email,
            phone: editingUser.phone,
            specialty: editingUser.specialty
        } : d));
    }

    setEditingUser(null);
  };

  return (
    <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-left-4 duration-500 relative">
      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
        <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
          <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center"><span className="material-symbols-outlined">info</span></div>
          <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Datos de Marca e Identidad</h3>
        </div>
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label><input type="text" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" /></div>
           <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Divisa</label><select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold"><option value="€">Euro (€)</option><option value="$">Dólar ($)</option></select></div>
           <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idioma Web</label><select value={settings.language} onChange={e => setSettings({...settings, language: e.target.value as any})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold"><option value="es-ES">Español (España)</option><option value="es-LATAM">Español (Latinoamérica)</option><option value="en-US">English (US)</option></select></div>
           <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-bg-dark rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 group relative overflow-hidden">
              {settings.logo ? <img src={settings.logo} className="h-12 w-auto object-contain mb-2" /> : <span className="material-symbols-outlined text-4xl text-slate-300">image</span>}
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logo Institucional</p>
              <button onClick={() => logoInputRef.current?.click()} className="absolute inset-0 bg-primary/80 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center font-bold text-xs">Cambiar Logo</button>
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={e => {const f = e.target.files?.[0]; if(f) {const r = new FileReader(); r.onload = (re) => setSettings({...settings, logo: re.target?.result as string}); r.readAsDataURL(f);}}} />
           </div>
        </div>
      </section>

      {/* OPERATIONS & SECTOR SECTION */}
      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
        <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
          <div className="size-12 rounded-xl bg-orange-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">storefront</span></div>
          <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Configuración Operativa y Sector</h3>
        </div>
        <div className="p-10 space-y-10">
            {/* SECTOR & BRANCHES SELECTOR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sector de Actividad</label>
                    <select 
                        value={settings.sector || 'Clínica Dental'} 
                        onChange={e => setSettings({...settings, sector: e.target.value})} 
                        className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold"
                    >
                        {CLINIC_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Sucursales</label>
                    <input 
                        type="number" 
                        min="1" 
                        max="50"
                        value={settings.branchCount || 1} 
                        onChange={e => setSettings({...settings, branchCount: parseInt(e.target.value)})} 
                        className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold"
                    />
                </div>
            </div>

            {/* APPOINTMENT POLICY SECTION (NEW) */}
            <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-900">
                <h4 className="text-sm font-black text-blue-600 dark:text-blue-300 uppercase tracking-tight mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined">rule_settings</span> Política de Citas y Confirmaciones
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Regla de Antelación (Días)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                min="1" 
                                max="30"
                                value={settings.appointmentPolicy?.leadTimeThreshold || 3} 
                                onChange={e => setSettings({...settings, appointmentPolicy: {...settings.appointmentPolicy, leadTimeThreshold: parseInt(e.target.value)}})} 
                                className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold shadow-sm"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">DÍAS MÍNIMOS</div>
                        </div>
                        <p className="text-[9px] text-slate-500 font-medium px-1 leading-relaxed">
                            Si se reserva con más de {settings.appointmentPolicy?.leadTimeThreshold} días, la cita nace como <span className="font-black">PENDIENTE</span>.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ventana de Confirmación</label>
                        <select 
                            value={settings.appointmentPolicy?.confirmationWindow || 24} 
                            onChange={e => setSettings({...settings, appointmentPolicy: {...settings.appointmentPolicy, confirmationWindow: parseInt(e.target.value) as any}})} 
                            className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold shadow-sm appearance-none"
                        >
                            <option value="24">24 Horas antes</option>
                            <option value="48">48 Horas antes</option>
                        </select>
                        <p className="text-[9px] text-slate-500 font-medium px-1 leading-relaxed">
                            Tiempo límite para que el paciente confirme su asistencia.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Citas Corto Plazo</label>
                        <button 
                            onClick={() => setSettings({...settings, appointmentPolicy: {...settings.appointmentPolicy, autoConfirmShortNotice: !settings.appointmentPolicy?.autoConfirmShortNotice}})} 
                            className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all border-2 shadow-sm ${settings.appointmentPolicy?.autoConfirmShortNotice ? 'border-success bg-success/10 text-success' : 'border-slate-200 bg-white text-slate-400'}`}
                        >
                            <span className="text-xs font-black uppercase">Auto-Confirmar</span>
                            <span className="material-symbols-outlined">{settings.appointmentPolicy?.autoConfirmShortNotice ? 'check_circle' : 'radio_button_unchecked'}</span>
                        </button>
                        <p className="text-[9px] text-slate-500 font-medium px-1 leading-relaxed">
                            Si se reserva con MENOS de {settings.appointmentPolicy?.leadTimeThreshold} días, se marca automáticamente como <span className="font-black text-success">CONFIRMADA</span>.
                        </p>
                    </div>
                </div>
            </div>

            {/* GLOBAL SCHEDULE BUILDER */}
            <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Horario Global de Apertura</h4>
                    <div className="flex bg-slate-100 dark:bg-bg-dark p-1 rounded-xl">
                        <button onClick={() => setSettings({...settings, scheduleType: 'split'})} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${settings.scheduleType === 'split' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-slate-400'}`}>Partido (Mañana/Tarde)</button>
                        <button onClick={() => setSettings({...settings, scheduleType: 'continuous'})} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${settings.scheduleType === 'continuous' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-slate-400'}`}>Corrido (Sin Cierre)</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {WEEK_DAYS.map(day => {
                        const sched = settings.globalSchedule?.[day] || { 
                            morning: { start: '09:00', end: '14:00', active: true }, 
                            afternoon: { start: '16:00', end: '20:00', active: true } 
                        };
                        const isContinuous = settings.scheduleType === 'continuous';
                        const isClosed = isContinuous ? !sched.morning.active : (!sched.morning.active && !sched.afternoon.active);

                        return (
                            // GRID LAYOUT: [Day Label] [Morning Inputs] [Afternoon Inputs (Optional)] [Status Label]
                            <div key={day} className={`grid grid-cols-1 items-center gap-4 p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-100 dark:border-slate-800 ${isContinuous ? 'xl:grid-cols-[100px_1fr_100px]' : 'xl:grid-cols-[80px_1fr_1fr_100px]'}`}>
                                <div className="font-bold text-slate-700 dark:text-white truncate">{day}</div>
                                
                                {/* Morning / Main Shift */}
                                <div className={`flex items-center gap-3 transition-opacity ${!sched.morning.active ? 'opacity-40 grayscale' : ''}`}>
                                    <button 
                                        onClick={() => updateGlobalSchedule(day, 'morning', 'active', !sched.morning.active)}
                                        className={`size-8 shrink-0 rounded-lg flex items-center justify-center transition-all ${sched.morning.active ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-400'}`}
                                        title={isContinuous ? "Activar Horario" : "Activar Turno Mañana"}
                                    >
                                        <span className="material-symbols-outlined text-lg">wb_sunny</span>
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="time" 
                                            value={sched.morning.start} 
                                            onChange={(e) => updateGlobalSchedule(day, 'morning', 'start', e.target.value)}
                                            disabled={!sched.morning.active}
                                            className="bg-white dark:bg-surface-dark border-none rounded-lg px-2 py-1.5 text-xs font-bold w-20 text-center shadow-sm disabled:cursor-not-allowed"
                                        />
                                        <span className="text-slate-400 font-bold">-</span>
                                        <input 
                                            type="time" 
                                            value={sched.morning.end} 
                                            onChange={(e) => updateGlobalSchedule(day, 'morning', 'end', e.target.value)}
                                            disabled={!sched.morning.active}
                                            className="bg-white dark:bg-surface-dark border-none rounded-lg px-2 py-1.5 text-xs font-bold w-20 text-center shadow-sm disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    {isContinuous && <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Horario Continuo</span>}
                                </div>

                                {/* Afternoon Shift (Hidden if Continuous) */}
                                {!isContinuous && (
                                    <div className={`flex items-center gap-3 transition-opacity ${!sched.afternoon.active ? 'opacity-40 grayscale' : ''}`}>
                                        <button 
                                            onClick={() => updateGlobalSchedule(day, 'afternoon', 'active', !sched.afternoon.active)}
                                            className={`size-8 shrink-0 rounded-lg flex items-center justify-center transition-all ${sched.afternoon.active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}
                                            title="Activar Turno Tarde"
                                        >
                                            <span className="material-symbols-outlined text-lg">nights_stay</span>
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="time" 
                                                value={sched.afternoon.start} 
                                                onChange={(e) => updateGlobalSchedule(day, 'afternoon', 'start', e.target.value)}
                                                disabled={!sched.afternoon.active}
                                                className="bg-white dark:bg-surface-dark border-none rounded-lg px-2 py-1.5 text-xs font-bold w-20 text-center shadow-sm disabled:cursor-not-allowed"
                                            />
                                            <span className="text-slate-400 font-bold">-</span>
                                            <input 
                                                type="time" 
                                                value={sched.afternoon.end} 
                                                onChange={(e) => updateGlobalSchedule(day, 'afternoon', 'end', e.target.value)}
                                                disabled={!sched.afternoon.active}
                                                className="bg-white dark:bg-surface-dark border-none rounded-lg px-2 py-1.5 text-xs font-bold w-20 text-center shadow-sm disabled:cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                {/* Status Column */}
                                <div className="flex justify-end">
                                    {isClosed ? (
                                        <span className="text-[10px] font-black text-danger uppercase tracking-widest px-3 py-1 bg-danger/10 rounded-lg border border-danger/20">Cerrado</span>
                                    ) : (
                                        <span className="text-[10px] font-black text-success uppercase tracking-widest px-3 py-1 bg-success/10 rounded-lg border border-success/20 opacity-0 xl:opacity-100 transition-opacity">Abierto</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </section>

      {/* USER REGISTRATION SECTION */}
      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
         <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
            <div className="size-12 rounded-xl bg-blue-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">person_add</span></div>
            <div><h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Alta de Usuarios</h3><p className="text-[10px] font-black text-primary uppercase tracking-widest">Registro de empleados y accesos</p></div>
         </div>
         <div className="p-10 space-y-10">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
               <div className="space-y-6">
                  <div className="flex gap-4 items-center mb-6">
                     <div className="relative group shrink-0" onClick={() => employeeAvatarRef.current?.click()}>
                        <div className="size-20 rounded-2xl bg-cover bg-center border-2 border-slate-200 dark:border-slate-700 shadow-md cursor-pointer" style={{backgroundImage: `url('${newEmployee.avatar}')`}}></div>
                        <input type="file" ref={employeeAvatarRef} className="hidden" accept="image/*" onChange={handleEmployeeAvatarChange} />
                     </div>
                     <div className="flex-1 space-y-1"><p className="text-[10px] font-black text-slate-400 uppercase">Foto Perfil</p><button onClick={() => employeeAvatarRef.current?.click()} className="text-xs font-bold text-primary">Subir</button></div>
                  </div>
                  <div className="space-y-4">
                     <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label><input type="text" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-sm font-bold" /></div>
                     <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellidos</label><input type="text" value={newEmployee.surname} onChange={e => setNewEmployee({...newEmployee, surname: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-sm font-bold" /></div>
                     <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">DNI</label><input type="text" value={newEmployee.dni} onChange={e => setNewEmployee({...newEmployee, dni: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-sm font-bold" /></div>
                  </div>
               </div>
               <div className="space-y-4">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label><input type="email" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-sm font-bold" /></div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label><input type="tel" value={newEmployee.phone} onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-sm font-bold" /></div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección</label><input type="text" value={newEmployee.address} onChange={e => setNewEmployee({...newEmployee, address: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-sm font-bold" /></div>
               </div>
               <div className="space-y-4">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol Sistema</label><select value={newEmployee.roleId} onChange={e => setNewEmployee({...newEmployee, roleId: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-sm font-bold">{settings.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                  {isDoctorRoleSelected && <div><label className="text-[9px] font-black text-primary uppercase tracking-widest ml-1">Especialidad</label><select value={newEmployee.specialty} onChange={e => setNewEmployee({...newEmployee, specialty: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-sm font-bold">{MEDICAL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>}
                  <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario</label><input type="text" value={newEmployee.username} onChange={e => setNewEmployee({...newEmployee, username: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-sm font-bold" /></div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label><input type="password" value={newEmployee.password} onChange={e => setNewEmployee({...newEmployee, password: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-sm font-bold" /></div>
                  <button onClick={handleCreateEmployee} className="w-full h-12 mt-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-blue-700 transition-all">Registrar Usuario</button>
               </div>
            </div>
            
            {/* USER LIST - NO SCROLL LIMIT */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
               <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Usuarios Registrados</h4>
               <div className="bg-slate-50 dark:bg-bg-dark/50 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                     <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                            <th className="p-3 text-[9px] uppercase font-black text-slate-500">Avatar</th>
                            <th className="p-3 text-[9px] uppercase font-black text-slate-500">Usuario</th>
                            <th className="p-3 text-[9px] uppercase font-black text-slate-500">Nombre</th>
                            <th className="p-3 text-[9px] uppercase font-black text-slate-500">Rol</th>
                            <th className="p-3 text-[9px] uppercase font-black text-slate-500 text-right">Acciones</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {systemUsers.map(u => (
                           <tr key={u.id} className="hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                              <td className="p-3"><div className="size-8 rounded-full bg-cover bg-center border border-slate-300 dark:border-slate-600" style={{backgroundImage: `url('${u.img}')`}}></div></td>
                              <td className="p-3 text-xs font-bold">{u.username}</td>
                              <td className="p-3 text-xs">{u.name}</td>
                              <td className="p-3">
                                 <select value={u.role} onChange={(e) => updateUserRole(u.id, e.target.value)} className="bg-transparent text-xs font-bold border-none p-0 focus:ring-0 cursor-pointer text-primary">
                                    {settings.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                 </select>
                              </td>
                              <td className="p-3 text-right">
                                <button onClick={() => handleOpenEditUser(u)} className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:text-primary hover:border-primary transition-all shadow-sm">
                                    Editar
                                </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      </section>

      {/* ROLES & PERMISSIONS */}
      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
         <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
            <div className="size-12 rounded-xl bg-purple-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">shield_person</span></div>
            <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Roles y Permisos</h3>
         </div>
         <div className="p-10 flex flex-col xl:flex-row gap-10">
            <div className="flex-1 space-y-6">
               <div className="flex gap-4">
                  <input type="text" placeholder="Nuevo Rol..." value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className="flex-1 bg-slate-50 dark:bg-bg-dark border-none rounded-xl px-4 py-3 text-sm font-bold" />
                  <button onClick={handleCreateRole} className="px-6 bg-purple-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg">Crear</button>
               </div>
               <div className="flex flex-wrap gap-2">
                  {settings.roles.map(role => (
                     <button key={role.id} onClick={() => setEditingRole(role)} className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${editingRole?.id === role.id ? 'bg-purple-500 border-purple-500 text-white' : 'bg-slate-50 dark:bg-bg-dark border-transparent'}`}>{role.name}</button>
                  ))}
               </div>
            </div>
            {editingRole && (
               <div className="flex-[1.5] bg-slate-50 dark:bg-bg-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-6">
                     <h4 className="font-black text-lg uppercase">{editingRole.name}</h4>
                     {!editingRole.isSystem && (
                        <button 
                            type="button"
                            onClick={() => handleDeleteRole(editingRole.id)} 
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-black uppercase hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800 cursor-pointer shadow-sm active:scale-95 select-none"
                        >
                            <span className="material-symbols-outlined text-base">delete</span> Eliminar Rol
                        </button>
                     )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     {AVAILABLE_PERMISSIONS.map(perm => (
                        <button key={perm.id} onClick={() => !editingRole.isSystem && togglePermission(perm.id)} className={`p-3 rounded-xl flex items-center justify-between border ${editingRole.permissions.includes(perm.id) ? 'bg-success/10 border-success/30 text-success' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                           <span className="text-[10px] font-black uppercase">{perm.label}</span>
                           <div className={`size-3 rounded-full ${editingRole.permissions.includes(perm.id) ? 'bg-success' : 'bg-slate-300'}`}></div>
                        </button>
                     ))}
                  </div>
               </div>
            )}
         </div>
      </section>

      {/* SERVICES */}
      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
        <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
          <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center"><span className="material-symbols-outlined">medical_services</span></div>
          <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Catálogo de Servicios</h3>
        </div>
        <div className="p-10 space-y-8">
           <div className="flex gap-4 flex-wrap">
              <input type="text" placeholder="Nombre" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} className="flex-1 min-w-[200px] bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" />
              <input type="number" placeholder="Precio" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} className="w-32 bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" />
              <input type="number" placeholder="Min" value={newServiceDuration} onChange={e => setNewServiceDuration(e.target.value)} className="w-24 bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" />
              <button onClick={addService} className="px-8 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">Añadir</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {settings.services.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200 dark:border-slate-800">
                   <div><p className="font-black text-xs uppercase">{s.name}</p><p className="text-[10px] text-primary font-bold">{s.price}{settings.currency} • {s.duration}m</p></div>
                   <button onClick={() => removeService(s.id)} className="text-danger"><span className="material-symbols-outlined text-lg">delete</span></button>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* MODAL DE EDICIÓN DE USUARIO */}
      {editingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
            <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark">
                <header className="px-8 py-6 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Editar Ficha de Usuario</h3>
                    <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-danger"><span className="material-symbols-outlined text-3xl">close</span></button>
                </header>
                <div className="p-8 space-y-6">
                    <div className="flex items-center gap-6">
                        <div className="relative group shrink-0 cursor-pointer" onClick={() => editAvatarRef.current?.click()}>
                            <div className="size-24 rounded-full bg-cover bg-center border-4 border-white dark:border-slate-700 shadow-lg" style={{backgroundImage: `url('${editingUser.img}')`}}></div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-white">edit</span></div>
                            <input type="file" ref={editAvatarRef} className="hidden" accept="image/*" onChange={handleEditAvatarChange} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <div><label className="text-[9px] font-black text-slate-400 uppercase">Nombre Completo</label><input type="text" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold" /></div>
                            <div><label className="text-[9px] font-black text-slate-400 uppercase">Nombre de Usuario</label><input type="text" value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value})} className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold" /></div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Rol Asignado</label>
                            <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})} className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold">
                                {settings.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        {editingUser.isLinkedDoctor && (
                            <div>
                                <label className="text-[9px] font-black text-primary uppercase">Especialidad (Médico)</label>
                                <select value={editingUser.specialty} onChange={e => setEditingUser({...editingUser, specialty: e.target.value})} className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-primary">
                                    {MEDICAL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {editingUser.isLinkedDoctor && (
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 grid grid-cols-2 gap-4">
                            <div><label className="text-[9px] font-black text-slate-400 uppercase">Email Corporativo</label><input type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 px-0 py-1 text-sm font-bold focus:border-primary focus:ring-0" /></div>
                            <div><label className="text-[9px] font-black text-slate-400 uppercase">Teléfono</label><input type="tel" value={editingUser.phone} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 px-0 py-1 text-sm font-bold focus:border-primary focus:ring-0" /></div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setEditingUser(null)} className="px-6 py-3 rounded-lg font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                        <button onClick={handleSaveEditedUser} className="px-8 py-3 bg-primary text-white rounded-lg font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform">Guardar Cambios</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* SECURITY CONFLICT MODAL */}
      {deleteConflict && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-2xl shadow-2xl border border-border-light dark:border-border-dark overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 flex items-center gap-4">
                    <div className="size-12 rounded-full bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-200 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-2xl">gpp_maybe</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-red-900 dark:text-red-100 leading-tight">Acción Bloqueada</h3>
                        <p className="text-[10px] font-bold text-red-700 dark:text-red-300 uppercase tracking-wide">Seguridad del Sistema</p>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        No se puede eliminar el rol <span className="font-black text-slate-900 dark:text-white">"{deleteConflict.roleName}"</span> porque está asignado a los siguientes usuarios activos:
                    </p>
                    <div className="bg-slate-50 dark:bg-bg-dark rounded-xl border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto custom-scrollbar p-2">
                        {deleteConflict.users.map(u => (
                            <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <div className="size-8 rounded-full bg-cover bg-center border border-slate-200 dark:border-slate-600" style={{backgroundImage: `url('${u.img}')`}}></div>
                                <div>
                                    <p className="text-xs font-black text-slate-800 dark:text-white">{u.name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{u.username}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs italic text-slate-400 text-center">
                        Debes reasignar a estos usuarios a otro rol antes de proceder con la eliminación.
                    </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-bg-dark border-t border-slate-100 dark:border-slate-800 flex justify-center">
                    <button 
                        onClick={() => setDeleteConflict(null)} 
                        className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* CONFIRMATION MODAL (Replaces window.confirm) */}
      {confirmDeleteRole && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-2xl shadow-2xl border border-border-light dark:border-border-dark overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 bg-slate-50 dark:bg-bg-dark border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Confirmar Eliminación</h3>
                </div>
                <div className="p-8 text-center space-y-4">
                    <div className="mx-auto size-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">delete_forever</span>
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        ¿Estás seguro de que deseas eliminar permanentemente el rol <span className="font-black text-slate-900 dark:text-white">"{confirmDeleteRole.name}"</span>?
                    </p>
                    <p className="text-xs text-slate-400">Esta acción no se puede deshacer.</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-bg-dark border-t border-slate-100 dark:border-slate-800 flex gap-3">
                    <button 
                        onClick={() => setConfirmDeleteRole(null)} 
                        className="flex-1 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={finalizeRoleDeletion} 
                        className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                    >
                        Sí, Eliminar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SettingsCompany;
