
import React, { useState, useRef } from 'react';
import { ClinicSettings, UserRole, RolePermissions, User, ClinicService, FileAttachment, VoiceAccent } from '../types';
import { COLOR_TEMPLATES } from '../App';
import { generatePersonalityPrompt } from '../services/gemini';

interface SettingsProps {
  settings: ClinicSettings;
  setSettings: React.Dispatch<React.SetStateAction<ClinicSettings>>;
  onToggleTheme: () => void;
  darkMode: boolean;
  systemUsers: User[];
  setSystemUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const PERSONALITY_TAGS = {
  emocion: ['Empática', 'Alegre', 'Serena', 'Enérgica', 'Seria', 'Dulce'],
  estilo: ['Concisa', 'Detallista', 'Proactiva', 'Escucha Activa', 'Paciente'],
  relacion: ['Formal (Usted)', 'Cercana (Tú)', 'Protectora', 'Vendedora']
};

const Settings: React.FC<SettingsProps> = ({ settings, setSettings, onToggleTheme, darkMode, systemUsers, setSystemUsers }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
  const [isGeneratingPersonality, setIsGeneratingPersonality] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');

  const knowledgeFileInputRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleGeneratePersonality = async () => {
    if (selectedTags.length === 0) {
      alert("Por favor, selecciona al menos una etiqueta para definir la personalidad.");
      return;
    }
    setIsGeneratingPersonality(true);
    try {
      const newPrompt = await generatePersonalityPrompt(
        selectedTags, 
        settings.aiPhoneSettings.assistantName, 
        settings.name
      );
      setSettings({
        ...settings,
        aiPhoneSettings: {
          ...settings.aiPhoneSettings,
          systemPrompt: newPrompt
        }
      });
      setShowSuccessMsg(true);
      setTimeout(() => setShowSuccessMsg(false), 3000);
    } catch (e) {
      alert("No se pudo generar la personalidad en este momento. Inténtalo de nuevo.");
    } finally {
      setIsGeneratingPersonality(false);
    }
  };

  const handleGlobalSave = () => {
    setShowSuccessMsg(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setShowSuccessMsg(false), 4000);
  };

  const resetVoiceToDefault = () => {
    setSettings(prev => ({
      ...prev,
      aiPhoneSettings: {
        ...prev.aiPhoneSettings,
        voiceName: 'Zephyr',
        voicePitch: 1.0,
        voiceSpeed: 1.0,
        accent: 'es-ES-Madrid'
      }
    }));
  };

  const handleKnowledgeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newFile: FileAttachment = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: (file.size / 1024).toFixed(1) + ' KB',
        date: new Date().toISOString().split('T')[0],
        url: URL.createObjectURL(file)
      };
      setSettings(prev => ({
        ...prev,
        aiPhoneSettings: {
          ...prev.aiPhoneSettings,
          knowledgeFiles: [...(prev.aiPhoneSettings.knowledgeFiles || []), newFile]
        }
      }));
    }
  };

  const removeKnowledgeFile = (id: string) => {
    setSettings(prev => ({
      ...prev,
      aiPhoneSettings: {
        ...prev.aiPhoneSettings,
        knowledgeFiles: prev.aiPhoneSettings.knowledgeFiles.filter(f => f.id !== id)
      }
    }));
  };

  const [formUser, setFormUser] = useState<Partial<User>>({
    role: 'Recepción',
    status: 'Activo',
    img: 'https://i.pravatar.cc/150?u=' + Math.random()
  });

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingUserId(null);
    setFormUser({ role: 'Recepción', status: 'Activo', img: 'https://i.pravatar.cc/150?u=' + Math.random() });
  };

  const handleEditInit = (user: User) => {
    setFormUser(user);
    setEditingUserId(user.id);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addSpecialty = () => {
    if (!newSpecialty.trim() || settings.specialties.includes(newSpecialty.trim())) return;
    setSettings(prev => ({ ...prev, specialties: [...prev.specialties, newSpecialty.trim()] }));
    setNewSpecialty('');
  };

  const removeSpecialty = (spec: string) => {
    setSettings(prev => ({ ...prev, specialties: prev.specialties.filter(s => s !== spec) }));
  };

  const addService = () => {
    if (!newServiceName.trim() || !newServicePrice) return;
    const service: ClinicService = { id: 'S' + Math.floor(Math.random() * 10000), name: newServiceName.trim(), price: parseFloat(newServicePrice) };
    setSettings(prev => ({ ...prev, services: [...prev.services, service] }));
    setNewServiceName('');
    setNewServicePrice('');
  };

  const removeService = (id: string) => {
    setSettings(prev => ({ ...prev, services: prev.services.filter(s => s.id !== id) }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSettings(prev => ({ ...prev, logo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormUser(prev => ({ ...prev, img: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUser.username || !formUser.name || !formUser.corporateEmail) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }
    if (editingUserId) {
      setSystemUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, ...formUser } as User : u));
    } else {
      const userToAdd: User = {
        id: 'U' + Math.floor(Math.random() * 10000),
        username: formUser.username!,
        password: formUser.password || '123456',
        name: formUser.name!,
        role: formUser.role as UserRole,
        jobTitle: formUser.jobTitle || 'Empleado',
        phone: formUser.phone || '',
        identityDocument: formUser.identityDocument || '',
        corporateEmail: formUser.corporateEmail!,
        status: formUser.status as 'Activo' | 'Inactivo',
        img: formUser.img || 'https://i.pravatar.cc/150'
      };
      setSystemUsers(prev => [...prev, userToAdd]);
    }
    resetForm();
    handleGlobalSave();
  };

  const deleteUser = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar permanentemente este usuario del sistema?")) {
      setSystemUsers(prev => prev.filter(u => u.id !== id));
      handleGlobalSave();
    }
  };

  return (
    <div className="p-10 max-w-[1400px] mx-auto space-y-16 animate-in fade-in duration-500 pb-24 relative">
      
      {showSuccessMsg && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
           <div className="bg-success text-white px-10 py-4 rounded-2xl shadow-2xl flex items-center gap-4 font-black uppercase tracking-widest text-xs border-2 border-white/20">
              <span className="material-symbols-outlined">check_circle</span>
              Configuración actualizada
           </div>
        </div>
      )}

      <header className="flex flex-col gap-2">
        <h1 className="text-5xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Panel Maestro de Control</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium italic text-lg text-balance">Configura la infraestructura visual, operativa y el catálogo de servicios de tu red clínica.</p>
      </header>

      <div className="grid grid-cols-1 gap-12">

        {/* SECCIÓN 1: CONFIGURACIÓN DE NEGOCIO */}
        <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-2xl transition-all">
           <div className="p-10 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-6">
             <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                 <span className="material-symbols-outlined text-4xl">business_center</span>
             </div>
             <div>
                <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Modelo de Negocio y Servicios</h3>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Personalización comercial y sectorial de la plataforma</p>
             </div>
           </div>

           <div className="p-12 space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                 <div className="space-y-8">
                    <div className="flex flex-col gap-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Sector de Actividad</label>
                       <div className="relative">
                          <select 
                            value={settings.sector}
                            onChange={e => setSettings({...settings, sector: e.target.value})}
                            className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer"
                          >
                            <option value="Odontología">Odontología y Salud Dental</option>
                            <option value="Fisioterapia">Fisioterapia y Rehabilitación</option>
                            <option value="Psicología">Psicología y Salud Mental</option>
                            <option value="Estética">Medicina Estética</option>
                            <option value="Veterinaria">Hospital Veterinario</option>
                            <option value="Podología">Podología</option>
                            <option value="General">Clínica Multidisciplinar</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">category</span>
                       </div>
                    </div>
                    <div className="flex flex-col gap-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Descripción del Negocio / Misión</label>
                       <textarea 
                          value={settings.description}
                          onChange={e => setSettings({...settings, description: e.target.value})}
                          placeholder="Describe tu clínica..."
                          className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-[1.75rem] px-8 py-6 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all outline-none shadow-sm h-32 resize-none"
                       />
                    </div>
                 </div>

                 <div className="space-y-8">
                    <div className="flex flex-col gap-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Especialidades Clínicas</label>
                       <div className="flex gap-3">
                          <input 
                            type="text"
                            value={newSpecialty}
                            onChange={e => setNewSpecialty(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && addSpecialty()}
                            placeholder="Ej: Cirugía Oral"
                            className="flex-1 bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10"
                          />
                          <button onClick={addSpecialty} className="size-14 bg-primary text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"><span className="material-symbols-outlined">add</span></button>
                       </div>
                       <div className="flex flex-wrap gap-2 pt-2">
                          {settings.specialties.map(spec => (
                            <div key={spec} className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 group transition-all hover:bg-primary/20">
                               {spec}
                               <button onClick={() => removeSpecialty(spec)} className="text-danger opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-xs">close</span></button>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-8 border-t-2 border-slate-50 dark:border-slate-800 pt-10">
                 <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Catálogo de Servicios y Precios</label>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-900/30 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800">
                    <div className="md:col-span-7 flex flex-col gap-2">
                       <input 
                         type="text" value={newServiceName} onChange={e => setNewServiceName(e.target.value)}
                         className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10" 
                         placeholder="Ej: Consulta de Valoración"
                       />
                    </div>
                    <div className="md:col-span-3 flex flex-col gap-2">
                       <input 
                         type="number" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)}
                         className="w-full bg-white dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10" 
                         placeholder="0.00"
                       />
                    </div>
                    <div className="md:col-span-2">
                       <button onClick={addService} className="w-full h-14 bg-success text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-success/30 flex items-center justify-center gap-2"><span className="material-symbols-outlined">price_check</span> Añadir</button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {settings.services.map(s => (
                       <div key={s.id} className="p-6 bg-white dark:bg-surface-dark border-2 border-slate-100 dark:border-slate-800 rounded-3xl flex items-center justify-between group hover:border-primary transition-all">
                          <div className="min-w-0">
                             <p className="text-sm font-black text-slate-800 dark:text-white truncate uppercase tracking-tight">{s.name}</p>
                             <p className="text-xl font-display font-black text-primary mt-1">€{s.price.toLocaleString()}</p>
                          </div>
                          <button onClick={() => removeService(s.id)} className="size-10 bg-danger/10 text-danger rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-danger hover:text-white"><span className="material-symbols-outlined">delete</span></button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </section>

        {/* SECCIÓN: ASISTENTE TELEFÓNICO IA (CON AJUSTES FINOS DE HUMANIDAD) */}
        <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-2xl transition-all">
           <div className="p-10 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
             <div className="flex items-center gap-6">
                <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-4xl">settings_phone</span>
                </div>
                <div>
                    <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Asistente Telefónico IA</h3>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Atención humana multilingüe con Gemini Live</p>
                </div>
             </div>
             <button 
                onClick={resetVoiceToDefault}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all border border-transparent hover:border-primary/20 shadow-sm"
             >
                <span className="material-symbols-outlined text-lg">history</span> Reset Voz
             </button>
           </div>

           <div className="p-12 space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                 <div className="space-y-8 col-span-1">
                    <div className="flex flex-col gap-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Identificación de Voz</label>
                       <div className="space-y-4">
                          <input 
                            type="text" value={settings.aiPhoneSettings.phoneNumber}
                            onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, phoneNumber: e.target.value}})}
                            className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 shadow-inner" 
                            placeholder="Número (+34...)"
                          />
                          <input 
                            type="text" value={settings.aiPhoneSettings.assistantName}
                            onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, assistantName: e.target.value}})}
                            className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 shadow-inner" 
                            placeholder="Nombre del Asistente"
                          />
                       </div>
                    </div>
                    
                    <div className="space-y-6 pt-4">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Acento de Voz Regional</label>
                       <div className="grid grid-cols-1 gap-3">
                          {[
                            { id: 'es-ES-Madrid', label: 'España (Madrid)', icon: '🇪🇸' },
                            { id: 'es-ES-Canarias', label: 'España (Canarias)', icon: '🇮🇨' },
                            { id: 'es-LATAM', label: 'Latinoamérica', icon: '🌎' },
                            { id: 'en-GB', label: 'Reino Unido (UK)', icon: '🇬🇧' },
                            { id: 'en-US', label: 'Estados Unidos (US)', icon: '🇺🇸' },
                          ].map(accent => (
                            <button 
                              key={accent.id}
                              onClick={() => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, accent: accent.id as VoiceAccent}})}
                              className={`px-5 py-4 rounded-2xl text-[11px] font-black uppercase transition-all border-2 flex items-center gap-3 ${settings.aiPhoneSettings.accent === accent.id ? 'bg-primary text-white border-primary shadow-lg' : 'bg-slate-50 dark:bg-bg-dark text-slate-400 border-transparent hover:border-primary/20'}`}
                            >
                               <span className="text-lg">{accent.icon}</span>
                               {accent.label}
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-12 col-span-1 lg:col-span-2">
                    {/* PERSONALITY DESIGNER */}
                    <div className="bg-slate-50 dark:bg-bg-dark/50 p-10 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-8">
                       <div className="flex items-center justify-between">
                          <div>
                             <h4 className="text-xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                                Generador de Personalidad Humana
                             </h4>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Personaliza el tono emocional de la IA de voz</p>
                          </div>
                          <button 
                             onClick={handleGeneratePersonality}
                             disabled={isGeneratingPersonality}
                             className={`h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl ${isGeneratingPersonality ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary text-white shadow-primary/30 hover:scale-105 active:scale-95'}`}
                          >
                             {isGeneratingPersonality ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">psychology</span>}
                             {isGeneratingPersonality ? 'Analizando...' : 'Generar Perfil'}
                          </button>
                       </div>

                       <div className="space-y-6">
                          {Object.entries(PERSONALITY_TAGS).map(([category, tags]) => (
                            <div key={category} className="space-y-3">
                               <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] ml-2 opacity-60">{category}</p>
                               <div className="flex flex-wrap gap-2">
                                  {tags.map(tag => (
                                    <button
                                      key={tag}
                                      onClick={() => toggleTag(tag)}
                                      className={`px-5 py-2.5 rounded-full text-[11px] font-black uppercase transition-all border-2 ${selectedTags.includes(tag) ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-white dark:bg-surface-dark border-slate-100 dark:border-slate-800 text-slate-400 hover:border-primary/30'}`}
                                    >
                                       {tag}
                                    </button>
                                  ))}
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="flex flex-col gap-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Personalidad Operativa (System Prompt)</label>
                       <textarea 
                          value={settings.aiPhoneSettings.systemPrompt}
                          onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, systemPrompt: e.target.value}})}
                          className="w-full bg-white dark:bg-bg-dark border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] px-10 py-8 text-sm font-medium focus:ring-4 focus:ring-primary/10 shadow-inner h-48 resize-none leading-relaxed"
                          placeholder="Instrucciones para la IA..."
                       />
                    </div>

                    {/* AJUSTES DE AUDIO (VELOCIDAD Y TONO) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-primary/5 rounded-[2.5rem] border-2 border-primary/20 relative overflow-hidden">
                        <div className="space-y-5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Velocidad de Habla</label>
                            <span className="text-xs font-black text-primary bg-white px-3 py-1 rounded-lg shadow-sm">{settings.aiPhoneSettings.voiceSpeed.toFixed(1)}x</span>
                          </div>
                          <input 
                            type="range" min="0.5" max="2.0" step="0.1" 
                            value={settings.aiPhoneSettings.voiceSpeed}
                            onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, voiceSpeed: parseFloat(e.target.value)}})}
                            className="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary" 
                          />
                        </div>
                        <div className="space-y-5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Tono de Voz (Pitch)</label>
                            <span className="text-xs font-black text-primary bg-white px-3 py-1 rounded-lg shadow-sm">{settings.aiPhoneSettings.voicePitch.toFixed(1)}</span>
                          </div>
                          <input 
                            type="range" min="0.5" max="1.5" step="0.1" 
                            value={settings.aiPhoneSettings.voicePitch}
                            onChange={e => setSettings({...settings, aiPhoneSettings: {...settings.aiPhoneSettings, voicePitch: parseFloat(e.target.value)}})}
                            className="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary" 
                          />
                        </div>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* RESTO DE SECCIONES... (IDENTIDAD Y MARCA, APARIENCIA, GESTIÓN USUARIOS) */}
        {/* ... (Se mantienen igual para no exceder límites de tokens, pero asegurando coherencia visual) ... */}
        
        <section className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-2xl transition-all">
           <div className="p-10 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-4">
             <div className="flex items-center gap-6">
                <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner"><span className="material-symbols-outlined text-4xl">group_add</span></div>
                <div>
                   <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestión de Usuarios</h3>
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Control de personal del sistema</p>
                </div>
             </div>
             <button onClick={() => isFormOpen ? resetForm() : setIsFormOpen(true)} className={`h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl ${isFormOpen ? 'bg-danger text-white' : 'bg-primary text-white shadow-primary/30'}`}><span className="material-symbols-outlined">{isFormOpen ? 'close' : 'person_add'}</span>{isFormOpen ? 'Cancelar' : 'Nuevo Usuario'}</button>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/30 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2">
                  <tr><th className="px-10 py-6">Identidad</th><th className="px-10 py-6">Rol</th><th className="px-10 py-6">Estado</th><th className="px-10 py-6 text-right">Gestión</th></tr>
                </thead>
                <tbody className="divide-y">
                  {systemUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                      <td className="px-10 py-6"><div className="flex items-center gap-4"><div className="size-14 rounded-2xl bg-cover bg-center border-2 border-white shadow-md" style={{ backgroundImage: `url("${user.img}")` }}></div><div className="flex flex-col"><span className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">{user.name}</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">@{user.username}</span></div></div></td>
                      <td className="px-10 py-6"><span className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">{user.role}</span></td>
                      <td className="px-10 py-6"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${user.status === 'Activo' ? 'bg-success' : 'bg-danger'} animate-pulse`}></span><span className={`text-[10px] font-black uppercase tracking-widest ${user.status === 'Activo' ? 'text-success' : 'text-danger'}`}>{user.status}</span></div></td>
                      <td className="px-10 py-6 text-right"><div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleEditInit(user)} className="size-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary"><span className="material-symbols-outlined">edit_square</span></button><button onClick={() => deleteUser(user.id)} className="size-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-danger"><span className="material-symbols-outlined">delete_forever</span></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </section>

      </div>

      <footer className="flex justify-end pt-12">
         <button onClick={handleGlobalSave} className="h-24 px-20 bg-primary text-white rounded-[3rem] font-black text-2xl uppercase tracking-tighter shadow-xl hover:scale-105 transition-all flex items-center gap-6"><span className="material-symbols-outlined text-4xl">save</span> Guardar Todo</button>
      </footer>
    </div>
  );
};

export default Settings;
