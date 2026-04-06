import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

// Dentro de BookingModal.tsx o como componente separado
export function DatePicker({ value, onChange }: { value: string, onChange: (d: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Generar días del mes (simplificado para el ejemplo)
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()) }, (_, i) => i + 1);
  const blanks = Array.from({ length: (firstDay + 6) % 7 }, (_, i) => i); // Ajuste para que empiece en Lunes

  const isSelected = (day: number) => {
    if (!value) return false;
    const d = new Date(value + 'T00:00:00');
    return d.getDate() === day && d.getMonth() === currentMonth.getMonth();
  };

  const handleSelect = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onChange(date.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          {currentMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
            className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 text-slate-400 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
            className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 text-slate-400 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
          <div key={d} className="text-[9px] font-black text-slate-300 dark:text-neutral-600 text-center py-2">{d}</div>
        ))}
        {blanks.map(b => <div key={`b-${b}`} />)}
        {days.map(day => {
          const active = isSelected(day);
          return (
            <button
              key={day}
              onClick={() => handleSelect(day)}
              className={`aspect-square flex items-center justify-center rounded-2xl text-xs font-black transition-all ${
                active 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110 z-10" 
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-white/50"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
      
      <p className="text-center text-[10px] font-bold text-slate-400 italic">
        * Solo se muestran días con disponibilidad
      </p>
    </div>
  );
}