
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './screens/Dashboard';
import Agenda from './screens/Agenda';
import Metrics from './screens/Metrics';
import Patients from './screens/Patients';
import Doctors from './screens/Doctors';
import HRManagement from './screens/HRManagement';
import Settings from './screens/Settings';
import Layout from './components/Layout';
import ChatBot from './components/ChatBot';
import VoiceAssistant from './components/VoiceAssistant';
import { Appointment, Patient, Doctor, User, ClinicSettings, ColorTemplate } from './types';

export const COLOR_TEMPLATES: ColorTemplate[] = [
  { id: 'ocean', name: 'Océano (Blue)', primary: '#3b82f6', dark: '#1d4ed8', light: '#dbeafe' },
  { id: 'emerald', name: 'Esmeralda (Green)', primary: '#10b981', dark: '#047857', light: '#d1fae5' },
  { id: 'amethyst', name: 'Amatista (Purple)', primary: '#8b5cf6', dark: '#6d28d9', light: '#ede9fe' },
  { id: 'sunset', name: 'Atardecer (Orange)', primary: '#f59e0b', dark: '#d97706', light: '#fef3c7' },
  { id: 'coal', name: 'Carbón (Slate)', primary: '#475569', dark: '#1e293b', light: '#f1f5f9' },
];

const generateMassiveMockData = () => {
  const doctors: Doctor[] = [
    { id: 'D001', name: "Dr. Carlos Vega", role: 'Admin', specialty: "Odontología Estética", status: "Active", img: "https://i.pravatar.cc/150?u=D001", branch: "Centro", phone: "+34 600 001", corporateEmail: "c.vega@clinic.com", docs: [], vacationHistory: [], attendanceHistory: [] },
    { id: 'D002', name: "Dra. Ana Lopez", role: 'Doctor', specialty: "Ortodoncia Avanzada", status: "Active", img: "https://i.pravatar.cc/150?u=D002", branch: "Norte", phone: "+34 600 002", corporateEmail: "a.lopez@clinic.com", docs: [], vacationHistory: [], attendanceHistory: [] },
    { id: 'D003', name: "Dr. Mario Ruiz", role: 'Doctor', specialty: "Cirugía Maxilofacial", status: "Active", img: "https://i.pravatar.cc/150?u=D003", branch: "Sur", phone: "+34 600 003", corporateEmail: "m.ruiz@clinic.com", docs: [], vacationHistory: [], attendanceHistory: [] },
    { id: 'D004', name: "Dra. Elena Sanz", role: 'Doctor', specialty: "Periodoncia", status: "Active", img: "https://i.pravatar.cc/150?u=D004", branch: "Este", phone: "+34 600 004", corporateEmail: "e.sanz@clinic.com", docs: [], vacationHistory: [], attendanceHistory: [] },
  ];

  const patients: Patient[] = [
    { id: 'P001', name: "Juan Pérez", birthDate: "1985-05-12", gender: 'Masculino', identityDocument: "12345678X", img: "https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Felix&backgroundColor=e2e8f0", phone: "+34 600 000 01", email: "juan@example.com", address: "Calle Mayor 1", medicalHistory: "Revisiones al día.", attachments: [], savedReports: [], history: [] }
  ];

  const appointments: Appointment[] = [];
  return { doctors, patients, appointments };
};

