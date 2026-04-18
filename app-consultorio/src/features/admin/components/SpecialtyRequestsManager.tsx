import { specialtyApi } from "@/api/specialty.api";
import { useSetSpecialtyStatus } from "@/hooks/admin/useAdminProfiles";
import { useQuery } from "@tanstack/react-query";
import type { ProfessionalSpecialty } from "@/types/Specialty.type";

interface Props {
  profileId: number;
}

export function ProfessionalSpecialtiesPanel({ profileId }: Props) {
  const setStatus = useSetSpecialtyStatus();

  const { data: specialties = [] } = useQuery<ProfessionalSpecialty[]>({
    queryKey: ["professional-specialties", profileId],
    queryFn: () => specialtyApi.getByProfessional(profileId),
  });

  return (
    <div className="space-y-2">
      {specialties.map((rel) => (
        <div
          key={`${rel.professionalId}-${rel.specialtyId}`}
          className="flex justify-between items-center p-3 rounded-2xl bg-white/30 dark:bg-white/5 border border-white/10"
        >
          {/* INFO */}
          <div className="space-y-0.5">
            <p className="text-sm font-bold">
              {rel.specialty.name}
            </p>

            <span className="text-xs text-slate-400">
              {rel.status}
            </span>
          </div>

          {/* ACCIONES */}
          {rel.status === "PENDING" && (
            <div className="flex gap-2">
              <button
                className="text-xs px-3 py-1 rounded-lg bg-emerald-500 text-white"
                onClick={() =>
                  setStatus.mutate({
                    professionalId: rel.professionalId,
                    specialtyId: rel.specialtyId,
                    status: "APPROVED",
                  })
                }
              >
                Aprobar
              </button>

              <button
                className="text-xs px-3 py-1 rounded-lg bg-rose-500 text-white"
                onClick={() =>
                  setStatus.mutate({
                    professionalId: rel.professionalId,
                    specialtyId: rel.specialtyId,
                    status: "REJECTED",
                  })
                }
              >
                Rechazar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}