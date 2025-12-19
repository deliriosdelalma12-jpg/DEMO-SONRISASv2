
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const Metrics: React.FC = () => {
  const data = [
    { name: 'Ene', value: 4000 },
    { name: 'Feb', value: 3000 },
    { name: 'Mar', value: 2000 },
    { name: 'Abr', value: 2780 },
    { name: 'May', value: 1890 },
    { name: 'Jun', value: 2390 },
    { name: 'Jul', value: 3490 },
    { name: 'Ago', value: 4000 },
  ];

  const pieData = [
    { name: 'Completadas', value: 65, color: '#46ec13' },
    { name: 'Pendientes', value: 20, color: '#60a5fa' },
    { name: 'Canceladas', value: 10, color: '#fb923c' },
    { name: 'No-Show', value: 5, color: '#f87171' },
  ];

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col gap-2">
        <p className="text-text-secondary text-sm font-medium uppercase tracking-wider">Análisis General</p>
        <h2 className="text-white text-3xl md:text-4xl font-black tracking-tight">Resumen de Rendimiento</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Facturación Total", val: "€42,593.00", icon: "paid", trend: "+12.5%", trendColor: "text-primary" },
          { label: "Nuevos Pacientes", val: "148", icon: "personal_injury", trend: "+5.2%", trendColor: "text-primary" },
          { label: "Citas Realizadas", val: "856", icon: "event_available", trend: "-2.1%", trendColor: "text-red-400" },
          { label: "Satisfacción", val: "98.5%", icon: "star", trend: "Avg 4.8", trendColor: "text-text-secondary" }
        ].map((kpi, i) => (
          <div key={i} className="bg-surface-dark p-5 rounded-2xl border border-border-dark flex flex-col gap-4 hover:border-primary/30 transition-colors group">
            <div className="flex justify-between items-start">
              <div className="bg-border-dark p-2 rounded-xl text-primary"><span className="material-symbols-outlined">{kpi.icon}</span></div>
              <span className={`${kpi.trendColor} text-xs font-bold bg-border-dark px-3 py-1 rounded-full`}>{kpi.trend}</span>
            </div>
            <div>
              <p className="text-text-secondary text-sm font-medium">{kpi.label}</p>
              <h3 className="text-white text-2xl font-bold mt-1">{kpi.val}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-dark rounded-2xl border border-border-dark p-6 h-[400px]">
          <h3 className="text-white text-lg font-bold mb-6">Evolución de Ingresos</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c3928" vertical={false} />
              <XAxis dataKey="name" stroke="#a3b99d" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#a3b99d" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e2b1a', border: '1px solid #2c3928', borderRadius: '12px' }}
                itemStyle={{ color: '#46ec13' }}
              />
              <Bar dataKey="value" fill="#46ec13" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface-dark rounded-2xl border border-border-dark p-6 flex flex-col">
          <h3 className="text-white text-lg font-bold mb-6">Estado de Citas</h3>
          <div className="flex-1 flex flex-col gap-5 justify-center">
            {pieData.map((s, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-white uppercase tracking-widest">{s.name}</span>
                  <span className="text-primary">{s.value}%</span>
                </div>
                <div className="w-full h-3 bg-border-dark rounded-full overflow-hidden">
                  <div style={{ width: `${s.value}%`, backgroundColor: s.color }} className="h-full rounded-full transition-all duration-1000"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Metrics;
