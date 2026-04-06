/// src/features/Professional/ProfessionalProfile.tsx
import {
  ExternalLink,
  Globe,
  FileText,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Award,
} from "lucide-react";
import { staticbackend } from "@/config/variables";
import type { Professional } from "@/types/professional.type";
import { RatingStars } from "@/components/ui/RatingStars";

type Props = {
  professional: Professional;
  onClose?: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SOCIAL_STYLE: Record<string, { icon: any; color: string; bg: string }> = {
  instagram: {
    icon: Instagram,
    color: "text-pink-500",
    bg: "bg-pink-50 dark:bg-pink-500/10",
  },
  facebook: {
    icon: Facebook,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  twitter: {
    icon: Twitter,
    color: "text-sky-500",
    bg: "bg-sky-50 dark:bg-sky-500/10",
  },
  x: {
    icon: Twitter,
    color: "text-slate-900 dark:text-white",
    bg: "bg-slate-100 dark:bg-neutral-800",
  },
  linkedin: {
    icon: Linkedin,
    color: "text-blue-700",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  website: {
    icon: Globe,
    color: "text-slate-500",
    bg: "bg-slate-100 dark:bg-neutral-800",
  },
};

const getSocialConfig = (type: string) => {
  const key = type.toLowerCase();

  for (const social in SOCIAL_STYLE) {
    if (key.includes(social)) {
      return SOCIAL_STYLE[social];
    }
  }

  return SOCIAL_STYLE.website;
};

export function ProfessionalProfile({ professional }: Props) {



  const avatarUrl = professional.avatar
    ? `${staticbackend}${professional.avatar}`
    : "/imgs/image.png";

  return (
    <div
      className="
        flex flex-col items-center
        p-6 rounded-2xl
        animate-in fade-in duration-300
      "
    >
      {/* HEADER */}

      {/* AVATAR + INFO HERO */}
      <div className="flex items-start gap-5 w-full mb-5">
        {/* AVATAR */}
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-indigo-500/60 p-0.5 bg-white/40 dark:bg-white/10 shadow-md">
            <img
              src={avatarUrl}
              alt={professional.name}
              className="w-full h-full rounded-[14px] object-cover"
            />
          </div>

          {/* Rating */}
          <RatingStars
            rating={professional.ratingAvg}
            count={professional.ratingCount}
            showValue
          />

          {professional.verificationStatus && (
            <div className="absolute -top-1 -right-1 bg-indigo-600 text-white p-1.5 rounded-lg shadow border-2 border-white dark:border-neutral-900">
              <Award size={12} />
            </div>
          )}
        </div>
        {/* INFO */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
            {professional.name} {professional.lastName}
          </h2>

          {/* Descripción del profesional */}
          {professional.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              {professional.description}
            </p>
          )}

          {/* Especialidades */}
          {professional.specialties && professional.specialties.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 mt-3">
                {professional.specialties.map((s) => (
                  <span
                    key={s.id}
                    className="
              text-[11px] font-semibold
              text-indigo-600 dark:text-indigo-400
              bg-indigo-50 dark:bg-indigo-900/20
              border border-indigo-200/40 dark:border-indigo-700/30
              px-2.5 py-0.5
              rounded-full
            "
                  >
                    {s.name}
                  </span>
                ))}
              </div>

              {/* Descripción de especialidades */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                {professional.specialties
                  .map((s) => s.description)
                  .filter(Boolean)
                  .join(" · ") || "Sin descripción de especialidades"}
              </p>
            </>
          )}
        </div>
      </div>

      {/* DIVIDER */}
      <div className="w-full border-t border-white/30 dark:border-white/10 mb-4" />

      {/* SECCIONES DINÁMICAS */}
      <div className="w-full space-y-5">
        {/* REDES SOCIALES */}
        {professional.socialLinks && professional.socialLinks.length > 0 && (
          <div className="space-y-4">
            <p className="text-[11px] font-bold text-slate-700 dark:text-neutral-400 uppercase tracking-wider">
              Presencia Digital
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {professional.socialLinks.map((link) => {
                const config = getSocialConfig(link.type);
                const Icon = config.icon;

                return (
                  <div
                    key={link.id}
                    className="
        group flex items-center justify-between
        p-3 rounded-xl
        border border-slate-100 dark:border-neutral-800
        bg-white dark:bg-neutral-900
        hover:shadow-sm transition-all
      "
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      {/* ICONO */}
                      <div
                        className={`p-2 rounded-lg shrink-0 ${config.bg} ${config.color}`}
                      >
                        <Icon size={14} />
                      </div>

                      {/* TEXTO */}
                      <div className="overflow-hidden min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-1">
                          {link.type}
                        </p>

                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="
              text-xs font-medium
              text-slate-700 dark:text-neutral-200
              truncate block
              hover:text-blue-500 transition-colors
            "
                        >
                          {link.url.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    </div>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
          p-1.5 text-slate-400
          hover:text-blue-500
          opacity-0 group-hover:opacity-100
          transition-opacity
        "
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                );
              })}
            </div>
            
          </div>
        )}

        {/* CERTIFICACIONES */}
        {professional.certificates && professional.certificates.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-700 dark:text-gray-400 uppercase tracking-widest">
              Certificaciones y Títulos
            </p>
            <div className="space-y-2">
              {professional.certificates.map((cert, i) => (
                <a
                  key={i}
                  href={`${staticbackend}${cert.fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    flex items-center gap-3
                    p-3 rounded-xl
                    bg-white/40 dark:bg-white/[0.04]
                    border border-white/30 dark:border-white/10
                    hover:border-indigo-400/50 dark:hover:border-indigo-500/30
                    hover:bg-white/60 dark:hover:bg-white/[0.07]
                    transition-all group
                  "
                >
                  <div className="p-2 bg-indigo-50/80 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <FileText size={16} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {cert.title}
                    </p>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                      Documento Verificado
                    </p>
                  </div>
                  <div
                    className="
                      p-1.5 rounded-lg
                      bg-white/60 dark:bg-white/10
                      text-gray-400
                      group-hover:bg-indigo-600 group-hover:text-white
                      transition-all
                    "
                  >
                    <ExternalLink size={13} />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

  );
}
