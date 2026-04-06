import { Clock, Edit2, Trash2 } from "lucide-react";
import type { Schedule } from "@/types/schedules.types";
import { useDeleteSchedule } from "@/hooks/schedules/useDeleteSchedule";
import { minutesToTime } from "@/utils/time";

interface Props {
  schedule: Schedule;
  onEdit: () => void;
}

export function ScheduleCard({ schedule, onEdit }: Props) {
  const deleteMutation = useDeleteSchedule();

return (
  <div className="group relative overflow-hidden bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-[2rem] border border-white/40 dark:border-white/10 p-4 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4)]">
    
    {/* Reflejo de luz superior (Efecto Cristal) */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 pointer-events-none" />
    
    <div className="relative z-10 flex items-center justify-between">
      {/* Lado Izquierdo: Icono y Tiempo */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-600/10 backdrop-blur-md shadow-sm group-hover:scale-110 transition-transform duration-300">
          <Clock size={14} strokeWidth={2.5} />
        </div>
        <div className="flex flex-row">
          <span className="text-sm font-semibold text-slate-700 dark:text-neutral-100 tabular-nums tracking-tight   onderline">
            {minutesToTime(schedule.startMin)} — {minutesToTime(schedule.endMin)}
          </span>
        </div>
      </div>

      {/* Lado Derecho: Acciones (Aparecen en Hover) */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
        <button 
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white/80 dark:hover:bg-white/10 rounded-lg transition-all border border-transparent hover:border-white/50 dark:hover:border-white/10 shadow-sm"
          title="Editar bloque"
        >
          <Edit2 size={14} strokeWidth={2.5} />
        </button>
        <button 
          onClick={() => confirm("¿Eliminar bloque?") && deleteMutation.mutate(schedule.id)}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all border border-transparent hover:border-red-500/20 shadow-sm"
          title="Eliminar bloque"
        >
          <Trash2 size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
    
    {/* Decoración sutil al fondo */}
    <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-700" />
  </div>
);
}