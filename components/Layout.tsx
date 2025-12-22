
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, ClinicSettings, PermissionId } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  onToggleTheme: () => void;
  currentUser: User;
  settings: ClinicSettings;
  onOpenVoiceAssistant: () => void;
  onOpenCurrentProfile?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, darkMode, onToggleTheme, currentUser, settings, onOpenVoiceAssistant, onOpenCurrentProfile }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const hasPermission = (requiredPermission: PermissionId) => {
    const userRole = settings.roles.find(r => r.id === currentUser.role);
    if (!userRole) return false; 
    return userRole.permissions.includes(requiredPermission);
  };

  const navItemsRaw = [
    { path: '/', label: 'Dashboard', icon: 'dashboard', perm: 'view_dashboard' },
    { path: '/agenda', label: 'Agenda', icon: 'calendar_month', perm: 'view_agenda' },
    { path: '/patients', label: 'Pacientes', icon: 'group', perm: 'view_patients' },
    { path: '/doctors', label: 'Médicos', icon: 'medical_services', perm: 'view_doctors' },
    { path: '/branches', label: 'Sucursales', icon: 'apartment', perm: 'view_branches' },
    { path: '/hr', label: 'Calendario de Personal', icon: 'event_note', perm: 'view_hr' },
    { path: '/metrics', label: 'Métricas', icon: 'leaderboard', perm: 'view_metrics' },
    { path: '/settings', label: 'Configuración', icon: 'settings', perm: 'view_settings' },
  ];

  const navItems = navItemsRaw.filter(item => hasPermission(item.perm as PermissionId));

  return (
    <div className="flex min-h-screen w-full bg-bg-light dark:bg-bg-dark transition-colors duration-300 no-print">
      {/* SIDEBAR - STICKY */}
      <aside className="w-[260px] border-r border-border-light dark:border-border-dark flex flex-col hidden lg:flex shrink-0 bg-white dark:bg-surface-dark transition-colors h-screen sticky top-0 z-50">
        <div className="p-6 h-20 flex items-center shrink-0">
          <Link to="/" className={`flex items-center gap-3 ${!settings.name ? 'justify-center' : ''} w-full`}>
            {/* SI EL NOMBRE ESTÁ VACÍO, EL LOGO OCUPA EL ANCHO COMPLETO */}
            <div className={`${settings.name ? 'size-8' : 'w-full h-12 flex justify-center'} text-primary transition-all duration-300`}>
              <img 
                src={settings.logo} 
                alt="Logo" 
                className={`w-full h-full object-contain ${!settings.name ? 'scale-125' : ''}`} 
              />
            </div>
            {settings.name && (
              <h2 className="text-slate-900 dark:text-white text-lg font-display font-bold tracking-tight truncate">
                {settings.name}
              </h2>
            )}
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`flex items-center gap-3 px-3 py-3 rounded-md transition-all group ${
                isActive(item.path) 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${isActive(item.path) ? 'filled' : ''}`}>{item.icon}</span>
              <span className="text-sm font-bold tracking-tight">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 opacity-40 pointer-events-none border-t border-border-light dark:border-border-dark shrink-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">v3.0.0-flat</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER - STICKY */}
        <header className="h-20 border-b border-border-light dark:border-border-dark flex items-center justify-between px-8 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-xl shrink-0 z-40 transition-all no-print sticky top-0">
          
          <div className="flex-1 flex items-center">
            {/* RAZÓN SOCIAL EN LA PARTE SUPERIOR */}
            <h1 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] truncate max-w-xs">
              {settings.businessName}
            </h1>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <button 
              onClick={onOpenVoiceAssistant}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-bold uppercase tracking-widest text-[10px] hover:bg-primary-dark transition-colors group shadow-lg shadow-primary/20"
            >
              <div className="p-0.5 bg-white/20 rounded-full group-hover:animate-pulse">
                <span className="material-symbols-outlined text-sm">call</span>
              </div>
              Asistente AI
            </button>
          </div>

          <div className="flex items-center gap-6 pl-8 flex-1 justify-end">
            
            <button 
              onClick={onToggleTheme} 
              className="size-10 flex items-center justify-center rounded-md bg-slate-50 dark:bg-bg-dark text-slate-400 hover:text-primary border border-border-light dark:border-border-dark transition-all"
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              <span className="material-symbols-outlined text-xl">
                {darkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            <div className="w-px h-8 bg-border-light dark:border-border-dark"></div>

            <div className="flex items-center gap-4">
              <div className="text-right flex flex-col items-end">
                <p className="text-base font-display font-bold text-slate-900 dark:text-white leading-none">
                  {currentUser.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                   <span className="size-1.5 bg-success rounded-full animate-pulse"></span>
                   <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none">
                     {settings.roles.find(r => r.id === currentUser.role)?.name || 'Usuario'}
                   </p>
                </div>
              </div>
              
              <div className="relative group">
                <div 
                  onClick={onOpenCurrentProfile}
                  className="size-10 rounded-md bg-cover bg-center border border-border-light dark:border-border-dark shadow-sm cursor-pointer hover:border-primary transition-colors" 
                  style={{ backgroundImage: `url("${currentUser.img}")` }}
                  title="Ver Mi Ficha"
                ></div>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA - NATURAL SCROLL */}
        <main className="flex-1 relative bg-bg-light dark:bg-bg-dark transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
