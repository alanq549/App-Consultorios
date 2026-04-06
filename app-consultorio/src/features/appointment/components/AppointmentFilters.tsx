import { Filter } from "lucide-react";

interface Props {
  status: string;
  onStatusChange: (status: string) => void;
}

export function AppointmentFilters({ status, onStatusChange }: Props) {
  const options = [
    { value: "", label: "Todos" },
    { value: "PENDING", label: "Pendientes" },
    { value: "CONFIRMED", label: "Confirmadas" },
    { value: "CANCELLED", label: "Canceladas" },
      { value: "COMPLETED", label: "Finalizadas" },
  ];

  return (
    <div className="flex items-center gap-4 bg-white/40 dark:bg-neutral-900/40 p-1.5 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm">
      {/* Icono decorativo opcional */}
      <div className="pl-3 pr-1 text-slate-400">
        <Filter size={16} strokeWidth={3} />
      </div>

      <div className="flex gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            className={`
              px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300
              ${
                status === option.value
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105"
                  : "text-slate-500 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white"
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}