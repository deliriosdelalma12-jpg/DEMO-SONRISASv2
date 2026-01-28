
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Screens
import Dashboard from './screens/Dashboard';
import Agenda from './screens/Agenda';
import Metrics from './screens/Metrics';
import Patients from './screens/Patients';
import Doctors from './screens/Doctors';
import Branches from './screens/Branches';
import Settings from './screens/Settings';
import Login from './screens/auth/Login';
import SignUp from './screens/auth/SignUp';
import AuthCallback from './screens/auth/AuthCallback';

// Components
import Layout from './components/Layout';
import VoiceAssistant from './components/VoiceAssistant';
import { Appointment, Task, Patient, Doctor, Branch, ColorTemplate } from './types';

export const COLOR_TEMPLATES: ColorTemplate[] = [
  { id: 'ocean', name: 'Océano', primary: '#3b82f6', dark: '#1d4ed8', light: '#dbeafe' },
  { id: 'emerald', name: 'Esmeralda', primary: '#10b981', dark: '#047857', light: '#d1fae5' },
  { id: 'amethyst', name: 'Amatista', primary: '#8b5cf6', dark: '#6d28d9', light: '#ede9fe' },
  { id: 'sunset', name: 'Atardecer', primary: '#f59e0b', dark: '#1d4ed8', light: '#fef3c7' },
  { id: 'coal', name: 'Carbón', primary: '#475569', dark: '#1e293b', light: '#f1f5f9' },
];

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, settings, setSettings, tenantUser, signOut, loading: authLoading, refreshContext } = useAuth();
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const location = useLocation();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [darkMode, setDarkMode] = useState(false);
  const [syncTimeout, setSyncTimeout] = useState(false);

  useEffect(() => {
    if (settings) {
      setDarkMode(settings.defaultTheme === 'dark');
      const template = COLOR_TEMPLATES.find(t => t.id === settings.colorTemplate) || COLOR_TEMPLATES[0];
      const root = document.documentElement;
      root.style.setProperty('--color-primary', template.primary);
      root.style.setProperty('--color-primary-dark', template.dark);
      root.style.setProperty('--color-primary-light', template.light);
    }
  }, [settings]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Detector de bloqueo de sincronización
  useEffect(() => {
    let timer: any;
    if (user && !tenantUser) {
        timer = setTimeout(() => setSyncTimeout(true), 12000);
    } else {
        setSyncTimeout(false);
    }
    return () => clearTimeout(timer);
  }, [user, tenantUser]);

  const isPublicRoute = ['/login', '/signup', '/auth/callback'].includes(location.pathname);

  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    );
  }

  return (
    <PrivateRoute>
      {tenantUser && settings ? (
        <Layout 
          darkMode={darkMode} 
          onToggleTheme={() => setDarkMode(!darkMode)} 
          currentUser={tenantUser} 
          settings={settings}
          onOpenVoiceAssistant={() => setIsVoiceOpen(true)}
          onSignOut={signOut}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard settings={settings} appointments={appointments} setAppointments={setAppointments} tasks={tasks} setTasks={setTasks} patients={patients} doctors={doctors} currentUser={tenantUser} systemUsers={[tenantUser]} />} />
            <Route path="/agenda" element={<Agenda appointments={appointments} setAppointments={setAppointments} patients={patients} doctors={doctors} globalSchedule={settings.globalSchedule || {}} settings={settings} />} />
            <Route path="/patients" element={<Patients patients={patients} setPatients={setPatients} appointments={appointments} clinicSettings={settings} currentUser={tenantUser} team={doctors} />} />
            <Route path="/doctors" element={<Doctors doctors={doctors} setDoctors={setDoctors} appointments={appointments} branches={branches} patients={patients} clinicSettings={settings} setAppointments={setAppointments} />} />
            <Route path="/branches" element={<Branches branches={branches} setBranches={setBranches} doctors={doctors} setDoctors={setDoctors} appointments={appointments} />} />
            <Route path="/metrics" element={<Metrics appointments={appointments} doctors={doctors} patients={patients} settings={settings} branches={branches} />} />
            <Route path="/settings" element={<Settings settings={settings} setSettings={setSettings} onToggleTheme={() => setDarkMode(!darkMode)} darkMode={darkMode} systemUsers={[tenantUser]} setSystemUsers={() => {}} doctors={doctors} setDoctors={setDoctors} patients={patients} setPatients={setPatients} branches={branches} setBranches={setBranches} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          {isVoiceOpen && <VoiceAssistant onClose={() => setIsVoiceOpen(false)} settings={settings} appointments={appointments} setAppointments={setAppointments} doctors={doctors} branches={branches} patients={patients} setPatients={setPatients} />}
        </Layout>
      ) : (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
            <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-8 shadow-lg shadow-primary/20"></div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-2">Conectando con tu Clínica...</h1>
            <p className="text-xs text-slate-500 font-black uppercase tracking-[0.2em] max-w-xs leading-relaxed">
                Estamos recuperando tu configuración personalizada desde la nube.
            </p>
            
            {syncTimeout && (
                <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 space-y-6">
                    <p className="text-rose-500 text-[10px] font-bold uppercase bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-500/20">La sincronización está tardando más de lo habitual</p>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => refreshContext()} className="px-8 py-4 bg-white text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Reintentar Lectura</button>
                        <button onClick={() => signOut()} className="px-8 py-2 text-slate-500 font-bold uppercase text-[9px] hover:text-white transition-colors">Cerrar Sesión y Volver a entrar</button>
                    </div>
                </div>
            )}
        </div>
      )}
    </PrivateRoute>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
