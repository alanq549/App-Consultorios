import type { Schedule, UpdateScheduleDTO } from "../types";

interface Props extends Schedule {
  onEdit: (id: number, data: UpdateScheduleDTO) => void;
  onDelete: (id: number) => void;
}

export default function ScheduleCard({
  id,
  dayOfWeek,
  startTime,
  endTime,
  isAvailable,
  onEdit,
  onDelete,
}: Props) {
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  return (
    <div className="border border-neutral-200 dark:border-zinc-700 p-5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-zinc-800 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-neutral-800 dark:text-zinc-100">
          {dayNames[dayOfWeek]}
        </h3>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
          isAvailable 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {isAvailable ? "Disponible" : "No disponible"}
        </span>
      </div>

      {/* Horario */}
      <div className="bg-neutral-50 dark:bg-zinc-700/50 p-3 rounded-lg mb-4">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-sm text-neutral-500 dark:text-zinc-400">Inicio</p>
            <p className="text-xl font-semibold text-neutral-800 dark:text-zinc-100">{startTime}</p>
          </div>
          <div className="w-8 h-px bg-neutral-300 dark:bg-zinc-600 relative">
            <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs text-neutral-400 dark:text-zinc-500">a</span>
          </div>
          <div className="text-center">
            <p className="text-sm text-neutral-500 dark:text-zinc-400">Fin</p>
            <p className="text-xl font-semibold text-neutral-800 dark:text-zinc-100">{endTime}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto flex justify-end gap-2">
        <button
          className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-1
                     text-blue-600 hover:text-blue-800 hover:bg-blue-50 
                     dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-zinc-700 
                     transition-colors"
          onClick={() => onEdit(id, { dayOfWeek, startTime, endTime, isAvailable })}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>
        <button 
          className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-1
                     text-red-600 hover:text-red-800 hover:bg-red-50 
                     dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-zinc-700 
                     transition-colors"
          onClick={() => onDelete(id)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Eliminar
        </button>
      </div>
    </div>
  );
}