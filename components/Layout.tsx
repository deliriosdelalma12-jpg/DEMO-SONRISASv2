
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
  onOpenCurrentProfile?: () => void; // New prop
}

const Layout: React.FC<LayoutProps> = ({ children, darkMode, onToggleTheme, currentUser, settings, onOpenVoiceAssistant, onOpenCurrentProfile }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  // Helper to check if current user has permission for a specific route/feature
  const hasPermission = (requiredPermission: PermissionId) => {
    const userRole = settings.roles.find(r => r.id === currentUser.role);
    if (!userRole) return false; // Default to blocked if role not found
    return userRole.permissions.includes(requiredPermission);
  };

  const navItemsRaw = [
    { path: '/', label: 'Dashboard', icon: 'dashboard', perm: 'view_dashboard' },
    { path: '/agenda', label: 'Agenda', icon: 'calendar_month', perm: 'view_agenda' },
    { path: '/patients', label: 'Pacientes', icon: 'group', perm: 'view_patients' },
    { path: '/doctors', label: 'Médicos', icon: 'medical_services', perm: 'view_doctors' },
    { path: '/hr', label: 'Personal', icon: 'badge_calendar', perm: 'view_hr' },
    { path: '/metrics', label: 'Métricas', icon: 'leaderboard', perm: 'view_metrics' },
    { path: '/settings', label: 'Configuración', icon: 'settings', perm: 'view_settings' },
  ];

  // Filter items based on permissions
  const navItems = navItemsRaw.filter(item => hasPermission(item.perm as PermissionId));

  return (
    <div className="flex h-screen overflow-hidden bg-bg-light dark:bg-bg-dark transition-colors duration-300 no-print">
      {/* SIDEBAR: Ahora solo contiene el logo y la navegación */}
      <aside className="w-[280px] border-r border-border-light dark:border-border-dark flex flex-col hidden lg:flex shrink-0 bg-white dark:bg-surface-dark transition-colors">
        <div className="p-8">
          <Link to="/" className={`flex items-center gap-3 ${!settings.name ? 'justify-center' : ''}`}>
            <div className={`${settings.name ? 'size-10' : 'w-full h-16'} text-primary transition-all duration-300`}>
              <img 
                src={settings.logo} 
                alt="Logo" 
                className={`w-full h-full object-contain ${!settings.name ? 'object-left' : ''}`} 
              />
            </div>
            {settings.name && (
              <h2 className="text-slate-900 dark:text-white text-2xl font-display font-bold tracking-tight truncate">
                {settings.name}
              </h2>
            )}
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`flex items-center gap-3 px-4 py-4 rounded-2xl transition-all group ${
                isActive(item.path) 
                  ? 'bg-primary/10 text-primary shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-bg-light dark:hover:bg-bg-dark hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined text-2xl ${isActive(item.path) ? 'filled' : ''}`}>{item.icon}</span>
              <span className="text-sm font-bold tracking-tight">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* El pie del sidebar ahora está limpio */}
        <div className="p-8 opacity-20 pointer-events-none">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">v2.5.0-native</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* HEADER: Rediseñado para incluir el perfil arriba a la derecha en grande */}
        <header className="h-24 border-b border-border-light dark:border-border-dark flex items-center justify-between px-10 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl shrink-0 z-30 transition-all no-print relative">
          
          {/* Spacer izquierdo para equilibrar el layout */}
          <div className="flex-1"></div>

          {/* Botón Asistente Telefónico (Centrado y más pequeño) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <button 
              onClick={onOpenVoiceAssistant}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-transform shadow-lg shadow-primary/30 group"
            >
              <div className="p-1 bg-white/20 rounded-full group-hover:animate-pulse">
                <span className="material-symbols-outlined text-base">call</span>
              </div>
              Asistente AI
            </button>
          </div>

          {/* Lado Derecho: Perfil y Tema (ARRIBA A LA DERECHA EN GRANDE) */}
          <div className="flex items-center gap-8 pl-8 flex-1 justify-end">
            
            {/* Toggle de Tema Discreto */}
            <button 
              onClick={onToggleTheme} 
              className="size-12 flex items-center justify-center rounded-2xl bg-bg-light dark:bg-bg-dark text-slate-400 hover:text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20"
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              <span className="material-symbols-outlined text-2xl">
                {darkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Separador Vertical */}
            <div className="w-px h-10 bg-border-light dark:bg-border-dark"></div>

            {/* Perfil del Usuario en Grande */}
            <div className="flex items-center gap-5">
              <div className="text-right flex flex-col items-end">
                <p className="text-xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                  {currentUser.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                   <span className="size-1.5 bg-success rounded-full animate-pulse"></span>
                   <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none">
                     {/* Show Role Name instead of raw ID */}
                     {settings.roles.find(r => r.id === currentUser.role)?.name || 'Usuario'}
                   </p>
                </div>
              </div>
              
              <div className="relative group">
                <div 
                  onClick={onOpenCurrentProfile}
                  className="size-14 rounded-2xl bg-cover bg-center border-2 border-primary/20 shadow-xl shadow-primary/10 transform group-hover:scale-105 transition-transform cursor-pointer" 
                  style={{ backgroundImage: `url("${currentUser.img}")` }}
                  title="Ver Mi Ficha"
                ></div>
                <div className="absolute -bottom-1 -right-1 size-5 bg-success border-2 border-white dark:border-surface-dark rounded-full"></div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-bg-light dark:bg-bg-dark transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
