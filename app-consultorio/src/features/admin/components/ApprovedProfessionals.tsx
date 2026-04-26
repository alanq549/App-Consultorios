

import { useProfessionals } from "@/hooks/appointments/useProfessionals";
import type { Professional } from "@/types/professional.type";
import { ProfessionalAdminCard } from "./ProfessionalAdminCard";
import { ProfessionalSpecialtiesPanel } from "./SpecialtyRequestsManager";
import { Users, Loader2, Search, Filter, ShieldCheck } from "lucide-react";

export function ApprovedProfessionals() {
  const { data, isLoading, isError } = useProfessionals();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={32} strokeWidth={1.5} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Cargando directorio médico...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] text-rose-600 text-center">
        <p className="text-xs font-black uppercase tracking-widest">Error al sincronizar perfiles aprobados</p>
      </div>
    );
  }

  return (
    <section className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER CON BUSCADOR SUTIL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-500">
            <ShieldCheck size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Directorio Activo</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Profesionales Aprobados
          </h2>
        </div>

        {/* Acciones de filtrado sutiles */}
        <div className="flex items-center gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                placeholder="Buscar por nombre..." 
                className="w-full bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-2xl py-2.5 pl-11 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
           </div>
           <button className="p-2.5 bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-2xl text-slate-500">
              <Filter size={18} />
           </button>
        </div>
      </div>

      {/* LISTADO */}
      {!data?.length ? (
        <div className="bg-white/20 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 rounded-[3rem] py-20 text-center">
          <Users className="mx-auto text-slate-300 mb-4" size={48} strokeWidth={1} />
          <p className="text-sm font-medium text-slate-400 italic">
            No se encontraron profesionales aprobados en el sistema.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {data.map((profile: Professional) => (
            <div 
              key={profile.id} 
              className="space-y-4 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-white dark:border-white/5 rounded-[2.5rem] p-2 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500"
            >
              {/* Reutilizamos el AdminCard pero podemos pasarle los hijos */}
              <ProfessionalAdminCard profile={profile}>
                {/* Contenedor interno para las especialidades */}
                <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-4 px-4">
                    <div className="w-1 h-4 bg-blue-500 rounded-full" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Gestión de Especialidades
                    </h4>
                  </div>
                  <div className="px-2 pb-2">
                    <ProfessionalSpecialtiesPanel profileId={profile.id} />
                  </div>
                </div>
              </ProfessionalAdminCard>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}