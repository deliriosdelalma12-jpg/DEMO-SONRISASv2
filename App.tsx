
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './screens/Dashboard';
import Agenda from './screens/Agenda';
import Metrics from './screens/Metrics';
import Patients from './screens/Patients';
import Doctors from './screens/Doctors';
import HRManagement from './screens/HRManagement';
import Layout from './components/Layout';
import ChatBot from './components/ChatBot';
import VoiceAssistant from './components/VoiceAssistant';
import { Appointment, Patient, Doctor, User, ClinicSettings } from './types';

const App: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>({
    name: "MediClinic Premium",
    logo: "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/hospital.svg",
    phone: "+34 910 000 001",
    email: "central@mediclinic-premium.com",
    address: "Paseo de la Castellana 100, Madrid"
  });

  const [currentUser] = useState<User>({
    id: 'D001',
    name: 'Dr. Carlos Vega',
    role: 'Admin',
    corporateEmail: 'c.vega@mediclinic.com',
    img: 'https://i.pravatar.cc/150?u=D001'
  });

  const [doctors, setDoctors] = useState<Doctor[]>([
    { 
      id: 'D001', 
      name: "Dr. Carlos Vega", 
      role: 'Admin', 
      specialty: "Odontología Estética", 
      status: "Active", 
      img: "https://i.pravatar.cc/150?u=D001", 
      branch: "Centro", 
      phone: "+34 600 001", 
      corporateEmail: "c.vega@clinic.com", 
      contractType: "Indefinido - Jornada Completa",
      overtimeHours: 4.5,
      totalHoursWorked: 168,
      vacationDaysTotal: 30,
      vacationDaysTaken: 12,
      hourlyRate: 75,
      vacationHistory: [
        { id: 'v1', start: '2023-11-01', end: '2023-11-12', status: 'Aprobada', type: 'Vacaciones' }
      ],
      attendanceHistory: [
        { id: 'a1', date: '2023-10-10', type: 'Retraso', duration: '20 min', status: 'Justificado', notes: 'Tráfico denso por lluvia.' },
        { id: 'a2', date: '2023-09-15', type: 'Ausencia', duration: '1 día', status: 'Justificado', notes: 'Asuntos familiares urgentes.' }
      ],
      docs: [] 
    },
    { 
      id: 'D002', 
      name: "Dra. Ana Lopez", 
      role: 'Doctor', 
      specialty: "Ortodoncia Avanzada", 
      status: "Active", 
      img: "https://i.pravatar.cc/150?u=D002", 
      branch: "Norte", 
      phone: "+34 600 002", 
      corporateEmail: "a.lopez@clinic.com", 
      contractType: "Indefinido - Media Jornada",
      overtimeHours: 0,
      totalHoursWorked: 80,
      vacationDaysTotal: 30,
      vacationDaysTaken: 5,
      hourlyRate: 60,
      vacationHistory: [
        { id: 'v2', start: '2023-12-20', end: '2024-01-05', status: 'Pendiente', type: 'Vacaciones' }
      ],
      attendanceHistory: [],
      docs: [] 
    },
  ]);

  const [patients, setPatients] = useState<Patient[]>([
    { 
      id: 'P001', name: "Juan Ignacio Pérez", birthDate: "1990-05-15", gender: 'Masculino', identityDocument: '12345678A', img: "https://i.pravatar.cc/150?u=P001", phone: "+34 600 100 200", 
      email: "juan.perez@expert-dent.com", address: "Calle Mayor 1, 4ºB", 
      medicalHistory: "Paciente presenta sensibilidad aguda en molares superiores.",
      associatedDoctorId: 'D001', associatedDoctorName: 'Dr. Carlos Vega',
      weight: "82", height: "185", bloodType: "A+", allergies: ["Penicilina"],
      attachments: [], savedReports: [], history: []
    } as any
  ]);

  const [appointments, setAppointments] = useState<Appointment[]>([
    { id: '1', patientName: 'Juan Ignacio Pérez', patientId: 'P001', doctorName: 'Dr. Carlos Vega', doctorId: 'D001', time: '09:00', date: '2023-10-24', treatment: 'Limpieza Dental Profunda', status: 'Completed' },
  ]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  return (
    <HashRouter>
      <Layout darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} currentUser={currentUser}>
        <Routes>
          <Route path="/" element={<Dashboard appointments={appointments} setAppointments={setAppointments} tasks={[]} setTasks={() => {}} patients={patients} doctors={doctors} />} />
          <Route path="/agenda" element={<Agenda appointments={appointments} setAppointments={setAppointments} patients={patients} doctors={doctors} />} />
          <Route path="/patients" element={<Patients patients={patients} setPatients={setPatients} appointments={appointments} clinicSettings={clinicSettings} currentUser={currentUser} team={doctors} />} />
          <Route path="/doctors" element={<Doctors doctors={doctors} appointments={appointments} setDoctors={setDoctors} />} />
          <Route path="/hr" element={<HRManagement doctors={doctors} setDoctors={setDoctors} />} />
          <Route path="/metrics" element={<Metrics />} />
        </Routes>
      </Layout>

      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50 no-print">
        <button onClick={() => setIsVoiceOpen(true)} className="size-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-primary/40"><span className="material-symbols-outlined text-3xl">audio_spark</span></button>
        <button onClick={() => setIsChatOpen(true)} className="size-14 bg-white dark:bg-surface-dark text-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform border border-primary/20"><span className="material-symbols-outlined text-3xl">smart_toy</span></button>
      </div>

      {isChatOpen && <ChatBot onClose={() => setIsChatOpen(false)} />}
      {isVoiceOpen && <VoiceAssistant onClose={() => setIsVoiceOpen(false)} />}
    </HashRouter>
  );
};

export default App;
