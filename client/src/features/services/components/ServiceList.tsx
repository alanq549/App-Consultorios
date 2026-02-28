import ServiceCard from "./ServiceCard";
import type { Service, UpdateServiceDTO } from "../types";

type Props = {
  services: Service[];
  onEdit: (id: string, data: UpdateServiceDTO) => void;
  onDelete: (id: string) => void;
};

export default function ServiceList({ services, onEdit, onDelete }: Props) {
  if (services.length === 0) return (
    <p className="text-gray-500 text-center py-8 text-lg">
      No hay servicios aún.
    </p>
  );

  return (
    <div className="grid gap-6 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <ServiceCard 
          key={s.id} 
          {...s} 
          onEdit={onEdit} 
          onDelete={onDelete} 
        />
      ))}
    </div>
  );
}