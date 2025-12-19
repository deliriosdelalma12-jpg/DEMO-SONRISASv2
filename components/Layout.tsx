
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  onToggleTheme: () => void;
  currentUser: User;
}

const Layout: React.FC<LayoutProps> = ({ children, darkMode, onToggleTheme, currentUser }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/agenda', label: 'Agenda', icon: 'calendar_month' },
    { path: '/patients', label: 'Pacientes', icon: 'group' },
    { path: '/doctors', label: 'Médicos', icon: 'medical_services' },
    { path: '/hr', label: 'Personal', icon: 'badge_calendar' },
    { path: '/metrics', label: 'Métricas', icon: 'leaderboard' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-bg-light dark:bg-bg-dark transition-colors duration-300 no-print">
      <aside className="w-[280px] border-r border-border-light dark:border-border-dark flex flex-col hidden lg:flex shrink-0 bg-white dark:bg-surface-dark">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="size-10 text-primary">
              <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                 <rect x="8" y="8" width="32" height="32" rx="8" fill="currentColor" fillOpacity="0.1" />
                 <path d="M24 12V36M12 24H36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-slate-900 dark:text-white text-2xl font-display font-bold tracking-tight">MediClinic</h2>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive(item.path) ? 'bg-primary/10 text-primary' : 'text-slate-500 dark:text-slate-400 hover:bg-bg-light dark:hover:bg-bg-dark hover:text-slate-900 dark:hover:text-white'}`}>
              <span className={`material-symbols-outlined ${isActive(item.path) ? 'filled' : ''}`}>{item.icon}</span>
              <span className="text-sm font-semibold">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-border-light dark:border-border-dark space-y-4">
          <button onClick={onToggleTheme} className="flex items-center gap-3 w-full p-3 rounded-xl bg-bg-light dark:bg-bg-dark text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined">{darkMode ? 'light_mode' : 'dark_mode'}</span>
            <span className="text-xs font-bold uppercase tracking-wider">{darkMode ? 'Tema Claro' : 'Tema Oscuro'}</span>
          </button>
          
          <div className="bg-bg-light dark:bg-bg-dark p-4 rounded-2xl border border-border-light dark:border-border-dark">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-cover bg-center border-2 border-primary/20" style={{ backgroundImage: `url("${currentUser.img}")` }}></div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate text-slate-900 dark:text-white">{currentUser.name}</p>
                <p className="text-[9px] text-slate-500 uppercase font-black">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b border-border-light dark:border-border-dark flex items-center justify-between px-8 bg-white/80 dark:bg-bg-dark/80 backdrop-blur shrink-0 z-30 transition-colors no-print">
          <div className="flex items-center flex-1 max-w-xl">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input type="text" placeholder="Buscar en expediente..." className="w-full bg-bg-light dark:bg-surface-dark border-none rounded-2xl pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary h-12" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
