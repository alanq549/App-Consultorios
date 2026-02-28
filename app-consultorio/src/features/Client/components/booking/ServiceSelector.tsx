// src/features/client/components/booking/ServiceSelector.tsx
import { useEffect, useState } from "react";
import { getServicesByProfessional } from "@/api/service.api";
import type { Service } from "@/types/service.type";
import { Clock, ChevronRight } from "lucide-react"; // Opcional: iconos para mejorar la UI

export interface ServiceSelectorProps {
  professionalId: number;
  onSelect: (service: Service) => void;
  onClose: () => void;
}

export function ServiceSelector({
  professionalId,
  onSelect,
  onClose,
}: ServiceSelectorProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!professionalId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getServicesByProfessional(professionalId)
      .then(setServices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [professionalId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm text-neutral-400 animate-pulse">
          Cargando servicios disponibles...
        </p>
      </div>
    );
  }

  if (!services.length) {
    return (
      <div className="text-center p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
        <p className="text-neutral-400 mb-4">
          Este profesional no tiene servicios activos.
        </p>
        <button
          onClick={onClose}
          className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
        >
          Volver atrás
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3">
        {services.map((s) => {
          const isSelected = selectedId === s.id;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSelectedId(s.id);
                onSelect(s);
              }}
              className={`
                group relative flex items-center justify-between
                p-4 rounded-xl border transition-all duration-300
                ${
                  isSelected
                    ? "bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)] "
                    : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06] backdrop-blur-md"
                }
              `}
            >
              <div className="flex flex-col text-left">
                <span
                  className={`
    font-semibold text-base transition-colors
    ${
      isSelected
        ? "text-indigo-700 dark:text-indigo-300"
        : "text-gray-900 dark:text-gray-100"
    }
  `}
                >
                  {s.name}
                </span>
                <span className="text-xs text-neutral-400  dark:text-neutral-400 mt-1 line-clamp-1">
                  {s.description || "Evaluación profesional especializada"}
                </span>

                <div className="flex items-center gap-2 mt-2">
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      isSelected
                        ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                        : "bg-white/5 border-white/10 text-neutral-400"
                    }`}
                  >
                    <Clock size={12} />
                    {s.durationMin} min
                  </div>
                </div>
              </div>

              <div
                className={`transition-transform duration-300 ${isSelected ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"}`}
              >
                <ChevronRight className="text-indigo-400" size={20} />
              </div>

              {/* Indicador lateral de selección */}
              {isSelected && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-indigo-500 rounded-r-full" />
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onClose}
        className="w-full mt-2 py-3 rounded-xl font-medium text-neutral-800 hover:text-neutral-900 hover:bg-white/20 transition-all"
      >
        Cancelar
      </button>
    </div>
  );
}
