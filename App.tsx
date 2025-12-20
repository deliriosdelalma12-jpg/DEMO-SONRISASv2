
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './screens/Dashboard';
import Agenda from './screens/Agenda';
import Metrics from './screens/Metrics';
import Patients from './screens/Patients';
import Doctors from './screens/Doctors';
import Branches from './screens/Branches';
import HRManagement from './screens/HRManagement';
import Settings from './screens/Settings';
import Layout from './components/Layout';
import VoiceAssistant from './components/VoiceAssistant';
import DoctorDetailModal from './components/DoctorDetailModal';
import PatientDetailModal from './components/PatientDetailModal';
import { Appointment, Patient, Doctor, User, ClinicSettings, ColorTemplate, Task, RoleDefinition, AppointmentStatus, Branch, DaySchedule } from './types';

export const COLOR_TEMPLATES: ColorTemplate[] = [
  { id: 'ocean', name: 'Océano', primary: '#3b82f6', dark: '#1d4ed8', light: '#dbeafe' },
  { id: 'emerald', name: 'Esmeralda', primary: '#10b981', dark: '#047857', light: '#d1fae5' },
  { id: 'amethyst', name: 'Amatista', primary: '#8b5cf6', dark: '#6d28d9', light: '#ede9fe' },
  { id: 'sunset', name: 'Atardecer', primary: '#f59e0b', dark: '#d97706', light: '#fef3c7' },
  { id: 'coal', name: 'Carbón', primary: '#475569', dark: '#1e293b', light: '#f1f5f9' },
];

// --- ROLES INICIALES ---
const INITIAL_ROLES: RoleDefinition[] = [
  {
    id: 'admin_role',
    name: 'Administrador Global',
    isSystem: true,
    permissions: ['view_dashboard', 'view_agenda', 'view_patients', 'view_doctors', 'view_branches', 'view_hr', 'view_metrics', 'view_settings', 'view_all_data', 'can_edit']
  },
  {
    id: 'doctor_role',
    name: 'Facultativo (Médico)',
    isSystem: false,
    permissions: ['view_dashboard', 'view_agenda', 'view_patients', 'can_edit'] 
  },
  {
    id: 'reception_role',
    name: 'Recepción',
    isSystem: false,
    permissions: ['view_dashboard', 'view_agenda', 'view_patients', 'view_branches', 'view_all_data', 'can_edit'] 
  }
];

const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'B1', name: 'Centro', address: 'Av. de la Constitución 120', city: 'Madrid', zip: '28001',
    phone: '910 000 001', email: 'centro@mediclinic.com', status: 'Active',
    coordinates: { lat: '40.416775', lng: '-3.703790' },
    img: 'https://images.unsplash.com/photo-1538108149393-fbbd8189718c?q=80&w=800&auto=format&fit=crop',
    openingHours: '08:00 - 21:00', manager: 'Carlos D.'
  },
  {
    id: 'B2', name: 'Norte', address: 'Paseo de la Castellana 250', city: 'Madrid', zip: '28046',
    phone: '910 000 002', email: 'norte@mediclinic.com', status: 'Active',
    coordinates: { lat: '40.478905', lng: '-3.688172' },
    img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800&auto=format&fit=crop',
    openingHours: '09:00 - 20:00', manager: 'Laura M.'
  },
  {
    id: 'B3', name: 'Sur', address: 'Av. de Andalucía 85', city: 'Getafe', zip: '28903',
    phone: '910 000 003', email: 'sur@mediclinic.com', status: 'Maintenance',
    coordinates: { lat: '40.308256', lng: '-3.732669' },
    img: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=800&auto=format&fit=crop',
    openingHours: '08:00 - 15:00', manager: 'Sergio R.'
  }
];

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Helper to create default M-F schedule
const createDefaultGlobalSchedule = (): Record<string, DaySchedule> => {
  const schedule: Record<string, DaySchedule> = {};
  WEEK_DAYS.forEach(day => {
    const isWeekend = day === 'Sábado' || day === 'Domingo';
    schedule[day] = {
      morning: { start: '09:00', end: '14:00', active: !isWeekend },
      afternoon: { start: '16:00', end: '20:00', active: !isWeekend } // L-V turno partido por defecto
    };
  });
  return schedule;
};

