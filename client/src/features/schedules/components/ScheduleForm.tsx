import { useState } from "react";
import type { CreateScheduleDTO } from "../types";

const dayOptions = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

interface Props {
  onSubmit: (data: CreateScheduleDTO) => void;
  initial?: CreateScheduleDTO;
  editMode?: boolean;
}

export default function ScheduleForm({ onSubmit, initial, editMode }: Props) {
  const [form, setForm] = useState<CreateScheduleDTO>(
    initial || { 
      dayOfWeek: 0, 
      startTime: "09:00", 
      endTime: "17:00", 
      isAvailable: true 
    }
  );

  const handleChange = (field: keyof CreateScheduleDTO, value: unknown) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <label htmlFor="dayOfWeek" className="block text-sm font-medium text-neutral-700 dark:text-zinc-300">
          Día de la semana
        </label>
        <select
          id="dayOfWeek"
          value={form.dayOfWeek}
          onChange={(e) => handleChange("dayOfWeek", Number(e.target.value))}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white"
          required
        >
          {dayOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="startTime" className="block text-sm font-medium text-neutral-700 dark:text-zinc-300">
            Hora inicio
          </label>
          <input
            type="time"
            id="startTime"
            value={form.startTime}
            onChange={(e) => handleChange("startTime", e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="endTime" className="block text-sm font-medium text-neutral-700 dark:text-zinc-300">
            Hora fin
          </label>
          <input
            type="time"
            id="endTime"
            value={form.endTime}
            onChange={(e) => handleChange("endTime", e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white"
            required
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isAvailable"
          checked={form.isAvailable}
          onChange={(e) => handleChange("isAvailable", e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-neutral-300 dark:border-zinc-600 rounded dark:bg-zinc-700"
        />
        <label htmlFor="isAvailable" className="ml-2 block text-sm text-neutral-700 dark:text-zinc-300">
          Disponible
        </label>
      </div>

      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-blue-500 transition-colors"
      >
        {editMode ? "Actualizar horario" : "Crear horario"}
      </button>
    </form>
  );
}