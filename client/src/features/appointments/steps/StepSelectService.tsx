// src/features/appointments/steps/StepSelectService.tsx
import clsx from "clsx";

export type Service = {
  id: number;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
};

type Props = {
  services: Service[];
  selectedServiceId?: number;
  onSelectService: (serviceId: number) => void;
};

export default function StepSelectService({
  services,
  selectedServiceId,
  onSelectService,
}: Props) {
  return (
    <section className="w-full ">
      {/* Header del Step */}
      <header className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Selecciona un servicio
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Elige el servicio que deseas agendar
        </p>
      </header>

      {/* Grid de servicios */}
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ">
        {services.map((service) => {
          const isSelected = selectedServiceId === service.id;

          return (
            <li key={service.id}>
              <button
                onClick={() => onSelectService(service.id)}
                className="w-full h-full text-left focus:outline-none"
              >
                <div
                  className={clsx(
                    "h-full p-6 rounded-2xl border backdrop-blur-sm transition-all duration-200",
                    "bg-white/40 dark:bg-transparent shadow-xl hover:shadow-2xl",
                    "group-active:scale-[0.98]",
                    isSelected
                      ? "border-teal-500 ring-2 ring-teal-500/30"
                      : "border-gray-200/50 dark:border-white/20 hover:border-teal-500 dark:hover:border-teal-400"
                  )}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex-grow">
                      <h3
                        className={clsx(
                          "text-lg font-semibold mb-2 transition-colors",
                          isSelected
                            ? "text-teal-600 dark:text-teal-400"
                            : "text-gray-900 dark:text-white"
                        )}
                      >
                        {service.name}
                      </h3>

                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
                        {service.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100/50 dark:border-gray-700/30">
                      <div className="flex justify-between items-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100/40 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {service.durationMinutes} min
                        </span>

                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          ${service.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
