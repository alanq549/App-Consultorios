import { useState } from "react";
import { useSpecialties, useInactiveSpecialties } from "@/hooks/specialties/useSpecialties";
import { SpecialtyTable } from "../components/SpecialtyTable";
import { SpecialtyForm } from "../components/SpecialtyForm";
import { Plus, LayoutGrid, Archive, Loader2, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export const ManageSpecialties = () => {
  const { data: specialties, isLoading } = useSpecialties();
  const { data: inactive } = useInactiveSpecialties();
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  const [openForm, setOpenForm] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER DINÁMICO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-500">
            <Sparkles size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Configuración</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Especialidades Médicas
          </h1>
        </div>

        <button
          onClick={() => setOpenForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/25"
        >
          <Plus size={16} strokeWidth={3} />
          Nueva especialidad
        </button>
      </div>

      {/* TABS DE FILTRADO */}
      <div className="flex gap-2 p-1.5 bg-slate-100/50 dark:bg-white/5 w-fit rounded-2xl border border-slate-200/50 dark:border-white/5">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === "active" 
            ? "bg-white dark:bg-neutral-800 text-blue-600 shadow-sm border border-slate-200/50 dark:border-white/10" 
            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          }`}
        >
          <LayoutGrid size={14} /> Activas ({specialties?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab("inactive")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === "inactive" 
            ? "bg-white dark:bg-neutral-800 text-rose-600 shadow-sm border border-slate-200/50 dark:border-white/10" 
            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          }`}
        >
          <Archive size={14} /> Archivadas ({inactive?.length ?? 0})
        </button>
      </div>

      {/* CONTENIDO */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando catálogo...</p>
        </div>
      ) : (
        <SpecialtyTable 
          specialties={activeTab === "active" ? (specialties ?? []) : (inactive ?? [])} 
          inactive={activeTab === "inactive"} 
        />
      )}

      {/* MODAL FORM */}
      {openForm && (
        <Modal 
  title="Nueva Especialidad" 
  onClose={() => setOpenForm(false)}
>
  <SpecialtyForm onClose={() => setOpenForm(false)} />
</Modal>
      )}
    </div>
  );
};