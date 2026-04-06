// ServiceList.tsx
import { useQuery } from "@tanstack/react-query";
import { getServicesByProfessional } from "@/api/service.api";
import type { Service } from "@/types/service.type";
import { ServiceCard } from "./ServiceCard";

interface Props {
  onEdit: (service: Service) => void;
}

export function ServiceList({ onEdit }: Props) {
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => getServicesByProfessional(1),
  });

  if (isLoading) return <p className="text-slate-400 text-sm">Cargando servicios...</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          onEdit={() => onEdit(service)}
        />
      ))}
    </div>
  );
}