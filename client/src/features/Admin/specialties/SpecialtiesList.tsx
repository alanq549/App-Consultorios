import  { useState } from "react";
import { useSpecialties, useDeleteSpecialty } from "@/features/specialties/specialtiesHooks";
import SpecialtyForm from "./SpecialtyForm";

export default function SpecialtiesList() {
  const { data: specialties, isLoading, error } = useSpecialties();
  const deleteSpecialty = useDeleteSpecialty();

  const [editingSpecialtyId, setEditingSpecialtyId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
  
  if (error) return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">Error al cargar especialidades. Por favor intenta nuevamente.</p>
        </div>
      </div>
    </div>
  );

  const handleDelete = (id: number) => {
    if (window.confirm("¿Seguro que quieres eliminar esta especialidad?")) {
      deleteSpecialty.mutate(id);
    }
  };

  const handleEdit = (id: number) => {
    setEditingSpecialtyId(id);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingSpecialtyId(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingSpecialtyId(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-zinc-50">Especialidades Médicas</h2>
        <button
          onClick={handleCreate}
          className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-800/40 dark:hover:bg-teal-900 dark:border dark:border-teal-400 text-white px-4 py-2 rounded-md transition-colors duration-200 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Crear Especialidad
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-8">
          <SpecialtyForm 
            specialtyId={editingSpecialtyId} 
            onClose={closeForm} 
          />
        </div>
      )}

      <div className="bg-white dark:bg-zinc-800 shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {specialties?.length === 0 ? (
            <li className="px-6 py-4 text-center text-gray-500 dark:text-zinc-100">
              No hay especialidades registradas
            </li>
          ) : (
            specialties?.map((sp) => (
              <li key={sp.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900  dark:text-zinc-100 truncate">{sp.name}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-zinc-300">{sp.description}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex space-x-2">
                    <button
                      onClick={() => handleEdit(sp.id)}
                      className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-500 p-2 rounded-full hover:bg-blue-50 transition-colors duration-200 dark:hover:bg-zinc-600"
                      title="Editar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(sp.id)}
                      className="text-red-600 hover:text-red-900  dark:hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors duration-200 dark:hover:bg-zinc-600"
                      title="Eliminar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {deleteSpecialty.isPending && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>Eliminando especialidad...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}