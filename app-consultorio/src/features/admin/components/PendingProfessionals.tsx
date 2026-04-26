import { usePendingProfiles } from "@/hooks/admin/useAdminProfiles";
import { ProfessionalAdminCard } from "./ProfessionalAdminCard";
import type { Professional } from "@/types/professional.type";
import { ShieldCheck, UserCheck, Loader2, Info } from "lucide-react";
import { ProfessionalSpecialtiesPanel } from "./SpecialtyRequestsManager";

export function PendingProfessionals() {
  const { data, isLoading, isError } = usePendingProfiles();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-pulse">
        <Loader2 className="animate-spin text-blue-600" size={40} strokeWidth={1.5} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Verificando credenciales...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-center gap-4 text-rose-600">
        <Info size={24} />
        <p className="text-sm font-bold uppercase tracking-tight">
          Error al sincronizar los perfiles administrativos.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header del Módulo */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-500">
            <ShieldCheck size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Panel de Control</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Profesionales Pendientes
          </h2>
        </div>
        
        {data && data.length > 0 && (
          <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full">
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
              {data.length} por revisar
            </span>
          </div>
        )}
      </div>

      {!data?.length ? (
        <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-dashed border-slate-300 dark:border-white/10 rounded-[3rem] p-20 text-center">
          <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
            <UserCheck size={32} strokeWidth={1} />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">
            Excelente trabajo. No hay solicitudes pendientes de revisión.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
            {data.map((profile: Professional) => (
                    <ProfessionalAdminCard
                      key={profile.id}
                      profile={profile}
                    >
                      <ProfessionalSpecialtiesPanel profileId={profile.id} />
                    </ProfessionalAdminCard>
                  ))}
        </div>
      )}
    </section>
  );
}