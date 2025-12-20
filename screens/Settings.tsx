
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ClinicSettings, User, ClinicService, FileAttachment, VoiceAccent, AppLanguage, AppLabels, LaborIncidentType, Doctor, AttendanceRecord, VacationRequest, RoleDefinition, PermissionId } from '../types';
import { COLOR_TEMPLATES } from '../App';
import { generatePersonalityPrompt, speakText } from '../services/gemini';
// import { useNavigate } from 'react-router-dom'; // REMOVED to prevent navigation

interface SettingsProps {
  settings: ClinicSettings;
  setSettings: React.Dispatch<React.SetStateAction<ClinicSettings>>;
  onToggleTheme: () => void;
  darkMode: boolean;
  systemUsers: User[];
  setSystemUsers: React.Dispatch<React.SetStateAction<User[]>>;
  doctors?: Doctor[];
  setDoctors?: React.Dispatch<React.SetStateAction<Doctor[]>>;
  onOpenDoctor?: (doctorId: string) => void; // New Prop
}

const PERSONALITY_TAGS = {
  emocion: ['Empática', 'Alegre', 'Serena', 'Enérgica', 'Seria', 'Dulce'],
  estilo: ['Concisa', 'Detallista', 'Proactiva', 'Escucha Activa', 'Paciente'],
  relacion: ['Formal (Usted)', 'Cercana (Tú)', 'Protectora', 'Vendedora']
};

const CLINIC_SECTORS = [
  'Odontología / Dental',
  'Medicina General',
  'Estética y Dermatología',
  'Fisioterapia y Rehabilitación',
  'Psicología y Salud Mental',
  'Veterinaria',
  'Oftalmología',
  'Ginecología y Obstetricia',
  'Pediatría',
  'Laboratorio Clínico',
  'Otro'
];

