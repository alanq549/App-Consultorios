import { useEffect, useState } from "react";
import { professionalApi } from "@/api/professional.api";
import { CheckCircle2, Users, ChevronRight, Award } from "lucide-react";
import { staticbackend } from "@/config/variables";
import { ProfessionalProfile } from "@/features/Professional/ProfessionalProfile";
import type { Professional } from "@/types/professional.type";
import { RatingStars } from "@/components/ui/RatingStars";
import { createPortal } from "react-dom";

type Props = {
  selectedId: number | null;
  onSelect: (professional: Professional) => void;
};

export function ProfessionalList({ onSelect, selectedId }: Props) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileProfessional, setProfileProfessional] =
    useState<Professional | null>(null);

  useEffect(() => {
    professionalApi
      .getProfessionalProfilesAll()
      .then(setProfessionals)
      .finally(() => setLoading(false));
  }, []);

  const handleOpenProfile = async (p: Professional) => {
    const fullProfile = await professionalApi.getProfessionalProfile(p.id);
    setProfileProfessional(fullProfile);
    setProfileOpen(true);
  };

  const avatarUrl = (p: Professional) =>
    p.avatar ? `${staticbackend}${p.avatar}` : "/imgs/image.png";

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-72 rounded-[2rem] bg-slate-100 dark:bg-neutral-800 animate-pulse border border-slate-200 dark:border-neutral-700"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <Users size={18} />
              <span className="text-xs font-black uppercase tracking-widest">
                Reserva tu cita
              </span>
            </div>

            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              Nuestros Especialistas
            </h3>
          </div>

          <div className="bg-slate-100 dark:bg-neutral-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-neutral-700">
            <span className="text-sm font-bold text-slate-500 dark:text-neutral-400">
              <span className="text-blue-600 dark:text-blue-400">
                {professionals.length}
              </span>{" "}
              disponibles ahora
            </span>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {professionals.map((p) => {
            const isSelected = p.id === selectedId;

            return (
              <div
                key={p.id}
                onClick={() => {
                  onSelect(p);
                }}
                className={`
                cursor-pointer group relative flex flex-col items-center p-6
                rounded-[2rem] transition-all duration-500
                ${
                  isSelected
                    ? "bg-white dark:bg-neutral-900 border-2 border-blue-500 shadow-2xl shadow-blue-500/20 -translate-y-2"
                    : "bg-white dark:bg-neutral-900/50 border border-slate-100 dark:border-neutral-800 hover:border-blue-200 dark:hover:border-blue-900 shadow-sm hover:shadow-xl hover:-translate-y-1"
                }
              `}
              >
                {/* BADGE */}
                <div className="absolute top-4 right-4">
                  {isSelected ? (
                    <div className="bg-blue-500 text-white p-1.5 rounded-full shadow-lg">
                      <CheckCircle2 size={18} />
                    </div>
                  ) : (
                    p.verificationStatus === "APPROVED" && (
                      <div className="bg-slate-100 dark:bg-neutral-800 text-blue-500 p-1.5 rounded-full border">
                        <Award size={16} />
                      </div>
                    )
                  )}
                </div>

                {/* AVATAR */}
                <div className="mb-6">
                  <img
                    src={avatarUrl(p)}
                    alt={p.name}
                    className="w-24 h-24 rounded-2xl object-cover"
                  />
                </div>

                {/* INFO */}
                <div className="text-center w-full items-center flex flex-col gap-1">
                  <p className="text-xs font-bold text-blue-600 mb-1">
                    {p.specialties?.length
                      ? p.specialties.map((s) => s.name).join(", ")
                      : "Especialista"}
                  </p>

                  <h4 className="font-black text-lg text-slate-800 dark:text-white">
                    {p.name} {p.lastName}
                  </h4>

                  <RatingStars
                    rating={p.ratingAvg}
                    count={p.ratingCount}
                    showValue
                  />

                  {/* BOTONES */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProfile(p);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Ver perfil
                    </button>

                    <div
                      className={`
                      flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold
                      ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-neutral-800"
                      }
                    `}
                    >
                      {isSelected ? (
                        <>
                          Listo para agendar <ChevronRight size={14} />
                        </>
                      ) : (
                        "Ver disponibilidad"
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* MODAL PERFIL */}
      {profileOpen &&
        profileProfessional &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/70 dark:bg-neutral-900/60 rounded-2xl shadow-xl max-w-lg w-full relative">
              <button
                onClick={() => setProfileOpen(false)}
                className="absolute right-4 top-4 text-gray-500 hover:text-red-500"
              >
                ✕
              </button>
              <ProfessionalProfile
                professional={profileProfessional}
                onClose={() => setProfileOpen(false)}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
