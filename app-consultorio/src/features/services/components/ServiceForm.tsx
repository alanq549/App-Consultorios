import { useState } from "react";
import type { Service } from "@/types/service.type";
import {
  useCreateService,
  useUpdateService,
} from "@/hooks/Services/useServiceMutations";
import {
  ChevronDown,
  Edit3,
  Info,
  Layers,
  Plus,
  Save,
  Tag,
  X,
} from "lucide-react";
import { useSpecialtiesByProfessional } from "@/hooks/specialties/useSpecialties";
import { useAppSelector } from "@/hooks/auth/useRedux";
import type { RootState } from "@/store";

interface Props {
  service: Service | null;
  onClose: () => void;
}

export function ServiceForm({ service, onClose }: Props) {
  const isEdit = !!service;
  const user = useAppSelector((state: RootState) => state.auth.user);

  const createMutation = useCreateService();
  const updateMutation = useUpdateService();

  const professionalId =
    user?.role === "PROFESSIONAL" ? user.profile.id : undefined;

  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [durationMin, setDurationMin] = useState(service?.durationMin ?? 30);
  const [price, setPrice] = useState<number>(service?.price ?? 0);
  const [specialtyId, setSpecialtyId] = useState(service?.specialty?.id ?? 0);
  const { data: specialties = [] } = useSpecialtiesByProfessional(
    professionalId!,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        durationMin: Number(durationMin),
        price: parseFloat(price.toString()),
        specialtyId: Number(specialtyId),
      };

      if (isEdit && service) {
        await updateMutation.mutateAsync({ id: service.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      onClose();
    } catch (err) {
      console.error("Error al guardar servicio:", err);
      // aquí puedes mostrar un toast o mensaje de error al usuario
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] border border-white/40 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 overflow-hidden"
    >
      {/* HEADER FORM - Glass Intenso */}
      <div className="p-7 border-b border-white/20 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-neutral-800/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
            {isEdit ? (
              <Edit3 size={20} strokeWidth={2.5} />
            ) : (
              <Plus size={20} strokeWidth={2.5} />
            )}
          </div>
          <div>
            <h2 className="text-xl font-black text-neutral-800 dark:text-neutral-200  tracking-tight">
              {isEdit ? "Configurar Servicio" : "Nuevo Servicio"}
            </h2>
            <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">
              Gestión de Catálogo
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-8 space-y-6">
        {/* NOMBRE */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase ml-1 flex items-center gap-2 tracking-wider">
            <Tag size={12} strokeWidth={3} /> Nombre del servicio
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl px-4 py-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400/60"
            placeholder="Ej. Consulta General de Nutrición"
          />
        </div>

        {/* DESCRIPCIÓN */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300  uppercase ml-1 flex items-center gap-2 tracking-wider">
            <Info size={12} strokeWidth={3} /> Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl px-4 py-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none placeholder:text-slate-400/60"
            placeholder="Detalla de qué trata este servicio..."
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* DURACIÓN */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300  uppercase ml-1 tracking-wider">
              Duración
            </label>
            <div className="relative">
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl px-4 py-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200 outline-none appearance-none cursor-pointer"
              >
                {[15, 30, 45, 60, 90].map((m) => (
                  <option key={m} value={m} className="dark:bg-neutral-900">
                    {m} minutos
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                size={16}
              />
            </div>
          </div>

          {/* PRECIO */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300  uppercase ml-1 tracking-wider">
              Precio ($)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl px-4 py-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200 outline-none focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        {/* ESPECIALIDAD */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300  uppercase ml-1 flex items-center gap-2 tracking-wider">
            <Layers size={12} strokeWidth={3} /> Especialidad
          </label>
          <div className="relative">
            <select
              value={specialtyId}
              onChange={(e) => setSpecialtyId(Number(e.target.value))}
              className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl px-4 py-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200 outline-none appearance-none cursor-pointer"
            >
              {specialties.map((s) => (
                <option key={s.id} value={s.id} className="dark:bg-neutral-900">
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
              size={16}
            />
          </div>
        </div>
      </div>

      {/* FOOTER ACCIONES - Glass Reforzado */}
      <div className="p-7 bg-white/40 dark:bg-neutral-800/40 backdrop-blur-md border-t border-white/20 dark:border-white/5 flex gap-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-neutral-600 dark:text-neutral-300 hover:text-neutral-600 hover:bg-white/60 dark:hover:bg-white/5 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white px-4 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 disabled:opacity-50 transition-all active:scale-95"
        >
          {createMutation.isPending || updateMutation.isPending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={16} strokeWidth={3} />
          )}
          {isEdit ? "Guardar Cambios" : "Publicar Servicio"}
        </button>
      </div>
    </form>
  );
}
