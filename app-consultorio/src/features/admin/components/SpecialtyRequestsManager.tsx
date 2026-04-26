import { specialtyApi } from "@/api/specialty.api";
import { useSetSpecialtyStatus } from "@/hooks/admin/useAdminProfiles";
import { useQuery } from "@tanstack/react-query";
import type { ProfessionalSpecialty } from "@/types/Specialty.type";
import { Check, X, Clock, Award, Loader2 } from "lucide-react";

interface Props {
  profileId: number;
}

export function ProfessionalSpecialtiesPanel({ profileId }: Props) {
  const setStatus = useSetSpecialtyStatus();

  const { data: specialties = [], isLoading } = useQuery<ProfessionalSpecialty[]>({
    queryKey: ["professional-specialties", profileId],
    queryFn: () => specialtyApi.getByProfessional(profileId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-slate-400">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-widest">Cargando especialidades...</span>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {specialties.map((rel) => {
        const isPending = rel.status === "PENDING";
        const isApproved = rel.status === "APPROVED";
        const isRejected = rel.status === "REJECTED";
        const isMutating = setStatus.isPending && 
                          setStatus.variables?.specialtyId === rel.specialtyId;

        return (
          <div
            key={`${rel.professionalId}-${rel.specialtyId}`}
            className="group flex justify-between items-center p-4 rounded-[1.5rem] bg-white/40 dark:bg-black/20 border border-white/60 dark:border-white/5 transition-all hover:border-blue-500/30"
          >
            {/* INFO & STATUS BADGE */}
            <div className="flex items-start gap-3">
              <div className={`mt-1 p-2 rounded-xl ${
                isApproved ? 'bg-emerald-500/10 text-emerald-600' : 
                isRejected ? 'bg-rose-500/10 text-rose-600' : 
                'bg-amber-500/10 text-amber-600'
              }`}>
                <Award size={14} strokeWidth={2.5} />
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-700 dark:text-neutral-200 uppercase tracking-tight">
                  {rel.specialty.name}
                </p>
                <div className="flex items-center gap-1.5">
                  {isPending && <Clock size={10} className="text-amber-500" />}
                  <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${
                    isApproved ? 'text-emerald-500' : 
                    isRejected ? 'text-rose-500' : 
                    'text-amber-500'
                  }`}>
                    {rel.status === "PENDING" ? "Revisión Pendiente" : rel.status}
                  </span>
                </div>
              </div>
            </div>

            {/* ACCIONES DINÁMICAS */}
            <div className="flex gap-2">
              {isPending && !isMutating ? (
                <>
                  <button
                    disabled={setStatus.isPending}
                    className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all active:scale-90"
                    title="Aprobar"
                    onClick={() => setStatus.mutate({
                      professionalId: rel.professionalId,
                      specialtyId: rel.specialtyId,
                      status: "APPROVED",
                    })}
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>

                  <button
                    disabled={setStatus.isPending}
                    className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white transition-all active:scale-90"
                    title="Rechazar"
                    onClick={() => setStatus.mutate({
                      professionalId: rel.professionalId,
                      specialtyId: rel.specialtyId,
                      status: "REJECTED",
                    })}
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </>
              ) : isMutating ? (
                <div className="p-2.5">
                  <Loader2 size={14} className="animate-spin text-blue-500" />
                </div>
              ) : (
                /* Icono de estado final sutil */
                <div className={`p-2.5 opacity-30`}>
                  {isApproved ? <Check size={14} /> : <X size={14} />}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}