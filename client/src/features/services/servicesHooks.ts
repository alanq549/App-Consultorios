// src/features/services/servicesHooks.ts
import { useEffect, useState } from "react";
import {
  getMyServices,
  createService,
  updateService,
  deleteService,
} from "./services.api";
import type { CreateServiceDTO, UpdateServiceDTO } from "./types";
import { toast } from "react-toastify";

export function useMyServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = async () => {
    try {
      const { data } = await getMyServices();
      setServices(data);
    } catch (err) {
        console.error("Error fetching services:", err);
      toast.error("Error cargando servicios", { autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return { services, loading, refetch: fetchServices };
}

export function useServiceActions(refetch: () => void) {
  const create = async (payload: CreateServiceDTO) => {
    try {
      await createService(payload);
      toast.success("Servicio creado");
      refetch();
    } catch {
      toast.error("Error creando servicio");
    }
  };

  const update = async (id: string, payload: UpdateServiceDTO) => {
    try {
      await updateService(id, payload);
      toast.success("Servicio actualizado");
      refetch();
    } catch {
      toast.error("Error actualizando servicio");
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteService(id);
      toast.success("Servicio eliminado");
      refetch();
    } catch {
      toast.error("Error eliminando servicio");
    }
  };

  return { create, update, remove };
}
