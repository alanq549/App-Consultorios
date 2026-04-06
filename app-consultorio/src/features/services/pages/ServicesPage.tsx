import { useState } from "react";
import { Plus } from "lucide-react";
import { ServiceList } from "../components/ServiceList";
import { ServiceForm } from "../components/ServiceForm";
import type { Service } from "@/types/service.type";

export default function ServicesPage() {
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);

  const handleCreate = () => {
    setEditingService(null);
    setOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* HEADER DE LA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Plus size={24} strokeWidth={3} />
            </div>
            Mis Servicios
          </h1>
          <p className="text-slate-500 dark:text-neutral-400 text-sm mt-1">
            Gestiona los tipos de consulta y procedimientos que ofreces.
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-95"
        >
          <Plus size={20} />
          Nuevo Servicio
        </button>
      </div>

      <ServiceList onEdit={handleEdit} />
      {/* MODAL / OVERLAY PARA FORMULARIO */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-500"
          onClick={(e) => {
            // Opcional: Cerrar al hacer clic en el overlay (fuera del form)
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-lg drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden">
            <ServiceForm
              service={editingService}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
