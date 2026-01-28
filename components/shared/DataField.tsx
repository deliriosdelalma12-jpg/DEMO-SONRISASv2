
import React from 'react';

export const DataField = ({ label, value, onChange, type = "text", options = [], editing = true, placeholder = "", required = false }: any) => {
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    
    if (type === 'number') {
      if (val === '') {
        onChange(''); 
      } else {
        onChange(parseFloat(val));
      }
    } else {
      onChange(val);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {editing ? (
        type === 'select' ? (
          <div className="relative">
            <select 
              value={value} 
              onChange={handleInputChange} 
              className="w-full bg-white dark:bg-bg-dark border border-slate-300 dark:border-slate-700 rounded-md px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
            >
              {options.map((opt: any) => (
                <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">unfold_more</span>
          </div>
        ) : (
          <input 
            type={type === 'number' ? 'number' : 'text'}
            value={value} 
            placeholder={placeholder}
            onChange={handleInputChange}
            className="w-full bg-white dark:bg-bg-dark border border-slate-300 dark:border-slate-700 rounded-md px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
        )
      ) : (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md px-4 py-2.5 flex items-center min-h-[42px]">
          <span className="text-sm font-bold text-slate-800 dark:text-white leading-none">{value || (value === 0 ? 0 : '---')}</span>
        </div>
      )}
    </div>
  );
};
