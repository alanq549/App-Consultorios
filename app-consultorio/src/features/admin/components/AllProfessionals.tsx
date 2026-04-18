import { useAdminProfiles } from "@/hooks/admin/useAdminProfiles";
import { ProfessionalAdminCard } from "./ProfessionalAdminCard";
import type { Professional } from "@/types/professional.type";
import { SearchX, AlertCircle } from "lucide-react";
import { ProfessionalSpecialtiesPanel } from "./SpecialtyRequestsManager";

export function AllProfessionals() {
  const { data, isLoading, isError } = useAdminProfiles();

  // ── ESTADO: CARGANDO (SKELETON) ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="h-4 w-32 bg-slate-200 dark:bg-white/5 animate-pulse rounded-full" />
          <div className="h-4 w-12 bg-slate-200 dark:bg-white/5 animate-pulse rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 w-full bg-white/30 dark:bg-white/5 border border-white/20 rounded-[2rem] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── ESTADO: ERROR ────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-red-500/5 border border-red-500/10 rounded-[3rem] text-center">
        <AlertCircle size={40} className="text-red-500 mb-4 opacity-50" />
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-500">Error al sincronizar datos</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-[10px] font-bold text-slate-500 underline uppercase">Reintentar</button>
      </div>
    );
  }

  // ── ESTADO: VACÍO ────────────────────────────────────────────────────────
  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="p-6 bg-slate-100 dark:bg-white/5 rounded-[2.5rem] mb-4">
          <SearchX size={32} className="text-slate-400 opacity-20" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">No se encontraron profesionales</p>
      </div>
    );
  }

  // ── RENDER PRINCIPAL ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* MINI HEADER DE SECCIÓN */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Directorio Global
          </h2>
        </div>
        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
          {data.length} {data.length === 1 ? 'USUARIO' : 'USUARIOS'}
        </span>
      </div>

      {/* GRID DINÁMICO: 1 col en móvil, 2 cols en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {data.map((profile: Professional) => (
          <ProfessionalAdminCard
            key={profile.id}
            profile={profile}
          >
            <ProfessionalSpecialtiesPanel profileId={profile.id} />
          </ProfessionalAdminCard>
        ))}
      </div>
    </div>
  );
}