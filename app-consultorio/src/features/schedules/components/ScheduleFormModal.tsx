import { X, Save, AlertCircle, Info, Clock, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Schedule } from "@/types/schedules.types";
import { useCreateSchedule } from "@/hooks/schedules/useCreateSchedule";
import { useUpdateSchedule } from "@/hooks/schedules/useUpdateSchedule";
import { minutesToTime, timeToMinutes, generateTimeSlots } from "@/utils/time";

interface Props {
  schedule: Schedule | null;
  onClose: () => void;
}

const DAYS_ABBR = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];
const days = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const timeSlots = generateTimeSlots(15);

export function ScheduleFormModal({ schedule, onClose }: Props) {
  const isEdit = !!schedule;

  const createMutation = useCreateSchedule();
  const updateMutation = useUpdateSchedule();

  const [dayOfWeek, setDayOfWeek] = useState(schedule?.dayOfWeek ?? 1);
  const [start, setStart] = useState(
    schedule ? minutesToTime(schedule.startMin) : "09:00",
  );
  const [end, setEnd] = useState(
    schedule ? minutesToTime(schedule.endMin) : "10:00",
  );

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);

    // 🔴 validaciones UI

    if (startMin >= endMin) {
      setError("La hora de inicio debe ser menor que la de fin");
      return;
    }

    if (startMin % 15 !== 0 || endMin % 15 !== 0) {
      setError("Los horarios deben ser múltiplos de 15 minutos");
      return;
    }

    setError(null);

    if (isEdit && schedule) {
      updateMutation.mutate(
        {
          id: schedule.id,
          data: { startMin, endMin },
        },
        { onSuccess: onClose },
      );
    } else {
      createMutation.mutate(
        {
          dayOfWeek,
          startMin,
          endMin,
        },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl rounded-[2.5rem] w-full max-w-md shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] border border-white/40 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header con Glass Effect Refinado */}
        <div className="p-8 border-b border-white/20 dark:border-white/5 flex justify-between items-center bg-white/30 dark:bg-neutral-800/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 text-white">
              <Clock size={20} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                {isEdit ? "Editar Horario" : "Nuevo Bloque"}
              </h2>
              <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">
                Configuración Médica
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {!isEdit && (
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase ml-1 tracking-[0.15em]">
                Día de la semana
              </label>
              <div className="grid grid-cols-4 gap-2">
                {days.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDayOfWeek(i)}
                    className={`py-2 text-[10px] font-black rounded-xl border transition-all duration-300 ${
                      dayOfWeek === i
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/40 scale-105"
                        : "bg-white/40 dark:bg-white/5 border-white/40 dark:border-white/5 text-slate-500 hover:border-blue-300 backdrop-blur-md"
                    }`}
                  >
                    {DAYS_ABBR[i]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-800 dark:text-neutral-300 uppercase ml-1 tracking-wider">
                Hora Inicio
              </label>
              <div className="relative group">
                <select
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl px-4 py-4 text-sm font-black text-slate-700 dark:text-neutral-200 outline-none transition-all cursor-pointer appearance-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/50 [&::-webkit-scrollbar-thumb]:dark:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-blue-400/60"
                >
                  {timeSlots.map((slot) => (
                    <option
                      key={slot}
                      value={slot}
                      className="bg-white dark:bg-neutral-900"
                    >
                      {slot}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-800 dark:text-neutral-300 uppercase ml-1 tracking-wider">
                Hora Fin
              </label>
              <div className="relative group">
                <select
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl px-4 py-4 text-sm font-black text-slate-700 dark:text-neutral-200 outline-none transition-all cursor-pointer appearance-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-neutral-400/50 [&::-webkit-scrollbar-thumb]:dark:bg-neutral-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-blue-400/60"
                >
                  {timeSlots.map((slot) => (
                    <option
                      key={slot}
                      value={slot}
                      className="bg-white dark:bg-neutral-900"
                    >
                      {slot}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          </div>

          {/* Banner Informativo con Glass suave */}
          <div className="bg-blue-600/10 dark:bg-blue-400/10 backdrop-blur-md border border-blue-200/30 dark:border-blue-800/30 p-5 rounded-[1.5rem] flex gap-4 items-center">
            <div className="p-2 bg-blue-100/50 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400">
              <Info size={18} strokeWidth={2.5} />
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-300 font-bold leading-relaxed italic">
              Este horario será visible para tus pacientes en la agenda pública.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 text-red-500 bg-red-500/10 backdrop-blur-md border border-red-500/20 p-4 rounded-2xl animate-in shake-in duration-300">
              <AlertCircle size={18} strokeWidth={2.5} />
              <p className="text-xs font-black uppercase tracking-tight">
                {error}
              </p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-neutral-600 dark:text-neutral-300 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-white/40 dark:hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white px-4 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 disabled:opacity-50 transition-all active:scale-95"
            >
              <Save size={16} strokeWidth={3} />
              {isEdit ? "Actualizar" : "Crear Horario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
