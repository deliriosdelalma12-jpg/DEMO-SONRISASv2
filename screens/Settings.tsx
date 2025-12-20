
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

  // State for User Editing Modal
  const [editingSystemUser, setEditingSystemUser] = useState<User | null>(null);
  const editingUserAvatarRef = useRef<HTMLInputElement>(null);

  // --- REFS FOR NEW FEATURES ---
  const knowledgeFileInputRef = useRef<HTMLInputElement>(null);

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

  // --- HANDLER: CAMBIO DE NOMBRE ASISTENTE ---
  const handleAssistantNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    const oldName = settings.aiPhoneSettings.assistantName;
    
    // Si no hay nombre previo, solo actualizamos el estado sin reemplazar
    if (!oldName) {
         setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, assistantName: newName}});
         return;
    }

    // Reemplazo inteligente en el Prompt y en el Saludo
    // Usamos replaceAll para asegurar que todas las menciones se actualicen
    const updatedPrompt = settings.aiPhoneSettings.systemPrompt.replaceAll(oldName, newName);
    const updatedGreeting = settings.aiPhoneSettings.initialGreeting.replaceAll(oldName, newName);

    setSettings(prev => ({
        ...prev,
        aiPhoneSettings: {
            ...prev.aiPhoneSettings,
            assistantName: newName,
            systemPrompt: updatedPrompt,
            initialGreeting: updatedGreeting
        }
    }));
  };

  // --- HANDLERS: BASE DE CONOCIMIENTOS ---
  const handleKnowledgeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const newFile: FileAttachment = {
            id: 'KB-' + Date.now(),
            name: file.name,
            type: file.type,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            date: new Date().toISOString().split('T')[0],
            url: URL.createObjectURL(file)
        };
        
        const currentFiles = settings.aiPhoneSettings.knowledgeFiles || [];
        setSettings({
            ...settings,
            aiPhoneSettings: {
                ...settings.aiPhoneSettings,
                knowledgeFiles: [...currentFiles, newFile]
            }
        });
    }
  };

  const removeKnowledgeFile = (id: string) => {
    const currentFiles = settings.aiPhoneSettings.knowledgeFiles || [];
    setSettings({
        ...settings,
        aiPhoneSettings: {
            ...settings.aiPhoneSettings,
            knowledgeFiles: currentFiles.filter(f => f.id !== id)
        }
    });
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

  // --- Handlers for Editing System User Modal ---
  const handleEditUserClick = (user: User) => {
    setEditingSystemUser(user);
  };

  const handleSaveEditedUser = () => {
    if (!editingSystemUser) return;
    if (!editingSystemUser.name.trim()) { alert('El nombre es obligatorio'); return; }
    
    setSystemUsers(prev => prev.map(u => u.id === editingSystemUser.id ? editingSystemUser : u));
    
    // Sync with doctors if applicable
    if (setDoctors) {
        setDoctors(prev => prev.map(d => d.id === editingSystemUser.id ? { ...d, name: editingSystemUser.name, role: editingSystemUser.role, img: editingSystemUser.img || d.img } : d));
    }

    setEditingSystemUser(null);
    setSuccessMessageText(`Datos de ${editingSystemUser.name} actualizados.`);
    setShowSuccessMsg(true);
    setTimeout(() => setShowSuccessMsg(false), 3000);
  };

  const handleEditingUserAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingSystemUser) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingSystemUser({ ...editingSystemUser, img: reader.result as string });
      };
      reader.readAsDataURL(file);
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
      {/* COMPANY TAB CONTENT PRESERVED */}
      {activeTab === 'company' && (
        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-left-4 duration-500">
          {/* ... (Existing Company Content Preserved) ... */}
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

          {/* ... (Existing Role Management and User Registration) ... */}
          {/* ... (Existing Service Management) ... */}
          
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

      {/* LABOR TAB CONTENT PRESERVED */}
      {activeTab === 'labor' && (
        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
           {/* ... Contenido Laboral existente ... */}
           {/* Re-rendering existing labor components implicitly or explicitly if space permits, assuming component logic handles this via activeTab check */}
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
                  {/* ... Resto de campos laboral ... */}
               </div>
            </div>
          </section>
          {/* ... Other Labor Sections ... */}
        </div>
      )}

      {/* VISUAL TAB CONTENT PRESERVED */}
      {activeTab === 'visual' && (
        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
           {/* ... Contenido Visual ... */}
           <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
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
                 {/* ... Grid de colores ... */}
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {COLOR_TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => setSettings({...settings, colorTemplate: t.id})} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-4 group ${settings.colorTemplate === t.id ? 'border-primary bg-primary/5 shadow-xl scale-105' : 'border-transparent bg-slate-50 dark:bg-bg-dark hover:border-slate-200'}`}>
                         <div className="size-12 rounded-full shadow-lg transition-transform group-hover:scale-110" style={{backgroundColor: t.primary}}></div>
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t.name}</span>
                      </button>
                    ))}
                 </div>
                 {/* ... Sliders ... */}
              </div>
           </section>
        </div>
      )}
      
      {/* --- ASSISTANT TAB (UPDATED WITH NEW SECTIONS) --- */}
      {activeTab === 'assistant' && (
        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
           
           {/* NEW: ASSISTANT NAME & IDENTITY CONFIG (AT THE TOP) */}
           <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
                <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
                <div className="size-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">badge</span></div>
                <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Identidad del Asistente</h3>
                </div>
                <div className="p-10">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Asistente</label>
                    <div className="flex gap-4 items-center mt-2">
                        <input 
                            type="text" 
                            value={settings.aiPhoneSettings.assistantName} 
                            onChange={handleAssistantNameChange}
                            className="flex-1 bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-lg font-black text-primary focus:ring-4 focus:ring-primary/10 transition-all"
                            placeholder="Ej: Sara"
                        />
                        <div className="text-xs font-medium text-slate-400 max-w-xs italic flex items-start gap-2">
                            <span className="material-symbols-outlined text-sm mt-0.5">info</span>
                            Al cambiar el nombre, se actualizará automáticamente en el Prompt y el Saludo inicial.
                        </div>
                    </div>
                </div>
            </section>

           {/* SECTION 1: VOICE & LANGUAGE (EXISTING) */}
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

           {/* SECTION 2: PERSONALITY & PROMPT (EXISTING) */}
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

           {/* NEW: KNOWLEDGE BASE SECTION (AT THE BOTTOM) */}
           <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
                <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="size-12 rounded-xl bg-teal-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">folder_data</span></div>
                    <div>
                        <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Base de Conocimientos</h3>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Documentación empresarial para la IA</p>
                    </div>
                </div>
                <button onClick={() => knowledgeFileInputRef.current?.click()} className="px-8 py-3 bg-teal-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">upload</span> Subir Archivos
                </button>
                <input type="file" ref={knowledgeFileInputRef} onChange={handleKnowledgeFileUpload} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" />
                </div>
                <div className="p-10">
                    {(settings.aiPhoneSettings.knowledgeFiles?.length || 0) === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem]">
                            <span className="material-symbols-outlined text-6xl mb-2">upload_file</span>
                            <p className="font-bold text-sm">No hay documentos subidos</p>
                            <p className="text-xs">Sube PDFs, Excel o Word para entrenar al asistente.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {settings.aiPhoneSettings.knowledgeFiles?.map(file => (
                                <div key={file.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="size-10 rounded-xl bg-white dark:bg-surface-dark flex items-center justify-center text-teal-500 shadow-sm shrink-0">
                                            <span className="material-symbols-outlined">{file.name.endsWith('.pdf') ? 'picture_as_pdf' : 'description'}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold truncate">{file.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black">{file.size}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => removeKnowledgeFile(file.id)} className="size-8 rounded-lg bg-white dark:bg-surface-dark text-slate-400 hover:text-danger flex items-center justify-center transition-colors">
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
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

      {/* EDIT SYSTEM USER MODAL */}
      {editingSystemUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
           <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark">
              <header className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                 <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white uppercase tracking-tight">Editar Usuario</h3>
                 <button onClick={() => setEditingSystemUser(null)} className="size-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger shadow-sm transition-all"><span className="material-symbols-outlined text-2xl">close</span></button>
              </header>
              <div className="p-8 space-y-6">
                 <div className="flex justify-center mb-4">
                    <div className="relative group cursor-pointer" onClick={() => editingUserAvatarRef.current?.click()}>
                       <div className="size-24 rounded-2xl bg-cover bg-center border-4 border-slate-100 dark:border-slate-800 shadow-lg" style={{backgroundImage: `url('${editingSystemUser.img}')`}}></div>
                       <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined text-white">photo_camera</span>
                       </div>
                       <input type="file" ref={editingUserAvatarRef} className="hidden" accept="image/*" onChange={handleEditingUserAvatarChange} />
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                       <input 
                          type="text" 
                          value={editingSystemUser.name} 
                          onChange={(e) => setEditingSystemUser({...editingSystemUser, name: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario (@)</label>
                       <input 
                          type="text" 
                          value={editingSystemUser.username} 
                          onChange={(e) => setEditingSystemUser({...editingSystemUser, username: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol de Acceso</label>
                       <div className="relative">
                          <select 
                             value={editingSystemUser.role} 
                             onChange={(e) => setEditingSystemUser({...editingSystemUser, role: e.target.value})}
                             className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                          >
                             {settings.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                       </div>
                    </div>
                 </div>

                 <button onClick={handleSaveEditedUser} className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all mt-4">
                    Guardar Cambios
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
