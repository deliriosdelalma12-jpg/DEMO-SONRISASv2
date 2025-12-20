
import React, { useState, useMemo, useRef } from 'react';
import { Doctor, Appointment, AppointmentStatus, DaySchedule, FileAttachment, AttendanceRecord } from '../types';
import AppointmentDetailModal from '../components/AppointmentDetailModal';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// COMPONENTES AUXILIARES FUERA PARA EVITAR PÉRDIDA DE FOCO
const DataField = ({ label, value, onChange, type = "text", options = [], editing = true, placeholder = "", required = false }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
      {label} {required && <span className="text-danger">*</span>}
    </label>
    {editing ? (
      type === 'select' ? (
        <div className="relative">
          <select 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all appearance-none"
          >
            {options.map((opt: any) => (
              <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">unfold_more</span>
        </div>
      ) : (
        <input 
          type={type} 
          value={value} 
          placeholder={placeholder}
          onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
          className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
        />
      )
    ) : (
      <div className="bg-white/40 dark:bg-white/5 border border-transparent rounded-2xl px-5 py-3.5 flex items-center min-h-[50px]">
        <span className="text-sm font-black text-slate-800 dark:text-white leading-none">{value || '---'}</span>
      </div>
    )}
  </div>
);

const ScheduleRow = ({ day, schedule, onChange, editing }: any) => {
  const safeSchedule = schedule || {
    morning: { start: '09:00', end: '14:00', active: true },
    afternoon: { start: '16:00', end: '20:00', active: true }
  };

  return (
    <div className="bg-white/60 dark:bg-bg-dark/40 p-6 rounded-[2.5rem] border border-white dark:border-border-dark flex flex-col md:flex-row items-center gap-8 shadow-sm">
      <div className="w-32 shrink-0">
        <p className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-widest">{day}</p>
      </div>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        {['morning', 'afternoon'].map((shift) => (
          <div key={shift} className="flex items-center gap-4 bg-white/80 dark:bg-surface-dark p-4 rounded-[1.75rem] border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className={`size-12 rounded-2xl flex items-center justify-center ${shift === 'morning' ? 'bg-primary/10 text-primary' : 'bg-orange-400/10 text-orange-400'}`}>
              <span className="material-symbols-outlined text-2xl">{shift === 'morning' ? 'wb_sunny' : 'nights_stay'}</span>
            </div>
            <div className="flex-1 flex items-center gap-2">
              {editing ? (
                <div className="flex items-center gap-2 w-full">
                  <input type="time" value={safeSchedule[shift].start} onChange={e => onChange(day, shift, 'start', e.target.value)} className="bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold w-full text-center" />
                  <span className="text-slate-400 font-bold">-</span>
                  <input type="time" value={safeSchedule[shift].end} onChange={e => onChange(day, shift, 'end', e.target.value)} className="bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold w-full text-center" />
                </div>
              ) : (
                <span className="text-sm font-black text-slate-700 dark:text-slate-300 ml-2">{safeSchedule[shift].start} - {safeSchedule[shift].end}</span>
              )}
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{shift === 'morning' ? 'MAÑANA' : 'TARDE'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

interface DoctorsProps {
  doctors: Doctor[];
  appointments: Appointment[];
  setDoctors?: React.Dispatch<React.SetStateAction<Doctor[]>>;
}

const Doctors: React.FC<DoctorsProps> = ({ doctors, appointments, setDoctors }) => {
  const [selectedDoctorForAgenda, setSelectedDoctorForAgenda] = useState<Doctor | null>(null);
  const [selectedDoctorForProfile, setSelectedDoctorForProfile] = useState<Doctor | null>(null);
  const [activeTab, setActiveTab] = useState<'perfil' | 'horario' | 'laboral' | 'rendimiento' | 'docs'>('perfil');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editDocData, setEditDocData] = useState<Doctor | null>(null);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [viewingDoc, setViewingDoc] = useState<FileAttachment | null>(null);
  const [isAddingAttendance, setIsAddingAttendance] = useState(false);
  const [newAttendance, setNewAttendance] = useState<Partial<AttendanceRecord>>({
    type: 'Retraso',
    date: new Date().toISOString().split('T')[0],
    status: 'Pendiente'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);

  const getInitialSchedule = (): Record<string, DaySchedule> => DAYS.reduce((acc, day) => ({
    ...acc,
    [day]: {
      morning: { start: '09:00', end: '14:00', active: true },
      afternoon: { start: '16:00', end: '20:00', active: true }
    }
  }), {});

  const [newDocData, setNewDocData] = useState<Doctor>({
    id: '',
    name: '',
    role: 'Doctor',
    specialty: '',
    status: 'Active',
    img: 'https://i.pravatar.cc/150?u=' + Math.random(),
    branch: 'Centro',
    phone: '',
    corporateEmail: '',
    docs: [],
    schedule: getInitialSchedule(),
    contractType: 'Indefinido - Jornada Completa',
    hourlyRate: 0,
    overtimeHours: 0,
    totalHoursWorked: 0,
    vacationDaysTotal: 30,
    vacationDaysTaken: 0,
    vacationHistory: [],
    attendanceHistory: []
  });

  const metrics = useMemo(() => {
    if (!selectedDoctorForProfile) return null;
    const docApts = appointments.filter(a => a.doctorId === selectedDoctorForProfile.id);
    const uniquePatients = new Set(docApts.map(a => a.patientId)).size;
    const completed = docApts.filter(a => a.status === 'Completed').length;
    const satisfaction = completed > 0 ? (95 + (parseInt(selectedDoctorForProfile.id.replace(/\D/g,'') || '0') % 5)) : 0;
    const avgTime = completed > 0 ? (15 + (parseInt(selectedDoctorForProfile.id.replace(/\D/g,'') || '0') % 10)) : 0;
    return { uniquePatients, completed, satisfaction, avgTime };
  }, [selectedDoctorForProfile, appointments]);

  // CÁLCULO EN TIEMPO REAL DE VACACIONES
  const realTimeVacationStats = useMemo(() => {
    if (!editDocData) return { consumed: 0, pending: 0, balance: 30 };
    
    const today = new Date();
    today.setHours(0,0,0,0); // Normalizar a medianoche para comparar solo fechas

    let consumed = 0;
    let pending = 0;

    (editDocData.vacationHistory || []).forEach(v => {
      if (v.status === 'Rechazada') return; // Ignorar rechazadas

      const start = new Date(v.start);
      const end = new Date(v.end);
      
      // Iterar día por día dentro del rango
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // Normalizar día actual del bucle
        const currentCheck = new Date(d);
        currentCheck.setHours(0,0,0,0);

        if (currentCheck <= today) {
          consumed++; // Ya pasó o es hoy
        } else {
          pending++; // Es futuro
        }
      }
    });

    const totalAllowed = editDocData.vacationDaysTotal || 30;
    // Saldo disponible se reduce conforme se consumen los días (pasan los días)
    const balance = totalAllowed - consumed;

    return { consumed, pending, balance, totalAllowed };
  }, [editDocData]);

  const handleOpenProfile = (doc: Doctor) => {
    setSelectedDoctorForProfile(doc);
    setEditDocData({ 
      ...doc,
      schedule: doc.schedule || getInitialSchedule()
    });
    setIsEditing(false);
    setActiveTab('perfil');
  };

  const handleSaveProfile = () => {
    if (editDocData && setDoctors) {
      const missing = [];
      if (!editDocData.name?.trim()) missing.push("Nombre");
      if (!editDocData.specialty?.trim()) missing.push("Especialidad");
      if (!editDocData.corporateEmail?.trim()) missing.push("Email Corporativo");

      if (missing.length > 0) {
        alert(`⚠️ No se pueden guardar los cambios:\n\n${missing.map(m => `• ${m}`).join('\n')}`);
        return;
      }

      setDoctors(prev => prev.map(d => d.id === editDocData.id ? editDocData : d));
      setSelectedDoctorForProfile(editDocData);
      setIsEditing(false);
    }
  };

  const handleCreateDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    const missing = [];
    if (!newDocData.name?.trim()) missing.push("Nombre y Apellidos");
    if (!newDocData.specialty?.trim()) missing.push("Especialidad Clínica");
    if (!newDocData.corporateEmail?.trim()) missing.push("Email Corporativo");

    if (missing.length > 0) {
      alert(`⚠️ Faltan campos obligatorios para registrar al médico:\n\n${missing.map(m => `• ${m}`).join('\n')}`);
      return;
    }
    
    if (setDoctors) {
      const doctorToAdd: Doctor = {
        ...newDocData,
        id: `D${Math.floor(Math.random() * 900) + 100}`,
      };
      
      setDoctors(prev => [...prev, doctorToAdd]);
      setIsCreating(false);
      setNewDocData({
        id: '', name: '', role: 'Doctor', specialty: '', status: 'Active', img: 'https://i.pravatar.cc/150?u=' + Math.random(), branch: 'Centro', phone: '', corporateEmail: '', docs: [], schedule: getInitialSchedule(), contractType: 'Indefinido - Jornada Completa', hourlyRate: 0, overtimeHours: 0, totalHoursWorked: 0, vacationDaysTotal: 30, vacationDaysTaken: 0, vacationHistory: [], attendanceHistory: []
      });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'edit' | 'create') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'edit' && editDocData) {
          setEditDocData({ ...editDocData, img: reader.result as string });
        } else {
          setNewDocData({ ...newDocData, img: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'edit' | 'create') => {
    const file = e.target.files?.[0];
    if (file) {
      const newDoc: FileAttachment = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name, type: file.type, size: (file.size / 1024 / 1024).toFixed(2) + ' MB', date: new Date().toISOString().split('T')[0], url: URL.createObjectURL(file)
      };
      if (target === 'edit' && editDocData) {
        setEditDocData({ ...editDocData, docs: [...(editDocData.docs || []), newDoc] });
      } else if (target === 'create') {
        setNewDocData({ ...newDocData, docs: [...(newDocData.docs || []), newDoc] });
      }
    }
  };

  const handleAddAttendance = () => {
    if (!editDocData || !newAttendance.date) return;
    const record: AttendanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      date: newAttendance.date, type: newAttendance.type as any, duration: newAttendance.duration, status: newAttendance.status as any, notes: newAttendance.notes
    };
    setEditDocData({
      ...editDocData,
      attendanceHistory: [record, ...(editDocData.attendanceHistory || [])]
    });
    setIsAddingAttendance(false);
    setNewAttendance({ type: 'Retraso', date: new Date().toISOString().split('T')[0], status: 'Pendiente' });
  };

  return (
    <div className="p-10 max-w-[1600px] mx-auto w-full space-y-12 no-print">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tighter">Cuerpo Médico</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium italic">Gestión operativa, RRHH y analítica estratégica.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="h-16 px-10 bg-primary text-white rounded-[2rem] font-bold shadow-2xl shadow-primary/30 hover:scale-105 transition-all flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl">person_add</span>
          <span className="text-lg uppercase tracking-tight">Registrar Médico</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {doctors.map((doc) => (
          <div key={doc.id} className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-[3rem] p-10 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all relative overflow-hidden group border-2">
            <div className={`absolute top-8 right-8 text-[11px] font-black uppercase tracking-[0.2em] ${doc.status === 'Active' ? 'text-success' : 'text-warning'}`}>
               <span className="flex items-center gap-2">
                 <span className={`size-2.5 rounded-full ${doc.status === 'Active' ? 'bg-success' : 'bg-warning'} animate-pulse`}></span> 
                 {doc.status === 'Active' ? 'En Servicio' : 'Ausente'}
               </span>
            </div>
            <div className="flex items-center gap-8 mb-10">
              <div className="size-28 rounded-[2.5rem] bg-cover bg-center border-4 border-slate-50 dark:border-slate-800 shadow-xl group-hover:rotate-3 transition-transform" style={{ backgroundImage: `url("${doc.img}")` }}></div>
              <div>
                 <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-tight">{doc.name}</h3>
                 <p className="text-xs font-black uppercase text-primary tracking-[0.3em] mt-2">{doc.specialty}</p>
              </div>
            </div>
            <div className="space-y-4 pt-8 border-t border-border-light dark:border-border-dark">
               <div className="flex justify-between items-center bg-slate-50 dark:bg-bg-dark px-6 py-4 rounded-2xl">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sucursal</span>
                 <span className="text-sm font-black text-slate-900 dark:text-white uppercase">{doc.branch}</span>
               </div>
               <div className="flex justify-between items-center px-6">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Corporativo</span>
                 <span className="text-sm font-black text-slate-600 dark:text-slate-400 italic">{doc.corporateEmail}</span>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-10">
               <button onClick={() => setSelectedDoctorForAgenda(doc)} className="py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-[11px] font-black uppercase text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                 <span className="material-symbols-outlined text-xl">event_note</span>
                 <span>Ver Agenda</span>
               </button>
               <button onClick={() => handleOpenProfile(doc)} className="py-4 bg-primary/10 text-primary rounded-2xl text-[11px] font-black uppercase hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2">
                 <span className="material-symbols-outlined text-xl">contact_page</span>
                 <span>Ver Ficha</span>
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* ... (MODAL REGISTRO NUEVO MÉDICO - Mismo contenido) ... */}
      {isCreating && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
          <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-6xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark h-[90vh]">
            <header className="px-12 py-10 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-8">
                  <div className="size-20 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center shadow-inner"><span className="material-symbols-outlined text-4xl">person_add</span></div>
                  <div>
                    <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Alta de Especialista</h2>
                    <p className="text-[11px] font-black text-primary uppercase tracking-[0.3em] mt-1">Incorporación al cuadro médico de la red</p>
                  </div>
               </div>
               <div className="flex items-center gap-6">
                  <button onClick={handleCreateDoctor} className="h-16 px-12 bg-primary text-white rounded-[2rem] font-black shadow-2xl shadow-primary/30 hover:scale-105 transition-all uppercase text-xs tracking-widest flex items-center gap-3">
                    <span className="material-symbols-outlined">how_to_reg</span> Finalizar Registro
                  </button>
                  <button onClick={() => setIsCreating(false)} className="size-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger transition-all shadow-md">
                    <span className="material-symbols-outlined text-4xl">close</span>
                  </button>
               </div>
            </header>

            <form onSubmit={handleCreateDoctor} className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-12 bg-transparent">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-10 p-10 bg-white/70 dark:bg-surface-dark/60 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
                  <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3"><span className="material-symbols-outlined text-sm">contact_page</span> Identidad y Foto</h4>
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="shrink-0 group relative">
                      <div className="size-40 rounded-[2.5rem] bg-cover bg-center border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden" style={{ backgroundImage: `url("${newDocData.img}")` }}>
                        <div className="absolute inset-0 bg-primary/60 backdrop-blur-sm flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                          <span className="material-symbols-outlined text-4xl">photo_camera</span>
                          <span className="text-[10px] font-black uppercase mt-1">Subir Foto</span>
                        </div>
                      </div>
                      <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleAvatarChange(e, 'create')} />
                    </div>
                    <div className="flex-1 grid grid-cols-1 gap-6 w-full">
                      <DataField required label="Nombre y Apellidos" value={newDocData.name} onChange={(val: string) => setNewDocData({...newDocData, name: val})} />
                      <DataField required label="Especialidad Clínica" value={newDocData.specialty} onChange={(val: string) => setNewDocData({...newDocData, specialty: val})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <DataField required label="Email Corporativo" value={newDocData.corporateEmail} onChange={(val: string) => setNewDocData({...newDocData, corporateEmail: val})} />
                    <DataField label="Extensión / Teléfono" value={newDocData.phone} onChange={(val: string) => setNewDocData({...newDocData, phone: val})} />
                  </div>
                </div>
                <div className="space-y-10 p-10 bg-white/70 dark:bg-surface-dark/60 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
                  <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3"><span className="material-symbols-outlined text-sm">work</span> Condiciones del Contrato</h4>
                  <div className="grid grid-cols-1 gap-8">
                    <DataField label="Sede de Trabajo" value={newDocData.branch} onChange={(val: string) => setNewDocData({...newDocData, branch: val})} type="select" options={['Centro', 'Norte', 'Sur', 'Oeste', 'Este']} />
                    <DataField label="Tipo de Relación Laboral" value={newDocData.contractType} onChange={(val: string) => setNewDocData({...newDocData, contractType: val})} type="select" options={['Indefinido - Jornada Completa', 'Indefinido - Media Jornada', 'Autónomo / Colaborador', 'Temporal']} />
                    <div className="grid grid-cols-2 gap-8">
                      <DataField label="Coste / Hora (€)" value={newDocData.hourlyRate} onChange={(val: number) => setNewDocData({...newDocData, hourlyRate: val})} type="number" />
                      <DataField label="Vacaciones Anuales" value={newDocData.vacationDaysTotal} onChange={(val: number) => setNewDocData({...newDocData, vacationDaysTotal: val})} type="number" />
                    </div>
                  </div>
                </div>
              </div>
              {/* ... Resto del formulario igual ... */}
              <div className="p-10 bg-white/70 dark:bg-surface-dark/60 rounded-[3rem] border border-white dark:border-border-dark shadow-sm space-y-10">
                <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3"><span className="material-symbols-outlined text-sm">calendar_month</span> Disponibilidad de Turnos (Doble Jornada)</h4>
                <div className="grid grid-cols-1 gap-6">
                  {DAYS.map(day => (
                    <ScheduleRow key={day} day={day} editing={true} schedule={newDocData.schedule?.[day]} onChange={(d: string, s: string, p: string, v: string) => { const newSched = { ...newDocData.schedule }; if (newSched[d]) { (newSched[d] as any)[s][p] = v; setNewDocData({ ...newDocData, schedule: newSched }); } }} />
                  ))}
                </div>
              </div>
              <div className="p-10 bg-white/70 dark:bg-surface-dark/60 rounded-[3rem] border border-white dark:border-border-dark shadow-sm space-y-10">
                <div className="flex justify-between items-center">
                  <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3"><span className="material-symbols-outlined text-sm">folder_managed</span> Documentación Administrativa</h4>
                  <button type="button" onClick={() => createFileInputRef.current?.click()} className="px-6 py-3 bg-primary/10 text-primary rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Subir Documentos</button>
                  <input type="file" ref={createFileInputRef} className="hidden" onChange={e => handleFileUpload(e, 'create')} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {newDocData.docs.map(doc => (
                    <div key={doc.id} className="p-6 bg-white dark:bg-bg-dark border rounded-[2rem] flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="material-symbols-outlined text-slate-400">description</span>
                        <p className="text-[14px] font-black text-slate-700 dark:text-white truncate">{doc.name}</p>
                      </div>
                      <button type="button" onClick={() => setNewDocData({...newDocData, docs: newDocData.docs.filter(d => d.id !== doc.id)})} className="text-danger p-2 hover:bg-danger/10 rounded-xl transition-all"><span className="material-symbols-outlined text-2xl">delete</span></button>
                    </div>
                  ))}
                  {newDocData.docs.length === 0 && <p className="col-span-full py-12 text-center italic text-slate-400 text-sm font-medium">No se han adjuntado credenciales para este especialista.</p>}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FICHA MÉDICA 360° EDITABLE */}
      {selectedDoctorForProfile && editDocData && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
           <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-6xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark h-[92vh]">
              <header className="px-12 py-10 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-8">
                    <div className="relative group">
                      <div className="size-24 rounded-[2.5rem] bg-cover bg-center shadow-2xl border-4 border-white dark:border-slate-700" style={{ backgroundImage: `url("${editDocData.img}")` }}>
                        {isEditing && (
                          <div className="absolute inset-0 bg-primary/60 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer" onClick={() => editAvatarInputRef.current?.click()}>
                            <span className="material-symbols-outlined text-3xl">photo_camera</span>
                          </div>
                        )}
                      </div>
                      <input type="file" ref={editAvatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleAvatarChange(e, 'edit')} />
                    </div>
                    <div>
                       <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">{editDocData.name}</h2>
                       <div className="flex items-center gap-4 mt-2">
                         <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-xl text-[11px] font-black uppercase tracking-[0.2em]">{editDocData.specialty}</span>
                         <span className="px-4 py-1.5 bg-success/10 text-success rounded-xl text-[11px] font-black uppercase tracking-[0.2em]">Col. 282812345</span>
                       </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-6">
                    {isEditing ? (
                      <button onClick={handleSaveProfile} className="h-16 px-10 bg-primary text-white rounded-[2rem] font-black flex items-center gap-3 shadow-2xl shadow-primary/30 transition-all active:scale-95"><span className="material-symbols-outlined text-2xl">save</span> Guardar Cambios</button>
                    ) : (
                      <button onClick={() => setIsEditing(true)} className="h-16 px-10 bg-primary text-white rounded-[2rem] font-black flex items-center gap-3 shadow-2xl shadow-primary/30 transition-all active:scale-95"><span className="material-symbols-outlined text-2xl">edit</span> Editar Expediente</button>
                    )}
                    <button onClick={() => { setSelectedDoctorForProfile(null); setIsEditing(false); }} className="size-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger transition-all shadow-md"><span className="material-symbols-outlined text-4xl">close</span></button>
                 </div>
              </header>

              <div className="flex-1 flex overflow-hidden">
                 <nav className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white/40 dark:bg-surface-dark/40 p-8 gap-3 shrink-0">
                    {[
                      { id: 'perfil', label: 'Info Profesional', icon: 'account_circle' },
                      { id: 'horario', label: 'Horario y Turnos', icon: 'schedule' },
                      { id: 'laboral', label: 'Laboral y RRHH', icon: 'badge' },
                      { id: 'rendimiento', label: 'Rendimiento', icon: 'analytics' },
                      { id: 'docs', label: 'Documentación', icon: 'folder_managed' }
                    ].map(t => (
                      <button 
                        key={t.id} 
                        onClick={() => { setActiveTab(t.id as any); }}
                        className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all ${activeTab === t.id ? 'bg-primary text-white shadow-xl translate-x-2' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-primary'}`}
                      >
                        <span className="material-symbols-outlined text-2xl">{t.icon}</span> {t.label}
                      </button>
                    ))}
                 </nav>

                 <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-12 bg-transparent">
                    {/* ... (TABS PERFIL Y HORARIO - Mismo contenido) ... */}
                    {activeTab === 'perfil' && (
                      <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
                         <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
                            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-10"><span className="material-symbols-outlined text-sm">badge</span> Información del Facultativo</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                               <DataField label="Nombre Completo" value={editDocData.name} onChange={(v:any) => isEditing && setEditDocData({...editDocData, name: v})} editing={isEditing} required={true} />
                               <DataField label="Especialidad Principal" value={editDocData.specialty} onChange={(v:any) => isEditing && setEditDocData({...editDocData, specialty: v})} editing={isEditing} required={true} />
                               <DataField label="Sede / Sucursal" value={editDocData.branch} onChange={(v:any) => isEditing && setEditDocData({...editDocData, branch: v})} editing={isEditing} />
                               <DataField label="Email de Empresa" value={editDocData.corporateEmail} onChange={(v:any) => isEditing && setEditDocData({...editDocData, corporateEmail: v})} editing={isEditing} required={true} />
                               <DataField label="Teléfono de Contacto" value={editDocData.phone} onChange={(v:any) => isEditing && setEditDocData({...editDocData, phone: v})} editing={isEditing} />
                               <div className="flex flex-col gap-1.5 w-full">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Estado Operativo</label>
                                  {isEditing ? (
                                    <div className="relative">
                                      <select 
                                        value={editDocData.status}
                                        onChange={(e) => setEditDocData({...editDocData, status: e.target.value as any})}
                                        className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all appearance-none"
                                      >
                                        <option value="Active">Activo / Disponible</option>
                                        <option value="Vacation">Vacaciones</option>
                                        <option value="Inactive">Inactivo</option>
                                      </select>
                                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">unfold_more</span>
                                    </div>
                                  ) : (
                                    <div className="bg-white/40 dark:bg-white/5 border border-transparent rounded-2xl px-5 py-3.5 flex items-center min-h-[50px]">
                                      <span className={`text-sm font-black uppercase leading-none ${editDocData.status === 'Active' ? 'text-success' : 'text-warning'}`}>{editDocData.status === 'Active' ? 'EN SERVICIO' : editDocData.status}</span>
                                    </div>
                                  )}
                               </div>
                            </div>
                         </div>
                      </div>
                    )}

                    {activeTab === 'horario' && (
                      <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                         <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
                            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-10"><span className="material-symbols-outlined text-sm">calendar_month</span> Cronograma Semanal</h4>
                            <div className="grid grid-cols-1 gap-6">
                               {DAYS.map(day => (
                                 <ScheduleRow key={day} day={day} schedule={editDocData.schedule?.[day]} editing={isEditing} onChange={(d:string, s:string, p:string, v:string) => {
                                    const newSched = {...editDocData.schedule};
                                    if (newSched[d]) {
                                      (newSched[d] as any)[s][p] = v;
                                      setEditDocData({...editDocData, schedule: newSched});
                                    }
                                 }} />
                               ))}
                            </div>
                         </div>
                      </div>
                    )}

                    {activeTab === 'laboral' && (
                      <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
                         <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm">
                            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 mb-10"><span className="material-symbols-outlined text-sm">work</span> Gestión de Recursos Humanos</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                               <DataField label="Relación Laboral" value={editDocData.contractType || ''} onChange={(v:any) => isEditing && setEditDocData({...editDocData, contractType: v})} type="select" options={['Indefinido - Jornada Completa', 'Indefinido - Media Jornada', 'Autónomo / Colaborador', 'Temporal']} editing={isEditing} />
                               <DataField label="Precio Hora (€)" value={editDocData.hourlyRate || 0} onChange={(v:any) => isEditing && setEditDocData({...editDocData, hourlyRate: v})} type="number" editing={isEditing} />
                               <DataField label="Horas Extras" value={editDocData.overtimeHours || 0} onChange={(v:any) => isEditing && setEditDocData({...editDocData, overtimeHours: v})} type="number" editing={isEditing} />
                               <DataField label="Cómputo Mes" value={editDocData.totalHoursWorked || 0} onChange={(v:any) => isEditing && setEditDocData({...editDocData, totalHoursWorked: v})} type="number" editing={isEditing} />
                            </div>
                         </div>

                         <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm space-y-10">
                            <div className="flex justify-between items-center">
                              <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3"><span className="material-symbols-outlined text-sm">assignment_ind</span> Registro de Asistencia</h4>
                              {isEditing && (
                                <button onClick={() => setIsAddingAttendance(true)} className="px-6 py-3 bg-primary/10 text-primary rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm">Registrar Incidencia</button>
                              )}
                            </div>
                            
                            {isAddingAttendance && (
                              <div className="p-10 bg-slate-50 dark:bg-bg-dark rounded-[2.5rem] border-2 border-primary/20 space-y-10 animate-in slide-in-from-top-6 shadow-xl">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                  <DataField label="Tipo Incidencia" value={newAttendance.type} onChange={(v:any) => setNewAttendance({...newAttendance, type: v})} type="select" options={['Retraso', 'Ausencia', 'Baja Médica', 'Permiso']} />
                                  <DataField label="Fecha" value={newAttendance.date} onChange={(v:any) => setNewAttendance({...newAttendance, date: v})} type="date" />
                                  <DataField label="Magnitud / Tiempo" value={newAttendance.duration || ''} onChange={(v:any) => setNewAttendance({...newAttendance, duration: v})} placeholder="Ej: 45 min o 2 días" />
                                  <DataField label="Resolución" value={newAttendance.status} onChange={(v:any) => setNewAttendance({...newAttendance, status: v})} type="select" options={['Pendiente', 'Justificado', 'No Justificado']} />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Descripción Detallada</label>
                                  <textarea value={newAttendance.notes || ''} onChange={e => setNewAttendance({...newAttendance, notes: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none h-28" placeholder="Contexto de la incidencia..." />
                                </div>
                                <div className="flex gap-4">
                                  <button onClick={handleAddAttendance} className="flex-1 h-14 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 transition-transform active:scale-95">Archivar Registro</button>
                                  <button onClick={() => setIsAddingAttendance(false)} className="flex-1 h-14 bg-slate-200 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest transition-transform active:scale-95">Anular</button>
                                </div>
                              </div>
                            )}

                            <div className="overflow-hidden rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner bg-white/40 dark:bg-white/5">
                              <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b dark:border-slate-800">
                                  <tr>
                                    <th className="px-8 py-5">Fecha Evento</th>
                                    <th className="px-8 py-5">Categoría</th>
                                    <th className="px-8 py-5">Duración</th>
                                    <th className="px-8 py-5">Situación</th>
                                    <th className="px-8 py-5">Notas</th>
                                    {isEditing && <th className="px-8 py-5 text-right">Acción</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {editDocData.attendanceHistory && editDocData.attendanceHistory.length > 0 ? (
                                    editDocData.attendanceHistory.map(rec => (
                                      <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-5 text-sm font-black text-slate-800 dark:text-white">{rec.date}</td>
                                        <td className="px-8 py-5">
                                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] ${
                                            rec.type === 'Retraso' ? 'bg-warning/10 text-warning' : 
                                            rec.type === 'Ausencia' ? 'bg-danger/10 text-danger' : 
                                            rec.type === 'Baja Médica' ? 'bg-blue-500/10 text-blue-500' : 
                                            'bg-slate-500/10 text-slate-500'
                                          }`}>
                                            {rec.type}
                                          </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-bold text-slate-500 dark:text-slate-400">{rec.duration || '---'}</td>
                                        <td className="px-8 py-5">
                                          <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${
                                            rec.status === 'Justificado' ? 'bg-success/10 text-success' : 
                                            rec.status === 'No Justificado' ? 'bg-danger/10 text-danger' : 
                                            'bg-slate-400/10 text-slate-400'
                                          }`}>
                                            {rec.status}
                                          </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-medium text-slate-400 italic max-w-sm truncate">{rec.notes || '---'}</td>
                                        {isEditing && (
                                          <td className="px-8 py-5 text-right">
                                            <button onClick={() => setEditDocData({...editDocData, attendanceHistory: editDocData.attendanceHistory?.filter(r => r.id !== rec.id)})} className="text-danger hover:scale-110 transition-transform p-2 bg-danger/5 rounded-xl">
                                              <span className="material-symbols-outlined text-2xl">delete</span>
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={isEditing ? 6 : 5} className="px-8 py-16 text-center italic text-slate-400 text-sm font-medium">Historial de asistencia libre de incidencias.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                         </div>

                         <div className="bg-white/70 dark:bg-surface-dark/60 p-10 rounded-[3rem] border border-white dark:border-border-dark shadow-sm space-y-10">
                            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3"><span className="material-symbols-outlined text-sm">beach_access</span> Consumo de Vacaciones y Permisos</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                               <div className="space-y-8 flex flex-col justify-center">
                                  <div className="flex justify-between items-end mb-2">
                                     <div>
                                        <p className="text-5xl font-black text-slate-800 dark:text-white leading-none">
                                          {realTimeVacationStats.balance}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3">Días de Saldo Disponible</p>
                                     </div>
                                     <div className="text-right">
                                        <p className="text-2xl font-black text-slate-500 dark:text-slate-400 leading-none">
                                          {realTimeVacationStats.consumed}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Días Disfrutados (Pasados)</p>
                                        {realTimeVacationStats.pending > 0 && (
                                          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-1">{realTimeVacationStats.pending} Días Pendientes (Futuros)</p>
                                        )}
                                     </div>
                                  </div>
                                  <div className="w-full h-6 bg-slate-100 dark:bg-bg-dark rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                                     <div 
                                        className="h-full bg-gradient-to-r from-primary to-primary-dark transition-all duration-1000 shadow-lg" 
                                        style={{ width: `${(realTimeVacationStats.consumed / realTimeVacationStats.totalAllowed) * 100}%` }}
                                     ></div>
                                  </div>
                               </div>
                               <div className="space-y-6">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Registro Histórico de Ausencias</p>
                                  <div className="space-y-4 max-h-[220px] overflow-y-auto pr-4 custom-scrollbar">
                                    {editDocData.vacationHistory && editDocData.vacationHistory.length > 0 ? (
                                      editDocData.vacationHistory.map(v => (
                                        <div key={v.id} className="p-6 bg-white dark:bg-bg-dark rounded-3xl flex justify-between items-center border border-slate-100 dark:border-slate-800 shadow-sm">
                                           <div className="flex items-center gap-5">
                                              <div className="size-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-2xl">event</span></div>
                                              <div>
                                                <p className="text-sm font-black text-slate-800 dark:text-white">{v.start} al {v.end}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">{v.type}</p>
                                              </div>
                                           </div>
                                           <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${v.status === 'Aprobada' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                              {v.status}
                                           </span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm italic text-slate-400 text-center py-10 font-medium">No se han registrado solicitudes previas.</p>
                                    )}
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                    )}

                    {/* ... (RESTO DE TABS IGUAL) ... */}
                    {activeTab === 'rendimiento' && metrics && (
                      <div className="space-y-12 animate-in fade-in slide-in-from-right-4 text-center">
                         <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 text-left mb-10"><span className="material-symbols-outlined text-sm">analytics</span> Analítica de Impacto Clínico</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                              {i:'groups', v:metrics.uniquePatients, l:'Pacientes Únicos', c:'primary'},
                              {i:'task_alt', v:metrics.completed, l:'Citas Finalizadas', c:'success'},
                              {i:'verified', v:`${metrics.satisfaction}%`, l:'Satisfacción', c:'orange-400'},
                              {i:'timer', v:`${metrics.avgTime} min`, l:'Tiempo Medio', c:'blue-500'}
                            ].map((m,idx)=>(
                              <div key={idx} className="bg-white dark:bg-slate-900/50 p-10 rounded-[3rem] shadow-xl flex flex-col items-center gap-4 border border-white dark:border-slate-800 hover:scale-105 transition-transform">
                                <div className={`size-20 rounded-[1.75rem] bg-${m.c}/10 flex items-center justify-center text-${m.c}`}><span className="material-symbols-outlined text-5xl">{m.i}</span></div>
                                <p className="text-4xl font-black text-slate-900 dark:text-white leading-tight mt-2">{m.v}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.l}</p>
                              </div>
                            ))}
                         </div>
                         
                         <div className="bg-white/80 dark:bg-surface-dark/60 p-12 rounded-[3.5rem] border border-white dark:border-border-dark shadow-xl flex items-center justify-between text-left mt-10">
                            <div>
                               <h4 className="text-3xl font-display font-black uppercase tracking-tight text-slate-900 dark:text-white">Valoración Global del Especialista</h4>
                               <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium italic">Puntuación agregada basada en protocolos de calidad y encuestas post-consulta.</p>
                            </div>
                            <div className="flex gap-2 text-orange-400 drop-shadow-lg">
                               {[...Array(5)].map((_, i) => (
                                 <span key={i} className={`material-symbols-outlined text-6xl ${i < Math.round(metrics.satisfaction/20) ? 'filled' : ''}`}>star</span>
                               ))}
                            </div>
                         </div>
                      </div>
                    )}

                    {activeTab === 'docs' && (
                      <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                         <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3"><span className="material-symbols-outlined text-sm">folder_managed</span> Repositorio de Documentación Legal</h4>
                            {isEditing && <button onClick={() => fileInputRef.current?.click()} className="h-14 px-8 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20 transition-all hover:scale-105"><span className="material-symbols-outlined text-2xl">upload</span> Subir Documento</button>}
                            <input type="file" ref={fileInputRef} onChange={e => handleFileUpload(e, 'edit')} className="hidden" />
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {editDocData.docs?.map(file => (
                              <div key={file.id} className="p-8 bg-white dark:bg-bg-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-6 shadow-sm group hover:border-primary transition-all">
                                 <div className="size-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors"><span className="material-symbols-outlined text-3xl">description</span></div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-base font-black truncate text-slate-800 dark:text-white leading-tight">{file.name}</p>
                                    <p className="text-[11px] text-slate-400 font-black uppercase mt-1 tracking-widest">{file.date} • {file.size}</p>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <button onClick={() => setViewingDoc(file)} className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-slate-400" title="Previsualizar"><span className="material-symbols-outlined text-2xl">visibility</span></button>
                                    <a href={file.url} download={file.name} className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-primary hover:text-white transition-all flex items-center justify-center text-slate-400 shadow-sm" title="Descargar"><span className="material-symbols-outlined text-2xl">download</span></a>
                                    {isEditing && <button onClick={() => setEditDocData({...editDocData, docs: editDocData.docs.filter(d => d.id !== file.id)})} className="size-12 rounded-2xl bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all flex items-center justify-center shadow-sm" title="Eliminar"><span className="material-symbols-outlined text-2xl">delete</span></button>}
                                 </div>
                              </div>
                            ))}
                            {(!editDocData.docs || editDocData.docs.length === 0) && (
                              <div className="col-span-2 py-24 flex flex-col items-center gap-6 opacity-30 italic">
                                <span className="material-symbols-outlined text-8xl">folder_open</span>
                                <p className="font-black text-xl uppercase tracking-widest">Sin archivos digitalizados</p>
                              </div>
                            )}
                         </div>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DE PREVISUALIZACIÓN */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-surface-dark w-full max-w-5xl h-[85vh] rounded-[3.5rem] overflow-hidden flex flex-col relative shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/20">
              <header className="px-10 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                 <div className="flex items-center gap-4"><span className="material-symbols-outlined text-primary text-3xl">description</span><h3 className="font-black text-lg uppercase tracking-tight text-slate-800 dark:text-white">{viewingDoc.name}</h3></div>
                 <button onClick={() => setViewingDoc(null)} className="size-12 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors"><span className="material-symbols-outlined text-4xl">close</span></button>
              </header>
              <div className="flex-1 bg-slate-100 dark:bg-bg-dark flex items-center justify-center overflow-hidden">
                 {viewingDoc.type.includes('image') ? <img src={viewingDoc.url} alt={viewingDoc.name} className="max-w-full max-h-full object-contain shadow-2xl" /> : <iframe src={viewingDoc.url} className="w-full h-full border-none bg-white" title={viewingDoc.name}></iframe>}
              </div>
           </div>
        </div>
      )}

      {selectedApt && (
        <AppointmentDetailModal 
          appointment={selectedApt} onClose={() => setSelectedApt(null)}
          onUpdateStatus={() => setSelectedApt(null)}
          patients={[]} doctors={doctors}
        />
      )}

      {/* ... (PANEL LATERAL AGENDA - Mismo contenido) ... */}
      {selectedDoctorForAgenda && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
           <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-6xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark h-[85vh]">
              <header className="px-12 py-10 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-8">
                    <div className="size-16 rounded-[1.5rem] bg-primary/10 text-primary flex items-center justify-center shadow-inner"><span className="material-symbols-outlined text-4xl">event_note</span></div>
                    <div>
                       <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Planificación Operativa</h2>
                       <p className="text-[11px] font-black text-primary uppercase tracking-[0.3em] mt-1">Próximas 48 horas para {selectedDoctorForAgenda.name}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedDoctorForAgenda(null)} className="size-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger transition-all shadow-md">
                   <span className="material-symbols-outlined text-4xl">close</span>
                 </button>
              </header>
              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   {['2023-10-24', '2023-10-25'].map(day => {
                     const dayApps = appointments.filter(a => a.doctorId === selectedDoctorForAgenda.id && a.date === day);
                     return (
                       <div key={day} className="space-y-8">
                          <h4 className="text-[13px] font-black uppercase text-primary tracking-[0.5em] bg-primary/5 p-6 rounded-[2rem] text-center border border-primary/10 shadow-sm">{day === '2023-10-24' ? 'Hoy - Martes 24' : 'Mañana - Miércoles 25'}</h4>
                          <div className="space-y-6">
                            {dayApps.length > 0 ? dayApps.map(apt => (
                              <div key={apt.id} onClick={() => setSelectedApt(apt)} className={`p-8 rounded-[2.5rem] bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark flex items-center gap-8 hover:border-primary transition-all cursor-pointer group shadow-sm hover:shadow-xl ${apt.status === 'Cancelled' ? 'opacity-50 grayscale' : ''}`}>
                                 <div className="size-16 rounded-[1.25rem] bg-slate-100 dark:bg-bg-dark text-slate-600 dark:text-slate-400 flex items-center justify-center font-black text-xl group-hover:bg-primary group-hover:text-white transition-all shadow-inner">{apt.time}</div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-xl font-black text-slate-800 dark:text-white truncate">{apt.patientName}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{apt.treatment}</p>
                                 </div>
                                 <div className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${apt.status === 'Completed' ? 'bg-success text-white shadow-lg shadow-success/20' : apt.status === 'Cancelled' ? 'bg-danger text-white' : 'bg-warning text-white shadow-lg shadow-warning/20'}`}>{apt.status === 'Completed' ? 'Atendido' : apt.status}</div>
                              </div>
                            )) : <div className="py-24 text-center opacity-20 flex flex-col items-center gap-4"><span className="material-symbols-outlined text-7xl">event_busy</span><p className="text-sm font-black uppercase tracking-[0.3em]">Sin actividad programada</p></div>}
                          </div>
                       </div>
                     );
                   })}
                </div>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
      `}</style>
    </div>
  );
};

export default Doctors;
