import { ScheduleCard } from "./ScheduleCard";
import type { Schedule } from "@/types/schedules.types";

interface Props {
  schedules: Schedule[];
  onEdit: (schedule: Schedule) => void;
}

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function ScheduleList({ schedules, onEdit }: Props) {
  // Agrupamos los horarios por día de la semana
  const groupedSchedules = Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i,
    dayName: DAYS[i],
    slots: schedules
      .filter((s) => s.dayOfWeek === i)
      .sort((a, b) => a.startMin - b.startMin), // Ordenados por hora
  }));

return (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2">
    {groupedSchedules.map((group) => (
      <div 
        key={group.dayIndex}
        className={`flex flex-col gap-5 p-6 rounded-[2.5rem] border transition-all duration-500 backdrop-blur-xl ${
          group.slots.length > 0 
            ? "bg-white/70 dark:bg-neutral-900/70 border-white/40 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] scale-100" 
            : "bg-white/20 dark:bg-neutral-950/20 border-dashed border-slate-300/50 dark:border-neutral-800/50 opacity-60 scale-[0.98]"
        }`}
      >
        {/* Header del Día */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className={`relative flex h-2 w-2`}>
              {group.slots.length > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${group.slots.length > 0 ? 'bg-blue-600' : 'bg-slate-300 dark:bg-neutral-700'}`}></span>
            </div>
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-[0.1em] text-[11px]">
              {group.dayName}
            </h3>
          </div>
        </div>

        {/* Slots de tiempo */}
        <div className="space-y-3">
          {group.slots.length > 0 ? (
            group.slots.map((schedule) => (
              <div key={schedule.id} className="group transition-transform duration-300 hover:scale-[1.03]">
                <ScheduleCard
                  schedule={schedule}
                  onEdit={() => onEdit(schedule)}
                />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
               <div className="w-10 h-10 rounded-2xl border-2 border-dashed border-neutral-400/50 dark:border-neutral-700 flex items-center justify-center mb-3 group-hover:border-blue-400/50 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-500 dark:bg-neutral-700" />
               </div>
               <p className="text-[10px] text-neutral-700 dark:text-neutral-500 font-black uppercase tracking-[0.15em]">Sin horario</p>
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);
}