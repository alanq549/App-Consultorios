// src/features/client/components/booking/ServiceSelector.tsx
import { useEffect, useState } from "react";
import { getServicesByProfessional } from "@/api/service.api";
import type { Service } from "@/types/service.type";
import { Clock, ChevronRight, PackageX, Check } from "lucide-react";

export interface ServiceSelectorProps {
  professionalId: number;
  onSelect: (service: Service) => void;
  onClose: () => void;
}

export function ServiceSelector({ professionalId, onSelect, onClose }: ServiceSelectorProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(!!professionalId);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!professionalId) return;
    let isMounted = true;
    getServicesByProfessional(professionalId)
      .then((data) => { if (isMounted) setServices(data); })
      .catch(console.error)
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [professionalId]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1 mb-4">
          Cargando servicios...
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-2xl bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/5 animate-pulse"
            style={{ opacity: 1 - i * 0.2 }}
          />
        ))}
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (!services.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-400">
          <PackageX size={28} strokeWidth={1.5} />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-black text-slate-600 dark:text-slate-300 tracking-tight">
            Sin servicios disponibles
          </p>
          <p className="text-xs text-slate-400 dark:text-neutral-500">
            Este profesional no tiene servicios activos aún.
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/5 transition-all"
        >
          Volver atrás
        </button>
      </div>
    );
  }

  // ── Lista ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">
        Selecciona un servicio
        <span className="ml-2 text-blue-500 dark:text-blue-400 normal-case tracking-normal font-bold">
          ({services.length} disponible{services.length !== 1 ? "s" : ""})
        </span>
      </label>

      {/* SCROLL si hay muchos servicios */}
      <div
        className={`space-y-2 ${services.length > 4 ? "max-h-[340px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/50 [&::-webkit-scrollbar-thumb]:dark:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-blue-400/60" : ""}`}
      >
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
              className={`group w-full relative flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-300 ${
                isSelected
                  ? "bg-blue-600/10 dark:bg-blue-500/10 border-blue-400/50 dark:border-blue-500/30 shadow-lg shadow-blue-500/10 scale-[1.01]"
                  : "bg-white/40 dark:bg-white/[0.03] border-white/40 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/[0.06] hover:border-blue-300/40 dark:hover:border-white/20 hover:scale-[1.005]"
              }`}
            >
              {/* Indicador lateral activo */}
              <div className={`absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full transition-all duration-300 ${
                isSelected ? "bg-blue-600 opacity-100" : "opacity-0"
              }`} />

              {/* ÍCONO / NÚMERO */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-300 ${
                isSelected
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-neutral-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:text-blue-500"
              }`}>
                {isSelected ? <Check size={16} strokeWidth={3} /> : (services.indexOf(s) + 1)}
              </div>

              {/* INFO */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className={`text-sm font-black tracking-tight truncate transition-colors ${
                  isSelected
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-slate-800 dark:text-white"
                }`}>
                  {s.name}
                </p>
                {s.description && (
                  <p className="text-[11px] text-slate-400 dark:text-neutral-500 font-medium line-clamp-1 leading-relaxed">
                    {s.description}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border transition-colors ${
                    isSelected
                      ? "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/30 text-blue-600 dark:text-blue-400"
                      : "bg-slate-100 dark:bg-white/5 border-transparent text-slate-400 dark:text-neutral-500"
                  }`}>
                    <Clock size={10} strokeWidth={2.5} />
                    {s.durationMin} min
                  </span>

                  {/* Precio si existe */}
                  {s.price != null && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border transition-colors ${
                      isSelected
                        ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-100 dark:bg-white/5 border-transparent text-slate-400 dark:text-neutral-500"
                    }`}>
                      ${s.price}
                    </span>
                  )}
                </div>
              </div>

              {/* CHEVRON */}
              <ChevronRight
                size={18}
                className={`flex-shrink-0 transition-all duration-300 ${
                  isSelected
                    ? "text-blue-500 translate-x-0 opacity-100"
                    : "text-slate-300 dark:text-neutral-600 -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                }`}
              />
            </button>
          );
        })}
      </div>

      <button
        onClick={onClose}
        className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/5 transition-all"
      >
        Cancelar
      </button>
    </div>
  );
}