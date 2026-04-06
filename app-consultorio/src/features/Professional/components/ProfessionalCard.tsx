// ProfessionalCard.tsx — componente separado
import { CheckCircle2, ChevronRight, Award } from "lucide-react";
import { staticbackend } from "@/config/variables";
import { RatingStars } from "@/components/ui/RatingStars";
import type { Professional } from "@/types/professional.type";

type Props = {
  professional: Professional;
  isSelected: boolean;
  onSelect: () => void;
  onViewProfile: () => void;
};

export function ProfessionalCard({ professional: p, isSelected, onSelect, onViewProfile }: Props) {
  const avatarUrl = p.avatar ? `${staticbackend}${p.avatar}` : "/imgs/image.png";

  return (
    <div
      onClick={onSelect}
      className={`
        cursor-pointer group relative flex flex-col items-center p-6
        rounded-[2rem] transition-all duration-500
        ${isSelected
          ? "bg-white dark:bg-neutral-900 border-2 border-blue-500 shadow-2xl shadow-blue-500/20 -translate-y-2"
          : "bg-white dark:bg-neutral-900/50 border border-slate-100 dark:border-neutral-800 hover:border-blue-200 dark:hover:border-blue-900 shadow-sm hover:shadow-xl hover:-translate-y-1"
        }
      `}
    >
      {/* BADGE */}
      <div className="absolute top-4 right-4">
        {isSelected && (
          <div className="bg-blue-500 text-white p-1.5 rounded-full shadow-lg">
            <CheckCircle2 size={18} />
          </div>
        )}
        {!isSelected && p.verificationStatus === "APPROVED" && (
          <div className="bg-slate-100 dark:bg-neutral-800 text-blue-500 p-1.5 rounded-full border">
            <Award size={16} />
          </div>
        )}
      </div>

      {/* AVATAR */}
      <div className="mb-6">
        <img src={avatarUrl} alt={p.name} className="w-24 h-24 rounded-2xl object-cover" />
      </div>

      {/* INFO */}
      <div className="text-center w-full flex flex-col items-center gap-1">
        <p className="text-xs font-bold text-blue-600 mb-1">
          {p.specialties?.length
            ? p.specialties.map((s) => s.name).join(", ")
            : "Especialista"}
        </p>

        <h4 className="font-black text-lg text-slate-800 dark:text-white">
          {p.name} {p.lastName}
        </h4>

        <RatingStars rating={p.ratingAvg} count={p.ratingCount} showValue />

        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={(e) => { e.stopPropagation(); onViewProfile(); }}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Ver perfil
          </button>

          <div className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold
            ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-neutral-800"}`}
          >
            {isSelected
              ? <span className="flex items-center gap-1">Listo para agendar <ChevronRight size={14} /></span>
              : <span>Ver disponibilidad</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}