// src/features/client/components/booking/TimeSlotPicker.tsx
import { useEffect, useState } from "react";
import { getAvailability } from "@/api/appointment.api";
import type { TimeSlot } from "@/types/booking.types";
import { CalendarX, ChevronLeft, Check } from "lucide-react";

interface TimeSlotPickerProps {
  professionalId: number;
  serviceId: number;
  date: string;
  onSelect: (slot: TimeSlot) => void;
  onBack: () => void;
}

export function TimeSlotPicker({ professionalId, serviceId, date, onSelect, onBack }: TimeSlotPickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TimeSlot | null>(null);

  const formatTime = (min: number) => {
    const h = Math.floor(min / 60).toString().padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  useEffect(() => {
    if (!professionalId || !serviceId || !date) return;
    let isMounted = true;

    (async () => {
      setLoading(true);
      try {
        const data = await getAvailability(professionalId, serviceId, date);
        if (isMounted) setSlots(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [professionalId, serviceId, date]);

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">
          Buscando horarios...
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 rounded-2xl bg-white/30 dark:bg-white/5 animate-pulse border border-white/20" />
          ))}
        </div>
      </div>
    );
  }

  // ── EMPTY ────────────────────────────────────────────────────────────────
  if (!slots.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-[2rem] text-slate-400 mb-4">
          <CalendarX size={28} strokeWidth={1.5} />
        </div>
        <p className="text-sm font-black text-slate-600 dark:text-slate-300 tracking-tight">Sin disponibilidad</p>
        <p className="text-[11px] text-slate-400 dark:text-neutral-500 mb-6 px-10">No hay turnos libres para la fecha seleccionada.</p>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-blue-500 hover:text-white transition-all"
        >
          <ChevronLeft size={14} strokeWidth={3} /> Probar otro día
        </button>
      </div>
    );
  }

  // ── LISTA ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
          Horarios disponibles
        </label>
        <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">
          {slots.length} turnos
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/50 [&::-webkit-scrollbar-thumb]:rounded-full">
        {slots.map((slot, i) => {
          const isSelected = selected?.startMin === slot.startMin;

          return (
            <button
              key={i}
              onClick={() => {
                setSelected(slot);
                onSelect(slot);
              }}
              className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${
                isSelected
                  ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/40 scale-105 z-10"
                  : "bg-white/40 dark:bg-white/[0.03] border-white/40 dark:border-white/10 hover:border-blue-400/50 hover:bg-white/60 dark:hover:bg-white/5"
              }`}
            >
              <span className={`text-xs font-black tracking-widest ${
                isSelected ? "text-white" : "text-slate-800 dark:text-white"
              }`}>
                {formatTime(slot.startMin)}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-tighter opacity-60 ${
                isSelected ? "text-blue-100" : "text-slate-400"
              }`}>
                {formatTime(slot.endMin)}
              </span >
              
              {isSelected && (
                <div className="absolute top-1 right-1">
                   <Check size={10} className="text-white" strokeWidth={4} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2"
        >
          <ChevronLeft size={14} strokeWidth={3} /> Volver
        </button>
      </div>
    </div>
  );
}