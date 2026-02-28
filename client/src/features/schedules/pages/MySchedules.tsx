// src/features/schedules/pages/MySchedules.tsx
import { useState } from "react";
import { useMySchedules, useScheduleActions } from "../schedulesHooks";
import ScheduleCard from "../components/ScheduleCard";
import ModalScheduleForm from "../components/ModalScheduleForm";
import type { UpdateScheduleDTO, CreateScheduleDTO } from "../types";

export default function MySchedules() {
  const { schedules, loading, refetch } = useMySchedules();
  const { create, update, remove } = useScheduleActions(refetch);

  const [modalOpen, setModalOpen] = useState(false);
const [editing, setEditing] = useState<null | { id: number; data: CreateScheduleDTO }>(null);

  if (loading) return <p>Cargando horarios...</p>;

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

const openEdit = (id: number, data: UpdateScheduleDTO) => {
  setEditing({
    id,
    data: {
      dayOfWeek: data.dayOfWeek ?? 0,  // valor por defecto si está undefined
      startTime: data.startTime ?? "09:00",
      endTime: data.endTime ?? "10:00",
      isAvailable: data.isAvailable ?? true,
    },
  });
  setModalOpen(true);
};


const handleSubmit = (data: CreateScheduleDTO) => {
  if (editing) {
    update(editing.id, data);
  } else {
    create(data);
  }
  setModalOpen(false);
};

  return (
 <div className="p-4 space-y-6">
  <div className="flex items-center justify-between">
    <h2 className="text-2xl font-bold">Mis Horarios</h2>
    <button
      onClick={openCreate}
      className="bg-teal-400/70 hover:bg-teal-400  dark:bg-teal-800/40 dark:hover:bg-teal-700/60 dark:border dark:border-teal-400 text-white px-4 py-2 rounded "
    >
      Nuevo Horario
    </button>
  </div>

  <hr />

  <div className="grid gap-4 mt-4">
    {schedules.map((sched) => (
      <ScheduleCard
        key={sched.id}
        {...sched}
        onEdit={openEdit}
        onDelete={remove}
      />
    ))}
  </div>

  <ModalScheduleForm
    isOpen={modalOpen}
    onClose={() => setModalOpen(false)}
    onSubmit={handleSubmit}
    initial={editing?.data}
    editMode={!!editing}
  />
</div>

  );
}
