// src/features/client/components/booking/ProfessionalList.tsx
import { useEffect, useState } from "react";
import { getProfessionalProfilesAll } from "@/api/professional.api";
import { CheckCircle2, Star } from "lucide-react";
import { staticbackend } from "@/config/variables";

type Professional = {
  id: number;
  name: string;
  lastName: string;
  avatar?: string;
  isVerified: boolean;
  specialty?: {
    id: number;
    name: string;
  };
};

type Props = {
  onSelect: (professional: Professional) => void;
};

export function ProfessionalList({ onSelect }: Props) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    getProfessionalProfilesAll()
      .then(setProfessionals)
      .finally(() => setLoading(false));
  }, []);

  const avatarUrl = (p: Professional) =>
    p.avatar ? `${staticbackend}${p.avatar}` : "/imgs/image.png";

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-56 rounded-2xl bg-white/10 animate-pulse border border-white/20"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white p-1">
          Selecciona un profesional
        </h3>
        <span className="text-xs text-neutral-500 font-medium">
          {professionals.length} especialistas disponibles
        </span>
      </div>

      {/* Grid de profesionales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 justify-items-center">
        {professionals.map((p) => {
          const isSelected = p.id === selectedId;

          return (
            <button
              key={p.id}
              onClick={() => {
                setSelectedId(p.id);
                onSelect(p);
              }}
              className={`
                group relative flex flex-col items-center p-4
                rounded-2xl bg-white/30 dark:bg-neutral-800/30 backdrop-blur-lg
                border border-white/20 dark:border-white/10
                shadow-lg transition-all duration-300
                min-w-[200px] max-w-[260px] w-full
                ${isSelected ? "border-indigo-500 shadow-indigo" : "hover:scale-105 hover:border-white/30"}
              `}
            >
              {/* Badge de selección */}
              {isSelected && (
                <div className="absolute top-4 right-4 text-indigo-500 animate-in zoom-in duration-300">
                  <CheckCircle2 size={24} className="text-indigo-500" />
                </div>
              )}

              {/* Avatar */}
              <div className="relative mb-4">
                <div
                  className={`absolute inset-0 rounded-full blur-md transition-opacity duration-300 ${
                    isSelected
                      ? "bg-indigo-500/20 opacity-100"
                      : "opacity-0 group-hover:opacity-20"
                  }`}
                />
                <img
                  src={avatarUrl(p)}
                  alt={`${p.name}`}
                  className={`relative w-24 h-24 rounded-full object-cover border-4 transition-transform duration-300 ${
                    isSelected
                      ? "border-indigo-500"
                      : "border-white/20 group-hover:scale-105"
                  }`}
                />
                {p.isVerified && (
                  <div
                    className="absolute bottom-1 right-1 bg-blue-500 text-white p-1 rounded-full shadow-md"
                    title="Verificado"
                  >
                    <CheckCircle2 size={10} strokeWidth={2} />
                  </div>
                )}
              </div>

              {/* Información */}
              <div className="text-center flex-1">
                <h4
                  className={`font-bold text-lg transition-colors ${
                    isSelected
                      ? "text-indigo-400"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {p.name} {p.lastName}
                </h4>
                {p.specialty && (
                  <p className="text-sm font-medium text-neutral-400 mt-1 uppercase tracking-tight">
                    {p.specialty.name}
                  </p>
                )}

                <div className="flex items-center justify-center gap-1 mt-3 py-1 px-3 rounded-full bg-white/10 border border-white/10 text-yellow-500 font-bold text-[10px]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={10} fill="currentColor" />
                  ))}
                  <span className="ml-1 text-neutral-400">5.0</span>
                </div>
              </div>

              {/* Footer */}
              <div
                className={`
                  mt-4 pt-4 border-t border-white/10 w-full text-center transition-opacity duration-300
                  ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                `}
              >
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                  {isSelected ? "Seleccionado" : "Seleccionar"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