// --- DATOS MOCK INICIALES (Doctors, Patients, etc...) ---
// (Keeping original mock data for brevity, assuming it exists in same structure)
const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'D1', name: 'Dra. Ana Torres', role: 'doctor_role', specialty: 'Ortodoncia', status: 'Active',
    img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=400&auto=format&fit=crop',
    branch: 'Centro', phone: '600 111 222', corporateEmail: 'ana.torres@mediclinic.com', docs: [],
    vacationDaysTotal: 30, vacationDaysTaken: 5,
    vacationHistory: [
      { id: 'hist_1', start: '2023-08-01', end: '2023-08-05', daysUsed: 5, status: 'Aprobada', type: 'Vacaciones' }
    ],
    attendanceHistory: [],
    schedule: {
      'Lunes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
      'Miércoles': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
      'Viernes': { morning: { start: '09:00', end: '15:00', active: true }, afternoon: { start: '00:00', end: '00:00', active: false } }
    }
  },
  {
    id: 'D2', name: 'Dr. Carlos Ruiz', role: 'doctor_role', specialty: 'Implantología', status: 'Active',
    img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=400&auto=format&fit=crop',
    branch: 'Norte', phone: '600 333 444', corporateEmail: 'carlos.ruiz@mediclinic.com', docs: [],
    vacationDaysTotal: 30, vacationDaysTaken: 12,
    vacationHistory: [
      { id: 'hist_2', start: '2023-07-10', end: '2023-07-21', daysUsed: 12, status: 'Aprobada', type: 'Vacaciones' }
    ],
    attendanceHistory: []
  },
  {
    id: 'D3', name: 'Dra. Sofia Mendez', role: 'doctor_role', specialty: 'Odontopediatría', status: 'Vacation',
    img: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=400&auto=format&fit=crop',
    branch: 'Sur', phone: '600 555 666', corporateEmail: 'sofia.mendez@mediclinic.com', docs: [],
    vacationDaysTotal: 22, vacationDaysTaken: 22,
    vacationHistory: [
      { id: 'hist_3', start: '2023-09-01', end: '2023-09-22', daysUsed: 22, status: 'Aprobada', type: 'Vacaciones' }
    ],
    attendanceHistory: []
  },
  {
    id: 'D4', name: 'Dr. Javier Costa', role: 'doctor_role', specialty: 'Cirugía Maxilofacial', status: 'Active',
    img: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=400&auto=format&fit=crop',
    branch: 'Centro', phone: '600 777 888', corporateEmail: 'javier.costa@mediclinic.com', docs: [],
    vacationDaysTotal: 30, vacationDaysTaken: 0,
    vacationHistory: [],
    attendanceHistory: []
  }
];

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'P1001', name: 'Laura Martínez', birthDate: '1990-05-15', gender: 'Femenino',
    identityDocument: '12345678A', phone: '699 000 111', email: 'laura.m@gmail.com', address: 'Calle Mayor 1',
    img: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Laura&backgroundColor=e2e8f0',
    medicalHistory: 'Alergia a la penicilina. Ortodoncia previa en 2010.',
    weight: '62', height: '165', bloodType: 'A+', allergies: ['Penicilina'],
    associatedDoctorId: 'D1', associatedDoctorName: 'Dra. Ana Torres',
    attachments: [
      { id: 'f1', name: 'Radiografía Panorámica', type: 'image/jpeg', size: '2.4 MB', date: '2023-09-10', url: 'https://prod-images-static.radiopaedia.org/images/52694668/0b26f5546059530595360936555309_jumbo.jpeg' }
    ]
  },
  {
    id: 'P1002', name: 'Pedro Gomez', birthDate: '1985-11-20', gender: 'Masculino',
    identityDocument: '87654321B', phone: '699 222 333', email: 'pedro.g@hotmail.com', address: 'Av. Libertad 45',
    img: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Pedro&backgroundColor=e2e8f0',
    medicalHistory: 'Hipertensión controlada. Implante en pieza 24.',
    weight: '85', height: '180', bloodType: 'O+', allergies: [],
    associatedDoctorId: 'D2', associatedDoctorName: 'Dr. Carlos Ruiz'
  },
  {
    id: 'P1003', name: 'María Rodríguez', birthDate: '2015-03-10', gender: 'Femenino',
    identityDocument: 'Sin DNI', phone: '699 444 555 (Madre)', email: 'madre.maria@gmail.com', address: 'Plaza España 2',
    img: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Maria&backgroundColor=e2e8f0',
    medicalHistory: 'Ninguna patología previa. Revisión rutinaria.',
    weight: '32', height: '135', bloodType: 'B+', allergies: ['Nueces'],
    associatedDoctorId: 'D3', associatedDoctorName: 'Dra. Sofia Mendez'
  },
  {
    id: 'P1004', name: 'Roberto Fernandez', birthDate: '1978-02-14', gender: 'Masculino',
    identityDocument: '33445566C', phone: '699 777 888', email: 'roberto.f@gmail.com', address: 'Calle Pez 22',
    img: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Roberto&backgroundColor=e2e8f0',
    medicalHistory: 'Diabetes tipo 2. Control periódico.',
    weight: '90', height: '178', bloodType: 'AB+', allergies: [],
    associatedDoctorId: 'D1', associatedDoctorName: 'Dra. Ana Torres'
  },
  {
    id: 'P1005', name: 'Elena White', birthDate: '1995-07-22', gender: 'Femenino',
    identityDocument: 'X1234567Z', phone: '699 999 000', email: 'elena.w@yahoo.com', address: 'Gran Vía 10',
    img: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Elena&backgroundColor=e2e8f0',
    medicalHistory: 'Limpieza anual. Sin antecedentes relevantes.',
    weight: '58', height: '170', bloodType: 'O-', allergies: [],
    associatedDoctorId: 'D2', associatedDoctorName: 'Dr. Carlos Ruiz'
  }
];

