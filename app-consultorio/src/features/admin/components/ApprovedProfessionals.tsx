"use client";

import {useProfessionals} from "@/hooks/appointments/useProfessionals";
import type { Professional } from "@/types/professional.type";
import { ProfessionalAdminCard } from "./ProfessionalAdminCard";

export  function ApprovedProfessionals() {
      const { data, isLoading, isError } = useProfessionals();
    
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
          No hay profesionales aprobados en este momento.
        </p>
      </div>
    );
  }

   return (
      <section className="space-y-4">
  
        <h2 className="text-xl font-semibold">
          Profesionales aprobados
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