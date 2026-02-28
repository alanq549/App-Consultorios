import { useState } from "react";
import { useMyServices, useServiceActions } from "../servicesHooks";
import ModalServiceForm from "../components/ModalServiceForm";
import ServiceList from "../components/ServiceList";
import type { ServiceFormDTO, UpdateServiceDTO } from "../types";

export default function MyServices() {
  const { services, loading, refetch } = useMyServices();
  const { create, update, remove } = useServiceActions(refetch);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<null | { id: string; data: ServiceFormDTO }>(null);

  if (loading) return <p>Cargando servicios...</p>;

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Mis Servicios</h2>
        <button
          onClick={() => {
            setEditing(null); // modo creación
            setModalOpen(true);
          }} 
      className="bg-teal-400/70 hover:bg-teal-400  dark:bg-teal-800/40 dark:hover:bg-teal-700/60 text-white px-4 py-2 rounded dark:border dark:border-teal-400"
        >
          + Nuevo servicio
        </button>
      </div>

      <hr />

      <ServiceList
        services={services}
        onEdit={(id: string, data: UpdateServiceDTO) => {
          const cleaned: ServiceFormDTO = {
            name: data.name || "",
            description: data.description || "",
            durationMinutes: data.durationMinutes || 30,
            price: data.price ?? 0,
          };
          setEditing({ id, data: cleaned });
          setModalOpen(true);
        }}
        onDelete={remove}
      />

      <ModalServiceForm
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  onSubmit={(data) => {
    console.log("📦 DATA QUE SE ENVÍA AL BACKEND:", data);

    if (editing) {
      update(editing.id, data);
    } else {
      create(data);
    }
  }}
  initial={editing?.data}
  editMode={!!editing}
/>

    </div>
  );
}
