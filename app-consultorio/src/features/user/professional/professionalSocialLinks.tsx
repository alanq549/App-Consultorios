import { useState } from "react";
import { useProfessionalProfile } from "@/hooks/users/useProfessionalProfile";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { 
  Facebook, 
  Instagram, 
  Linkedin, 
  Globe, 
  Link as LinkIcon, 
  Plus, 
  Trash2, 
  ExternalLink,
  AlertCircle
} from "lucide-react";

interface SocialLink {
  id: number;
  type: "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "WEBSITE";
  url: string;
}

// Helper para iconos y colores según la red
const SOCIAL_CONFIG = {
  FACEBOOK: { icon: Facebook, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", label: "Facebook" },
  INSTAGRAM: { icon: Instagram, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-900/20", label: "Instagram" },
  LINKEDIN: { icon: Linkedin, color: "text-blue-700", bg: "bg-blue-50 dark:bg-blue-900/20", label: "LinkedIn" },
  WEBSITE: { icon: Globe, color: "text-slate-600", bg: "bg-slate-50 dark:bg-neutral-800", label: "Sitio Web" },
};


export const ProfessionalSocialLinks = () => {
  const { addSocialLink, removeSocialLink, loading, error } = useProfessionalProfile();
  const user = useSelector((state: RootState) => state.auth.user);

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<string>("");
  const [url, setUrl] = useState("");

  if (!user || user.role !== "PROFESSIONAL") return null;

  const socialLinks: SocialLink[] = user.profile?.socialLinks ?? [];



  const handleAdd = async () => {
    if (!type || !url) return;
    try {
      await addSocialLink({ type, url });
      setType("");
      setUrl("");
      setShowForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Eliminar este enlace?")) {
      try {
        await removeSocialLink(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-800 overflow-hidden">
      {/* HEADER */}
      <div className="p-6 border-b border-slate-100 dark:border-neutral-800 flex justify-between items-center bg-slate-50/50 dark:bg-neutral-800/30">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <LinkIcon className="text-blue-500" size={20} />
            Presencia Digital
          </h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400">Tus redes sociales y enlaces profesionales</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm ${
            showForm ? "bg-red-100 text-red-600 rotate-45" : "bg-blue-600 text-white hover:bg-blue-700 "
          }`}
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* FORMULARIO */}
        {showForm && (
          <div className="animate-in slide-in-from-top-4 duration-300 p-4 rounded-xl bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
            <div className="flex flex-col md:flex-row gap-3">
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)}
                className="md:w-1/3 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">Selecciona Red</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="WEBSITE">Website</option>
              </select>

              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="https://tu-perfil.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <button 
                onClick={handleAdd} 
                disabled={loading || !type || !url}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
              >
                {loading ? "..." : "Agregar"}
              </button>
            </div>
          </div>
        )}

        {/* LISTA DE REDES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
          {socialLinks.length === 0 ? (
            <div className="md:col-span-2 text-center py-8 opacity-60">
              <p className="text-sm italic">Aún no has conectado redes sociales.</p>
            </div>
          ) : (
            socialLinks.map((link) => {
              const config = SOCIAL_CONFIG[link.type as keyof typeof SOCIAL_CONFIG];
              const Icon = config.icon;

              return (
                <div 
                  key={link.id} 
                  className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`p-2 rounded-lg ${config.bg} ${config.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1">
                        {config.label}
                      </p>
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm font-medium text-slate-700 dark:text-neutral-200 truncate block hover:text-blue-500 transition-colors"
                      >
                        {link.url.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a 
                      href={link.url} 
                      target="_blank" 
                      className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button 
                      onClick={() => handleDelete(link.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {error && (
        <div className="px-6 pb-4">
          <p className="bg-red-50 dark:bg-red-900/20 text-red-600 text-xs p-3 rounded-lg flex items-center gap-2 ">
            <AlertCircle size={14} /> {error}
          </p>
        </div>
      )}
    </section>
  );
};