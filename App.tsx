
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
];

const INITIAL_DOCTORS: Doctor[] = [
  { id: 'D1', name: 'Dra. Ana Torres', role: 'doctor_role', specialty: 'Ortodoncia', status: 'Active', img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=400', branch: 'Centro Madrid', phone: '600 111 222', corporateEmail: 'ana.torres@mediclinic.com', docs: [], vacationDaysTotal: 30, vacationDaysTaken: 5, vacationHistory: [], attendanceHistory: [] },
  { id: 'D2', name: 'Dr. Roberto Sanz', role: 'doctor_role', specialty: 'Implantología', status: 'Active', img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=400', branch: 'Barcelona Diagonal', phone: '600 333 444', corporateEmail: 'roberto.sanz@mediclinic.com', docs: [], vacationDaysTotal: 30, vacationDaysTaken: 2, vacationHistory: [], attendanceHistory: [] },
];

const INITIAL_TASKS: Task[] = [
  { id: 'T1', title: 'Revisar stock de Implantes 4mm', description: 'Gabinete 2 sin existencias de titanio grado 5', completed: false, priority: 'High', sub: 'Logística', assignedToId: 'D2', createdById: 'U1', createdByName: 'Dirección General' },
];

const App: React.FC = () => {
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [viewingDoctor, setViewingDoctor] = useState<Doctor | null>(null);

  const [settings, setSettings] = useState<ClinicSettings>({
    id: 'CLINIC-SONRISAS-001',
    name: "MediClinic Premium",
    businessName: "MediClinic Solutions S.L.",
    sector: "Clínica Dental Multi-Sede",
    region: "ES",
    branchCount: 2,
    scheduleType: 'split',
    logo: "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/hospital.svg",
    phone: "+34 910 000 001",
    email: "central@mediclinic.com",
    address: "Paseo de la Castellana 100, Madrid",
    currency: "€",
    language: "es-ES",
    roles: INITIAL_ROLES, 
    services: [],
    aiPhoneSettings: {
      assistantName: "Elena",
      clinicDisplayName: "Odontología Integral Avanzada",
      language: "es-ES",
      voice: "default",
      tone: "formal",
      escalation_rules: {
        transfer_number: "+34912345678",
        escalate_on_frustration: true
      },
      policy_texts: {
        cancel_policy: "Las citas deben cancelarse con al menos 24 horas de antelación.",
        privacy_notice: "Sus datos están protegidos según la normativa vigente."
      },
      prompt_overrides: {
        custom_greeting: "Bienvenido a Odontología Integral. Soy Elena.",
      },
      core_version: "1.0.1",
      active: true,
      phoneNumber: "+34 900 123 456", 
      aiCompanyName: "MediClinic Premium", 
      initialGreeting: "Hola, soy Elena. ¿En qué puedo ayudarte hoy?",
      systemPrompt: "Eres la recepcionista experta de la clínica.", 
      instructions: "Verifica disponibilidad.",
      testSpeechText: "Hola, soy Elena. Estoy aquí para gestionar sus citas.", 
      voiceName: "Zephyr", 
      voicePitch: 1.0, 
      voiceSpeed: 1.0, 
      temperature: 0.7, 
      accent: 'es-ES-Madrid',
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      aiEmotion: "Empática",
      aiStyle: "Concisa",
      aiRelation: "Formal (Usted)",
      aiFocus: "Resolutiva",
      configVersion: Date.now()
    },
    defaultTheme: 'light', colorTemplate: 'ocean',
    visuals: { titleFontSize: 32, bodyFontSize: 16 },
    appointmentPolicy: { confirmationWindow: 24, leadTimeThreshold: 3, autoConfirmShortNotice: true },
    labels: {
      dashboardTitle: "Dashboard Directivo",
      agendaTitle: "Agenda Centralizada",
    },
    laborSettings: { vacationDaysPerYear: 30, allowCarryOver: false, businessDaysOnly: false, defaultContractType: "Indefinido", incidentTypes: [] },
    globalSchedule: {
        'Lunes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
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

  const currentUser = systemUsers[0] || adminUser;

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

  return (
    <HashRouter>
      <Layout 
        darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} 
        currentUser={currentUser} settings={settings}
        onOpenVoiceAssistant={() => setIsVoiceOpen(true)}
      >
        <Routes>
          <Route path="/" element={<Dashboard settings={settings} appointments={appointments} setAppointments={setAppointments} tasks={tasks} setTasks={setTasks} patients={patients} doctors={doctors} currentUser={currentUser} systemUsers={systemUsers} />} />
          <Route path="/agenda" element={<Agenda appointments={appointments} setAppointments={setAppointments} patients={patients} doctors={doctors} globalSchedule={settings.globalSchedule} settings={settings} />} />
          <Route path="/patients" element={<Patients patients={patients} setPatients={setPatients} appointments={appointments} clinicSettings={settings} currentUser={currentUser} team={doctors} />} />
          <Route path="/doctors" element={<Doctors doctors={doctors} setDoctors={setDoctors} appointments={appointments} branches={branches} patients={patients} clinicSettings={settings} setAppointments={setAppointments} />} />
          <Route path="/branches" element={<Branches branches={branches} setBranches={setBranches} doctors={doctors} setDoctors={setDoctors} appointments={appointments} />} />
          <Route path="/metrics" element={<Metrics appointments={appointments} doctors={doctors} patients={patients} settings={settings} branches={branches} />} />
          <Route path="/settings" element={<Settings settings={settings} setSettings={setSettings} onToggleTheme={() => setDarkMode(!darkMode)} darkMode={darkMode} systemUsers={systemUsers} setSystemUsers={setSystemUsers} doctors={doctors} setDoctors={setDoctors} patients={patients} setPatients={setPatients} branches={branches} setBranches={setBranches} />} />
        </Routes>
      </Layout>
      {isVoiceOpen && <VoiceAssistant onClose={() => setIsVoiceOpen(false)} settings={settings} appointments={appointments} setAppointments={setAppointments} doctors={doctors} branches={branches} patients={patients} setPatients={setPatients} />}
    </HashRouter>
  );
};

export default App;
