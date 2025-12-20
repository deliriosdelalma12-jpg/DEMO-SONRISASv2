
import React, { useState, useMemo, useEffect } from 'react';
import { Doctor, VacationRequest, AttendanceRecord } from '../types';

interface HRManagementProps {
  doctors: Doctor[];
  setDoctors: React.Dispatch<React.SetStateAction<Doctor[]>>;
}

const HRManagement: React.FC<HRManagementProps> = ({ doctors, setDoctors }) => {
  const [activeTab, setActiveTab] = useState<'vacations' | 'attendance'>('vacations');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  
  const [formData, setFormData] = useState<{
    type: string;
    date: string;
    endDate?: string;
    duration?: string;
    notes: string;
    status: string;
  }>({
    type: 'Vacaciones',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'Pendiente'
  });

  // Calculate duration automatically when dates change
  const calculatedDays = useMemo(() => {
    if (activeTab !== 'vacations' || !formData.date || !formData.endDate) return 0;
    const start = new Date(formData.date);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    return diffDays > 0 ? diffDays : 1;
  }, [formData.date, formData.endDate, activeTab]);

  // Get selected doctor details for the preview card
  const selectedDoctorDetails = useMemo(() => {
    return doctors.find(d => d.id === selectedDoctorId);
  }, [doctors, selectedDoctorId]);

  // CALCULO EN TIEMPO REAL PARA EL MODAL DE RRHH (IGUAL QUE EN DOCTORS.TSX)
  const realTimeVacationStats = useMemo(() => {
    if (!selectedDoctorDetails) return { consumed: 0, pending: 0, balance: 30 };
    
    const today = new Date();
    today.setHours(0,0,0,0);

    let consumed = 0;
    let pending = 0;

    (selectedDoctorDetails.vacationHistory || []).forEach(v => {
      if (v.status === 'Rechazada') return;

      const start = new Date(v.start);
      const end = new Date(v.end);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const currentCheck = new Date(d);
        currentCheck.setHours(0,0,0,0);

        if (currentCheck <= today) {
          consumed++;
        } else {
          pending++;
        }
      }
    });

    const totalAllowed = selectedDoctorDetails.vacationDaysTotal || 30;
    const balance = totalAllowed - consumed; // Saldo solo baja si se consume el día

    return { consumed, pending, balance, totalAllowed };
  }, [selectedDoctorDetails]);

  const allVacations = useMemo(() => {
    return doctors.flatMap(doc => 
      (doc.vacationHistory || []).map(v => ({ ...v, doctorName: doc.name, doctorImg: doc.img, doctorId: doc.id }))
    ).sort((a, b) => b.start.localeCompare(a.start));
  }, [doctors]);

  const allAttendance = useMemo(() => {
    return doctors.flatMap(doc => 
      (doc.attendanceHistory || []).map(a => ({ ...a, doctorName: doc.name, doctorImg: doc.img, doctorId: doc.id }))
    ).sort((a, b) => b.date.localeCompare(a.date));
  }, [doctors]);

  const handleOpenCreate = () => {
    setEditingRecordId(null);
    setSelectedDoctorId('');
    setFormData({
      type: activeTab === 'vacations' ? 'Vacaciones' : 'Retraso',
      date: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      notes: '',
      status: 'Pendiente'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (docId: string, record: any, tab: 'vacations' | 'attendance') => {
    setEditingRecordId(record.id);
    setSelectedDoctorId(docId);
    if (tab === 'vacations') {
      setFormData({
        type: record.type,
        date: record.start,
        endDate: record.end,
        notes: '', 
        status: record.status
      });
    } else {
      setFormData({
        type: record.type,
        date: record.date,
        duration: record.duration,
        notes: record.notes || '',
        status: record.status
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveRecord = () => {
    if (!selectedDoctorId) {
      alert("Por favor, selecciona un empleado para asignar el registro.");
      return;
    }

    setDoctors(prev => prev.map(doc => {
      if (doc.id !== selectedDoctorId) return doc;

      if (activeTab === 'vacations') {
        const vacation: VacationRequest = {
          id: editingRecordId || Math.random().toString(36).substr(2, 9),
          start: formData.date,
          end: formData.endDate || formData.date,
          daysUsed: calculatedDays,
          status: formData.status as any,
          type: formData.type as any
        };

        let newHistory = [...(doc.vacationHistory || [])];
        if (editingRecordId) {
          newHistory = newHistory.map(v => v.id === editingRecordId ? vacation : v);
        } else {
          newHistory = [vacation, ...newHistory];
        }

        // Ya no guardamos vacationDaysTaken estático porque se calcula al vuelo en la visualización
        // Pero para compatibilidad si alguna parte lo usa, podemos guardar un estimado
        
        return { 
          ...doc, 
          vacationHistory: newHistory,
          // vacationDaysTaken se recalculará dinámicamente en la vista
        };

      } else {
        const attendance: AttendanceRecord = {
          id: editingRecordId || Math.random().toString(36).substr(2, 9),
          date: formData.date,
          type: formData.type as any,
          duration: formData.duration,
          status: formData.status as any,
          notes: formData.notes
        };

        let newHistory = [...(doc.attendanceHistory || [])];
        if (editingRecordId) {
          newHistory = newHistory.map(a => a.id === editingRecordId ? attendance : a);
        } else {
          newHistory = [attendance, ...newHistory];
        }
        
        let newStatus = doc.status;
        if (attendance.type === 'Baja Médica' && attendance.status === 'Justificado') {
             newStatus = 'Medical Leave';
        }

        return { ...doc, attendanceHistory: newHistory, status: newStatus as any };
      }
    }));

    setIsModalOpen(false);
  };

  const updateQuickStatus = (doctorId: string, recordId: string, newStatus: string, type: 'v' | 'a') => {
    setDoctors(prev => prev.map(doc => {
      if (doc.id !== doctorId) return doc;
      
      if (type === 'v') {
        const newHistory = doc.vacationHistory?.map(v => v.id === recordId ? { ...v, status: newStatus as any } : v) || [];
        return { ...doc, vacationHistory: newHistory };
      } else {
        return {
          ...doc,
          attendanceHistory: doc.attendanceHistory?.map(a => a.id === recordId ? { ...a, status: newStatus as any } : a)
        };
      }
    }));
  };

  return (
    <div className="p-10 max-w-[1600px] mx-auto w-full space-y-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestión de Personal</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Control centralizado de vacaciones, ausencias e incidencias laborales.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="h-16 px-10 bg-primary text-white rounded-[2rem] font-bold shadow-2xl shadow-primary/30 hover:scale-105 transition-all flex items-center gap-3"
        >
          <span className="material-symbols-outlined text-2xl">{activeTab === 'vacations' ? 'beach_access' : 'add_moderator'}</span>
          <span className="text-lg uppercase tracking-tight">
            {activeTab === 'vacations' ? 'Asignar Vacaciones' : 'Reportar Incidencia'}
          </span>
        </button>
      </div>

      {/* ... (KPI Cards y Tabla - Igual que antes) ... */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-surface-dark p-8 rounded-[3rem] border-2 border-border-light dark:border-border-dark flex flex-col items-center gap-4 text-center shadow-sm">
          <div className="size-20 rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center"><span className="material-symbols-outlined text-5xl">beach_access</span></div>
          <p className="text-4xl font-black text-slate-900 dark:text-white">{allVacations.filter(v => v.status === 'Aprobada').length}</p>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Solicitudes Aprobadas</p>
        </div>
        <div className="bg-white dark:bg-surface-dark p-8 rounded-[3rem] border-2 border-border-light dark:border-border-dark flex flex-col items-center gap-4 text-center shadow-sm">
          <div className="size-20 rounded-3xl bg-warning/10 text-warning flex items-center justify-center"><span className="material-symbols-outlined text-5xl">history</span></div>
          <p className="text-4xl font-black text-slate-900 dark:text-white">{allAttendance.filter(a => a.type === 'Retraso').length}</p>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Retrasos Detectados</p>
        </div>
        <div className="bg-white dark:bg-surface-dark p-8 rounded-[3rem] border-2 border-border-light dark:border-border-dark flex flex-col items-center gap-4 text-center shadow-sm">
          <div className="size-20 rounded-3xl bg-danger/10 text-danger flex items-center justify-center"><span className="material-symbols-outlined text-5xl">person_off</span></div>
          <p className="text-4xl font-black text-slate-900 dark:text-white">{allAttendance.filter(a => a.type === 'Ausencia' || a.type === 'Baja Médica').length}</p>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Bajas y Ausencias</p>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-dark rounded-[3.5rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl flex flex-col min-h-[600px]">
        <header className="p-4 border-b border-border-light dark:border-border-dark flex bg-slate-50 dark:bg-slate-900/50">
          <button 
            onClick={() => setActiveTab('vacations')}
            className={`flex-1 py-6 rounded-[2rem] text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${activeTab === 'vacations' ? 'bg-white dark:bg-surface-dark text-primary shadow-lg scale-105 z-10' : 'text-slate-400 hover:text-primary'}`}
          >
            <span className="material-symbols-outlined">calendar_today</span> Control de Vacaciones
          </button>
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-6 rounded-[2rem] text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${activeTab === 'attendance' ? 'bg-white dark:bg-surface-dark text-primary shadow-lg scale-105 z-10' : 'text-slate-400 hover:text-primary'}`}
          >
            <span className="material-symbols-outlined">rule</span> Incidencias y Bajas
          </button>
        </header>

        <div className="flex-1 overflow-x-auto">
          {activeTab === 'vacations' ? (
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/30 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b">
                <tr>
                  <th className="px-10 py-6">Empleado / Doctor</th>
                  <th className="px-10 py-6">Periodo</th>
                  <th className="px-10 py-6">Duración Total</th>
                  <th className="px-10 py-6">Estado</th>
                  <th className="px-10 py-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allVacations.map(vac => (
                  <tr key={vac.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-cover bg-center border-2 border-white shadow-sm" style={{ backgroundImage: `url("${vac.doctorImg}")` }}></div>
                        <span className="text-sm font-black text-slate-800 dark:text-white uppercase">{vac.doctorName}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-bold text-sm">
                        <span>{vac.start}</span>
                        <span className="material-symbols-outlined text-slate-300">arrow_right_alt</span>
                        <span>{vac.end}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-black text-slate-600 dark:text-slate-300">
                        {vac.daysUsed} días
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        vac.status === 'Aprobada' ? 'bg-success/10 text-success' : 
                        vac.status === 'Rechazada' ? 'bg-danger/10 text-danger' : 
                        'bg-warning/10 text-warning'
                      }`}>
                        {vac.status}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        {vac.status === 'Pendiente' && (
                          <button onClick={() => updateQuickStatus(vac.doctorId, vac.id, 'Aprobada', 'v')} className="size-10 rounded-xl bg-success/10 text-success hover:bg-success hover:text-white transition-all shadow-sm" title="Aprobar"><span className="material-symbols-outlined">check</span></button>
                        )}
                        <button 
                          onClick={() => handleOpenEdit(vac.doctorId, vac, 'vacations')}
                          className="size-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm" title="Editar registro"
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button onClick={() => updateQuickStatus(vac.doctorId, vac.id, 'Rechazada', 'v')} className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-danger hover:text-white transition-all" title="Cancelar / Rechazar"><span className="material-symbols-outlined">block</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {allVacations.length === 0 && (
                  <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic font-medium">No se han registrado solicitudes de vacaciones.</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/30 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b">
                <tr>
                  <th className="px-10 py-6">Empleado / Doctor</th>
                  <th className="px-10 py-6">Fecha</th>
                  <th className="px-10 py-6">Tipo Incidencia</th>
                  <th className="px-10 py-6">Estado</th>
                  <th className="px-10 py-6">Observaciones</th>
                  <th className="px-10 py-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allAttendance.map(att => (
                  <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-cover bg-center border-2 border-white shadow-sm" style={{ backgroundImage: `url("${att.doctorImg}")` }}></div>
                        <span className="text-sm font-black text-slate-800 dark:text-white uppercase">{att.doctorName}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-sm font-bold text-slate-600 dark:text-slate-300">{att.date}</td>
                    <td className="px-10 py-6">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        att.type === 'Retraso' ? 'bg-warning/10 text-warning' : 
                        att.type === 'Ausencia' ? 'bg-danger/10 text-danger' : 
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {att.type} {att.duration && `(${att.duration})`}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${
                        att.status === 'Justificado' ? 'bg-success/10 text-success' : 
                        att.status === 'No Justificado' ? 'bg-danger/10 text-danger' : 
                        'bg-slate-400/10 text-slate-400'
                      }`}>
                        {att.status}
                      </span>
                    </td>
                    <td className="px-10 py-6 max-w-xs truncate text-xs italic text-slate-400 font-medium">{att.notes || 'Sin observaciones'}</td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        {att.status === 'Pendiente' && (
                          <button onClick={() => updateQuickStatus(att.doctorId, att.id, 'Justificado', 'a')} className="px-3 rounded-xl bg-success/10 text-success text-[10px] font-black uppercase hover:bg-success hover:text-white transition-all shadow-sm">Validar</button>
                        )}
                        <button 
                          onClick={() => handleOpenEdit(att.doctorId, att, 'attendance')}
                          className="size-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm" title="Editar incidencia"
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-danger hover:text-white transition-all"><span className="material-symbols-outlined">delete</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {allAttendance.length === 0 && (
                  <tr><td colSpan={6} className="py-20 text-center text-slate-400 italic font-medium">No se han registrado incidencias de asistencia.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in zoom-in duration-300">
          <div className="bg-[#f1f5f9] dark:bg-bg-dark w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-border-light dark:border-border-dark">
            <header className="px-10 py-8 bg-white/80 dark:bg-surface-dark/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-3xl">
                    {editingRecordId ? 'edit_note' : (activeTab === 'vacations' ? 'beach_access' : 'add_moderator')}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingRecordId ? 'Modificar Registro' : (activeTab === 'vacations' ? 'Asignar Vacaciones' : 'Nueva Incidencia')}
                  </h3>
                  <p className="text-[9px] font-black text-primary uppercase tracking-widest mt-0.5">Gestión vinculada a empleado</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="size-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-danger shadow-md transition-all"><span className="material-symbols-outlined text-4xl">close</span></button>
            </header>

            <div className="p-10 space-y-8">
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Seleccionar Empleado</label>
                <select 
                  value={selectedDoctorId}
                  disabled={!!editingRecordId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full bg-white dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none disabled:opacity-50"
                >
                  <option value="">-- Buscar empleado en la lista --</option>
                  {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialty})</option>)}
                </select>
              </div>

              {/* CARD DE RESUMEN DEL EMPLEADO SELECCIONADO (CON CALCULOS REAL-TIME) */}
              {selectedDoctorDetails && (
                <div className="p-6 bg-slate-100 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-top-2">
                   <div className="flex items-center gap-4 border-r border-slate-300 dark:border-slate-600 pr-6 mr-2">
                      <div className="size-12 rounded-xl bg-cover bg-center" style={{backgroundImage: `url('${selectedDoctorDetails.img}')`}}></div>
                      <div>
                         <p className="text-sm font-black dark:text-white">{selectedDoctorDetails.name}</p>
                         <p className="text-[10px] text-slate-500 uppercase">{selectedDoctorDetails.contractType || 'Contrato Estándar'}</p>
                      </div>
                   </div>
                   
                   {activeTab === 'vacations' ? (
                     <div className="flex-1 flex justify-around items-center text-center">
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Totales</p>
                           <p className="text-xl font-black text-slate-800 dark:text-white">{realTimeVacationStats.totalAllowed}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consumidos (Hoy)</p>
                           <p className="text-xl font-black text-orange-500">{realTimeVacationStats.consumed}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Disp.</p>
                           <p className="text-xl font-black text-primary">{realTimeVacationStats.balance}</p>
                        </div>
                     </div>
                   ) : (
                     <div className="flex-1 flex items-center justify-between px-4">
                        <p className="text-xs font-medium text-slate-500 italic">Registrando incidencia para historial operativo.</p>
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${selectedDoctorDetails.status === 'Active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                           Estado Actual: {selectedDoctorDetails.status}
                        </span>
                     </div>
                   )}
                </div>
              )}

              {/* ... (Resto del formulario igual) ... */}
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tipo de Evento</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-white dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none"
                  >
                    {activeTab === 'vacations' ? (
                      <>
                        <option value="Vacaciones">Vacaciones</option>
                        <option value="Asuntos Propios">Asuntos Propios</option>
                        <option value="Baja">Baja Médica</option>
                      </>
                    ) : (
                      <>
                        <option value="Retraso">Retraso</option>
                        <option value="Ausencia">Ausencia</option>
                        <option value="Baja Médica">Baja Médica</option>
                        <option value="Permiso">Permiso Horario</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                    {activeTab === 'vacations' ? 'Fecha Inicio' : 'Fecha Evento'}
                  </label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full bg-white dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" />
                </div>
              </div>

              {activeTab === 'vacations' ? (
                <div className="flex flex-col gap-2 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Fecha Finalización (Inclusive)</label>
                     <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">Total Planificado: {calculatedDays} días</span>
                  </div>
                  <input type="date" min={formData.date} value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} className="w-full bg-white dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" />
                </div>
              ) : (
                <div className="flex flex-col gap-2 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Duración Aproximada</label>
                  <input type="text" placeholder="Ej: 45 min, 2 horas..." value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} className="w-full bg-white dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                 <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Estado</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-white dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Aprobada">Aprobada / Validada</option>
                    <option value="Rechazada">Rechazada / Denegada</option>
                    {activeTab === 'attendance' && <option value="Justificado">Justificado</option>}
                    {activeTab === 'attendance' && <option value="No Justificado">No Justificado</option>}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Notas y Justificación</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full bg-white dark:bg-bg-dark border border-slate-200 dark:border-slate-700 rounded-3xl p-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none h-24 resize-none" placeholder="Motivo o detalles adicionales..." />
              </div>

              <div className="flex gap-4 pt-2">
                <button onClick={handleSaveRecord} className="flex-1 h-16 bg-primary text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                  {editingRecordId ? 'Actualizar Registro' : 'Confirmar y Guardar'}
                </button>
                <button onClick={() => setIsModalOpen(false)} className="flex-1 h-16 bg-slate-200 text-slate-600 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-slate-300 transition-all">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRManagement;