const App: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  
  const mock = useMemo(() => generateMassiveMockData(), []);
  const [doctors, setDoctors] = useState<Doctor[]>(mock.doctors);
  const [patients, setPatients] = useState<Patient[]>(mock.patients);
  const [appointments, setAppointments] = useState<Appointment[]>(mock.appointments);

  // ESTADO GLOBAL DE CONFIGURACIÓN AMPLIADO
  const [settings, setSettings] = useState<ClinicSettings>({
    name: "MediClinic Premium",
    logo: "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/hospital.svg",
    phone: "+34 910 000 001",
    email: "central@mediclinic-premium.com",
    address: "Paseo de la Castellana 100, Madrid",
    sector: "Odontología y Estética Dental",
    description: "Clínica líder en tratamientos de vanguardia con enfoque en la salud integral del paciente.",
    specialties: ["Ortodoncia", "Implantología", "Periodoncia", "Estética Dental"],
    services: [
      { id: 'S1', name: 'Limpieza Dental Profunda', price: 65 },
      { id: 'S2', name: 'Ortodoncia Invisible', price: 3200 },
      { id: 'S3', name: 'Implante Titanio', price: 1100 },
      { id: 'S4', name: 'Blanqueamiento Zoom', price: 250 }
    ],
    aiPhoneSettings: {
      phoneNumber: "+34 900 123 456",
      assistantName: "Sara",
      systemPrompt: "Eres la asistente virtual experta. Tienes capacidad para agendar citas pidiendo nombre y servicio, reprogramar si el paciente lo solicita y cancelar citas. Eres amable pero eficiente.",
      knowledgeBase: "Horario: L-V 9:00 a 20:00. Ubicación: Paseo de la Castellana 100. Especialidades: Ortodoncia, Implantes y Estética. Aceptamos seguros: Sanitas, Adeslas y Mapfre.",
      knowledgeFiles: [],
      voiceName: "Zephyr",
      voicePitch: 1.0,
      voiceSpeed: 1.0,
      accent: 'es-ES-Madrid'
    },
    defaultTheme: 'light',
    colorTemplate: 'ocean',
    roles: [
      { id: 'Admin', name: 'Administrador', permissions: { visualize: true, create: true, modify: true, delete: true } },
      { id: 'Doctor', name: 'Especialista', permissions: { visualize: true, create: true, modify: true, delete: false } },
      { id: 'Recepción', name: 'Atención al Cliente', permissions: { visualize: true, create: true, modify: true, delete: false } },
      { id: 'Enfermería', name: 'Asistente Clínico', permissions: { visualize: true, create: false, modify: true, delete: false } },
    ]
  });

  const [systemUsers, setSystemUsers] = useState<User[]>([
    {
      id: 'D001',
      username: 'cvega_admin',
      name: 'Dr. Carlos Vega',
      role: 'Admin',
      jobTitle: 'Director Médico',
      phone: '+34 600 000 001',
      identityDocument: '12345678A',
      corporateEmail: 'c.vega@mediclinic.com',
      img: 'https://i.pravatar.cc/150?u=D001',
      status: 'Activo'
    },
    {
      id: 'U002',
      username: 'mrodriguez_recep',
      name: 'María Rodríguez',
      role: 'Recepción',
      jobTitle: 'Coordinadora de Pacientes',
      phone: '+34 600 000 002',
      identityDocument: '87654321B',
      corporateEmail: 'm.rodriguez@mediclinic.com',
      img: 'https://i.pravatar.cc/150?u=U002',
      status: 'Activo'
    }
  ]);

  const [darkMode, setDarkMode] = useState(settings.defaultTheme === 'dark');

  // Aplicar colores dinámicos
  useEffect(() => {
    const template = COLOR_TEMPLATES.find(t => t.id === settings.colorTemplate) || COLOR_TEMPLATES[0];
    const root = document.documentElement;
    root.style.setProperty('--color-primary', template.primary);
    root.style.setProperty('--color-primary-dark', template.dark);
    root.style.setProperty('--color-primary-light', template.light);
  }, [settings.colorTemplate]);

  // Aplicar modo oscuro
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const currentUser = systemUsers[0]; // Simulación de login

  return (
    <HashRouter>
      <Layout 
        darkMode={darkMode} 
        onToggleTheme={() => setDarkMode(!darkMode)} 
        currentUser={currentUser}
        settings={settings}
      >
        <Routes>
          <Route path="/" element={<Dashboard appointments={appointments} setAppointments={setAppointments} tasks={[]} setTasks={() => {}} patients={patients} doctors={doctors} />} />
          <Route path="/agenda" element={<Agenda appointments={appointments} setAppointments={setAppointments} patients={patients} doctors={doctors} />} />
          <Route path="/patients" element={<Patients patients={patients} setPatients={setPatients} appointments={appointments} clinicSettings={settings} currentUser={currentUser} team={doctors} />} />
          <Route path="/doctors" element={<Doctors doctors={doctors} appointments={appointments} setDoctors={setDoctors} />} />
          <Route path="/hr" element={<HRManagement doctors={doctors} setDoctors={setDoctors} />} />
          <Route path="/metrics" element={<Metrics appointments={appointments} doctors={doctors} patients={patients} />} />
          <Route path="/settings" element={<Settings settings={settings} setSettings={setSettings} onToggleTheme={() => setDarkMode(!darkMode)} darkMode={darkMode} systemUsers={systemUsers} setSystemUsers={setSystemUsers} />} />
        </Routes>
      </Layout>

      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50 no-print">
        <button onClick={() => setIsVoiceOpen(true)} className="size-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-primary/40"><span className="material-symbols-outlined text-3xl">audio_spark</span></button>
        <button onClick={() => setIsChatOpen(true)} className="size-14 bg-white dark:bg-surface-dark text-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform border border-primary/20"><span className="material-symbols-outlined text-3xl">smart_toy</span></button>
      </div>

      {isChatOpen && <ChatBot onClose={() => setIsChatOpen(false)} />}
      {isVoiceOpen && <VoiceAssistant onClose={() => setIsVoiceOpen(false)} settings={settings} />}
    </HashRouter>
  );
};

export default App;
