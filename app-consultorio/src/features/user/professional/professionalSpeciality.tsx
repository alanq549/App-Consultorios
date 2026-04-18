import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { Stethoscope, Info, Plus, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useProfessionalProfile } from "@/hooks/users/useProfessionalProfile";
import { useSpecialties } from "@/hooks/specialties/useSpecialties";

const STATUS_CONFIG = {
  PENDING: {
    label: "Pendiente",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  APPROVED: {
    label: "Aprobada",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  REJECTED: {
    label: "Rechazada",
    icon: XCircle,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
};

export const ProfessionalSpeciality = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const { requestSpecialty, loading } = useProfessionalProfile();
  const { data: allSpecialties } = useSpecialties();

  if (!user || user.role !== "PROFESSIONAL") return null;

  const specialties = user.profile?.specialties ?? [];
  
  // Lógica de validación preventiva
  const pendingCount = specialties.filter(s => s.status === "PENDING").length;
  const canRequestMore = pendingCount < 2;

  const availableSpecialties = allSpecialties?.filter(
    (s) => !specialties.some((p) => p.id === s.id)
  ) ?? [];

  return (
    <section className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 dark:border-white/10 overflow-hidden shadow-sm">
      
      {/* HEADER PREMIUM */}
      <div className="p-8 border-b border-white/20 dark:border-white/5 flex items-center justify-between bg-white/20 dark:bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
            <Stethoscope size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">
              Especialidades
            </h3>
            <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest">
              Gestiona tus certificaciones médicas
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-10">
        {/* SECCIÓN: MIS ESPECIALIDADES */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase tracking-[0.2em] ml-1">
            Mis especialidades actuales
          </h4>

          {specialties.length === 0 ? (
            <div className="p-8 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10 text-center">
              <p className="text-sm font-medium text-slate-400 italic">
                Aún no has solicitado ninguna especialidad.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {specialties.map((spec) => {
                const config = STATUS_CONFIG[spec.status as keyof typeof STATUS_CONFIG];
                const Icon = config.icon;

                return (
                  <div
                    key={spec.id}
                    className="group flex items-start justify-between gap-4 p-5 rounded-[2rem] border border-white/60 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] transition-all hover:scale-[1.02]"
                  >
                    <div className="flex-1 space-y-1">
                      <h4 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">
                        {spec.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed line-clamp-2">
                        {spec.description || "Sin descripción adicional."}
                      </p>
                    </div>

                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${config.bg} ${config.color} ${config.border}`}>
                      <Icon size={12} strokeWidth={3} />
                      {config.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECCIÓN: SOLICITAR NUEVAS */}
        <div className="pt-8 border-t border-white/20 dark:border-white/5 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase tracking-[0.2em] ml-1">
              Solicitar nueva especialidad
            </h4>
            
            {/* ALERT DE LÍMITE */}
            {!canRequestMore && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-in fade-in slide-in-from-right-4">
                <Info size={14} className="text-amber-600 dark:text-amber-400" />
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-tight">
                  Límite alcanzado: Máximo 2 pendientes
                </p>
              </div>
            )}
          </div>

          {!canRequestMore ? (
            <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm text-amber-500">
                <Clock size={20} />
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed font-medium">
                Tienes <span className="text-slate-800 dark:text-white font-bold">{pendingCount} solicitudes en espera</span>. Por políticas de calidad, debemos revisar tus credenciales actuales antes de permitir nuevas solicitudes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableSpecialties.map((spec) => (
                <button
                  key={spec.id}
                  onClick={() => requestSpecialty(spec.id)}
                  disabled={loading}
                  className="group relative flex items-center justify-center p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-neutral-800/50 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-neutral-400 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:shadow-lg hover:shadow-blue-500/5 active:scale-95 disabled:opacity-50"
                >
                  <Plus size={14} className="absolute left-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {spec.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};