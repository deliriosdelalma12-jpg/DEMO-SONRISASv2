
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
      // Solo si el usuario está autenticado en Auth pero no existe en public.users
      if (user && !tenantUser && !loading && !onboarding) {
        console.log('🚀 Triggering Onboarding...');
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
            console.log('✅ Onboarding success');
            await refreshContext();
          } else {
            console.error('❌ Onboarding failed endpoint status:', res.status);
          }
        } catch (e) {
          console.error("❌ Onboarding network error:", e);
        } finally {
          setOnboarding(false);
        }
      }
    };
    runOnboarding();
  }, [user, tenantUser, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">Sincronizando Core SaaS...</p>
        </div>
      </div>
    );
  }

  if (onboarding) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="size-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-4">
             <span className="material-symbols-outlined text-primary text-4xl animate-bounce">cloud_sync</span>
          </div>
          <p className="text-white font-display font-black text-xl uppercase tracking-tight">Preparando tu Clínica</p>
          <p className="text-slate-500 text-sm font-medium italic">Configurando bases de datos multi-tenant...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, settings, setSettings, tenantUser, signOut, loading } = useAuth();
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const location = useLocation();
  
  // Real data state
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

  // Evitar blank screen si estamos cargando settings tras login exitoso
  if (user && !isPublicRoute && (!tenantUser || !settings)) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">Cargando Ajustes de Clínica...</p>
          </div>
        </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      <Route path="/*" element={
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
                      supabase.from('tenant_settings').upsert({ 
                        clinic_id: tenantUser.clinic_id, 
                        settings: newS 
                      }).then(({ error }) => {
                        if (error) console.error("Error persisting settings:", error);
                      });
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
          ) : null}
        </PrivateRoute>
      } />
    </Routes>
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
