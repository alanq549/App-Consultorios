// ProfessionalAdminCard.tsx
import { useReviewProfessionalProfile, useSetProfileStatus } from "@/hooks/admin/useAdminProfiles";
import type { Professional } from "@/types/professional.type";
import { staticbackend } from "@/config/variables";
import {
  Check, X, RefreshCw,
  ExternalLink, ShieldAlert, Loader2
} from "lucide-react";

interface Props {
  profile: Professional;
  children?: React.ReactNode;

}
import { ProfessionalProfile } from "@/features/Professional/ProfessionalProfile";
import { Modal } from "@/components/ui/Modal";

import { useState } from "react";

export function ProfessionalAdminCard({ profile, children }: Props) {
  const reviewMutation = useReviewProfessionalProfile();
  const statusMutation = useSetProfileStatus();

  const isPendingMutation = reviewMutation.isPending || statusMutation.isPending;

  const avatarUrl = profile.avatar
    ? `${staticbackend}${profile.avatar}`
    : "/imgs/image.png";

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      PENDING: { label: "Pendiente", color: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/20" },
      APPROVED: { label: "Aprobado", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/20" },
      REJECTED: { label: "Rechazado", color: "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-500/20" },
      SUSPENDED: { label: "Suspendido", color: "bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-500/20" },
    };
    return configs[status] || { label: status, color: "bg-gray-100 text-gray-500 border-gray-200" };
  };

  const [openProfile, setOpenProfile] = useState(false);

  const status = getStatusConfig(profile.verificationStatus);

  return (
    <div className="group relative bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/60 dark:border-white/10 p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5">

      <div className="flex flex-col sm:flex-row gap-5 items-start">

        {/* AVATAR + BADGE */}
        <div className="relative shrink-0 mx-auto sm:mx-0">
          <img
            src={avatarUrl}
            className="w-20 h-20 rounded-[1.8rem] object-cover border-2 border-white dark:border-white/5 shadow-md"
            alt={profile.name}
          />
          <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-tighter shadow-sm ${status.color}`}>
            {status.label}
          </div>
        </div>

        {/* INFO PRINCIPAL */}
        <div className="flex-1 min-w-0 space-y-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="text-base font-black text-slate-800 dark:text-white truncate">
              {profile.name} {profile.lastName}
            </h3>
            <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 hidden sm:block">•</span>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest truncate">
              {profile.specialties?.[0]?.name || "Especialista"}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
            {profile.description || "Sin descripción proporcionada."}
          </p>

          <div className="flex items-center justify-center sm:justify-start gap-4 pt-2">
            <button className="text-[10px] font-black text-slate-400 hover:text-blue-500 uppercase tracking-widest flex items-center gap-1 transition-colors">
              {/* aqui seria mandar no se al link de su telefono o red social*/}
             {/*  <a
                href={`tel:${profile.phone}`}
                className="text-[10px] font-black text-slate-400 hover:text-blue-500 uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                <Mail size={12} /> Contactar
                <span className="opacity-60 font-medium ml-1">({profile.phone})</span>
              </a> */}
            </button>
            <button
              onClick={() => setOpenProfile(true)}
              className="text-[10px] font-black text-slate-400 hover:text-blue-500 uppercase tracking-widest flex items-center gap-1 transition-colors"
            >
              <ExternalLink size={12} /> Perfil
            </button>

            {openProfile && (
              <Modal
                title="Perfil del profesional"
                onClose={() => setOpenProfile(false)}
              >
                <ProfessionalProfile professional={profile} />
              </Modal>
            )}
          </div>
        </div>

        {/* ACCIONES DE CONTROL */}
        <div className="flex sm:flex-col gap-2 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-white/20">

          {isPendingMutation ? (
            <div className="flex items-center justify-center w-full py-4">
              <Loader2 className="animate-spin text-blue-500" size={20} />
            </div>
          ) : (
            <>
              {profile.verificationStatus === "PENDING" && (
                <div className="flex sm:flex-col gap-2 w-full">
                  <button
                    onClick={() => reviewMutation.mutate({ profileId: profile.id, status: "APPROVED" })}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                  >
                    <Check size={14} strokeWidth={3} /> Aprobar
                  </button>
                  <button
                    onClick={() => reviewMutation.mutate({ profileId: profile.id, status: "REJECTED" })}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    <X size={14} strokeWidth={3} /> Rechazar
                  </button>
                </div>
              )}


              {profile.verificationStatus === "APPROVED" && (
                <button
                  onClick={() => statusMutation.mutate({ profileId: profile.id, status: "SUSPENDED" })}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  <ShieldAlert size={14} strokeWidth={3} /> Suspender
                </button>
              )}

              {profile.verificationStatus === "SUSPENDED" && (
                <button
                  onClick={() => statusMutation.mutate({ profileId: profile.id, status: "APPROVED" })}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  <RefreshCw size={14} strokeWidth={3} /> Reactivar
                </button>
              )}
            </>
          )}


        </div>
      </div>
      {/* 👇 AQUÍ VA EL CHILDREN */}
     {children && (
  <div className="mt-5 pt-5 border-t border-slate-100 dark:border-white/5">
    {children}
  </div>
)}
    </div>

  );
}