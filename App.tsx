
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

// ... (Resto de las constantes igual) ...
export const COLOR_TEMPLATES: ColorTemplate[] = [
  { id: 'ocean', name: 'Océano', primary: '#3b82f6', dark: '#1d4ed8', light: '#dbeafe' },
  { id: 'emerald', name: 'Esmeralda', primary: '#10b981', dark: '#047857', light: '#d1fae5' },
  { id: 'amethyst', name: 'Amatista', primary: '#8b5cf6', dark: '#6d28d9', light: '#ede9fe' },
  { id: 'sunset', name: 'Atardecer', primary: '#f59e0b', dark: '#d97706', light: '#fef3c7' },
  { id: 'coal', name: 'Carbón', primary: '#475569', dark: '#1e293b', light: '#f1f5f9' },
];

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
  }
];

const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'D1', name: 'Dra. Ana Torres', role: 'doctor_role', specialty: 'Ortodoncia', status: 'Active',
    img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=400&auto=format&fit=crop',
    branch: 'Centro', phone: '600 111 222', corporateEmail: 'ana.torres@mediclinic.com', docs: [],
    vacationDaysTotal: 30, vacationDaysTaken: 5,
    vacationHistory: [],
    attendanceHistory: []
  }
];

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const createDefaultGlobalSchedule = (): Record<string, DaySchedule> => {
  const schedule: Record<string, DaySchedule> = {};
  WEEK_DAYS.forEach(day => {
    const isWeekend = day === 'Sábado' || day === 'Domingo';
    schedule[day] = {
      morning: { start: '09:00', end: '14:00', active: !isWeekend },
      afternoon: { start: '16:00', end: '20:00', active: !isWeekend }
    };
  });
  return schedule;
};

const App: React.FC = () => {
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  
  // --- STATE MANAGEMENT ---
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // --- GLOBAL MODAL STATE ---
  const [viewingDoctor, setViewingDoctor] = useState<Doctor | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);

  const [settings, setSettings] = useState<ClinicSettings>({
    name: "MediClinic Premium",
    sector: "Clínica Dental",
    region: "ES",
    branchCount: 3,
    scheduleType: 'split',
    logo: "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/hospital.svg",
    phone: "+34 910 000 001",
    email: "central@mediclinic-premium.com",
    address: "Madrid, España",
    currency: "€",
    language: "es-ES",
    roles: INITIAL_ROLES, 
    services: [
      { id: 'S1', name: 'Limpieza Dental', price: 65, duration: 45 },
      { id: 'S2', name: 'Consulta General', price: 50, duration: 30 }
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
      confirmationWindow: 24,
      leadTimeThreshold: 3,
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
      incidentTypes: []
    },
    globalSchedule: createDefaultGlobalSchedule()
  });

  const [darkMode, setDarkMode] = useState(settings.defaultTheme === 'dark');

  // --- SYSTEM USERS STATE ---
  const adminUser: User = { id: 'U1', username: 'admin', name: 'Dr. Administrador', role: 'admin_role', img: 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?q=80&w=200&auto=format&fit=crop' };
  
  const [systemUsers, setSystemUsers] = useState<User[]>([adminUser]);

  useEffect(() => {
    setSystemUsers(prev => {
      const currentUsersMap = new Map<string, User>(prev.map(u => [u.id, u]));
      const admin = currentUsersMap.get('U1') || adminUser;
      const newUsersList: User[] = [admin];

      doctors.forEach(doc => {
        newUsersList.push({
            id: doc.id,
            username: doc.corporateEmail.split('@')[0] || doc.name.replace(/\s+/g, '').toLowerCase(),
            name: doc.name,
            role: doc.role || 'doctor_role',
            img: doc.img
        });
      });
      return newUsersList;
    });
  }, [doctors]);

  const currentUser = systemUsers.find(u => u.id === 'U1') || adminUser;

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

  const handleOpenDoctor = (doctorId: string) => {
    const doc = doctors.find(d => d.id === doctorId);
    if (doc) setViewingDoctor(doc);
  };

  const handleOpenPatient = (patientId: string) => {
    const pat = patients.find(p => p.id === patientId);
    if (pat) setViewingPatient(pat);
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
                settings={settings} setSettings={setSettings} 
                onToggleTheme={() => setDarkMode(!darkMode)} darkMode={darkMode} 
                systemUsers={systemUsers} setSystemUsers={setSystemUsers} 
                doctors={doctors} setDoctors={setDoctors}
                patients={patients} setPatients={setPatients}
                branches={branches} setBranches={setBranches}
                onOpenDoctor={handleOpenDoctor} 
              />
            } 
          />
        </Routes>
      </Layout>

      {viewingDoctor && (
        <DoctorDetailModal 
          doctor={viewingDoctor} 
          appointments={appointments}
          onClose={() => setViewingDoctor(null)}
          onSave={(updated) => setDoctors(prev => prev.map(d => d.id === updated.id ? updated : d))}
        />
      )}

      {viewingPatient && (
        <PatientDetailModal
          patient={viewingPatient}
          clinicSettings={settings}
          team={doctors}
          onClose={() => setViewingPatient(null)}
          onSave={(updated) => setPatients(prev => prev.map(p => p.id === updated.id ? updated : p))}
          onOpenDoctor={handleOpenDoctor}
          appointments={appointments}
        />
      )}

      {isVoiceOpen && (
        <VoiceAssistant 
            onClose={() => setIsVoiceOpen(false)} 
            settings={settings} 
            appointments={appointments} setAppointments={setAppointments} 
            doctors={doctors} branches={branches} 
            patients={patients} setPatients={setPatients} 
        />
      )}
    </HashRouter>
  );
};

export default App;
