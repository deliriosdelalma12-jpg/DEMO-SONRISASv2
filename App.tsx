
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './screens/Dashboard';
import Agenda from './screens/Agenda';
import Metrics from './screens/Metrics';
import Patients from './screens/Patients';
import Doctors from './screens/Doctors';
import Services from './screens/Services';
import Clinics from './screens/Clinics';
import Settings from './screens/Settings';
import Users from './screens/Users';
import Layout from './components/Layout';
import ChatBot from './components/ChatBot';
import VoiceAssistant from './components/VoiceAssistant';
import { Appointment, Patient, Doctor, Task, Branch } from './types';

const App: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Global Mock State
  const [appointments, setAppointments] = useState<Appointment[]>([
    { id: '1', patientName: 'Juan Pérez', patientId: 'P001', doctorName: 'Dr. Vega', doctorId: 'D001', time: '09:00', date: '2023-10-24', treatment: 'Limpieza', status: 'Confirmed' },
    { id: '2', patientName: 'Maria Garcia', patientId: 'P002', doctorName: 'Dra. Lopez', doctorId: 'D002', time: '10:30', date: '2023-10-24', treatment: 'Consulta', status: 'Pending', avatar: 'https://picsum.photos/40/40?random=2' },
    { id: '3', patientName: 'Carlos Ruiz', patientId: 'P003', doctorName: 'Dr. Vega', doctorId: 'D001', time: '11:00', date: '2023-10-25', treatment: 'Ortodoncia', status: 'Rescheduled' },
    { id: '4', patientName: 'Elena Gomez', patientId: 'P004', doctorName: 'Dr. Vega', doctorId: 'D001', time: '12:00', date: '2023-10-24', treatment: 'Cirugía', status: 'Cancelled' },
  ]);

  const [patients, setPatients] = useState<Patient[]>([
    { 
      id: 'P001', name: "Juan Pérez", age: "28 años", img: "https://picsum.photos/200/200?random=10", phone: "+34 600 000 100", 
      email: "juan@example.com", address: "Calle Mayor 1, Madrid", medicalHistory: "Alergia a la penicilina.", attachments: [], 
      history: [{ date: '2023-10-20', action: 'Cita Creada', description: 'Paciente nuevo registrado' }] 
    },
    { 
      id: 'P002', name: "Maria Garcia", age: "42 años", img: "https://picsum.photos/200/200?random=11", phone: "+34 600 000 200", 
      email: "maria@example.com", address: "Av. Diagonal 45, BCN", medicalHistory: "Sin antecedentes relevantes.", attachments: [], history: [] 
    },
  ]);

  const [doctors, setDoctors] = useState<Doctor[]>([
    { id: 'D001', name: "Dr. Carlos Vega", specialty: "Odontología", status: "Active", img: "https://picsum.photos/200/200?random=20", branch: "Centro", phone: "123", email: "vega@clinic.com", docs: [] },
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    { id: 'T1', text: 'Revisar laboratorio #402', sub: 'Pendiente desde ayer', completed: false, priority: 'High' },
    { id: 'T2', text: 'Llamar a seguro médico', sub: 'Autorización Paciente Luis G.', completed: true, priority: 'Medium' },
  ]);

  const [branches, setBranches] = useState<Branch[]>([
    { id: 'B1', name: "Dental Central", address: "Av. Reforma 222, CDMX", status: "Operativa", location: "19.4326, -99.1332", phone: "555-0192", staffCount: 12 },
  ]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  return (
    <HashRouter>
      <Layout darkMode={darkMode} onToggleTheme={toggleTheme}>
        <Routes>
          <Route path="/" element={<Dashboard appointments={appointments} tasks={tasks} setTasks={setTasks} />} />
          <Route path="/agenda" element={<Agenda appointments={appointments} setAppointments={setAppointments} />} />
          <Route path="/patients" element={<Patients patients={patients} setPatients={setPatients} />} />
          <Route path="/doctors" element={<Doctors doctors={doctors} setDoctors={setDoctors} />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/clinics" element={<Clinics branches={branches} setBranches={setBranches} />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/users" element={<Users />} />
          <Route path="/services" element={<Services />} />
        </Routes>
      </Layout>

      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
        <button
          onClick={() => { setIsVoiceOpen(true); setIsChatOpen(false); }}
          className="size-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform group"
          title="Asistente de Voz"
        >
          <span className="material-symbols-outlined text-3xl group-hover:animate-pulse">audio_spark</span>
        </button>
        <button
          onClick={() => { setIsChatOpen(true); setIsVoiceOpen(false); }}
          className="size-14 bg-white dark:bg-surface-dark text-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform group border border-primary/20"
          title="Chat con IA"
        >
          <span className="material-symbols-outlined text-3xl">smart_toy</span>
        </button>
      </div>

      {isChatOpen && <ChatBot onClose={() => setIsChatOpen(false)} />}
      {isVoiceOpen && <VoiceAssistant onClose={() => setIsVoiceOpen(false)} />}
    </HashRouter>
  );
};

export default App;
