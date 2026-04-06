import { Plus } from "lucide-react";
import { useSchedules } from "@/hooks/schedules/useSchedules";
import { ScheduleList } from "../components/ScheduleList";
import { ScheduleFormModal } from "../components/ScheduleFormModal";
import { useState } from "react";
import type { Schedule } from "@/types/schedules.types";
import { useAppSelector } from "@/hooks/auth/useRedux";
import type { RootState } from "@/store";

export default function SchedulesPage() {
  const user = useAppSelector((state: RootState) => state.auth.user);
  const profileId = user?.profile?.id;
  const { data: schedules, isLoading } = useSchedules(profileId!);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Schedule | null>(null);

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-10">
      {/* Header un poco más sofisticado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 dark:border-neutral-800 pb-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Gestión de Disponibilidad
          </div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">
            Horarios de <span className="text-blue-600">Atención</span>
          </h1>
        </div>

        <button
          onClick={() => { setSelected(null); setOpen(true); }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-70 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-lg shadow-blue-500/25 active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          Nuevo bloque horario
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <ScheduleList
          schedules={schedules ?? []}
          onEdit={(schedule) => { setSelected(schedule); setOpen(true); }}
        />
      </div>

      {/* Modal*/}
       {open && (
        <ScheduleFormModal
          schedule={selected}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );

}