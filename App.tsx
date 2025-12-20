
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './screens/Dashboard';
import Agenda from './screens/Agenda';
import Metrics from './screens/Metrics';
import Patients from './screens/Patients';
import Doctors from './screens/Doctors';
import HRManagement from './screens/HRManagement';
import Settings from './screens/Settings';
import Layout from './components/Layout';
import VoiceAssistant from './components/VoiceAssistant';
import { Appointment, Patient, Doctor, User, ClinicSettings, ColorTemplate, Task } from './types';

export const COLOR_TEMPLATES: ColorTemplate[] = [
  { id: 'ocean', name: 'Océano', primary: '#3b82f6', dark: '#1d4ed8', light: '#dbeafe' },
  { id: 'emerald', name: 'Esmeralda', primary: '#10b981', dark: '#047857', light: '#d1fae5' },
  { id: 'amethyst', name: 'Amatista', primary: '#8b5cf6', dark: '#6d28d9', light: '#ede9fe' },
  { id: 'sunset', name: 'Atardecer', primary: '#f59e0b', dark: '#d97706', light: '#fef3c7' },
  { id: 'coal', name: 'Carbón', primary: '#475569', dark: '#1e293b', light: '#f1f5f9' },
];

// --- DATOS MOCK INICIALES ---

const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'D1', name: 'Dra. Ana Torres', role: 'Doctor', specialty: 'Ortodoncia', status: 'Active',
    img: 'https://img.freepik.com/foto-gratis/mujer-doctora-vistiendo-bata-laboratorio-estetoscopio-aislado_1303-29791.jpg',
    branch: 'Centro', phone: '600 111 222', corporateEmail: 'ana.torres@mediclinic.com', docs: [],
    vacationDaysTotal: 30, vacationDaysTaken: 5,
    schedule: {
      'Lunes': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
      'Miércoles': { morning: { start: '09:00', end: '14:00', active: true }, afternoon: { start: '16:00', end: '20:00', active: true } },
      'Viernes': { morning: { start: '09:00', end: '15:00', active: true }, afternoon: { start: '00:00', end: '00:00', active: false } }
    }
  },
  {
    id: 'D2', name: 'Dr. Carlos Ruiz', role: 'Doctor', specialty: 'Implantología', status: 'Active',
    img: 'https://img.freepik.com/foto-gratis/doctor-sonriente-con-estetoscopio_1154-255.jpg',
    branch: 'Norte', phone: '600 333 444', corporateEmail: 'carlos.ruiz@mediclinic.com', docs: [],
    vacationDaysTotal: 30, vacationDaysTaken: 12
  },
  {
    id: 'D3', name: 'Dra. Sofia Mendez', role: 'Doctor', specialty: 'Odontopediatría', status: 'Vacation',
    img: 'https://img.freepik.com/foto-gratis/enfermera-joven-hispana-uniforme-medico-estetoscopio-sobre-fondo-amarillo-mirando-hacia-lado-sonrisa-natural-cara-risa-segura_141793-128229.jpg',
    branch: 'Sur', phone: '600 555 666', corporateEmail: 'sofia.mendez@mediclinic.com', docs: [],
    vacationDaysTotal: 22, vacationDaysTaken: 22
  },
  {
    id: 'D4', name: 'Dr. Javier Costa', role: 'Doctor', specialty: 'Cirugía Maxilofacial', status: 'Active',
    img: 'https://img.freepik.com/foto-gratis/retrato-hombre-sonriente-trabajador-hospital_23-2148858880.jpg',
    branch: 'Centro', phone: '600 777 888', corporateEmail: 'javier.costa@mediclinic.com', docs: [],
    vacationDaysTotal: 30, vacationDaysTaken: 0
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
  }
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: 'A1', patientId: 'P1001', patientName: 'Laura Martínez', doctorId: 'D1', doctorName: 'Dra. Ana Torres', date: new Date().toISOString().split('T')[0], time: '09:00', treatment: 'Revisión Ortodoncia', status: 'Confirmed' },
  { id: 'A2', patientId: 'P1002', patientName: 'Pedro Gomez', doctorId: 'D2', doctorName: 'Dr. Carlos Ruiz', date: new Date().toISOString().split('T')[0], time: '10:30', treatment: 'Implante Titanio', status: 'Pending' },
  { id: 'A3', patientId: 'P1003', patientName: 'María Rodríguez', doctorId: 'D3', doctorName: 'Dra. Sofia Mendez', date: new Date().toISOString().split('T')[0], time: '12:00', treatment: 'Limpieza Dental', status: 'Completed' },
  { id: 'A4', patientId: 'P1001', patientName: 'Laura Martínez', doctorId: 'D1', doctorName: 'Dra. Ana Torres', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '16:00', treatment: 'Urgencia', status: 'Confirmed' },
];

