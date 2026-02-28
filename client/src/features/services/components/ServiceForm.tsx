import { useState } from "react";
import type { ServiceFormDTO } from "../types";

interface Props {
  onSubmit: (data: ServiceFormDTO) => void;
  initial?: ServiceFormDTO;
  editMode?: boolean;
}

export default function ServiceForm({ onSubmit, initial, editMode }: Props) {
  const [form, setForm] = useState<ServiceFormDTO>(
    initial || {
  name: "",
  description: "",
  durationMinutes: 30,
  price: 1,
}
  );

  const handleChange = (field: keyof ServiceFormDTO, value: unknown) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-zinc-300">
          Nombre del servicio
        </label>
        <input
          type="text"
          id="name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white"
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="block text-sm font-medium text-neutral-700 dark:text-zinc-300">
          Descripción
        </label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="duration" className="block text-sm font-medium text-neutral-700 dark:text-zinc-300">
            Duración (minutos)
          </label>
          <input
            type="number"
            id="duration"
            value={form.durationMinutes}
            onChange={(e) => handleChange("durationMinutes", Number(e.target.value))}
            min="1"   step="0.01"
            className="w-full px-3 py-2 border border-neutral-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="price" className="block text-sm font-medium text-neutral-700 dark:text-zinc-300">
            Precio
          </label>
          <input
            type="number"
            id="price"
            value={form.price}
            onChange={(e) => handleChange("price", Number(e.target.value))}
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-neutral-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-white"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-blue-500 transition-colors"
      >
        {editMode ? "Actualizar servicio" : "Crear servicio"}
      </button>
    </form>
  );
}