// src/features/admin/components/PendingProfessionals.tsx

import { usePendingProfiles } from "@/hooks/admin/useAdminProfiles";
import { ProfessionalAdminCard } from "./ProfessionalAdminCard";
import type { Professional } from "@/types/professional.type";

export function PendingProfessionals() {
  const { data, isLoading, isError } = usePendingProfiles();

  if (isLoading) {
    return <p className="text-gray-500">Cargando profesionales pendientes...</p>;
  }

  if (isError) {
    return <p className="text-red-500">Error al cargar los perfiles.</p>;
  }

  if (!data?.length) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-gray-600">
          No hay profesionales pendientes de aprobación.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">

      <h2 className="text-xl font-semibold">
        Profesionales pendientes
      </h2>

      <div className="grid gap-4">
        {data.map((profile: Professional) => (
          <ProfessionalAdminCard
            key={profile.id}
            profile={profile}
          />
        ))}
      </div>

    </section>
  );
}