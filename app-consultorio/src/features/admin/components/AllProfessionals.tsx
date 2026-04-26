
import { useAdminProfiles } from "@/hooks/admin/useAdminProfiles";
import { ProfessionalAdminCard } from "./ProfessionalAdminCard";
import type { Professional } from "@/types/professional.type";
import { SearchX, AlertCircle, Users2, RefreshCcw, Globe } from "lucide-react";
import { ProfessionalSpecialtiesPanel } from "./SpecialtyRequestsManager";

export function AllProfessionals() {
  const { data, isLoading, isError } = useAdminProfiles();

  // ── ESTADO: CARGANDO (SKELETON REFINADO) ──────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between px-4">
          <div className="h-3 w-40 bg-slate-200 dark:bg-white/5 animate-pulse rounded-full" />
          <div className="h-6 w-16 bg-slate-200 dark:bg-white/5 animate-pulse rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[200px] w-full bg-white/30 dark:bg-white/5 border border-white/20 rounded-[2.5rem] animate-pulse shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  // ── ESTADO: ERROR (CON TOQUE PREMIUM) ─────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-rose-500/5 border border-rose-500/10 rounded-[3rem] text-center backdrop-blur-md">
        <div className="p-4 bg-rose-500/10 rounded-full mb-4">
          <AlertCircle size={32} className="text-rose-500" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500">
          Fallo en la conexión de datos
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 flex items-center gap-2 px-6 py-2 bg-white dark:bg-white/5 border border-rose-500/20 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-rose-500 hover:text-white transition-all duration-300 shadow-lg shadow-rose-500/10"
        >
          <RefreshCcw size={12} />
          Reintentar sincronización
        </button>
      </div>
    );
  }

  // ── ESTADO: VACÍO (ILUSTRATIVO) ──────────────────────────────────────────
  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in-95">
        <div className="relative p-10 bg-slate-100 dark:bg-white/5 rounded-[3.5rem] mb-6">
          <Users2 size={48} className="text-slate-300 dark:text-neutral-700" strokeWidth={1} />
          <div className="absolute top-8 right-8">
             <SearchX size={20} className="text-blue-500 animate-bounce" />
          </div>
        </div>
        <h3 className="text-sm font-black text-slate-400 dark:text-neutral-500 uppercase tracking-[0.3em]">
          Base de datos vacía
        </h3>
        <p className="text-[10px] text-slate-400/60 font-bold uppercase mt-2">
          No hay registros de profesionales actualmente
        </p>
      </div>
    );
  }

  // ── RENDER PRINCIPAL ─────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out">

      {/* MINI HEADER DE SECCIÓN - Identidad de Marca */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3 group">
          <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors duration-500">
            <Globe size={14} className="text-blue-500 group-hover:text-white transition-colors" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-[0.25em]">
              Directorio Global
            </h2>
            <div className="h-[2px] w-8 bg-blue-500/30 rounded-full transition-all group-hover:w-full" />
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white/50 dark:bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white dark:border-white/10 shadow-sm">
           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-black text-slate-600 dark:text-neutral-300 uppercase tracking-widest italic">
            {data.length} {data.length === 1 ? 'Perfil' : 'Perfiles'}
           </span>
        </div>
      </div>

      {/* GRID DINÁMICO: Efecto Stagger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pb-10">
        {data.map((profile: Professional, index: number) => (
          <div 
            key={profile.id}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <ProfessionalAdminCard profile={profile}>
              {/* Sección de Especialidades con separación premium */}
              <div className="mt-6 pt-6 border-t border-slate-200/40 dark:border-white/5">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-neutral-500">
                      Credenciales y Permisos
                    </h4>
                  </div>
                </div>
                <div className="px-1">
                  <ProfessionalSpecialtiesPanel profileId={profile.id} />
                </div>
              </div>
            </ProfessionalAdminCard>
          </div>
        ))}
      </div>
    </div>
  );
}