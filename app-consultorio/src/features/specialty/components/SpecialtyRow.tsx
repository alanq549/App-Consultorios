// SpecialtyRow.tsx
import { useRemoveSpecialty } from "@/hooks/specialties/useRemoveSpecialty";
import { useRestoreSpecialty } from "@/hooks/specialties/useRestoreSpecialty";
import type { Specialty } from "@/types/Specialty.type";
import { Trash2, RotateCcw, Stethoscope } from "lucide-react";

export const SpecialtyRow = ({ specialty, inactive }: { specialty: Specialty, inactive?: boolean }) => {
  const remove = useRemoveSpecialty();
  const restore = useRestoreSpecialty();
  const isPending = remove.isPending || restore.isPending;

  return (
    <div className="group bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-white dark:border-white/5 p-4 md:px-8 md:py-6 rounded-[2rem] hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 md:grid md:grid-cols-[1.5fr_2fr_120px] items-center gap-4">
      
      {/* Identificador + Nombre */}
      <div className="flex items-center gap-4 mb-2 md:mb-0">
        <div className={`p-3 rounded-2xl ${inactive ? 'bg-slate-100 text-slate-400' : 'bg-blue-500/10 text-blue-600'}`}>
          <Stethoscope size={18} />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
            {specialty.name}
          </h4>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
            ID: #{specialty.id.toString().padStart(3, '0')}
          </span>
        </div>
      </div>

      {/* Descripción */}
      <div className="mb-4 md:mb-0">
        <p className="text-xs text-slate-500 dark:text-neutral-400 line-clamp-1 italic">
          {specialty.description || "Sin descripción proporcionada."}
        </p>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-2">
        {!inactive ? (
          <button
            disabled={isPending}
            onClick={() => remove.mutate(specialty.id)}
            className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            <Trash2 size={14} />
            <span className="md:hidden">Desactivar</span>
          </button>
        ) : (
          <button
            disabled={isPending}
            onClick={() => restore.mutate(specialty.id)}
            className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-600 text-emerald-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            <RotateCcw size={14} />
            <span className="md:hidden">Restaurar</span>
          </button>
        )}
      </div>
    </div>
  );
};