const VOICE_OPTIONS = [
  { id: 'Zephyr', name: 'Zephyr', gender: 'Femenino', desc: 'Clara y profesional' },
  { id: 'Kore', name: 'Kore', gender: 'Femenino', desc: 'Dulce y cercana' },
  { id: 'Puck', name: 'Puck', gender: 'Masculino', desc: 'Juvenil y enérgico' },
  { id: 'Charon', name: 'Charon', gender: 'Masculino', desc: 'Profunda y autoritaria' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Masculino', desc: 'Robusta y madura' },
];

const ACCENT_OPTIONS: { id: VoiceAccent; name: string }[] = [
  { id: 'es-ES-Madrid', name: 'Español (Madrid)' },
  { id: 'es-ES-Canarias', name: 'Español (Canarias)' },
  { id: 'es-LATAM', name: 'Español (Latinoamérica)' },
  { id: 'en-GB', name: 'English (British)' },
  { id: 'en-US', name: 'English (US)' },
];

const GREETING_PILLS = [
  "Hola, soy {name}, de {clinic}. ¿En qué te ayudo?",
  "Buenos días, habla {name}. ¿Quieres agendar una cita?",
  "Gracias por llamar a {clinic}, soy {name}. ¿Cómo puedo asistirte hoy?",
  "Central de {clinic}, habla {name}. Dígame."
];

const AVAILABLE_PERMISSIONS: {id: PermissionId, label: string, group: string}[] = [
  { id: 'view_dashboard', label: 'Ver Panel Principal', group: 'Navegación' },
  { id: 'view_agenda', label: 'Ver Agenda', group: 'Navegación' },
  { id: 'view_patients', label: 'Ver Pacientes', group: 'Navegación' },
  { id: 'view_doctors', label: 'Ver Médicos', group: 'Navegación' },
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

const Settings: React.FC<SettingsProps> = ({ settings, setSettings, onToggleTheme, darkMode, systemUsers, setSystemUsers, doctors, setDoctors, onOpenDoctor }) => {
  const [activeTab, setActiveTab] = useState<'company' | 'labor' | 'visual' | 'assistant'>('company');
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
  const [successMessageText, setSuccessMessageText] = useState('Registro guardado');
  const [isGeneratingPersonality, setIsGeneratingPersonality] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  // const navigate = useNavigate(); // REMOVED
  
  // State for Service Management
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');
  const [newServiceDuration, setNewServiceDuration] = useState<string>('30');

  // State for Roles Management
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [newRoleName, setNewRoleName] = useState('');

  // State for Employee Registration (Alta de Usuarios)
  const initialEmployeeState = {
    name: '', surname: '', dni: '',
    email: '', phone: '',
    address: '', city: '', zip: '', province: '',
    roleId: '', 
    jobTitle: '',
    specialty: '', 
    username: '', password: '',
    avatar: 'https://i.pravatar.cc/150?u=new_user'
  };
  const [newEmployee, setNewEmployee] = useState(initialEmployeeState);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isDoctorRoleSelected, setIsDoctorRoleSelected] = useState(false);
  const employeeAvatarRef = useRef<HTMLInputElement>(null);

  // Check if selected role is a doctor
  useEffect(() => {
    const role = settings.roles.find(r => r.id === newEmployee.roleId);
    // Simple logic: if role name contains "Médico" or "Facultativo" or ID contains "doctor"
    const isDoc = role ? (role.name.toLowerCase().includes('médico') || role.name.toLowerCase().includes('facultativo') || role.id.includes('doctor')) : false;
    setIsDoctorRoleSelected(isDoc);
  }, [newEmployee.roleId, settings.roles]);


  // State for Labor Management (Definitions)
  const [newIncident, setNewIncident] = useState<Partial<LaborIncidentType>>({
    name: '', requiresJustification: true, isPaid: false, color: 'bg-slate-500'
  });

  // State for Labor Management (Operational - Assigning incidents/vacations)
  const [manageType, setManageType] = useState<'incident' | 'vacation'>('incident');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null); // New state for editing
  const [eventData, setEventData] = useState({
    typeId: '',
    date: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    duration: '',
    notes: '',
    status: 'Justificado' // Default for Admin
  });

  const logoInputRef = useRef<HTMLInputElement>(null);

  // Global History Calculation with doctorId and endDate for editing
  const globalHistory = useMemo(() => {
    if (!doctors) return [];
    const incidents = doctors.flatMap(d => (d.attendanceHistory || []).map(a => ({
        ...a, 
        empName: d.name, 
        doctorId: d.id, 
        category: 'Incidencia'
    })));
    const vacations = doctors.flatMap(d => (d.vacationHistory || []).map(v => ({
      id: v.id, 
      date: v.start, 
      endDate: v.end, 
      type: v.type, 
      status: v.status, 
      notes: `${v.daysUsed} días (${v.start} a ${v.end})`, 
      empName: d.name, 
      doctorId: d.id, 
      category: 'Vacaciones'
    })));
    return [...incidents, ...vacations].sort((a, b) => b.date.localeCompare(a.date));
  }, [doctors]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleTestVoice = async () => {
    const text = settings.aiPhoneSettings.testSpeechText || settings.aiPhoneSettings.initialGreeting;
    setIsTestingVoice(true);
    try {
      const base64 = await speakText(text, settings.aiPhoneSettings.voiceName);
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
      
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (e) {
      alert("Error al probar voz.");
    } finally {
      setIsTestingVoice(false);
    }
  };

  const handleGeneratePersonality = async () => {
    if (selectedTags.length === 0) {
      alert("Selecciona al menos una etiqueta de personalidad.");
      return;
    }
    setIsGeneratingPersonality(true);
    try {
      const newPrompt = await generatePersonalityPrompt(selectedTags, settings.aiPhoneSettings.assistantName, settings.name);
      setSettings(prev => ({
        ...prev,
        aiPhoneSettings: { ...prev.aiPhoneSettings, systemPrompt: newPrompt }
      }));
    } catch (e) {
      alert("Error al generar personalidad.");
    } finally {
      setIsGeneratingPersonality(false);
    }
  };

  const handleGlobalSave = () => {
    setSuccessMessageText('Configuración Maestra Guardada');
    setShowSuccessMsg(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setShowSuccessMsg(false), 3000);
  };

  // --- Employee Registration Handlers ---
  const handleEmployeeAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmployee(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateEmployeeForm = () => {
    const errors: {[key: string]: string} = {};
    const { name, surname, dni, email, roleId, username, password, specialty, phone } = newEmployee;

    if (!name.trim()) errors.name = "El nombre es obligatorio.";
    if (!surname.trim()) errors.surname = "Los apellidos son obligatorios.";
    if (!dni.trim()) errors.dni = "El DNI/NIE es obligatorio.";
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
        errors.email = "El email es obligatorio.";
    } else if (!emailRegex.test(email)) {
        errors.email = "Formato inválido. Debe contener '@' y un dominio.";
    }

    // Phone validation
    const phoneRegex = /^[0-9+ ]{9,}$/;
    if (phone && !phoneRegex.test(phone)) {
        errors.phone = "Teléfono inválido. Mínimo 9 dígitos.";
    }

    if (!roleId) errors.roleId = "Debes asignar un rol al usuario.";
    if (!username.trim()) errors.username = "El usuario de acceso es obligatorio.";
    if (!password.trim()) errors.password = "La contraseña es obligatoria.";
    
    if (isDoctorRoleSelected && !specialty) {
        errors.specialty = "La especialidad es obligatoria para roles médicos.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateEmployee = () => {
    if (!validateEmployeeForm()) {
        // Scroll to top of the specific section if needed, or simply let the user see the red texts
        return; 
    }

    const { name, surname, dni, email, roleId, username, password, specialty, avatar, jobTitle, phone } = newEmployee;
    const fullName = `${name} ${surname}`;
    const newId = `U${Math.floor(Math.random() * 10000)}`;

    // 1. Create System User
    const newUser: User = {
      id: newId,
      username: username,
      name: fullName,
      role: roleId,
      img: avatar
    };
    setSystemUsers(prev => [...prev, newUser]);

    // 2. If Doctor, Create Doctor Entry
    if (isDoctorRoleSelected && setDoctors) {
      const newDoctor: Doctor = {
        id: `D${Math.floor(Math.random() * 10000)}`, // Distinct ID for doctor registry
        name: fullName,
        role: roleId,
        specialty: specialty,
        status: 'Active',
        img: avatar,
        branch: 'Centro', // Default
        phone: phone,
        corporateEmail: email,
        docs: [],
        schedule: {
            'Lunes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
            'Martes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
            'Miércoles': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
            'Jueves': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
            'Viernes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '00:00', end: '00:00', active: false } }
        },
        vacationDaysTotal: 30,
        vacationDaysTaken: 0,
        vacationHistory: [],
        attendanceHistory: [],
        contractType: 'Indefinido',
        hourlyRate: 0,
      };
      setDoctors(prev => [...prev, newDoctor]);
    }

    // 3. Reset and Notify
    setNewEmployee(initialEmployeeState);
    setFormErrors({});
    setSuccessMessageText(`Usuario ${username} registrado con éxito en el sistema.`);
    setShowSuccessMsg(true);
    setTimeout(() => setShowSuccessMsg(false), 3000);
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
    setNewServiceName('');
    setNewServicePrice('');
  };

  const removeService = (id: string) => {
    setSettings(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id)
    }));
  };

  const updateLabel = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      labels: { ...prev.labels, [key]: value }
    }));
  };

  const useGreetingPill = (pill: string) => {
    const processed = pill
      .replace('{name}', settings.aiPhoneSettings.assistantName)
      .replace('{clinic}', settings.name);
    setSettings(prev => ({
      ...prev,
      aiPhoneSettings: { ...prev.aiPhoneSettings, initialGreeting: processed }
    }));
  };

  // --- Roles & Permissions Handlers ---

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    const newRole: RoleDefinition = {
      id: 'role_' + Math.random().toString(36).substr(2, 9),
      name: newRoleName,
      isSystem: false, // Ensure false
      permissions: ['view_dashboard'] // Default permission
    };
    setSettings(prev => ({
      ...prev,
      roles: [...prev.roles, newRole]
    }));
    setNewRoleName('');
    setEditingRole(newRole);
  };

  const handleDeleteRole = (id: string) => {
    const roleToDelete = settings.roles.find(r => r.id === id);
    
    if (!roleToDelete) return; // Role doesn't exist

    if (roleToDelete.isSystem) {
        alert("Los roles de sistema no pueden ser eliminados.");
        return;
    }

    if (window.confirm(`¿Estás seguro de que deseas eliminar el rol "${roleToDelete.name}"? Esta acción no se puede deshacer.`)) {
      // 1. Clear editing if it's the one being deleted
      if (editingRole?.id === id) {
          setEditingRole(null);
      }
      
      // 2. Update Settings
      setSettings(prev => ({
        ...prev,
        roles: prev.roles.filter(r => r.id !== id)
      }));
    }
  };

  const togglePermission = (permId: PermissionId) => {
    if (!editingRole) return;
    const hasPerm = editingRole.permissions.includes(permId);
    const updatedPerms = hasPerm 
      ? editingRole.permissions.filter(p => p !== permId)
      : [...editingRole.permissions, permId];
    
    const updatedRole = { ...editingRole, permissions: updatedPerms };
    setEditingRole(updatedRole);
    setSettings(prev => ({
      ...prev,
      roles: prev.roles.map(r => r.id === editingRole.id ? updatedRole : r)
    }));
  };

  const updateUserRole = (userId: string, newRoleId: string) => {
    setSystemUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRoleId } : u));
    
    // Also update doctor record if applicable
    if (setDoctors) {
        setDoctors(prev => prev.map(d => d.id === userId ? { ...d, role: newRoleId } : d));
    }
  };


  // --- Labor Settings Handlers ---
  const addIncidentType = () => {
    if (!newIncident.name) return;
    const type: LaborIncidentType = {
      id: 'inc_' + Math.floor(Math.random() * 10000),
      name: newIncident.name,
      requiresJustification: newIncident.requiresJustification || false,
      isPaid: newIncident.isPaid || false,
      color: newIncident.color || 'bg-slate-500'
    };
    setSettings(prev => ({
      ...prev,
      laborSettings: {
        ...prev.laborSettings,
        incidentTypes: [...(prev.laborSettings.incidentTypes || []), type]
      }
    }));
    setNewIncident({ name: '', requiresJustification: true, isPaid: false, color: 'bg-slate-500' });
  };

  const removeIncidentType = (id: string) => {
    setSettings(prev => ({
      ...prev,
      laborSettings: {
        ...prev.laborSettings,
        incidentTypes: prev.laborSettings.incidentTypes.filter(t => t.id !== id)
      }
    }));
  };

  const handleRegisterEvent = () => {
    if (!doctors || !setDoctors || !selectedEmpId) return;
    if (manageType === 'incident' && !eventData.typeId) { alert('Selecciona un tipo de incidencia'); return; }

    setDoctors(prev => prev.map(doc => {
      if (doc.id !== selectedEmpId) return doc;

      if (manageType === 'incident') {
        const typeName = settings.laborSettings.incidentTypes.find(t => t.id === eventData.typeId)?.name || 'Incidencia';
        const newRecord: AttendanceRecord = {
          id: editingRecordId || 'REC-' + Date.now(),
          date: eventData.date,
          type: typeName,
          duration: eventData.duration,
          status: eventData.status as any,
          notes: eventData.notes
        };
        
        let newHistory = [...(doc.attendanceHistory || [])];
        if (editingRecordId) {
            newHistory = newHistory.map(rec => rec.id === editingRecordId ? newRecord : rec);
        } else {
            newHistory = [newRecord, ...newHistory];
        }

        return {
          ...doc,
          attendanceHistory: newHistory
        };
      } else {
        // Vacation Logic
        const start = new Date(eventData.date);
        const end = new Date(eventData.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
        
        const newVacation: VacationRequest = {
          id: editingRecordId || 'VAC-' + Date.now(),
          start: eventData.date,
          end: eventData.endDate,
          daysUsed: days > 0 ? days : 1,
          status: 'Aprobada',
          type: 'Vacaciones'
        };

        let newHistory = [...(doc.vacationHistory || [])];
        if (editingRecordId) {
            newHistory = newHistory.map(rec => rec.id === editingRecordId ? newVacation : rec);
        } else {
            newHistory = [newVacation, ...newHistory];
        }

        const totalTaken = newHistory.filter(v => v.status !== 'Rechazada').reduce((acc, c) => acc + c.daysUsed, 0);

        return {
          ...doc,
          vacationHistory: newHistory,
          vacationDaysTaken: totalTaken
        };
      }
    }));

    // Reset Form
    setEventData({ ...eventData, notes: '', duration: '', date: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], typeId: '' });
    setEditingRecordId(null);
    setSelectedEmpId('');
    setShowSuccessMsg(true);
    setTimeout(() => setShowSuccessMsg(false), 3000);
  };

  const handleEditRecord = (item: any) => {
      setSelectedEmpId(item.doctorId);
      setEditingRecordId(item.id);
      
      if (item.category === 'Vacaciones') {
          setManageType('vacation');
          setEventData({
              ...eventData,
              date: item.date,
              endDate: item.endDate || item.date,
              notes: '',
              typeId: '', 
              status: item.status
          });
      } else {
          setManageType('incident');
          // Find type ID by name
          const typeObj = settings.laborSettings.incidentTypes.find(t => t.name === item.type);
          setEventData({
              ...eventData,
              date: item.date,
              duration: item.duration || '',
              notes: item.notes || '',
              typeId: typeObj ? typeObj.id : '',
              status: item.status
          });
      }
  };

  const handleDeleteRecord = (doctorId: string, recordId: string, category: string) => {
      if(!window.confirm("¿Seguro que deseas eliminar este registro?")) return;
      if (!setDoctors) return;

      setDoctors(prev => prev.map(doc => {
          if (doc.id !== doctorId) return doc;
          
          if (category === 'Vacaciones') {
              return {
                  ...doc,
                  vacationHistory: doc.vacationHistory?.filter(v => v.id !== recordId)
              };
          } else {
              return {
                  ...doc,
                  attendanceHistory: doc.attendanceHistory?.filter(a => a.id !== recordId)
              };
          }
      }));
  };

  const handleCancelEdit = () => {
      setEditingRecordId(null);
      setSelectedEmpId('');
      setEventData({
        typeId: '',
        date: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        duration: '',
        notes: '',
        status: 'Justificado'
      });
  };

  // HANDLER PARA CLICK EN AVATAR (DEEP LINK / GLOBAL MODAL)
  const handleUserClick = (userId: string) => {
      // Use the injected onOpenDoctor prop if available
      if (onOpenDoctor) {
          const isDoctor = doctors?.some(d => d.id === userId);
          if (isDoctor) {
              onOpenDoctor(userId);
          }
      }
  };

  return (
    <div className="p-10 max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-500 pb-32">
      
      {showSuccessMsg && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
           <div className="bg-success text-white px-8 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase tracking-widest text-[10px]">
              <span className="material-symbols-outlined">check_circle</span>
              {editingRecordId ? 'Registro actualizado' : successMessageText}
           </div>
        </div>
      )}

      {/* ... (HEADER y TABS IGUAL) ... */}
      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">
            Configuración del Sistema
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium italic text-lg">
            Personaliza la identidad de tu marca, políticas laborales y la inteligencia de tu asistente.
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-bg-dark p-2 rounded-[2.5rem] w-fit border border-slate-200 dark:border-slate-800 shadow-inner overflow-x-auto max-w-full">
           <button onClick={() => setActiveTab('company')} className={`px-10 py-4 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shrink-0 ${activeTab === 'company' ? 'bg-white dark:bg-surface-dark text-primary shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}><span className="material-symbols-outlined text-lg">business</span> Empresa</button>
           <button onClick={() => setActiveTab('labor')} className={`px-10 py-4 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shrink-0 ${activeTab === 'labor' ? 'bg-white dark:bg-surface-dark text-primary shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}><span className="material-symbols-outlined text-lg">badge</span> Laboral</button>
           <button onClick={() => setActiveTab('visual')} className={`px-10 py-4 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shrink-0 ${activeTab === 'visual' ? 'bg-white dark:bg-surface-dark text-primary shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}><span className="material-symbols-outlined text-lg">palette</span> Visual</button>
           <button onClick={() => setActiveTab('assistant')} className={`px-10 py-4 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shrink-0 ${activeTab === 'assistant' ? 'bg-white dark:bg-surface-dark text-primary shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}><span className="material-symbols-outlined text-lg">psychology</span> Asistente IA</button>
        </div>
      </header>

      {/* ... TABS Logic ... */}
      {activeTab === 'company' && (
        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-left-4 duration-500">
          <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
              <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center"><span className="material-symbols-outlined">info</span></div>
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Datos de Marca e Identidad</h3>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                  <input type="text" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" />
               </div>
               
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sector Empresarial</label>
                  <div className="relative">
                    <select 
                      value={settings.sector} 
                      onChange={e => setSettings({...settings, sector: e.target.value})} 
                      className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold appearance-none cursor-pointer"
                    >
                      {CLINIC_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none">expand_more</span>
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificación Fiscal (CIF/NIF)</label>
                  <input type="text" value={settings.taxId} onChange={e => setSettings({...settings, taxId: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" placeholder="Ej: B12345678" />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sitio Web</label>
                  <input type="text" value={settings.website} onChange={e => setSettings({...settings, website: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" placeholder="www.tuclinica.com" />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Divisa</label>
                  <select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold"><option value="€">Euro (€)</option><option value="$">Dólar ($)</option></select>
               </div>
               
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idioma Web</label>
                  <select value={settings.language} onChange={e => setSettings({...settings, language: e.target.value as any})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold"><option value="es-ES">Español (España)</option><option value="es-LATAM">Español (Latinoamérica)</option><option value="en-US">English (US)</option></select>
               </div>
               
               <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-bg-dark rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 group relative overflow-hidden mt-4">
                  {settings.logo ? <img src={settings.logo} className="h-16 w-auto object-contain mb-2" /> : <span className="material-symbols-outlined text-4xl text-slate-300">image</span>}
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logo Institucional</p>
                  <button onClick={() => logoInputRef.current?.click()} className="absolute inset-0 bg-primary/80 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center font-bold text-xs">Cambiar Logo</button>
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={e => {const f = e.target.files?.[0]; if(f) {const r = new FileReader(); r.onload = (re) => setSettings({...settings, logo: re.target?.result as string}); r.readAsDataURL(f);}}} />
               </div>
            </div>
          </section>

          {/* NEW: ALTA DE EMPLEADOS Y USUARIOS */}
          <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
             <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
                <div className="size-12 rounded-xl bg-blue-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">person_add</span></div>
                <div>
                   <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Alta de Usuarios y Empleados</h3>
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest">Registro detallado y credenciales de acceso</p>
                </div>
             </div>
             
             <div className="p-10 space-y-10">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                   
                   {/* Col 1: Datos Personales e Identidad */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                         <span className="size-2 bg-blue-500 rounded-full"></span>
                         <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Datos Personales</h4>
                      </div>
                      
                      <div className="flex gap-4 items-center mb-6">
                         <div className="relative group shrink-0">
                            <div className="size-20 rounded-2xl bg-cover bg-center border-2 border-slate-200 dark:border-slate-700 shadow-md" style={{backgroundImage: `url('${newEmployee.avatar}')`}}>
                               <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => employeeAvatarRef.current?.click()}>
                                  <span className="material-symbols-outlined text-white">edit</span>
                               </div>
                            </div>
                            <input type="file" ref={employeeAvatarRef} className="hidden" accept="image/*" onChange={handleEmployeeAvatarChange} />
                         </div>
                         <div className="flex-1 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Foto de Perfil</p>
                            <button onClick={() => employeeAvatarRef.current?.click()} className="text-xs font-bold text-primary hover:underline">Subir imagen</button>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre <span className="text-danger">*</span></label>
                            <input type="text" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} className={`w-full bg-slate-50 dark:bg-bg-dark border ${formErrors.name ? 'border-danger' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-3 text-sm font-bold`} />
                            {formErrors.name && <span className="text-danger text-[9px] font-bold ml-1">{formErrors.name}</span>}
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellidos <span className="text-danger">*</span></label>
                            <input type="text" value={newEmployee.surname} onChange={e => setNewEmployee({...newEmployee, surname: e.target.value})} className={`w-full bg-slate-50 dark:bg-bg-dark border ${formErrors.surname ? 'border-danger' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-3 text-sm font-bold`} />
                            {formErrors.surname && <span className="text-danger text-[9px] font-bold ml-1">{formErrors.surname}</span>}
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">DNI / NIE <span className="text-danger">*</span></label>
                            <input type="text" value={newEmployee.dni} onChange={e => setNewEmployee({...newEmployee, dni: e.target.value})} className={`w-full bg-slate-50 dark:bg-bg-dark border ${formErrors.dni ? 'border-danger' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-3 text-sm font-bold`} />
                            {formErrors.dni && <span className="text-danger text-[9px] font-bold ml-1">{formErrors.dni}</span>}
                         </div>
                      </div>
                   </div>

                   {/* Col 2: Dirección y Contacto */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                         <span className="size-2 bg-purple-500 rounded-full"></span>
                         <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Ubicación y Contacto</h4>
                      </div>
                      
                      <div className="space-y-4">
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección Completa</label>
                            <input type="text" placeholder="Calle, Número, Piso..." value={newEmployee.address} onChange={e => setNewEmployee({...newEmployee, address: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Código Postal</label>
                               <input type="text" value={newEmployee.zip} onChange={e => setNewEmployee({...newEmployee, zip: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold" />
                            </div>
                            <div>
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ciudad</label>
                               <input type="text" value={newEmployee.city} onChange={e => setNewEmployee({...newEmployee, city: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold" />
                            </div>
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Provincia</label>
                            <input type="text" value={newEmployee.province} onChange={e => setNewEmployee({...newEmployee, province: e.target.value})} className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold" />
                         </div>
                         <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email <span className="text-danger">*</span></label>
                               <input type="email" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} className={`w-full bg-slate-50 dark:bg-bg-dark border ${formErrors.email ? 'border-danger' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-3 text-sm font-bold`} />
                               {formErrors.email && <span className="text-danger text-[9px] font-bold ml-1">{formErrors.email}</span>}
                            </div>
                            <div>
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                               <input type="tel" value={newEmployee.phone} onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})} className={`w-full bg-slate-50 dark:bg-bg-dark border ${formErrors.phone ? 'border-danger' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-3 text-sm font-bold`} />
                               {formErrors.phone && <span className="text-danger text-[9px] font-bold ml-1">{formErrors.phone}</span>}
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Col 3: Rol, Cargo y Acceso */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                         <span className="size-2 bg-success rounded-full"></span>
                         <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Rol y Credenciales</h4>
                      </div>

                      <div className="space-y-4 bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo / Puesto</label>
                            <input type="text" placeholder="Ej: Recepcionista Senior" value={newEmployee.jobTitle} onChange={e => setNewEmployee({...newEmployee, jobTitle: e.target.value})} className="w-full bg-white dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold" />
                         </div>
                         
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Asignar Rol de Sistema <span className="text-danger">*</span></label>
                            <div className="relative">
                               <select 
                                  value={newEmployee.roleId} 
                                  onChange={e => setNewEmployee({...newEmployee, roleId: e.target.value})}
                                  className={`w-full bg-white dark:bg-bg-dark border ${formErrors.roleId ? 'border-danger' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-3 text-sm font-bold appearance-none cursor-pointer`}
                               >
                                  <option value="">-- Seleccionar Rol --</option>
                                  {settings.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                               </select>
                               <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none">expand_more</span>
                            </div>
                            {formErrors.roleId && <span className="text-danger text-[9px] font-bold ml-1">{formErrors.roleId}</span>}
                         </div>

                         {/* DYNAMIC DOCTOR FIELD */}
                         {isDoctorRoleSelected && (
                            <div className="animate-in slide-in-from-top-2 fade-in">
                               <label className="text-[9px] font-black text-primary uppercase tracking-widest ml-1">Especialidad Médica <span className="text-danger">*</span></label>
                               <div className="relative">
                                  <select 
                                     value={newEmployee.specialty} 
                                     onChange={e => setNewEmployee({...newEmployee, specialty: e.target.value})}
                                     className={`w-full bg-white dark:bg-bg-dark border-2 ${formErrors.specialty ? 'border-danger' : 'border-primary/20'} rounded-xl px-4 py-3 text-sm font-bold appearance-none cursor-pointer text-primary`}
                                  >
                                     <option value="">-- Seleccionar Especialidad --</option>
                                     {MEDICAL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary pointer-events-none">medical_services</span>
                               </div>
                               {formErrors.specialty && <span className="text-danger text-[9px] font-bold ml-1">{formErrors.specialty}</span>}
                            </div>
                         )}
                      </div>

                      <div className="space-y-4 pt-2">
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario de Acceso <span className="text-danger">*</span></label>
                            <input type="text" value={newEmployee.username} onChange={e => setNewEmployee({...newEmployee, username: e.target.value})} className={`w-full bg-slate-50 dark:bg-bg-dark border ${formErrors.username ? 'border-danger' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-3 text-sm font-bold`} />
                            {formErrors.username && <span className="text-danger text-[9px] font-bold ml-1">{formErrors.username}</span>}
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña (Segura) <span className="text-danger">*</span></label>
                            <input type="password" value={newEmployee.password} onChange={e => setNewEmployee({...newEmployee, password: e.target.value})} className={`w-full bg-slate-50 dark:bg-bg-dark border ${formErrors.password ? 'border-danger' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-3 text-sm font-bold tracking-widest`} />
                            {formErrors.password && <span className="text-danger text-[9px] font-bold ml-1">{formErrors.password}</span>}
                         </div>
                      </div>
                   </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
                   <button onClick={handleCreateEmployee} className="h-16 px-12 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-700 hover:scale-105 transition-all shadow-xl shadow-blue-500/30 flex items-center gap-3">
                      <span className="material-symbols-outlined text-2xl">save</span> Guardar y Registrar
                   </button>
                </div>

                {/* --- REGISTERED USERS LIST (VISUAL CONFIRMATION) --- */}
                <div className="pt-10">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">Directorio de Usuarios Registrados</h4>
                   <div className="bg-slate-50/50 dark:bg-bg-dark/30 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden">
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                         <table className="w-full text-left">
                            <thead className="bg-white dark:bg-surface-dark sticky top-0 z-10">
                               <tr>
                                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo</th>
                                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Rol Asignado</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                               {systemUsers.map(u => (
                                  <tr key={u.id} className="hover:bg-white dark:hover:bg-surface-dark transition-colors">
                                     <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                           <div className="size-8 rounded-full bg-cover bg-center border border-slate-200 dark:border-slate-700" style={{backgroundImage: `url('${u.img}')`}}></div>
                                           <span className="text-xs font-bold text-slate-600 dark:text-slate-300">@{u.username}</span>
                                        </div>
                                     </td>
                                     <td className="px-6 py-4 text-xs font-black text-slate-800 dark:text-white uppercase">{u.name}</td>
                                     <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded-lg text-[9px] font-bold text-slate-500 uppercase">
                                           {settings.roles.find(r => r.id === u.role)?.name || 'Sin Rol'}
                                        </span>
                                     </td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          {/* RBAC SECTION REDESIGNED */}
          <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
             <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
                <div className="size-12 rounded-xl bg-purple-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">shield_person</span></div>
                <div>
                   <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestión de Roles y Permisos</h3>
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest">Control de acceso avanzado</p>
                </div>
             </div>

             <div className="flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-slate-100 dark:divide-slate-800">
                {/* ROLE EDITOR COLUMN */}
                <div className="p-10 flex-[1.5] space-y-10">
                   {/* Create Role Input */}
                   <div className="flex items-end gap-4 p-6 bg-slate-50 dark:bg-bg-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <div className="flex-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Crear Nuevo Rol</label>
                         <input type="text" placeholder="Ej: Auxiliar Administrativo" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className="w-full bg-white dark:bg-surface-dark border-none rounded-2xl px-6 py-4 text-sm font-bold shadow-sm" />
                      </div>
                      <button onClick={handleCreateRole} className="h-14 px-8 bg-purple-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-lg shadow-purple-500/20">Crear</button>
                   </div>

                   {/* Role Selection List */}
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Seleccionar Rol para Editar</label>
                      <div className="flex flex-wrap gap-3">
                         {settings.roles.map(role => (
                            <button 
                               key={role.id} 
                               onClick={() => setEditingRole(role)}
                               className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wide border-2 transition-all flex items-center gap-3 ${editingRole?.id === role.id ? 'bg-purple-500 border-purple-500 text-white shadow-md transform scale-105' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-purple-300'}`}
                            >
                               {role.name}
                               {role.isSystem && <span className="material-symbols-outlined text-[14px] opacity-60">lock</span>}
                            </button>
                         ))}
                      </div>
                   </div>

                   {/* Permissions Editor */}
                   {editingRole && (
                      <div className="bg-slate-50 dark:bg-bg-dark p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4 shadow-inner">
                         <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200 dark:border-slate-700">
                            <div>
                                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-xl">{editingRole.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Configurando accesos y visibilidad</p>
                            </div>
                            {!editingRole.isSystem && (
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteRole(editingRole.id);
                                    }}
                                    className="px-6 py-2.5 bg-danger/10 text-danger rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-danger hover:text-white transition-all shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span> Eliminar Rol
                                </button>
                            )}
                            {editingRole.isSystem && <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-lg flex items-center gap-1"><span className="material-symbols-outlined text-xs">lock</span> Sistema</span>}
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {AVAILABLE_PERMISSIONS.map(perm => (
                               <button 
                                  key={perm.id} 
                                  onClick={() => !editingRole.isSystem && togglePermission(perm.id)}
                                  disabled={editingRole.isSystem && editingRole.id === 'admin_role'} 
                                  className={`p-4 rounded-2xl flex items-center justify-between border-2 transition-all text-left group ${editingRole.permissions.includes(perm.id) ? 'border-success bg-success/5' : 'border-transparent bg-white dark:bg-surface-dark'} ${(editingRole.isSystem && editingRole.id === 'admin_role') ? 'opacity-70 cursor-not-allowed' : 'hover:border-purple-300'}`}
                               >
                                  <div className="flex flex-col">
                                     <span className={`text-xs font-black uppercase ${editingRole.permissions.includes(perm.id) ? 'text-success' : 'text-slate-500'}`}>{perm.label}</span>
                                     <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{perm.group}</span>
                                  </div>
                                  <div className={`w-12 h-6 rounded-full flex items-center transition-all px-1 ${editingRole.permissions.includes(perm.id) ? 'bg-success justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'}`}>
                                     <div className="size-4 bg-white rounded-full shadow-sm"></div>
                                  </div>
                               </button>
                            ))}
                         </div>
                      </div>
                   )}
                </div>

                {/* USER ASSIGNMENT COLUMN */}
                <div className="p-10 flex-1 w-full bg-slate-50/50 dark:bg-slate-900/20">
                   <div className="flex items-center gap-3 mb-8">
                        <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 flex items-center justify-center"><span className="material-symbols-outlined">manage_accounts</span></div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Asignar Roles a Usuarios</h4>
                   </div>
                   
                   <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                      {systemUsers.map(user => (
                         <div key={user.id} className="p-5 bg-white dark:bg-surface-dark rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                               <div 
                                  onClick={() => handleUserClick(user.id)}
                                  className="size-12 rounded-2xl bg-cover bg-center border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform shadow-md hover:shadow-primary/30" 
                                  style={{backgroundImage: `url('${user.img}')`}}
                                  title="Ver Ficha de Empleado"
                               ></div>
                               <div className="min-w-0 flex-1">
                                  <p onClick={() => handleUserClick(user.id)} className="text-sm font-black text-slate-900 dark:text-white truncate cursor-pointer hover:text-primary transition-colors">{user.name}</p>
                                  <p className="text-[10px] text-slate-500 font-medium truncate">@{user.username}</p>
                               </div>
                               {/* Role Badge */}
                               <div className="px-3 py-1 bg-slate-100 dark:bg-bg-dark rounded-lg">
                                   <span className="text-[10px] font-black uppercase text-slate-500">
                                       {settings.roles.find(r => r.id === user.role)?.name || 'Sin Rol'}
                                   </span>
                               </div>
                            </div>
                            
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none text-lg">badge</span>
                                <select 
                                   value={user.role} 
                                   onChange={(e) => updateUserRole(user.id, e.target.value)}
                                   className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold py-3 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 cursor-pointer appearance-none transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                   {settings.roles.map(r => (
                                      <option key={r.id} value={r.id}>{r.name}</option>
                                   ))}
                                </select>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none text-lg">arrow_drop_down</span>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </section>

          {/* CATALOGO DE SERVICIOS */}
          <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
              <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center"><span className="material-symbols-outlined">medical_services</span></div>
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Catálogo de Servicios</h3>
            </div>
            <div className="p-10 space-y-8">
               <div className="flex gap-4 flex-wrap">
                  <input type="text" placeholder="Nombre del servicio" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} className="flex-1 min-w-[200px] bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" />
                  <div className="relative"><input type="number" placeholder="Precio" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} className="w-32 bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold pr-12" /><span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-400">{settings.currency}</span></div>
                  <div className="relative"><input type="number" placeholder="Minutos" value={newServiceDuration} onChange={e => setNewServiceDuration(e.target.value)} className="w-32 bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold pr-12" /><span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-400 text-[10px]">MIN</span></div>
                  <button onClick={addService} className="px-10 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Añadir</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {settings.services.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-bg-dark rounded-3xl border border-slate-200 dark:border-slate-800 group hover:border-primary transition-all">
                       <div className="min-w-0"><p className="font-black text-sm truncate uppercase tracking-tight text-slate-800 dark:text-white">{s.name}</p><p className="text-[10px] font-black text-primary mt-1">{s.price}{settings.currency} • {s.duration} min</p></div>
                       <button onClick={() => removeService(s.id)} className="text-danger hover:scale-125 transition-transform"><span className="material-symbols-outlined">delete</span></button>
                    </div>
                  ))}
               </div>
            </div>
          </section>
        </div>
      )}

      {/* Render other tabs */}
      {activeTab === 'labor' && (
        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
           {/* POLÍTICA DE VACACIONES */}
          <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
              <div className="size-12 rounded-xl bg-orange-400 text-white flex items-center justify-center">
                <span className="material-symbols-outlined">beach_access</span>
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Política de Vacaciones</h3>
            </div>
            <div className="p-10 space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Días Anuales por Contrato</label>
                     <input type="number" value={settings.laborSettings?.vacationDaysPerYear || 30} onChange={e => setSettings({...settings, laborSettings: {...settings.laborSettings, vacationDaysPerYear: parseInt(e.target.value)}})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Cómputo</label>
                     <div className="flex gap-2">
                        <button onClick={() => setSettings({...settings, laborSettings: {...settings.laborSettings, businessDaysOnly: false}})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${!settings.laborSettings?.businessDaysOnly ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 dark:bg-bg-dark text-slate-400'}`}>Naturales</button>
                        <button onClick={() => setSettings({...settings, laborSettings: {...settings.laborSettings, businessDaysOnly: true}})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${settings.laborSettings?.businessDaysOnly ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 dark:bg-bg-dark text-slate-400'}`}>Hábiles</button>
                     </div>
                  </div>
                  <div className="space-y-3 flex flex-col">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acumulación</label>
                     <button onClick={() => setSettings({...settings, laborSettings: {...settings.laborSettings, allowCarryOver: !settings.laborSettings?.allowCarryOver}})} className={`flex-1 flex items-center justify-between px-6 rounded-2xl transition-all border-2 ${settings.laborSettings?.allowCarryOver ? 'border-success bg-success/10 text-success' : 'border-slate-200 bg-slate-50 dark:bg-bg-dark text-slate-400'}`}>
                        <span className="text-xs font-black uppercase">Permitir acumular</span><span className="material-symbols-outlined">{settings.laborSettings?.allowCarryOver ? 'toggle_on' : 'toggle_off'}</span>
                     </button>
                  </div>
               </div>
            </div>
          </section>

          {/* GESTIÓN DE INCIDENCIAS */}
          <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
              <div className="size-12 rounded-xl bg-danger text-white flex items-center justify-center">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Tipos de Incidencias y Ausencias</h3>
            </div>
            
            <div className="p-10 space-y-8">
               <div className="bg-slate-50 dark:bg-bg-dark p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 space-y-6">
                  <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] ml-2">Crear Nuevo Tipo de Incidencia</h4>
                  <div className="flex flex-col lg:flex-row gap-6 items-end">
                     <div className="flex-1 w-full">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nombre</label>
                        <input type="text" placeholder="Ej: Baja Enfermedad Común" value={newIncident.name} onChange={e => setNewIncident({...newIncident, name: e.target.value})} className="w-full bg-white dark:bg-surface-dark border-none rounded-2xl px-6 py-4 text-sm font-bold shadow-sm" />
                     </div>
                     <div className="flex gap-4 w-full lg:w-auto">
                        <div className="flex-1 lg:flex-initial">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Etiqueta Color</label>
                           <select value={newIncident.color} onChange={e => setNewIncident({...newIncident, color: e.target.value})} className="w-full bg-white dark:bg-surface-dark border-none rounded-2xl px-4 py-4 text-sm font-bold shadow-sm cursor-pointer">
                              <option value="bg-slate-500">Gris</option><option value="bg-primary">Azul</option><option value="bg-success">Verde</option><option value="bg-warning">Amarillo</option><option value="bg-danger">Rojo</option><option value="bg-purple-500">Morado</option>
                           </select>
                        </div>
                        <div className="flex items-end pb-1 gap-2">
                           <button onClick={() => setNewIncident({...newIncident, requiresJustification: !newIncident.requiresJustification})} className={`size-12 rounded-2xl flex items-center justify-center transition-all ${newIncident.requiresJustification ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-surface-dark text-slate-300'}`} title="Requiere Justificación"><span className="material-symbols-outlined">description</span></button>
                           <button onClick={() => setNewIncident({...newIncident, isPaid: !newIncident.isPaid})} className={`size-12 rounded-2xl flex items-center justify-center transition-all ${newIncident.isPaid ? 'bg-success text-white shadow-lg' : 'bg-white dark:bg-surface-dark text-slate-300'}`} title="Es Retribuido"><span className="material-symbols-outlined">attach_money</span></button>
                        </div>
                     </div>
                     <button onClick={addIncidentType} className="h-14 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl">Añadir</button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {settings.laborSettings?.incidentTypes.map((inc) => (
                    <div key={inc.id} className="group p-6 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all relative overflow-hidden">
                       <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}><div className={`size-16 rounded-full ${inc.color}`}></div></div>
                       <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-4"><div className={`size-3 rounded-full ${inc.color}`}></div><h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight leading-none">{inc.name}</h4></div>
                          <div className="flex gap-2">
                             {inc.requiresJustification && <span className="px-2 py-1 bg-slate-100 dark:bg-bg-dark rounded-lg text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">description</span> Justif.</span>}
                             {inc.isPaid ? <span className="px-2 py-1 bg-success/10 rounded-lg text-[9px] font-bold text-success uppercase flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">attach_money</span> Pagado</span> : <span className="px-2 py-1 bg-slate-100 dark:bg-bg-dark rounded-lg text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">money_off</span> No Pagado</span>}
                          </div>
                          <button onClick={() => removeIncidentType(inc.id)} className="absolute bottom-6 right-6 text-slate-300 hover:text-danger transition-colors"><span className="material-symbols-outlined">delete</span></button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </section>

          {/* GESTIÓN OPERATIVA */}
          <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
            <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
              <div className="size-12 rounded-xl bg-purple-500 text-white flex items-center justify-center">
                <span className="material-symbols-outlined">badge</span>
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestión Operativa de Personal</h3>
            </div>
            
            <div className="flex flex-col xl:flex-row">
               {/* FORMULARIO */}
               <div className="p-10 w-full xl:w-[450px] border-b xl:border-b-0 xl:border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 space-y-8 shrink-0">
                  <div className="flex bg-white dark:bg-surface-dark p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                     <button onClick={() => setManageType('incident')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${manageType === 'incident' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Incidencia</button>
                     <button onClick={() => setManageType('vacation')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${manageType === 'vacation' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Vacaciones</button>
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Empleado</label>
                        <select 
                          value={selectedEmpId} 
                          disabled={!!editingRecordId}
                          onChange={(e) => setSelectedEmpId(e.target.value)} 
                          className="w-full bg-white dark:bg-surface-dark border-none rounded-2xl px-5 py-4 text-sm font-bold shadow-sm disabled:opacity-50"
                        >
                           <option value="">Seleccionar empleado...</option>
                           {doctors?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                     </div>

                     {manageType === 'incident' && (
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Incidencia</label>
                          <select value={eventData.typeId} onChange={(e) => setEventData({...eventData, typeId: e.target.value})} className="w-full bg-white dark:bg-surface-dark border-none rounded-2xl px-5 py-4 text-sm font-bold shadow-sm">
                             <option value="">Seleccionar tipo...</option>
                             {settings.laborSettings.incidentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                       </div>
                     )}

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha {manageType === 'vacation' ? 'Inicio' : ''}</label>
                           <input type="date" value={eventData.date} onChange={e => setEventData({...eventData, date: e.target.value})} className="w-full bg-white dark:bg-surface-dark border-none rounded-2xl px-4 py-4 text-xs font-bold shadow-sm" />
                        </div>
                        {manageType === 'vacation' ? (
                           <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Fin</label>
                              <input type="date" min={eventData.date} value={eventData.endDate} onChange={e => setEventData({...eventData, endDate: e.target.value})} className="w-full bg-white dark:bg-surface-dark border-none rounded-2xl px-4 py-4 text-xs font-bold shadow-sm" />
                           </div>
                        ) : (
                           <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Duración (Opc.)</label>
                              <input type="text" placeholder="Ej: 2h" value={eventData.duration} onChange={e => setEventData({...eventData, duration: e.target.value})} className="w-full bg-white dark:bg-surface-dark border-none rounded-2xl px-4 py-4 text-xs font-bold shadow-sm" />
                           </div>
                        )}
                     </div>

                     <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas Internas</label>
                        <textarea value={eventData.notes} onChange={e => setEventData({...eventData, notes: e.target.value})} className="w-full bg-white dark:bg-surface-dark border-none rounded-2xl px-5 py-4 text-xs font-medium h-24 shadow-sm resize-none" placeholder="Detalles para RRHH..."></textarea>
                     </div>

                     <button onClick={handleRegisterEvent} className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                        {editingRecordId ? 'Actualizar Evento' : 'Registrar Evento'}
                     </button>
                     {editingRecordId && (
                        <button onClick={handleCancelEdit} className="w-full py-3 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-300 dark:hover:bg-slate-600 transition-all">
                           Cancelar Edición
                        </button>
                     )}
                  </div>
               </div>

               {/* TABLA HISTÓRICO GLOBAL */}
               <div className="flex-1 p-10 flex flex-col">
                  <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-6">Historial Global de la Empresa</h4>
                  <div className="flex-1 overflow-hidden rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-surface-dark">
                     <div className="overflow-y-auto h-[500px] custom-scrollbar">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 dark:bg-bg-dark sticky top-0 z-10">
                              <tr>
                                 <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                 <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Empleado</th>
                                 <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                 <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {globalHistory.length > 0 ? globalHistory.map((item: any, idx) => (
                                 <tr key={idx} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${editingRecordId === item.id ? 'bg-primary/5 border-l-4 border-primary' : ''}`}>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{item.date}</td>
                                    <td className="px-6 py-4 text-xs font-black text-slate-800 dark:text-white uppercase">{item.empName}</td>
                                    <td className="px-6 py-4">
                                       <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${item.category === 'Vacaciones' ? 'bg-orange-400/10 text-orange-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                          {item.type || item.category}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <div className="flex justify-end gap-2">
                                          <button 
                                            onClick={() => handleEditRecord(item)}
                                            className="size-8 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center"
                                            title="Editar"
                                          >
                                             <span className="material-symbols-outlined text-sm">edit</span>
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteRecord(item.doctorId, item.id, item.category)}
                                            className="size-8 rounded-xl bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all flex items-center justify-center"
                                            title="Eliminar"
                                          >
                                             <span className="material-symbols-outlined text-sm">delete</span>
                                          </button>
                                       </div>
                                    </td>
                                 </tr>
                              )) : (
                                 <tr><td colSpan={4} className="p-10 text-center text-slate-400 text-xs italic">Sin registros recientes</td></tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'visual' && (
        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
           {/* ... Contenido Visual ... */}
           {/* (Included visually in full file render but no logic changes) */}
           <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
              {/* Same visual content */}
              <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center"><span className="material-symbols-outlined">palette</span></div>
                  <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Temas y Paleta de Colores</h3>
                </div>
                <button onClick={onToggleTheme} className="px-6 py-2.5 bg-slate-100 dark:bg-bg-dark rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary hover:text-white transition-all shadow-sm">
                  <span className="material-symbols-outlined text-lg">{darkMode ? 'light_mode' : 'dark_mode'}</span> Pasar a modo {darkMode ? 'Claro' : 'Oscuro'}
                </button>
              </div>
              <div className="p-10 space-y-10">
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {COLOR_TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => setSettings({...settings, colorTemplate: t.id})} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-4 group ${settings.colorTemplate === t.id ? 'border-primary bg-primary/5 shadow-xl scale-105' : 'border-transparent bg-slate-50 dark:bg-bg-dark hover:border-slate-200'}`}>
                         <div className="size-12 rounded-full shadow-lg transition-transform group-hover:scale-110" style={{backgroundColor: t.primary}}></div>
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t.name}</span>
                      </button>
                    ))}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-6">
                       <div className="flex justify-between items-center"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tamaño Fuente Títulos</label><span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-black">{settings.visuals.titleFontSize}px</span></div>
                       <input type="range" min="20" max="64" value={settings.visuals.titleFontSize} onChange={e => setSettings({...settings, visuals: {...settings.visuals, titleFontSize: parseInt(e.target.value)}})} className="w-full h-2 bg-slate-200 dark:bg-bg-dark rounded-lg appearance-none cursor-pointer accent-primary" />
                    </div>
                    <div className="space-y-6">
                       <div className="flex justify-between items-center"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tamaño Fuente Cuerpo</label><span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-black">{settings.visuals.bodyFontSize}px</span></div>
                       <input type="range" min="12" max="24" value={settings.visuals.bodyFontSize} onChange={e => setSettings({...settings, visuals: {...settings.visuals, bodyFontSize: parseInt(e.target.value)}})} className="w-full h-2 bg-slate-200 dark:bg-bg-dark rounded-lg appearance-none cursor-pointer accent-primary" />
                    </div>
                 </div>
              </div>
           </section>
           <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
              <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center"><span className="material-symbols-outlined">edit_note</span></div>
                <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Etiquetas y Textos de la Web (White Label)</h3>
              </div>
              <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                 {Object.entries(settings.labels).map(([key, value]) => (
                   <div key={key} className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                      <input type="text" value={value} onChange={e => updateLabel(key, e.target.value)} className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all" />
                   </div>
                 ))}
              </div>
           </section>
        </div>
      )}

      {activeTab === 'assistant' && (
        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
           {/* SECTION 1: VOICE & LANGUAGE */}
           <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
              <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center"><span className="material-symbols-outlined">volume_up</span></div>
                <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Selección de Voz e Idioma</h3>
              </div>
              <div className="p-10 space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Accent Options */}
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acento y Región</label>
                       <div className="grid grid-cols-1 gap-3">
                          {ACCENT_OPTIONS.map(opt => (
                            <button key={opt.id} onClick={() => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, accent: opt.id}})} className={`flex items-center justify-between px-6 py-4 rounded-2xl border-2 transition-all ${settings.aiPhoneSettings.accent === opt.id ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-500'}`}>
                               <span className="text-sm font-bold">{opt.name}</span>{settings.aiPhoneSettings.accent === opt.id && <span className="material-symbols-outlined text-sm">check_circle</span>}
                            </button>
                          ))}
                       </div>
                    </div>
                    {/* Voice Options */}
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voz del Asistente</label>
                       <div className="grid grid-cols-1 gap-3">
                          {VOICE_OPTIONS.map(voice => (
                            <button key={voice.id} onClick={() => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, voiceName: voice.id}})} className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all ${settings.aiPhoneSettings.voiceName === voice.id ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-500'}`}>
                               <div className={`size-10 rounded-xl flex items-center justify-center ${settings.aiPhoneSettings.voiceName === voice.id ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'}`}><span className="material-symbols-outlined">{voice.gender === 'Femenino' ? 'female' : 'male'}</span></div>
                               <div className="text-left flex-1"><p className="text-sm font-bold">{voice.name} <span className="text-[9px] opacity-60 uppercase">({voice.gender})</span></p><p className="text-[10px] italic opacity-60">{voice.desc}</p></div>
                               {settings.aiPhoneSettings.voiceName === voice.id && <span className="material-symbols-outlined text-sm">check_circle</span>}
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>
                 {/* Test Lab */}
                 <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/20 space-y-6">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Laboratorio de Pruebas</h4>
                       <button onClick={handleTestVoice} disabled={isTestingVoice} className="px-6 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                          {isTestingVoice ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">play_circle</span>} Escuchar Prueba
                       </button>
                    </div>
                    <textarea value={settings.aiPhoneSettings.testSpeechText} onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, testSpeechText: e.target.value}})} className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-medium h-24 shadow-inner resize-none" placeholder="Escribe lo que quieres que el asistente diga para probar su voz..." />
                 </div>
              </div>
           </section>

           {/* SECTION 2: PERSONALITY & PROMPT */}
           <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
              <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined">auto_awesome</span></div>
                  <div><h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Cerebro y Personalidad</h3><p className="text-[9px] font-black text-primary uppercase tracking-widest">Genera instrucciones avanzadas con IA</p></div>
                </div>
                <button onClick={handleGeneratePersonality} disabled={isGeneratingPersonality} className="px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-3">
                  {isGeneratingPersonality ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">magic_button</span>} Generar con Píldoras
                </button>
              </div>
              <div className="p-10 space-y-12">
                 <div className="space-y-8">
                    {Object.entries(PERSONALITY_TAGS).map(([category, tags]) => (
                      <div key={category} className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{category}</label>
                         <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                              <button key={tag} onClick={() => toggleTag(tag)} className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase border-2 transition-all ${selectedTags.includes(tag) ? 'bg-primary border-primary text-white' : 'bg-slate-50 dark:bg-bg-dark border-transparent text-slate-400 hover:border-slate-200'}`}>{tag}</button>
                            ))}
                         </div>
                      </div>
                    ))}
                 </div>
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrucciones Maestras (System Prompt)</label>
                    <textarea value={settings.aiPhoneSettings.systemPrompt} onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, systemPrompt: e.target.value}})} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-[2rem] px-8 py-8 text-sm font-medium h-64 shadow-inner leading-relaxed focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
                 </div>
                 <div className="space-y-6 pt-10 border-t">
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Saludo Inicial</label>
                       <div className="flex gap-2">
                          {GREETING_PILLS.map((pill, i) => (
                            <button key={i} onClick={() => useGreetingPill(pill)} className="px-3 py-1.5 bg-slate-100 dark:bg-bg-dark text-[9px] font-black uppercase rounded-lg border border-transparent hover:border-primary transition-all text-slate-500">Plantilla {i+1}</button>
                          ))}
                       </div>
                    </div>
                    <textarea value={settings.aiPhoneSettings.initialGreeting} onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, initialGreeting: e.target.value}})} className="w-full bg-slate-50 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold h-24 shadow-inner resize-none" />
                 </div>
              </div>
           </section>
        </div>
      )}

      <footer className="flex justify-end pt-12">
         <button onClick={handleGlobalSave} className="h-20 px-16 bg-primary text-white rounded-[2.5rem] font-black text-xl uppercase tracking-tighter shadow-2xl hover:scale-105 transition-all flex items-center gap-4">
            <span className="material-symbols-outlined text-3xl">save</span>
            Guardar Configuración Maestra
         </button>
      </footer>
    </div>
  );
};

export default Settings;
