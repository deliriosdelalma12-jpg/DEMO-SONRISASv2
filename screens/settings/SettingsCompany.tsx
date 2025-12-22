
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

const REGIONS: { code: CountryRegion, label: string }[] = [
    { code: 'ES', label: 'España' },
    { code: 'MX', label: 'México' },
    { code: 'US', label: 'Estados Unidos' },
    { code: 'CO', label: 'Colombia' },
    { code: 'AR', label: 'Argentina' },
    { code: 'BZ', label: 'Belice' },
    { code: 'CR', label: 'Costa Rica' },
    { code: 'SV', label: 'El Salvador' },
    { code: 'GT', label: 'Guatemala' },
    { code: 'HN', label: 'Honduras' },
    { code: 'NI', label: 'Nicaragua' },
    { code: 'PA', label: 'Panamá' }
];

const DEFAULT_LOGO = "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/hospital.svg";

const SettingsCompany: React.FC<SettingsCompanyProps> = ({ settings, setSettings, systemUsers, setSystemUsers, doctors, setDoctors }) => {
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');
  const [newServiceDuration, setNewServiceDuration] = useState<string>('30');
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  
  const [deleteConflict, setDeleteConflict] = useState<{ roleName: string; users: User[] } | null>(null);
  const [confirmDeleteRole, setConfirmDeleteRole] = useState<RoleDefinition | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const initialEmployeeState = {
    name: '', surname: '', dni: '', email: '', phone: '', address: '', city: '', zip: '', province: '',
    roleId: '', jobTitle: '', specialty: '', username: '', password: '', avatar: 'https://i.pravatar.cc/150?u=new_user'
  };
  const [newEmployee, setNewEmployee] = useState(initialEmployeeState);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isDoctorRoleSelected, setIsDoctorRoleSelected] = useState(false);
  const employeeAvatarRef = useRef<HTMLInputElement>(null);

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const editAvatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const role = settings.roles.find(r => r.id === newEmployee.roleId);
    const isDoc = role ? (role.name.toLowerCase().includes('médico') || role.name.toLowerCase().includes('facultativo') || role.id.includes('doctor')) : false;
    setIsDoctorRoleSelected(isDoc);
  }, [newEmployee.roleId, settings.roles]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSettings(prev => ({ ...prev, logo: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * MANEJADOR SEGURO DE NOMBRE COMERCIAL
   * Evita la corrupción de texto (efecto "destrucción") al borrar o editar.
   */
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    const oldName = settings.name;
    const aiNameMaster = settings.aiPhoneSettings.aiCompanyName; // Variable de control para la IA

    // 1. Actualizamos el nombre comercial (base para el sidebar/logo)
    // 2. Solo sincronizamos los textos de la IA si el nombre anterior NO estaba vacío
    //    y si el aiNameMaster coincide con el oldName (para asegurar coherencia).
    
    let updatedPrompt = settings.aiPhoneSettings.systemPrompt;
    let updatedGreeting = settings.aiPhoneSettings.initialGreeting;
    let updatedTest = settings.aiPhoneSettings.testSpeechText;

    // Solo realizamos reemplazo si hay un punto de referencia sólido (mínimo 2 caracteres)
    // Esto evita que al borrar el nombre, el replaceAll() inserte el nuevo nombre entre cada letra
    if (aiNameMaster && aiNameMaster.length > 1 && newName.length > 1) {
        updatedPrompt = updatedPrompt.split(aiNameMaster).join(newName);
        updatedGreeting = updatedGreeting.split(aiNameMaster).join(newName);
        updatedTest = updatedTest.split(aiNameMaster).join(newName);
    }

    setSettings(prev => ({ 
        ...prev, 
        name: newName, 
        aiPhoneSettings: { 
            ...prev.aiPhoneSettings, 
            aiCompanyName: newName, // La variable de la IA se autorregula aquí
            systemPrompt: updatedPrompt, 
            initialGreeting: updatedGreeting,
            testSpeechText: updatedTest
        } 
    }));
  };

  const resetLogo = () => {
    setSettings(prev => ({ ...prev, logo: DEFAULT_LOGO }));
  };

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
    if (roleToDelete.isSystem) return;
    const usersWithRole = systemUsers.filter(u => u.role === id);
    if (usersWithRole.length > 0) {
        setDeleteConflict({ roleName: roleToDelete.name, users: usersWithRole });
        return;
    }
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
        id: newId, name: fullName, role: roleId, specialty, status: 'Active',
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

  const handleOpenEditUser = (user: User) => {
    const linkedDoctor = doctors?.find(d => d.id === user.id); 
    setEditingUser({
        ...user,
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
    setSystemUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        name: editingUser.name,
        username: editingUser.username,
        role: editingUser.role,
        img: editingUser.img
    } : u));
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
          <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Identidad y Marca Corporativa</h3>
        </div>
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
           <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social (Contexto Legal y Cabecera)</label>
                <input 
                  type="text" 
                  value={settings.businessName} 
                  onChange={e => setSettings({...settings, businessName: e.target.value})} 
                  placeholder="Ej: Clínica Dental Solutions S.L."
                  className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial (Logo y Sidebar)</label>
                <input 
                  type="text" 
                  value={settings.name} 
                  onChange={handleCompanyNameChange} 
                  placeholder="Ej: MediClinic"
                  className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20" 
                />
                <p className="text-[9px] text-slate-400 italic px-1">Este nombre aparece junto al logo. Si se deja vacío, el logo ocupará todo el ancho disponible. <b>Nota:</b> Se sincroniza automáticamente con el asistente IA.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Divisa</label>
                  <select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold">
                    <option value="€">Euro (€)</option>
                    <option value="$">Dólar ($)</option>
                  </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Región / País</label>
                    <select 
                        value={settings.region || 'ES'} 
                        onChange={e => setSettings({...settings, region: e.target.value as CountryRegion})} 
                        className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold"
                    >
                        {REGIONS.map(r => (
                            <option key={r.code} value={r.code}>{r.label}</option>
                        ))}
                    </select>
                </div>
              </div>
           </div>

           <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logo Institucional</label>
              <div className="relative group bg-slate-50 dark:bg-bg-dark rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center gap-4 transition-all hover:border-primary/50">
                  <div className="size-32 flex items-center justify-center bg-white dark:bg-surface-dark rounded-2xl shadow-sm overflow-hidden p-4">
                      {settings.logo ? (
                        <img src={settings.logo} className="max-h-full max-w-full object-contain" alt="Preview Logo" />
                      ) : (
                        <span className="material-symbols-outlined text-5xl text-slate-200">add_photo_alternate</span>
                      )}
                  </div>
                  
                  <div className="flex flex-col items-center gap-2">
                      <p className="text-[10px] text-slate-500 font-bold uppercase text-center max-w-[200px]">Recomendado: PNG o SVG con fondo transparente.</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => logoInputRef.current?.click()}
                          className="px-5 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                        >
                          Cargar Imagen
                        </button>
                        {settings.logo !== DEFAULT_LOGO && (
                          <button 
                            onClick={resetLogo}
                            className="px-5 py-2 bg-white dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:text-danger hover:border-danger transition-all"
                          >
                            Restablecer
                          </button>
                        )}
                      </div>
                  </div>
                  
                  <input 
                    type="file" 
                    ref={logoInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleLogoChange} 
                  />
              </div>
           </div>
        </div>
      </section>

      {/* GESTIÓN DE ROLES Y PERMISOS */}
      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
        <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
          <div className="size-12 rounded-xl bg-purple-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">security</span></div>
          <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestión de Roles y Permisos</h3>
        </div>
        <div className="p-10 space-y-10">
          <div className="flex gap-4 items-end bg-slate-50 dark:bg-bg-dark p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nuevo Nombre de Rol</label>
              <input type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Ej: Recepcionista Senior" className="w-full bg-white dark:bg-surface-dark border-none rounded-2xl px-6 py-4 text-sm font-bold shadow-inner" />
            </div>
            <button onClick={handleCreateRole} className="h-14 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all">Crear Rol</button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Roles Configurados</label>
              <div className="space-y-3">
                {settings.roles.map(role => (
                  <div key={role.id} onClick={() => setEditingRole(role)} className={`group p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center justify-between ${editingRole?.id === role.id ? 'border-primary bg-primary/5 shadow-lg' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-bg-dark hover:border-slate-200'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-xl flex items-center justify-center ${role.isSystem ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary'}`}><span className="material-symbols-outlined">{role.isSystem ? 'verified' : 'person'}</span></div>
                      <div>
                        <p className="font-black text-sm uppercase tracking-tight text-slate-800 dark:text-white">{role.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{role.permissions.length} Permisos asignados</p>
                      </div>
                    </div>
                    {!role.isSystem && (
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }} className="size-8 rounded-lg bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"><span className="material-symbols-outlined text-sm">delete</span></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {editingRole && (
              <div className="bg-slate-50 dark:bg-bg-dark rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 space-y-6 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4">
                  <div>
                    <h4 className="font-black text-lg uppercase tracking-tight text-slate-800 dark:text-white">Permisos para: {editingRole.name}</h4>
                    {editingRole.isSystem && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase">Rol de Sistema (Protegido)</span>}
                  </div>
                  <button onClick={() => setEditingRole(null)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  {AVAILABLE_PERMISSIONS.map(perm => (
                    <button key={perm.id} disabled={editingRole.isSystem} onClick={() => togglePermission(perm.id)} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${editingRole.permissions.includes(perm.id) ? 'bg-white dark:bg-surface-dark border-primary text-primary shadow-sm' : 'bg-transparent border-slate-100 dark:border-slate-800 text-slate-400 opacity-60'}`}>
                      <span className="material-symbols-outlined text-sm">{editingRole.permissions.includes(perm.id) ? 'check_box' : 'check_box_outline_blank'}</span>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-tight leading-none">{perm.label}</p>
                        <p className="text-[8px] font-bold opacity-60 mt-1 uppercase">{perm.group}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* GESTIÓN DE USUARIOS Y ACCESOS */}
      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
        <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
          <div className="size-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">group</span></div>
          <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Usuarios y Accesos</h3>
        </div>
        <div className="p-10 space-y-10">
          <div className="bg-slate-50 dark:bg-bg-dark rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 space-y-10">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><span className="material-symbols-outlined">person_add</span></div>
              <h4 className="font-black text-lg uppercase tracking-tight text-slate-800 dark:text-white">Alta de Nuevo Empleado / Usuario</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-1 flex flex-col items-center gap-4">
                 <div className="relative group cursor-pointer" onClick={() => employeeAvatarRef.current?.click()}>
                    <div className="size-32 rounded-full bg-cover bg-center border-4 border-white dark:border-slate-700 shadow-xl" style={{backgroundImage: `url('${newEmployee.avatar}')`}}></div>
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-white text-3xl">photo_camera</span></div>
                    <input type="file" ref={employeeAvatarRef} className="hidden" accept="image/*" onChange={handleEmployeeAvatarChange} />
                 </div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Foto de Perfil</p>
              </div>

              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                  <input type="text" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} className={`w-full bg-white dark:bg-surface-dark border-2 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none ${formErrors.name ? 'border-red-400' : 'border-slate-100 dark:border-slate-800'}`} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellidos</label>
                  <input type="text" value={newEmployee.surname} onChange={e => setNewEmployee({...newEmployee, surname: e.target.value})} className={`w-full bg-white dark:bg-surface-dark border-2 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none ${formErrors.surname ? 'border-red-400' : 'border-slate-100 dark:border-slate-800'}`} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DNI / Documento</label>
                  <input type="text" value={newEmployee.dni} onChange={e => setNewEmployee({...newEmployee, dni: e.target.value})} className={`w-full bg-white dark:bg-surface-dark border-2 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none ${formErrors.dni ? 'border-red-400' : 'border-slate-100 dark:border-slate-800'}`} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Profesional</label>
                  <input type="email" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} className={`w-full bg-white dark:bg-surface-dark border-2 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none ${formErrors.email ? 'border-red-400' : 'border-slate-100 dark:border-slate-800'}`} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol de Acceso</label>
                  <select value={newEmployee.roleId} onChange={e => setNewEmployee({...newEmployee, roleId: e.target.value})} className={`w-full bg-white dark:bg-surface-dark border-2 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all ${formErrors.roleId ? 'border-red-400' : 'border-slate-100 dark:border-slate-800'}`}>
                    <option value="">Seleccionar rol...</option>
                    {settings.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                {isDoctorRoleSelected && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Especialidad Médica</label>
                    <select value={newEmployee.specialty} onChange={e => setNewEmployee({...newEmployee, specialty: e.target.value})} className={`w-full bg-white dark:bg-surface-dark border-2 rounded-2xl px-5 py-3 text-sm font-bold text-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none ${formErrors.specialty ? 'border-red-400' : 'border-primary/20'}`}>
                      <option value="">Seleccionar especialidad...</option>
                      {MEDICAL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario de Login</label>
                  <input type="text" value={newEmployee.username} onChange={e => setNewEmployee({...newEmployee, username: e.target.value})} className={`w-full bg-white dark:bg-surface-dark border-2 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none ${formErrors.username ? 'border-red-400' : 'border-slate-100 dark:border-slate-800'}`} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña Inicial</label>
                  <input type="password" value={newEmployee.password} onChange={e => setNewEmployee({...newEmployee, password: e.target.value})} className={`w-full bg-white dark:bg-surface-dark border-2 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none ${formErrors.password ? 'border-red-400' : 'border-slate-100 dark:border-slate-800'}`} />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-slate-700">
               <button onClick={handleCreateEmployee} className="h-16 px-20 bg-emerald-500 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all">Registrar y Crear Acceso</button>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-black text-lg uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-3"><span className="material-symbols-outlined">badge</span> Auditoría de Usuarios Activos</h4>
            <div className="bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empleado</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol Asignado</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {systemUsers.map(user => (
                    <tr key={user.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-full bg-cover bg-center border-2 border-white shadow-sm" style={{backgroundImage: `url('${user.img}')`}}></div>
                          <p className="font-black text-xs uppercase text-slate-700 dark:text-white">{user.name}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-500 dark:text-slate-400">@{user.username}</td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[9px] font-black uppercase text-slate-500">
                          {settings.roles.find(r => r.id === user.role)?.name || 'Sin Rol'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <button onClick={() => handleOpenEditUser(user)} className="size-10 rounded-xl bg-slate-50 dark:bg-bg-dark border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm"><span className="material-symbols-outlined text-sm">edit</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                        value={settings.branchCount} 
                        onChange={e => {
                            const val = e.target.value;
                            setSettings({...settings, branchCount: val === '' ? ('' as any) : parseInt(val)})
                        }} 
                        className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold"
                    />
                </div>
            </div>

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
                            <div key={day} className={`grid grid-cols-1 items-center gap-4 p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-100 dark:border-slate-800 ${isContinuous ? 'xl:grid-cols-[100px_1fr_100px]' : 'xl:grid-cols-[80px_1fr_1fr_100px]'}`}>
                                <div className="font-bold text-slate-700 dark:text-white truncate">{day}</div>
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
