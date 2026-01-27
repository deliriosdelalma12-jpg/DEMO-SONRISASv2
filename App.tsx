
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './screens/Dashboard';
import Agenda from './screens/Agenda';
import Metrics from './screens/Metrics';
import Patients from './screens/Patients';
import Doctors from './screens/Doctors';
import Branches from './screens/Branches';
import Settings from './screens/Settings';
import Layout from './components/Layout';
import VoiceAssistant from './components/VoiceAssistant';
import DoctorDetailModal from './components/DoctorDetailModal';
import { Appointment, Patient, Doctor, User, ClinicSettings, ColorTemplate, Task, RoleDefinition, AppointmentStatus, Branch, DaySchedule } from './types';

export const COLOR_TEMPLATES: ColorTemplate[] = [
  { id: 'ocean', name: 'Océano', primary: '#3b82f6', dark: '#1d4ed8', light: '#dbeafe' },
  { id: 'emerald', name: 'Esmeralda', primary: '#10b981', dark: '#047857', light: '#d1fae5' },
  { id: 'amethyst', name: 'Amatista', primary: '#8b5cf6', dark: '#6d28d9', light: '#ede9fe' },
  { id: 'sunset', name: 'Atardecer', primary: '#f59e0b', dark: '#d97706', light: '#fef3c7' },
  { id: 'coal', name: 'Carbón', primary: '#475569', dark: '#1e293b', light: '#f1f5f9' },
];

const INITIAL_ROLES: RoleDefinition[] = [
  { id: 'admin_role', name: 'Administrador Global', isSystem: true, permissions: ['view_dashboard', 'view_agenda', 'view_patients', 'view_doctors', 'view_branches', 'view_hr', 'view_metrics', 'view_settings', 'view_all_data', 'can_edit'] },
  { id: 'doctor_role', name: 'Facultativo (Médico)', isSystem: false, permissions: ['view_dashboard', 'view_agenda', 'view_patients', 'can_edit'] },
  { id: 'reception_role', name: 'Recepción', isSystem: false, permissions: ['view_dashboard', 'view_agenda', 'view_patients', 'view_branches', 'view_all_data', 'can_edit'] }
];

