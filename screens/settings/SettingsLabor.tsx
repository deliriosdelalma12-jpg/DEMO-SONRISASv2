
import React, { useState, useMemo } from 'react';
import { ClinicSettings, LaborIncidentType, Doctor, AttendanceRecord, VacationRequest } from '../../types';

interface SettingsLaborProps {
  settings: ClinicSettings;
  setSettings: React.Dispatch<React.SetStateAction<ClinicSettings>>;
  doctors: Doctor[];
  setDoctors: React.Dispatch<React.SetStateAction<Doctor[]>>;
}

const SettingsLabor: React.FC<SettingsLaborProps> = ({ settings, setSettings, doctors, setDoctors }) => {
  const [newIncident, setNewIncident] = useState<Partial<LaborIncidentType>>({ name: '', requiresJustification: true, isPaid: false, color: 'bg-slate-500' });
  const [manageType, setManageType] = useState<'incident' | 'vacation'>('incident');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [eventData, setEventData] = useState({ typeId: '', date: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], duration: '', notes: '', status: 'Justificado' });

  const globalHistory = useMemo(() => {
    if (!doctors) return [];
    const incidents = doctors.flatMap(d => (d.attendanceHistory || []).map(a => ({ ...a, empName: d.name, doctorId: d.id, category: 'Incidencia' })));
    const vacations = doctors.flatMap(d => (d.vacationHistory || []).map(v => ({ id: v.id, date: v.start, endDate: v.end, type: v.type, status: v.status, notes: `${v.daysUsed} días`, empName: d.name, doctorId: d.id, category: 'Vacaciones' })));
    return [...incidents, ...vacations].sort((a, b) => b.date.localeCompare(a.date));
  }, [doctors]);

  const addIncidentType = () => {
    if (!newIncident.name) return;
    const type: LaborIncidentType = {
      id: 'inc_' + Math.floor(Math.random() * 10000),
      name: newIncident.name,
      requiresJustification: newIncident.requiresJustification || false,
      isPaid: newIncident.isPaid || false,
      color: newIncident.color || 'bg-slate-500'
    };
    setSettings(prev => ({ ...prev, laborSettings: { ...prev.laborSettings, incidentTypes: [...(prev.laborSettings.incidentTypes || []), type] } }));
    setNewIncident({ name: '', requiresJustification: true, isPaid: false, color: 'bg-slate-500' });
  };

  const removeIncidentType = (id: string) => {
    setSettings(prev => ({ ...prev, laborSettings: { ...prev.laborSettings, incidentTypes: prev.laborSettings.incidentTypes.filter(t => t.id !== id) } }));
  };

  const handleRegisterEvent = () => {
    if (!selectedEmpId) return;
    if (manageType === 'incident' && !eventData.typeId) { alert('Selecciona tipo'); return; }

    setDoctors(prev => prev.map(doc => {
      if (doc.id !== selectedEmpId) return doc;
      if (manageType === 'incident') {
        const typeName = settings.laborSettings.incidentTypes.find(t => t.id === eventData.typeId)?.name || 'Incidencia';
        const newRecord: AttendanceRecord = { id: editingRecordId || 'REC-' + Date.now(), date: eventData.date, type: typeName, duration: eventData.duration, status: eventData.status as any, notes: eventData.notes };
        let newHistory = [...(doc.attendanceHistory || [])];
        if (editingRecordId) newHistory = newHistory.map(r => r.id === editingRecordId ? newRecord : r);
        else newHistory = [newRecord, ...newHistory];
        return { ...doc, attendanceHistory: newHistory };
      } else {
        const start = new Date(eventData.date);
        const end = new Date(eventData.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
        const newVacation: VacationRequest = { id: editingRecordId || 'VAC-' + Date.now(), start: eventData.date, end: eventData.endDate, daysUsed: days > 0 ? days : 1, status: 'Aprobada', type: 'Vacaciones' };
        let newHistory = [...(doc.vacationHistory || [])];
        if (editingRecordId) newHistory = newHistory.map(r => r.id === editingRecordId ? newVacation : r);
        else newHistory = [newVacation, ...newHistory];
        return { ...doc, vacationHistory: newHistory };
      }
    }));
    setEventData({ ...eventData, notes: '', duration: '', date: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], typeId: '' });
    setEditingRecordId(null); setSelectedEmpId(''); alert("Evento registrado");
  };

  const handleEditRecord = (item: any) => {
      setSelectedEmpId(item.doctorId); setEditingRecordId(item.id);
      if (item.category === 'Vacaciones') {
          setManageType('vacation');
          setEventData({ ...eventData, date: item.date, endDate: item.endDate || item.date, notes: '', typeId: '', status: item.status });
      } else {
          setManageType('incident');
          const typeObj = settings.laborSettings.incidentTypes.find(t => t.name === item.type);
          setEventData({ ...eventData, date: item.date, duration: item.duration || '', notes: item.notes || '', typeId: typeObj ? typeObj.id : '', status: item.status });
      }
  };

  const handleDeleteRecord = (docId: string, recId: string, cat: string) => {
      if(!window.confirm("¿Eliminar?")) return;
      setDoctors(prev => prev.map(doc => {
          if (doc.id !== docId) return doc;
          if (cat === 'Vacaciones') return { ...doc, vacationHistory: doc.vacationHistory?.filter(v => v.id !== recId) };
          return { ...doc, attendanceHistory: doc.attendanceHistory?.filter(a => a.id !== recId) };
      }));
  };

  return (
    <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
        <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
          <div className="size-12 rounded-xl bg-orange-400 text-white flex items-center justify-center"><span className="material-symbols-outlined">beach_access</span></div>
          <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Política de Vacaciones</h3>
        </div>
        <div className="p-10 space-y-10">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Días Anuales</label><input type="number" value={settings.laborSettings?.vacationDaysPerYear || 30} onChange={e => setSettings({...settings, laborSettings: {...settings.laborSettings, vacationDaysPerYear: parseInt(e.target.value)}})} className="w-full bg-slate-100 dark:bg-bg-dark border-none rounded-2xl px-6 py-4 text-sm font-bold" /></div>
              <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acumulación</label><button onClick={() => setSettings({...settings, laborSettings: {...settings.laborSettings, allowCarryOver: !settings.laborSettings?.allowCarryOver}})} className={`flex-1 w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all border-2 ${settings.laborSettings?.allowCarryOver ? 'border-success bg-success/10 text-success' : 'border-slate-200 bg-slate-50 dark:bg-bg-dark text-slate-400'}`}><span className="text-xs font-black uppercase">Permitir acumular</span><span className="material-symbols-outlined">{settings.laborSettings?.allowCarryOver ? 'toggle_on' : 'toggle_off'}</span></button></div>
           </div>
        </div>
      </section>

      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
        <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
          <div className="size-12 rounded-xl bg-danger text-white flex items-center justify-center"><span className="material-symbols-outlined">warning</span></div>
          <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Tipos de Incidencias</h3>
        </div>
        <div className="p-10 space-y-8">
           <div className="flex gap-4 items-end bg-slate-50 dark:bg-bg-dark p-6 rounded-[2rem]">
              <div className="flex-1"><label className="text-[9px] font-black text-slate-400 uppercase">Nombre</label><input type="text" value={newIncident.name} onChange={e => setNewIncident({...newIncident, name: e.target.value})} className="w-full bg-white dark:bg-surface-dark border-none rounded-2xl px-4 py-3 text-sm font-bold" /></div>
              <button onClick={addIncidentType} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs">Añadir</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {settings.laborSettings?.incidentTypes.map((inc) => (
                <div key={inc.id} className="p-6 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative">
                   <div className="flex items-center gap-3 mb-2"><div className={`size-3 rounded-full ${inc.color}`}></div><h4 className="font-black text-sm uppercase">{inc.name}</h4></div>
                   <button onClick={() => removeIncidentType(inc.id)} className="absolute top-4 right-4 text-slate-300 hover:text-danger"><span className="material-symbols-outlined">delete</span></button>
                </div>
              ))}
           </div>
        </div>
      </section>

      <section className="bg-white dark:bg-surface-dark rounded-[3rem] border-2 border-border-light dark:border-border-dark overflow-hidden shadow-xl">
        <div className="p-8 border-b-2 border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 flex items-center gap-5">
          <div className="size-12 rounded-xl bg-purple-500 text-white flex items-center justify-center"><span className="material-symbols-outlined">badge</span></div>
          <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestión Operativa</h3>
        </div>
        <div className="flex flex-col xl:flex-row">
           <div className="p-10 w-full xl:w-[400px] border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 space-y-6">
              <div className="flex gap-2"><button onClick={() => setManageType('incident')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${manageType === 'incident' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>Incidencia</button><button onClick={() => setManageType('vacation')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${manageType === 'vacation' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>Vacaciones</button></div>
              <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} disabled={!!editingRecordId} className="w-full bg-white dark:bg-surface-dark border-none rounded-2xl px-4 py-3 text-sm font-bold"><option value="">Empleado...</option>{doctors?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
              {manageType === 'incident' && <select value={eventData.typeId} onChange={(e) => setEventData({...eventData, typeId: e.target.value})} className="w-full bg-white dark:bg-surface-dark border-none rounded-2xl px-4 py-3 text-sm font-bold"><option value="">Tipo...</option>{settings.laborSettings.incidentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
              <input type="date" value={eventData.date} onChange={e => setEventData({...eventData, date: e.target.value})} className="w-full bg-white border-none rounded-2xl px-4 py-3 font-bold text-sm" />
              {manageType === 'vacation' && <input type="date" min={eventData.date} value={eventData.endDate} onChange={e => setEventData({...eventData, endDate: e.target.value})} className="w-full bg-white border-none rounded-2xl px-4 py-3 font-bold text-sm" />}
              <button onClick={handleRegisterEvent} className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs shadow-xl">{editingRecordId ? 'Actualizar' : 'Registrar'}</button>
              {editingRecordId && <button onClick={() => {setEditingRecordId(null); setSelectedEmpId('');}} className="w-full py-2 text-xs font-bold text-slate-400">Cancelar</button>}
           </div>
           <div className="flex-1 p-10">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 dark:bg-bg-dark sticky top-0"><tr><th className="p-4 text-[9px] uppercase font-black text-slate-400">Fecha</th><th className="p-4 text-[9px] uppercase font-black text-slate-400">Empleado</th><th className="p-4 text-[9px] uppercase font-black text-slate-400">Tipo</th><th className="p-4 text-right">Acciones</th></tr></thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {globalHistory.map((item: any, i) => (
                       <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5">
                          <td className="p-4 text-xs font-bold">{item.date}</td>
                          <td className="p-4 text-xs font-black uppercase">{item.empName}</td>
                          <td className="p-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-bold uppercase">{item.type || item.category}</span></td>
                          <td className="p-4 text-right flex justify-end gap-2"><button onClick={() => handleEditRecord(item)} className="size-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-sm">edit</span></button><button onClick={() => handleDeleteRecord(item.doctorId, item.id, item.category)} className="size-8 bg-danger/10 text-danger rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-sm">delete</span></button></td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsLabor;
