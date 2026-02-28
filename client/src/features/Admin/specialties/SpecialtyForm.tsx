import React, { useEffect, useState } from "react";
import { useCreateSpecialty, useUpdateSpecialty, useSpecialties } from "@/features/specialties/specialtiesHooks";
import type { SpecialtyInput } from "@/features/specialties/types";

interface Props {
  specialtyId: number | null;
  onClose: () => void;
}

export default function SpecialtyForm({ specialtyId, onClose }: Props) {
  const { data: specialties } = useSpecialties();
  const createSpecialty = useCreateSpecialty();
  const updateSpecialty = useUpdateSpecialty();

  const [formData, setFormData] = useState<SpecialtyInput>({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (specialtyId !== null && specialties) {
      const sp = specialties.find(s => s.id === specialtyId);
      if (sp) {
        setFormData({ name: sp.name, description: sp.description || "" });
      }
    } else {
      setFormData({ name: "", description: "" });
    }
  }, [specialtyId, specialties]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (specialtyId !== null) {
      updateSpecialty.mutate(
        { id: specialtyId, input: formData },
        { onSuccess: () => onClose() }
      );
    } else {
      createSpecialty.mutate(formData, {
        onSuccess: () => onClose(),
      });
    }
  };

  const isLoading = createSpecialty.isPending || updateSpecialty.isPending;
  const error = createSpecialty.error || updateSpecialty.error;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">
          {specialtyId !== null ? "Editar Especialidad" : "Crear Nueva Especialidad"}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la especialidad
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            minLength={3}
            maxLength={50}
            pattern="[a-zA-ZÁÉÍÓÚáéíóúÑñ\s]+"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: Cardiología"
          />
          <p className="mt-1 text-xs text-gray-500">
            Solo letras y espacios (3-50 caracteres)
          </p>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            minLength={10}
            maxLength={300}
            rows={4}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Descripción detallada de la especialidad..."
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.description?.length || 0}/300 caracteres
          </p>
        </div>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">Error al guardar la especialidad. Por favor intenta nuevamente.</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {specialtyId !== null ? "Actualizando..." : "Creando..."}
              </>
            ) : (
              specialtyId !== null ? "Actualizar" : "Crear"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}