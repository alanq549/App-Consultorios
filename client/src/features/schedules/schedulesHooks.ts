// src/features/schedules/schedulesHooks.ts
import { useState, useEffect } from "react";
import {
  getMySchedules,
  createSchedules,
  updateSchedule,
  deleteSchedule,
} from "./schedules.api";
import type { CreateScheduleDTO, UpdateScheduleDTO, Schedule } from "./types";
import { toast } from "react-toastify";

export function useMySchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    try {
      const { data } = await getMySchedules();
      setSchedules(data);
    } catch (e) {
        console.error("error en fetchschedules",e)
      toast.error("Error al cargar horarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  return { schedules, loading, refetch: fetchSchedules };
}

export function useScheduleActions(refetch: () => void) {
  const create = async (payload: CreateScheduleDTO | CreateScheduleDTO[]) => {
    try {
      await createSchedules(payload);
      toast.success("Horario(s) creado(s)");
      refetch();
    } catch {
      toast.error("Error al crear horario(s)");
    }
  };

  const update = async (id: number, payload: UpdateScheduleDTO) => {
    try {
      await updateSchedule(id, payload);
      toast.success("Horario actualizado");
      refetch();
    } catch {
      toast.error("Error al actualizar horario");
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteSchedule(id);
      toast.success("Horario eliminado");
      refetch();
    } catch {
      toast.error("Error al eliminar horario");
    }
  };

  return { create, update, remove };
}
