/// src/features/appointment/components/booking/ServiceSelector.tsx
import { Clock } from "lucide-react";
import type { Service } from "@/types/service.type";

interface Props {
  services: Service[];
  onSelect: (service: Service) => void;
}

export function ServiceSelector({ services, onSelect }: Props) {
  if (services.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Este profesional no tiene servicios disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 ">
        Elige un servicio
      </p>

      <div className="grid gap-2">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className="
              w-full text-left
              flex items-center justify-between gap-4
              p-4 rounded-xl
              bg-white/40 dark:bg-white/[0.04]
              border border-white/30 dark:border-white/10
              hover:border-indigo-400/50 dark:hover:border-indigo-500/30
              hover:bg-white/70 dark:hover:bg-white/[0.08]
              hover:shadow-sm
              active:scale-[0.99]
              transition-all group
              
            "
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                {service.name}
              </p>
              {service.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {service.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                  <Clock size={11} />
                  {service.durationMin} min
                </span>
              </div>
            </div>

            <div className="flex-shrink-0 text-right">
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                ${service.price}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}