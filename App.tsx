
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';

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
  { id: 'sunset', name: 'Atardecer', primary: '#f59e0b', dark: '#d97706', light: '#fef3c7' },
  { id: 'coal', name: 'Carbón', primary: '#475569', dark: '#1e293b', light: '#f1f5f9' },
];

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, tenantUser, loading, refreshContext } = useAuth();
  const [onboarding, setOnboarding] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const runOnboarding = async () => {
      if (user && !tenantUser && !loading && !onboarding) {
        console.log('🚀 [ONBOARDING_TRIGGER] Preparando datos de clínica...');
        setOnboarding(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        try {
          const res = await fetch('/api/onboarding/ensure', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}` 
            }
          });
          
          if (res.ok) {
            console.log('✅ [ONBOARDING_SUCCESS]');
            await refreshContext();
          }
        } catch (e) {
          console.error("❌ Onboarding failed:", e);
        } finally {
          setOnboarding(false);
        }
      }
    };
    runOnboarding();
  }, [user, tenantUser, loading, onboarding, refreshContext]);

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

  if (onboarding) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-8">
        <div className="size-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6">
           <span className="material-symbols-outlined text-primary text-4xl animate-bounce">cloud_sync</span>
        </div>
        <p className="text-white font-display font-black text-xl uppercase tracking-widest">Preparando tu Espacio</p>
        <p className="text-slate-500 text-sm mt-2 italic">Configurando bases de datos multi-tenant...</p>
      </div>
    );
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, settings, setSettings, tenantUser, signOut, loading } = useAuth();
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const location = useLocation();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [darkMode, setDarkMode] = useState(false);

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

  const publicRoutes = ['/login', '/signup', '/auth/callback'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  // 1. Si es una ruta pública, renderizamos sin Layout
  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    );
  }

  // 2. Si hay un usuario pero los datos del tenant aún no están listos, mostramos loader preventivo
  if (user && (!tenantUser || !settings)) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
             <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizando Core...</p>
          </div>
        </div>
    );
  }

  // 3. Solo renderizamos el bloque de Layout si tenemos settings y tenantUser garantizados
  // Si user es null, PrivateRoute se encargará de redirigir, pero aquí evitamos el crash de Layout.
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
            <Route path="/" element={<Dashboard settings={settings} appointments={appointments} setAppointments={setAppointments} tasks={tasks} setTasks={setTasks} patients={patients} doctors={doctors} currentUser={tenantUser} systemUsers={[tenantUser]} />} />
            <Route path="/agenda" element={<Agenda appointments={appointments} setAppointments={setAppointments} patients={patients} doctors={doctors} globalSchedule={settings.globalSchedule || {}} settings={settings} />} />
            <Route path="/patients" element={<Patients patients={patients} setPatients={setPatients} appointments={appointments} clinicSettings={settings} currentUser={tenantUser} team={doctors} />} />
            <Route path="/doctors" element={<Doctors doctors={doctors} setDoctors={setDoctors} appointments={appointments} branches={branches} patients={patients} clinicSettings={settings} setAppointments={setAppointments} />} />
            <Route path="/branches" element={<Branches branches={branches} setBranches={setBranches} doctors={doctors} setDoctors={setDoctors} appointments={appointments} />} />
            <Route path="/metrics" element={<Metrics appointments={appointments} doctors={doctors} patients={patients} settings={settings} branches={branches} />} />
            <Route path="/settings" element={
              <Settings 
                settings={settings} 
                setSettings={(newS: any) => {
                  setSettings(newS);
                  supabase.from('tenant_settings').upsert({ clinic_id: tenantUser.clinic_id, settings: newS });
                }} 
                onToggleTheme={() => setDarkMode(!darkMode)} 
                darkMode={darkMode} 
                systemUsers={[tenantUser]} 
                setSystemUsers={() => {}} 
                doctors={doctors} 
                setDoctors={setDoctors} 
                patients={patients} 
                setPatients={setPatients} 
                branches={branches} 
                setBranches={setBranches} 
              />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {isVoiceOpen && <VoiceAssistant onClose={() => setIsVoiceOpen(false)} settings={settings} appointments={appointments} setAppointments={setAppointments} doctors={doctors} branches={branches} patients={patients} setPatients={setPatients} />}
        </Layout>
      ) : (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </PrivateRoute>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