// --- GENERADOR DE CITAS DEMO DINÁMICO ---
// Esta función se ejecuta al cargar la App y genera 30 citas para el MES ACTUAL
// Asegurando que la data base siempre esté "viva" y actualizada.
const generateDemoAppointments = (): Appointment[] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // Días reales del mes actual

  const treatments = [
    'Limpieza Dental', 'Consulta General', 'Ortodoncia', 'Implante Titanio', 
    'Revisión Periódica', 'Blanqueamiento', 'Urgencia', 'Cirugía Maxilofacial'
  ];
  const statuses: AppointmentStatus[] = ['Confirmed', 'Confirmed', 'Confirmed', 'Completed', 'Completed', 'Pending', 'Cancelled', 'Rescheduled'];
  const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'];

  const demoAppointments: Appointment[] = [];

  // 1. GENERATE SPECIFIC APPOINTMENTS FOR TODAY AND TOMORROW (Visual Assurance)
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  const createForDay = (dateStr: string, count: number) => {
      for (let i = 0; i < count; i++) {
        const doctor = INITIAL_DOCTORS[i % INITIAL_DOCTORS.length];
        const patient = INITIAL_PATIENTS[i % INITIAL_PATIENTS.length];
        demoAppointments.push({
            id: `FIXED_${dateStr}_${i}`,
            patientId: patient.id,
            patientName: patient.name,
            doctorId: doctor.id,
            doctorName: doctor.name,
            date: dateStr,
            time: times[i % times.length], // Distribute times
            treatment: treatments[i % treatments.length],
            status: 'Confirmed'
        });
      }
  };

  createForDay(todayStr, 4); // 4 Appointments today
  createForDay(tomorrowStr, 3); // 3 Appointments tomorrow

  // 2. GENERATE RANDOM APPOINTMENTS FOR THE REST OF THE MONTH
  for (let i = 0; i < 25; i++) {
    const doctor = INITIAL_DOCTORS[Math.floor(Math.random() * INITIAL_DOCTORS.length)];
    const patient = INITIAL_PATIENTS[Math.floor(Math.random() * INITIAL_PATIENTS.length)];
    const treatment = treatments[Math.floor(Math.random() * treatments.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const day = Math.floor(Math.random() * daysInMonth) + 1;
    const time = times[Math.floor(Math.random() * times.length)];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    let finalStatus = status;
    const aptDateObj = new Date(year, month, day);
    const todayObj = new Date();
    todayObj.setHours(0,0,0,0);

    if (aptDateObj > todayObj && status === 'Completed') {
        finalStatus = 'Confirmed';
    }

    demoAppointments.push({
      id: `DEMO_APT_${i}`,
      patientId: patient.id,
      patientName: patient.name,
      doctorId: doctor.id,
      doctorName: doctor.name,
      date: dateStr,
      time: time,
      treatment: treatment,
      status: finalStatus
    });
  }

  return demoAppointments.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
};

const INITIAL_DEMO_APPOINTMENTS = generateDemoAppointments();

const INITIAL_TASKS: Task[] = [
  { 
    id: 'T1', 
    title: 'Confirmar citas de mañana', 
    description: 'Llamar a pacientes de primera hora.', 
    content: 'Revisar la lista de pacientes agendados para mañana entre las 09:00 y las 11:00. Verificar que todos hayan recibido el SMS de recordatorio. En caso contrario, realizar llamada manual para confirmar asistencia y evitar huecos en la agenda.',
    completed: false, 
    priority: 'High', 
    sub: 'Recepción',
    assignedToId: 'U1' // Admin/Reception
  },
  { 
    id: 'T2', 
    title: 'Pedir material de implantes', 
    description: 'Faltan tornillos de titanio 3mm.', 
    content: 'Realizar inventario del cajón B2. Se ha detectado escasez de tornillos de titanio de 3mm y 5mm. Contactar con el proveedor "DentalTech" y realizar pedido urgente para recibir antes del viernes.',
    completed: true, 
    priority: 'Medium', 
    sub: 'Almacén',
    assignedToId: 'U1'
  },
  { 
    id: 'T3', 
    title: 'Revisar informe de Laura M.', 
    description: 'Evaluar evolución brackets.', 
    content: 'La paciente Laura Martínez (ID: P1001) reportó molestias en la zona molar derecha tras el último ajuste. Revisar radiografías recientes y planificar ajuste de tensión en la próxima visita.',
    completed: false, 
    priority: 'Low', 
    sub: 'Dra. Torres',
    assignedToId: 'D1' // Linked to Dra. Ana Torres
  },
  { 
    id: 'T4', 
    title: 'Firmar alta de Roberto F.', 
    description: 'Tratamiento completado.', 
    content: 'El paciente ha finalizado su ciclo de ortodoncia. Preparar certificado de garantía de retención y firmar el alta clínica en el sistema.',
    completed: false, 
    priority: 'Medium', 
    sub: 'Dr. Ruiz',
    assignedToId: 'D2' // Linked to Dr. Carlos Ruiz
  }
];

const App: React.FC = () => {
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  
  // --- STATE MANAGEMENT ---
  // Utilizamos los datos generados dinámicamente como estado inicial.
  // Al refrescar la página, este componente se desmonta y monta de nuevo,
  // regenerando los datos base y eliminando lo creado por el usuario.
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_DEMO_APPOINTMENTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);

  // --- GLOBAL MODAL STATE ---
  const [viewingDoctor, setViewingDoctor] = useState<Doctor | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);

  const [settings, setSettings] = useState<ClinicSettings>({
    name: "MediClinic Premium",
    sector: "Clínica Dental",
    logo: "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/hospital.svg",
    phone: "+34 910 000 001",
    email: "central@mediclinic-premium.com",
    address: "Madrid, España",
    currency: "€",
    language: "es-ES",
    roles: INITIAL_ROLES, 
    services: [
      { id: 'S1', name: 'Limpieza Dental', price: 65, duration: 45 },
      { id: 'S2', name: 'Consulta General', price: 50, duration: 30 },
      { id: 'S3', name: 'Ortodoncia', price: 1200, duration: 60 },
      { id: 'S4', name: 'Implante Titanio', price: 950, duration: 90 }
    ],
    aiPhoneSettings: {
      phoneNumber: "+34 900 123 456",
      assistantName: "Sara",
      initialGreeting: "Hola, soy Sara de MediClinic. ¿En qué puedo ayudarte?",
      systemPrompt: "Eres la recepcionista experta de la clínica.",
      instructions: "Debes ser amable y siempre verificar la disponibilidad antes de confirmar.",
      testSpeechText: "Esta es una prueba de mi voz con la configuración actual.",
      voiceName: "Zephyr",
      voicePitch: 1.0,
      voiceSpeed: 1.0,
      temperature: 0.7,
      accent: 'es-ES-Madrid',
      model: 'gemini-2.5-flash-native-audio-preview-09-2025'
    },
    defaultTheme: 'light',
    colorTemplate: 'ocean',
    visuals: { titleFontSize: 32, bodyFontSize: 16 },
    appointmentPolicy: {
      confirmationWindow: 24, // 24 hours before
      leadTimeThreshold: 3,   // 3 days
      autoConfirmShortNotice: true
    },
    labels: {
      dashboardTitle: "Panel Operativo",
      dashboardSubtitle: "Resumen de actividad diaria",
      agendaTitle: "Agenda Médica",
      agendaSubtitle: "Gestión de turnos y pacientes",
      patientsTitle: "Pacientes",
      patientsSubtitle: "Historial clínico centralizado"
    },
    laborSettings: {
      vacationDaysPerYear: 30,
      allowCarryOver: false,
      businessDaysOnly: false,
      defaultContractType: "Indefinido",
      incidentTypes: [
        { id: 'inc_1', name: 'Baja Médica (Enfermedad Común)', requiresJustification: true, isPaid: true, color: 'bg-blue-500' },
        { id: 'inc_2', name: 'Retraso Injustificado', requiresJustification: false, isPaid: false, color: 'bg-warning' },
        { id: 'inc_3', name: 'Ausencia Personal', requiresJustification: true, isPaid: false, color: 'bg-purple-500' },
        { id: 'inc_4', name: 'Accidente Laboral', requiresJustification: true, isPaid: true, color: 'bg-danger' }
      ]
    },
    globalSchedule: createDefaultGlobalSchedule()
  });

  const [darkMode, setDarkMode] = useState(settings.defaultTheme === 'dark');

  // --- SYSTEM USERS STATE ---
  const adminUser: User = { id: 'U1', username: 'admin', name: 'Dr. Administrador', role: 'admin_role', img: 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?q=80&w=200&auto=format&fit=crop' };
  
  const [systemUsers, setSystemUsers] = useState<User[]>([
    adminUser,
    ...INITIAL_DOCTORS.map(d => ({
        id: d.id,
        username: d.corporateEmail.split('@')[0],
        name: d.name,
        role: d.role,
        img: d.img
    }))
  ]);

  // Sync System Users and Doctors
  useEffect(() => {
    setSystemUsers(prev => {
      const currentUsersMap = new Map<string, User>(prev.map(u => [u.id, u]));
      const admin = currentUsersMap.get('U1') || adminUser;
      const newUsersList: User[] = [admin];

      doctors.forEach(doc => {
        const existing = currentUsersMap.get(doc.id);
        if (existing) {
          const userToUpdate: User = existing;
          newUsersList.push({ ...userToUpdate, role: doc.role, name: doc.name, img: doc.img });
        } else {
          newUsersList.push({
            id: doc.id,
            username: doc.corporateEmail.split('@')[0] || doc.name.replace(/\s+/g, '').toLowerCase(),
            name: doc.name,
            role: doc.role || 'doctor_role',
            img: doc.img
          });
        }
      });
      return newUsersList;
    });
  }, [doctors]);

  const [currentUserId, setCurrentUserId] = useState('U1'); 
  const currentUser = systemUsers.find(u => u.id === currentUserId) || adminUser;

  useEffect(() => {
    const template = COLOR_TEMPLATES.find(t => t.id === settings.colorTemplate) || COLOR_TEMPLATES[0];
    const root = document.documentElement;
    root.style.setProperty('--color-primary', template.primary);
    root.style.setProperty('--color-primary-dark', template.dark);
    root.style.setProperty('--color-primary-light', template.light);
    root.style.setProperty('--font-size-title', `${settings.visuals.titleFontSize}px`);
    root.style.setProperty('--font-size-body', `${settings.visuals.bodyFontSize}px`);
  }, [settings.colorTemplate, settings.visuals]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // --- HANDLERS FOR GLOBAL MODALS ---
  const handleOpenDoctor = (doctorId: string) => {
    const doc = doctors.find(d => d.id === doctorId);
    if (doc) setViewingDoctor(doc);
  };

  const handleOpenPatient = (patientId: string) => {
    const pat = patients.find(p => p.id === patientId);
    if (pat) setViewingPatient(pat);
  };

  const handleSaveGlobalDoctor = (updatedDoc: Doctor) => {
    setDoctors(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    setViewingDoctor(updatedDoc); // Keep modal open with fresh data or close? User said "close window -> maintain window I was viewing". This updates the data.
  };

  const handleSaveGlobalPatient = (updatedPat: Patient) => {
    setPatients(prev => prev.map(p => p.id === updatedPat.id ? updatedPat : p));
    setViewingPatient(updatedPat);
  };

  return (
    <HashRouter>
      <Layout 
        darkMode={darkMode} 
        onToggleTheme={() => setDarkMode(!darkMode)} 
        currentUser={currentUser} 
        settings={settings}
        onOpenVoiceAssistant={() => setIsVoiceOpen(true)}
        onOpenCurrentProfile={() => handleOpenDoctor(currentUser.id)}
      >
        <Routes>
          <Route path="/" element={<Dashboard settings={settings} appointments={appointments} setAppointments={setAppointments} tasks={tasks} setTasks={setTasks} patients={patients} doctors={doctors} currentUser={currentUser} />} />
          <Route path="/agenda" element={<Agenda appointments={appointments} setAppointments={setAppointments} patients={patients} doctors={doctors} globalSchedule={settings.globalSchedule} settings={settings} />} />
          <Route path="/patients" element={<Patients patients={patients} setPatients={setPatients} appointments={appointments} clinicSettings={settings} currentUser={currentUser} team={doctors} />} />
          <Route path="/doctors" element={<Doctors doctors={doctors} setDoctors={setDoctors} appointments={appointments} branches={branches} />} />
          <Route path="/branches" element={<Branches branches={branches} setBranches={setBranches} doctors={doctors} setDoctors={setDoctors} appointments={appointments} />} />
          <Route path="/hr" element={<HRManagement doctors={doctors} setDoctors={setDoctors} />} />
          <Route path="/metrics" element={<Metrics appointments={appointments} doctors={doctors} patients={patients} settings={settings} branches={branches} />} />
          <Route 
            path="/settings" 
            element={
              <Settings 
                settings={settings} 
                setSettings={setSettings} 
                onToggleTheme={() => setDarkMode(!darkMode)} 
                darkMode={darkMode} 
                systemUsers={systemUsers} 
                setSystemUsers={setSystemUsers} 
                doctors={doctors} 
                setDoctors={setDoctors} 
                onOpenDoctor={handleOpenDoctor} // Pass handler
              />
            } 
          />
        </Routes>
      </Layout>

      {/* GLOBAL MODALS OVERLAY */}
      {viewingDoctor && (
        <DoctorDetailModal 
          doctor={viewingDoctor} 
          appointments={appointments}
          onClose={() => setViewingDoctor(null)}
          onSave={handleSaveGlobalDoctor}
        />
      )}

      {viewingPatient && (
        <PatientDetailModal
          patient={viewingPatient}
          clinicSettings={settings}
          team={doctors}
          onClose={() => setViewingPatient(null)}
          onSave={handleSaveGlobalPatient}
          onOpenDoctor={handleOpenDoctor}
        />
      )}

      {isVoiceOpen && <VoiceAssistant onClose={() => setIsVoiceOpen(false)} settings={settings} appointments={appointments} setAppointments={setAppointments} doctors={doctors} branches={branches} patients={patients} />}
    </HashRouter>
  );
};

export default App;
