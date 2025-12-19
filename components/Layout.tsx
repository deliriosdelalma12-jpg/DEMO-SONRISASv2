
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/agenda', label: 'Agenda', icon: 'calendar_month' },
    { path: '/patients', label: 'Pacientes', icon: 'group' },
    { path: '/doctors', label: 'Médicos', icon: 'stethoscope' },
    { path: '/metrics', label: 'Métricas', icon: 'monitoring' },
    { path: '/services', label: 'Servicios', icon: 'medical_services' },
    { path: '/clinics', label: 'Clínicas', icon: 'apartment' },
    { path: '/users', label: 'Usuarios', icon: 'person_outline' },
    { path: '/settings', label: 'Configuración', icon: 'settings' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background-dark">
      {/* Sidebar */}
      <aside className="w-[280px] border-r border-border-dark flex flex-col hidden lg:flex shrink-0">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="size-10 text-primary">
              <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
              </svg>
            </div>
            <h2 className="text-white text-2xl font-black tracking-tight">MediClinic</h2>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                isActive(item.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary-dark hover:bg-surface-dark hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive(item.path) ? 'filled' : ''}`}>
                {item.icon}
              </span>
              <span className="text-sm font-bold">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-surface-dark p-4 rounded-2xl border border-border-dark">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-cover bg-center" style={{ backgroundImage: 'url("https://picsum.photos/100/100?random=1")' }}></div>
              <div>
                <p className="text-sm font-bold text-white">Dr. Carlos Vega</p>
                <p className="text-xs text-text-secondary">Administrador</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border-dark flex items-center justify-between px-6 bg-background-dark/80 backdrop-blur shrink-0 z-30">
          <div className="flex items-center flex-1 max-w-xl">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">search</span>
              <input
                type="text"
                placeholder="Buscar paciente o cita..."
                className="w-full bg-surface-dark border-none rounded-full pl-10 pr-4 text-sm text-white placeholder-text-secondary focus:ring-1 focus:ring-primary h-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 ml-4">
             <button className="flex items-center gap-2 h-9 px-4 bg-primary hover:bg-primary-dark text-background-dark text-sm font-bold rounded-full transition-colors">
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span className="hidden sm:inline">Nueva cita</span>
            </button>
            <button className="p-2 text-text-secondary hover:text-white transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#131811]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
