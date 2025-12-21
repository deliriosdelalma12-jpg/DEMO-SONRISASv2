
import React, { useState } from 'react';
import { Appointment, Doctor, Patient, ClinicSettings, Branch } from '../types';
import MetricsOperational from './metrics/MetricsOperational';
import MetricsFinancial from './metrics/MetricsFinancial';

interface MetricsProps {
  appointments: Appointment[];
  doctors: Doctor[];
  patients: Patient[];
  settings: ClinicSettings; 
  branches?: Branch[];
}

const Metrics: React.FC<MetricsProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'operational' | 'financial'>('operational');

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark">
        {/* TOP NAVIGATION BAR */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-bg-dark/80 backdrop-blur-md border-b border-border-light dark:border-border-dark px-8 py-4 flex items-center justify-center">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner">
                <button 
                    onClick={() => setActiveTab('operational')}
                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'operational' ? 'bg-white dark:bg-surface-dark text-primary shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    <span className="material-symbols-outlined text-lg">analytics</span> Operativa
                </button>
                <button 
                    onClick={() => setActiveTab('financial')}
                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'financial' ? 'bg-white dark:bg-surface-dark text-emerald-500 shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    <span className="material-symbols-outlined text-lg">attach_money</span> Financiera
                </button>
            </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 p-8">
            {activeTab === 'operational' ? (
                <MetricsOperational {...props} />
            ) : (
                <MetricsFinancial settings={props.settings} />
            )}
        </div>
    </div>
  );
};

export default Metrics;
