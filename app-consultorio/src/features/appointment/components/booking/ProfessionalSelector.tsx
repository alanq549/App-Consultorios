import { useState } from "react";
import { Eye } from "lucide-react";

import { useProfessionals } from "@/hooks/appointments/useProfessionals";
import { RatingStars } from "@/components/ui/RatingStars";
import { ProfessionalProfile } from "@/features/Professional/ProfessionalProfile";
import { Modal } from "@/components/ui/Modal";

import type { BookingProfessional, Professional } from "@/types/professional.type";
import { staticbackend } from "@/config/variables";
import { BookingFlowModal } from "./BookingFlowModal";

interface Props {
  value?: number;
  onChange: (professionalId: number) => void;
}

export function ProfessionalSelector({ value }: Props) {
  const { data: professionals, isLoading } = useProfessionals();
  const [bookingProfessional, setBookingProfessional] = useState<BookingProfessional | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<BookingProfessional | null>(null);

  const avatarUrl = (p: BookingProfessional) =>
    p.avatar ? `${staticbackend}${p.avatar}` : "/imgs/image.png";

  console.log("Professionals: ", professionals);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            
          >
            <div className="flex gap-3 items-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-gray-200/60 dark:bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200/60 dark:bg-white/10 rounded-full w-3/4" />
                <div className="h-2.5 bg-gray-200/60 dark:bg-white/10 rounded-full w-1/2" />
              </div>
            </div>
            <div className="h-8 bg-gray-200/60 dark:bg-white/10 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {professionals?.map((professional: BookingProfessional) => {
          const isSelected = value === professional.id;

          return (
            <div
              key={professional.id}
              className={`
                group relative flex flex-col
                rounded-2xl p-4
                backdrop-blur-xl
                border transition-all duration-200
                ${isSelected
                  ? "bg-indigo-50/80 dark:bg-indigo-900/20 border-indigo-400/60 dark:border-indigo-500/40 shadow-lg shadow-indigo-100/50 dark:shadow-indigo-900/20"
                  : "bg-white/60 dark:bg-white/[0.04] border-white/40 dark:border-white/10 hover:border-indigo-300/50 dark:hover:border-indigo-600/30 hover:shadow-md hover:bg-white/80 dark:hover:bg-white/[0.07]"
                }
              `}
            >
              {/* SELECTED BADGE */}
              {isSelected && (
                <span className="absolute top-3 right-3 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Seleccionado
                </span>
              )}

              {/* CARD HEADER: avatar + info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-shrink-0">
                  <img
                    src={avatarUrl(professional)}
                    alt={professional.name}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-white/60 dark:border-white/10 shadow-sm"
                  />
                 
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">
                    {professional.name} {professional.lastName}
                  </p>

                  {professional.specialty && (
                    <p className="text-[11px] text-indigo-500 dark:text-indigo-400 font-medium truncate mt-0.5">
                      {professional.specialty.name}
                    </p>
                  )}

                  <div className="mt-1">
                    <RatingStars
                      rating={professional.ratingAvg}
                      count={professional.ratingCount}
                      size={12}
                    />
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => setBookingProfessional(professional)}
                  className="
                    flex-1 py-2 px-3 rounded-xl text-xs font-semibold
                    bg-indigo-600 hover:bg-indigo-700 active:scale-95
                    text-white transition-all shadow-sm
                  "
                >
                  Reservar
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProfile(professional);
                  }}
                  className="
                    flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold
                    bg-white/60 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/10
                    text-gray-600 dark:text-gray-300
                    border border-white/40 dark:border-white/10
                    transition-all
                  "
                >
                  <Eye size={12} />
                  Perfil
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {bookingProfessional && (
        <BookingFlowModal
          professional={bookingProfessional}
          onClose={() => setBookingProfessional(null)}
        />
      )}

      {selectedProfile && (
        <Modal
          title={`${selectedProfile.name} ${selectedProfile.lastName ?? ""}`}
          onClose={() => setSelectedProfile(null)}
        >
          <ProfessionalProfile professional={selectedProfile as Professional} />
        </Modal>
      )}
    </>
  );
}