const INITIAL_TASKS: Task[] = [
  { id: 'T1', text: 'Confirmar citas de mañana', completed: false, priority: 'High', sub: 'Recepción' },
  { id: 'T2', text: 'Pedir material de implantes', completed: true, priority: 'Medium', sub: 'Almacén' },
  { id: 'T3', text: 'Revisar informe de Laura M.', completed: false, priority: 'Low', sub: 'Dra. Torres' }
];

const App: React.FC = () => {
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  
  // --- STATE MANAGEMENT ---
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);

  const [settings, setSettings] = useState<ClinicSettings>({
    name: "MediClinic Premium",
    logo: "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/hospital.svg",
    phone: "+34 910 000 001",
    email: "central@mediclinic-premium.com",
    address: "Madrid, España",
    currency: "€",
    language: "es-ES",
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
    labels: {
      dashboardTitle: "Panel Operativo",
      dashboardSubtitle: "Resumen de actividad diaria",
      agendaTitle: "Agenda Médica",
      agendaSubtitle: "Gestión de turnos y pacientes",
      patientsTitle: "Pacientes",
      patientsSubtitle: "Historial clínico centralizado"
    }
  });

  const [darkMode, setDarkMode] = useState(settings.defaultTheme === 'dark');

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

  const currentUser: User = {
    id: 'U1', username: 'admin', name: 'Dr. Administrador', role: 'Admin',
    img: 'https://i.pravatar.cc/150?u=admin'
  };

  return (
    <HashRouter>
      <Layout darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} currentUser={currentUser} settings={settings}>
        <Routes>
          <Route path="/" element={<Dashboard settings={settings} appointments={appointments} setAppointments={setAppointments} tasks={tasks} setTasks={setTasks} patients={patients} doctors={doctors} />} />
          <Route path="/agenda" element={<Agenda appointments={appointments} setAppointments={setAppointments} patients={patients} doctors={doctors} />} />
          <Route path="/patients" element={<Patients patients={patients} setPatients={setPatients} appointments={appointments} clinicSettings={settings} currentUser={currentUser} team={doctors} />} />
          <Route path="/doctors" element={<Doctors doctors={doctors} setDoctors={setDoctors} appointments={appointments} />} />
          <Route path="/hr" element={<HRManagement doctors={doctors} setDoctors={setDoctors} />} />
          <Route path="/metrics" element={<Metrics appointments={appointments} doctors={doctors} patients={patients} />} />
          <Route path="/settings" element={<Settings settings={settings} setSettings={setSettings} onToggleTheme={() => setDarkMode(!darkMode)} darkMode={darkMode} systemUsers={[currentUser]} setSystemUsers={() => {}} />} />
        </Routes>
      </Layout>

      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
        <button onClick={() => setIsVoiceOpen(true)} className="size-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-primary/40"><span className="material-symbols-outlined text-3xl">audio_spark</span></button>
      </div>

      {isVoiceOpen && <VoiceAssistant onClose={() => setIsVoiceOpen(false)} settings={settings} appointments={appointments} setAppointments={setAppointments} doctors={doctors} />}
    </HashRouter>
  );
};

export default App;
