// SpecialtyForm.tsx
import { useState } from "react";
import { useCreateSpecialty } from "@/hooks/specialties/useCreateSpecialty";
import { Stethoscope, FileText, Save, AlertCircle } from "lucide-react";

interface Props {
  onClose: () => void;
}

export const SpecialtyForm = ({ onClose }: Props) => {
  const create = useCreateSpecialty();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    create.mutate(
      { name, description },
      { onSuccess: onClose }
    );
  };

  const isLoading = create.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-5 p-1">
        {/* NOMBRE */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase ml-1 flex items-center gap-2 tracking-wider">
            <Stethoscope size={12} strokeWidth={3} /> Nombre de la especialidad
          </label>
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/40 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl px-4 py-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400/60"
            placeholder="Ej. Cardiología Deportiva"
          />
        </div>

        {/* DESCRIPCIÓN */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase ml-1 flex items-center gap-2 tracking-wider">
            <FileText size={12} strokeWidth={3} /> Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-white/40 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl px-4 py-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none placeholder:text-slate-400/60"
            placeholder="Describe brevemente el alcance..."
          />
        </div>

        {/* ERROR FEEDBACK */}
        {create.isError && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} />
            <p className="text-[10px] font-black uppercase tracking-tight">Error al guardar</p>
          </div>
        )}
      </div>

      {/* FOOTER ACCIONES - Mantiene la coherencia pero sin bordes propios si el modal ya es pequeño */}
      <div className="pt-4 flex gap-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white px-4 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3  transition-all active:scale-95"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={16} strokeWidth={3} />
          )}
          Registrar
        </button>
      </div>
    </form>
  );
};