const INITIAL_BRANCHES: Branch[] = [
  { id: 'B1', name: 'Centro Madrid', address: 'Av. de la Constitución 120', city: 'Madrid', zip: '28001', phone: '910 000 001', email: 'centro@mediclinic.com', status: 'Active', coordinates: { lat: '40.4167', lng: '-3.7037' }, img: 'https://images.unsplash.com/photo-1538108149393-fbbd8189718c?q=80&w=800', openingHours: '08:00 - 21:00', manager: 'Carlos D.' },
  { id: 'B2', name: 'Barcelona Diagonal', address: 'Av. Diagonal 450', city: 'Barcelona', zip: '08006', phone: '930 000 002', email: 'diagonal@mediclinic.com', status: 'Active', coordinates: { lat: '41.3902', lng: '2.1540' }, img: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800', openingHours: '09:00 - 20:00', manager: 'Laura M.' },
  { id: 'B3', name: 'Valencia Malvarrosa', address: 'Carrer d Isabel de Villena 15', city: 'Valencia', zip: '46011', phone: '960 000 003', email: 'valencia@mediclinic.com', status: 'Active', coordinates: { lat: '39.4699', lng: '-0.3763' }, img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800', openingHours: '09:00 - 19:00', manager: 'Santi V.' }
];

const INITIAL_DOCTORS: Doctor[] = [
  { id: 'D1', name: 'Dra. Ana Torres', role: 'doctor_role', specialty: 'Ortodoncia', status: 'Active', img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=400', branch: 'Centro Madrid', phone: '600 111 222', corporateEmail: 'ana.torres@mediclinic.com', docs: [], vacationDaysTotal: 30, vacationDaysTaken: 5, vacationHistory: [], attendanceHistory: [] },
  { id: 'D2', name: 'Dr. Roberto Sanz', role: 'doctor_role', specialty: 'Implantología', status: 'Active', img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=400', branch: 'Barcelona Diagonal', phone: '600 333 444', corporateEmail: 'roberto.sanz@mediclinic.com', docs: [], vacationDaysTotal: 30, vacationDaysTaken: 2, vacationHistory: [], attendanceHistory: [] },
  { id: 'D3', name: 'Dra. Carla Méndez', role: 'doctor_role', specialty: 'Odontopediatría', status: 'Active', img: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=400', branch: 'Valencia Malvarrosa', phone: '600 555 666', corporateEmail: 'carla.mendez@mediclinic.com', docs: [], vacationDaysTotal: 30, vacationDaysTaken: 0, vacationHistory: [], attendanceHistory: [] }
];

const TREATMENTS = ['Limpieza Dental', 'Ortodoncia', 'Consulta General', 'Cirugía Maxilofacial', 'Revisión Periódica', 'Implante Titanio', 'Endodoncia Molar'];

const generatePatients = (): Patient[] => {
  const names = ["Mateo", "Lucía", "Alejandro", "Sofía", "Martín", "Elena", "Hugo", "Valentina", "Lucas", "Julia", "Daniel", "Martina", "Leo", "Emma", "Enzo", "Carla", "Diego", "Nora", "Marcos", "Chloe", "Juan", "Maria", "Pedro", "Carlos", "David", "Laura", "Pablo", "Marta", "Jorge", "Ana", "Luis", "Carmen", "Raul", "Isabel", "Alberto", "Beatriz", "Fernando", "Clara", "Oscar", "Silvia", "Ruben", "Ines", "Victor", "Paula", "Adrian", "Raquel", "Gemma", "Felipe", "Berta", "Teresa", "Ricardo", "Sara", "Mateo", "Ivan", "Valeria", "Bruno", "Daniela", "Alvaro", "Abril", "Manuel"];
  const surnames = ["Garcia", "Rodriguez", "Gonzalez", "Fernandez", "Lopez", "Martinez", "Sanchez", "Perez", "Gomez", "Martin"];
  
  const emotionalMock = [
    "Paciente muy miedoso con las agujas, tratar con extrema delicadeza.",
    "Le encanta hablar de sus nietos, es muy amable.",
    "Tuvo una queja por el tiempo de espera el mes pasado, ser muy puntual.",
    "Prefiere que le expliquen todo el proceso antes de empezar.",
    "Paciente VIP, CEO de una empresa local, trato muy formal."
  ];

  const clinicalMock = [
    "En proceso de ortodoncia invisible, fase 4.",
    "Revisiones semestrales por encías sensibles.",
    "Seguimiento post-operatorio de implante molar derecho.",
    "Tratamiento de blanqueamiento finalizado, pendiente de protector nocturno.",
    "Alergia leve a la penicilina registrada."
  ];

  return names.map((name, i) => ({
    id: `P-${1000 + i}`,
    name: `${name} ${surnames[i % 10]}`,
    birthDate: `${1970 + (i % 50)}-05-15`,
    gender: i % 2 === 0 ? 'Masculino' : 'Femenino',
    identityDocument: `${50000000 + i}X`,
    phone: `600${100000 + i}`,
    email: `${name.toLowerCase()}@demo.com`,
    address: `Calle Real ${i + 1}`,
    img: `https://i.pravatar.cc/150?u=${name}${i}`,
    weight: '75', height: '175',
    bloodType: 'O+',
    allergies: [], pathologies: [], surgeries: [], medications: [], habits: [], familyHistory: [],
    medicalHistory: "Historial base.",
    emotionalNotes: emotionalMock[i % emotionalMock.length],
    clinicalSummary: clinicalMock[i % clinicalMock.length],
    history: []
  }));
};

const generateSyncAppointments = (allPatients: Patient[], doctors: Doctor[]): Appointment[] => {
  const appointments: Appointment[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31);

  for (let d = new Date(startOfYear); d <= endOfYear; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay(); 
    
    if (dayOfWeek === 0) continue;

    doctors.forEach(doc => {
      let dailyLoadProb = 0.5;
      if (dayOfWeek === 6) dailyLoadProb = 0.2;
      if (dayOfWeek === 2 || dayOfWeek === 3) dailyLoadProb = 0.8;
      
      const doctorVariability = 0.7 + (Math.random() * 0.6);
      const finalProb = dailyLoadProb * doctorVariability;

      const slots = ['09:00', '10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
      
      slots.forEach((time, idx) => {
        if (Math.random() < finalProb) {
          const patient = allPatients[Math.floor(Math.random() * allPatients.length)];
          
          let status: AppointmentStatus = 'Confirmed';
          if (d < now && d.toDateString() !== now.toDateString()) {
              status = 'Completed';
          } else if (d.toDateString() === now.toDateString()) {
              status = Math.random() > 0.8 ? 'Pending' : 'Confirmed';
          } else {
              status = Math.random() > 0.7 ? 'Pending' : 'Confirmed';
          }

          appointments.push({
            id: `APT-${doc.id}-${dateStr}-${idx}`,
            patientId: patient.id,
            patientName: patient.name,
            doctorId: doc.id,
            doctorName: doc.name,
            branch: doc.branch,
            treatment: TREATMENTS[Math.floor(Math.random() * TREATMENTS.length)],
            date: dateStr,
            time: time,
            status: status
          });
        }
      });
    });
  }

  return appointments;
};

const INITIAL_TASKS: Task[] = [
  { id: 'T1', title: 'Revisar stock de Implantes 4mm', description: 'Gabinete 2 sin existencias de titanio grado 5', completed: false, priority: 'High', sub: 'Logística', assignedToId: 'D2' },
  { id: 'T2', title: 'Seguimiento P-1025 (Post-Cirugía)', description: 'Llamar para verificar inflamación tras extracción', completed: false, priority: 'Medium', sub: 'Atención', assignedToId: 'D1' },
  { id: 'T3', title: 'Validar Radiografías P-1002', description: 'Urge para plan de ortodoncia de la tarde', completed: false, priority: 'High', sub: 'Diagnóstico', assignedToId: 'D3' },
  { id: 'T4', title: 'Firmar Consentimientos Pendientes', description: 'Regularizar expedientes semana anterior', completed: false, priority: 'Medium', sub: 'Administración', assignedToId: 'D1' },
  { id: 'T5', title: 'Calibrar Autoclave Central', description: 'Mantenimiento preventivo mensual', completed: true, priority: 'High', sub: 'Mantenimiento', assignedToId: 'U1' },
  { id: 'T6', title: 'Revisión Facturación Q1', description: 'Preparar cierre trimestral para contabilidad', completed: false, priority: 'Low', sub: 'Dirección', assignedToId: 'U1' },
  { id: 'T7', title: 'Actualizar Precios Ortodoncia', description: 'Nuevas tarifas alineadores invisibles', completed: false, priority: 'Medium', sub: 'Comercial', assignedToId: 'D2' },
  { id: 'T8', title: 'Llamar Proveedor de Desechables', description: 'Retraso en entrega de guantes y mascarillas', completed: false, priority: 'High', sub: 'Compras', assignedToId: 'D3' },
  { id: 'T9', title: 'Validar Informe Laboratorio P-1044', description: 'Prótesis lista para prueba el jueves', completed: false, priority: 'Medium', sub: 'Protésico', assignedToId: 'D2' },
  { id: 'T10', title: 'Organizar Sesión Clínica Viernes', description: 'Exponer caso complejo de maloclusión', completed: false, priority: 'Low', sub: 'Formación', assignedToId: 'D1' },
  { id: 'T11', title: 'Audit de Historias Clínicas P-1000 a P-1050', description: 'Verificar firmas LOPD', completed: false, priority: 'Medium', sub: 'Calidad', assignedToId: 'U1' },
  { id: 'T12', title: 'Entrevista nueva Higienista', description: 'Candidata recomendada por Dra. Torres', completed: false, priority: 'High', sub: 'RRHH', assignedToId: 'D1' },
  { id: 'T13', title: 'Mantenimiento Sillón Dental G1', description: 'Ruidos en el sistema de aspiración', completed: false, priority: 'Low', sub: 'Técnico', assignedToId: 'D2' },
  { id: 'T14', title: 'Preparar Pedido de Resinas', description: 'Quedan pocos botes de A2 y A3', completed: false, priority: 'Medium', sub: 'Compras', assignedToId: 'D3' },
  { id: 'T15', title: 'Revisar Cierre de Caja Sucursal Malvarrosa', description: 'Descuadre de 15€ detectado ayer', completed: false, priority: 'High', sub: 'Admin', assignedToId: 'U1' }
];

const App: React.FC = () => {
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>(generatePatients());
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [appointments, setAppointments] = useState<Appointment[]>(generateSyncAppointments(patients, INITIAL_DOCTORS));
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [viewingDoctor, setViewingDoctor] = useState<Doctor | null>(null);

  const [settings, setSettings] = useState<ClinicSettings>({
    name: "MediClinic Premium",
    businessName: "MediClinic Solutions S.L.",
    sector: "Clínica Dental Multi-Sede",
    region: "ES",
    branchCount: 3,
    scheduleType: 'split',
    logo: "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/hospital.svg",
    phone: "+34 910 000 001",
    email: "central@mediclinic.com",
    address: "Paseo de la Castellana 100, Madrid",
    currency: "€",
    language: "es-ES",
    roles: INITIAL_ROLES, 
    services: TREATMENTS.map((t, i) => ({ id: `S${i}`, name: t, price: 50 + (i * 15), duration: 30 + (i * 5) })),
    aiPhoneSettings: {
      phoneNumber: "+34 900 123 456", assistantName: "Sara", aiCompanyName: "MediClinic Premium", initialGreeting: "Hola, soy Sara de MediClinic Premium. ¿En qué puedo ayudarte hoy?",
      systemPrompt: "Eres la recepcionista experta de la clínica MediClinic Premium.", instructions: "Verifica disponibilidad.",
      testSpeechText: "Hola, soy Sara. Es un placer saludarte. Estoy aquí para gestionar tus citas en MediClinic Premium y resolver cualquier duda sobre nuestros tratamientos de forma inmediata. Mi compromiso es ofrecerte una atención personalizada, cercana y profesional en cada contacto. ¿En qué puedo ayudarte hoy?", 
      voiceName: "Zephyr", voicePitch: 1.0, voiceSpeed: 1.0, temperature: 0.7, accent: 'es-ES-Madrid',
      model: 'gemini-2.5-flash-native-audio-preview-12-2025'
    },
    defaultTheme: 'light', colorTemplate: 'ocean',
    visuals: { titleFontSize: 32, bodyFontSize: 16 },
    appointmentPolicy: { confirmationWindow: 24, leadTimeThreshold: 3, autoConfirmShortNotice: true },
    labels: {
      dashboardTitle: "Dashboard Directivo",
      dashboardSubtitle: "Monitorización Operativa",
      agendaTitle: "Agenda Centralizada",
      agendaSubtitle: "Gestión de Turnos",
      patientsTitle: "Expedientes",
      patientsSubtitle: "Historias Clínicas"
    },
    laborSettings: { vacationDaysPerYear: 30, allowCarryOver: false, businessDaysOnly: false, defaultContractType: "Indefinido", incidentTypes: [] },
    globalSchedule: {
        'Lunes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
        'Martes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
        'Miércoles': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
        'Jueves': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
        'Viernes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
        'Sábado': { morning: { start: '09:00', end: '13:00', active: true }, afternoon: { start: '00:00', end: '00:00', active: false } },
        'Domingo': { morning: { start: '00:00', end: '00:00', active: false }, afternoon: { start: '00:00', end: '00:00', active: false } }
    }
  });

  const [darkMode, setDarkMode] = useState(settings.defaultTheme === 'dark');
  const adminUser: User = { id: 'U1', username: 'admin', name: 'Director General', role: 'admin_role', img: 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?q=80&w=200' };
  const [systemUsers, setSystemUsers] = useState<User[]>([adminUser]);

  useEffect(() => {
    const newList = [adminUser];
    doctors.forEach(doc => {
      newList.push({ id: doc.id, username: doc.corporateEmail.split('@')[0], name: doc.name, role: doc.role || 'doctor_role', img: doc.img });
    });
    setSystemUsers(newList);
  }, [doctors]);

  const currentUser = systemUsers.find(u => u.id === 'U1') || adminUser;

  useEffect(() => {
    const template = COLOR_TEMPLATES.find(t => t.id === settings.colorTemplate) || COLOR_TEMPLATES[0];
    const root = document.documentElement;
    root.style.setProperty('--color-primary', template.primary);
    root.style.setProperty('--color-primary-dark', template.dark);
    root.style.setProperty('--color-primary-light', template.light);
  }, [settings.colorTemplate]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handleOpenDoctor = (doctorId: string) => {
    const doc = doctors.find(d => d.id === doctorId);
    if (doc) setViewingDoctor(doc);
  };

  return (
    <HashRouter>
      <Layout 
        darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} 
        currentUser={currentUser} settings={settings}
        onOpenVoiceAssistant={() => setIsVoiceOpen(true)}
        onOpenCurrentProfile={() => handleOpenDoctor(currentUser.id)}
      >
        <Routes>
          <Route path="/" element={<Dashboard settings={settings} appointments={appointments} setAppointments={setAppointments} tasks={tasks} setTasks={setTasks} patients={patients} doctors={doctors} currentUser={currentUser} />} />
          <Route path="/agenda" element={<Agenda appointments={appointments} setAppointments={setAppointments} patients={patients} doctors={doctors} globalSchedule={settings.globalSchedule} settings={settings} />} />
          <Route path="/patients" element={<Patients patients={patients} setPatients={setPatients} appointments={appointments} clinicSettings={settings} currentUser={currentUser} team={doctors} />} />
          <Route path="/doctors" element={<Doctors doctors={doctors} setDoctors={setDoctors} appointments={appointments} branches={branches} patients={patients} clinicSettings={settings} setAppointments={setAppointments} />} />
          <Route path="/branches" element={<Branches branches={branches} setBranches={setBranches} doctors={doctors} setDoctors={setDoctors} appointments={appointments} />} />
          <Route path="/metrics" element={<Metrics appointments={appointments} doctors={doctors} patients={patients} settings={settings} branches={branches} />} />
          <Route path="/settings" element={<Settings settings={settings} setSettings={setSettings} onToggleTheme={() => setDarkMode(!darkMode)} darkMode={darkMode} systemUsers={systemUsers} setSystemUsers={setSystemUsers} doctors={doctors} setDoctors={setDoctors} patients={patients} setPatients={setPatients} branches={branches} setBranches={setBranches} onOpenDoctor={handleOpenDoctor} />} />
        </Routes>
      </Layout>

      {viewingDoctor && <DoctorDetailModal doctor={viewingDoctor} appointments={appointments} onClose={() => setViewingDoctor(null)} onSave={(updated) => setDoctors(prev => prev.map(d => d.id === updated.id ? updated : d))} branches={branches} />}
      {isVoiceOpen && <VoiceAssistant onClose={() => setIsVoiceOpen(false)} settings={settings} appointments={appointments} setAppointments={setAppointments} doctors={doctors} branches={branches} patients={patients} setPatients={setPatients} />}
    </HashRouter>
  );
};

export default App;
