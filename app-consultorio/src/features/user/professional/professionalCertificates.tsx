import { useState } from "react";
import { useProfessionalProfile } from "@/hooks/users/useProfessionalProfile";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { staticbackend } from "@/config/variables";
import { FileText, Plus, Calendar, School, Upload, CheckCircle2, ExternalLink, X } from "lucide-react";

export const ProfessionalCertificates = () => {
  const { addCertificate, loading, error } = useProfessionalProfile();
  const user = useSelector((state: RootState) => state.auth.user);

  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [issuedDate, setIssuedDate] = useState("");

  if (!user || user.role !== "PROFESSIONAL") return null;

  const certificates = user.profile?.certificates ?? [];
  const certificatesWithUrls = certificates.map((cert) => ({
    ...cert,
    url: cert.fileUrl ? `${staticbackend}${cert.fileUrl}` : "#",
  }));

  const handleUpload = async () => {
    if (!file || !name || !issuedBy || !issuedDate) return;
    try {
      await addCertificate(file, name, issuedBy, issuedDate);
      setFile(null);
      setName("");
      setIssuedBy("");
      setIssuedDate("");
      setShowForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-800 overflow-hidden">

      {/* HEADER */}
      <div className="bg-slate-50/50 dark:bg-neutral-800/30 px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-neutral-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <CheckCircle2 size={16} className="text-blue-500" />
            CERTIFICACIONES Y TÍTULOS
          </h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Documenta tu experiencia y formación
          </p>
        
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm  ${
                       showForm ? "bg-red-100 dark:bg-red-800/40 text-red-400 dark:text-neutral-100 rotate-45" : "bg-blue-600 text-white hover:bg-blue-700 "

          }`}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="p-6 space-y-4">

        {/* FORMULARIO */}
        {showForm && (
          <div className="rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/40 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 dark:text-neutral-300 uppercase tracking-wide">Nombre del logro</label>
                <input
                  type="text"
                  placeholder="Ej. Especialidad en Nutrición"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-400 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 dark:text-neutral-300 uppercase tracking-wide">Institución</label>
                <input
                  type="text"
                  placeholder="Ej. UNAM"
                  value={issuedBy}
                  onChange={(e) => setIssuedBy(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 dark:text-neutral-300 uppercase tracking-wide">Fecha de emisión</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 text-slate-300 dark:text-neutral-600" size={14} />
                  <input
                    type="date"
                    value={issuedDate}
                    onChange={(e) => setIssuedDate(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 dark:text-neutral-300 uppercase tracking-wide">Documento</label>
                <label className="flex items-center gap-2 w-full h-9 px-3 bg-white dark:bg-neutral-900 border border-dashed border-slate-200 dark:border-neutral-700 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                  <Upload size={14} className="text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400 truncate">
                    {file ? file.name : "Subir PDF o imagen"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf,image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={loading || !file || !name}
              className="w-full bg-blue-600 hover:bg-blue-700  text-white text-sm font-medium py-2 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Plus size={15} />
              }
              Guardar certificado
            </button>
          </div>
        )}

        {/* LISTADO */}
        {certificates.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 border border-dashed border-slate-100 dark:border-neutral-800 rounded-xl">
            <FileText size={28} className="text-slate-200 dark:text-neutral-700" />
            <p className="text-xs text-slate-400 dark:text-neutral-500">Aún no has agregado certificados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {certificatesWithUrls.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-neutral-800 hover:border-blue-200 dark:hover:border-blue-900 transition-all group"
              >
                {/* Icono */}
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                  <School size={16} className="text-blue-500" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-neutral-100 truncate">
                    {cert.name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 dark:text-neutral-500">
                    <span className="flex items-center gap-1">
                      <School size={11} /> {cert.issuedBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> {new Date(cert.issuedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Enlace */}
                              <a
                  href={cert.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-500 dark:text-blue-400 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex-shrink-0"
                >
                  <ExternalLink size={12} />
                  Ver
                </a>
              </div>
            ))}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg flex items-center gap-2">
            <X size={13} /> {error}
          </p>
        )}

      </div>
    </section>
  );
};