
import React, { useState, useEffect, useMemo } from 'react';
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

// Motor de generación MASIVA para métricas (Densidad extrema en los últimos 30 días)
const generateMassiveMockData = () => {
  const doctors: Doctor[] = [
    { id: 'D001', name: "Dr. Carlos Vega", role: 'Admin', specialty: "Odontología Estética", status: "Active", img: "https://i.pravatar.cc/150?u=D001", branch: "Centro", phone: "+34 600 001", corporateEmail: "c.vega@clinic.com", docs: [], vacationHistory: [], attendanceHistory: [] },
    { id: 'D002', name: "Dra. Ana Lopez", role: 'Doctor', specialty: "Ortodoncia Avanzada", status: "Active", img: "https://i.pravatar.cc/150?u=D002", branch: "Norte", phone: "+34 600 002", corporateEmail: "a.lopez@clinic.com", docs: [], vacationHistory: [], attendanceHistory: [] },
    { id: 'D003', name: "Dr. Mario Ruiz", role: 'Doctor', specialty: "Cirugía Maxilofacial", status: "Active", img: "https://i.pravatar.cc/150?u=D003", branch: "Sur", phone: "+34 600 003", corporateEmail: "m.ruiz@clinic.com", docs: [], vacationHistory: [], attendanceHistory: [] },
    { id: 'D004', name: "Dra. Elena Sanz", role: 'Doctor', specialty: "Periodoncia", status: "Active", img: "https://i.pravatar.cc/150?u=D004", branch: "Este", phone: "+34 600 004", corporateEmail: "e.sanz@clinic.com", docs: [], vacationHistory: [], attendanceHistory: [] },
    { id: 'D005', name: "Dr. Roberto Soler", role: 'Doctor', specialty: "Endodoncia", status: "Active", img: "https://i.pravatar.cc/150?u=D005", branch: "Centro", phone: "+34 600 005", corporateEmail: "r.soler@clinic.com", docs: [], vacationHistory: [], attendanceHistory: [] },
    { id: 'D006', name: "Dra. Laura Gil", role: 'Doctor', specialty: "Odontopediatría", status: "Active", img: "https://i.pravatar.cc/150?u=D006", branch: "Norte", phone: "+34 600 006", corporateEmail: "l.gil@clinic.com", docs: [], vacationHistory: [], attendanceHistory: [] },
    { id: 'D007', name: "Dr. Sergio Maza", role: 'Doctor', specialty: "Implantología", status: "Active", img: "https://i.pravatar.cc/150?u=D007", branch: "Sur", phone: "+34 600 007", corporateEmail: "s.maza@clinic.com", docs: [], vacationHistory: [], attendanceHistory: [] },
    { id: 'D008', name: "Dra. Marta Vidal", role: 'Doctor', specialty: "Higiene Bucodental", status: "Active", img: "https://i.pravatar.cc/150?u=D008", branch: "Este", phone: "+34 600 008", corporateEmail: "m.vidal@clinic.com", docs: [], vacationHistory: [], attendanceHistory: [] },
  ];

  const patientNames = [
    "Juan Pérez", "Maria Garcia", "Pedro Sanchez", "Lucia Diaz", "Roberto Soler", "Elena Martinez", 
    "Carlos Ruiz", "Ana Belen", "Javier Gomez", "Sofia Vega", "Diego Lopez", "Carmen Sanz",
    "Luis Miguel", "Isabel Pantoja", "Fernando Alonso", "Pau Gasol", "Rafael Nadal", "Marta Sanchez",
    "Antonio Banderas", "Penelope Cruz", "Jordi Evole", "Julia Otero", "Andreu Buenafuente", "Berto Romero",
    "David Broncano", "Ibai Llanos", "Rosalia Vila", "C. Tangana", "Nathy Peluso", "Aitana Ocaña"
  ];

  const patients: Patient[] = patientNames.map((name, i) => ({
    id: `P${(i + 1).toString().padStart(3, '0')}`,
    name,
    birthDate: `${1950 + Math.floor(Math.random() * 50)}-0${1 + Math.floor(Math.random() * 9)}-${10 + Math.floor(Math.random() * 18)}`,
    gender: Math.random() > 0.5 ? 'Masculino' : 'Femenino',
    identityDocument: `${10000000 + i}X`,
    img: `https://i.pravatar.cc/150?u=P${i}`,
    phone: `+34 600 000 ${i.toString().padStart(2, '0')}`,
    email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
    address: `Calle Falsa ${i + 1}, Ciudad`,
    medicalHistory: "Paciente con revisiones periódicas.",
    attachments: [],
    savedReports: [],
    history: [],
    weight: (60 + Math.random() * 30).toFixed(1),
    height: (155 + Math.random() * 35).toFixed(0),
    bloodType: ['A+', 'O-', 'B+', 'AB+'][Math.floor(Math.random() * 4)],
    allergies: Math.random() > 0.7 ? ["Penicilina"] : []
  }));

  const treatments = [
    'Limpieza Dental Profunda', 'Ortodoncia', 'Ortodoncia Invisible', 
    'Cirugía Maxilofacial', 'Consulta General', 'Revisión Periódica', 
    'Implante Titanio', 'Endodoncia Molar', 'Blanqueamiento'
  ];
  
  const appointments: Appointment[] = [];
  const now = new Date();
  
  // Generamos 2000 citas con distribución específica
  for (let i = 0; i < 2000; i++) {
    let date: Date;
    const rand = Math.random();
    
    // 60% de las citas en los ÚLTIMOS 30 DÍAS (Para que el KPI de Metrics se vea masivo)
    if (rand > 0.4) {
      const daysAgo = Math.floor(Math.random() * 30);
      date = new Date();
      date.setDate(now.getDate() - daysAgo);
    } 
    // 20% en el resto del año (2025)
    else if (rand > 0.2) {
      const daysAgo = Math.floor(Math.random() * 365);
      date = new Date();
      date.setDate(now.getDate() - daysAgo);
    }
    // 20% en el futuro (Hasta Enero 2026)
    else {
      const daysAhead = Math.floor(Math.random() * 300);
      date = new Date();
      date.setDate(now.getDate() + daysAhead);
    }

    const dateStr = date.toISOString().split('T')[0];
    const doc = doctors[Math.floor(Math.random() * doctors.length)];
    const pat = patients[Math.floor(Math.random() * patients.length)];
    const treat = treatments[Math.floor(Math.random() * treatments.length)];
    
    let status: any = 'Pending';
    if (date < now) {
      // Pasado: 90% completadas para métricas de facturación real potentes
      status = Math.random() > 0.1 ? 'Completed' : 'Cancelled';
    } else {
      // Futuro
      const r = Math.random();
      if (r > 0.6) status = 'Confirmed';
      else if (r > 0.2) status = 'Pending';
      else status = 'Rescheduled';
    }

    appointments.push({
      id: `APT-${i.toString().padStart(4, '0')}`,
      patientName: pat.name,
      patientId: pat.id,
      doctorName: doc.name,
      doctorId: doc.id,
      time: `${Math.floor(Math.random() * 11 + 9).toString().padStart(2, '0')}:00`,
      date: dateStr,
      treatment: treat,
      status: status
    });
  }

  appointments.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  return { doctors, patients, appointments };
};

const App: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const mock = useMemo(() => generateMassiveMockData(), []);

  const [doctors, setDoctors] = useState<Doctor[]>(mock.doctors);
  const [patients, setPatients] = useState<Patient[]>(mock.patients);
  const [appointments, setAppointments] = useState<Appointment[]>(mock.appointments);

  const [clinicSettings] = useState<ClinicSettings>({
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
          <Route path="/metrics" element={<Metrics appointments={appointments} doctors={doctors} patients={patients} />} />
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
