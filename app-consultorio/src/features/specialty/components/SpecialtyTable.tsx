// SpecialtyTable.tsx
import { SpecialtyRow } from "./SpecialtyRow";
import type { Specialty } from "@/types/Specialty.type";

export const SpecialtyTable = ({ specialties, inactive }: { specialties: Specialty[], inactive?: boolean }) => {
  if (specialties.length === 0) {
    return (
      <div className="bg-white/20 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 rounded-[2.5rem] py-20 text-center">
        <p className="text-sm font-medium text-slate-400 italic">No hay especialidades en esta categoría.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {/* Header sutil para desktop */}
      <div className="hidden md:grid grid-cols-[1.5fr_2fr_120px] px-8 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
        <span>Nombre Especialidad</span>
        <span>Descripción del Área</span>
        <span className="text-right">Acciones</span>
      </div>

      {specialties.map((s) => (
        <SpecialtyRow key={s.id} specialty={s} inactive={inactive} />
      ))}
    </div>
  );
};

