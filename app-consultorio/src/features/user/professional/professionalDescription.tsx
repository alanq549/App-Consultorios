import { useState } from "react";
import { useProfessionalProfile } from "@/hooks/users/useProfessionalProfile";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { FileText } from "lucide-react";

export const ProfessionalDescription = () => {
  const { updateProfessionalProfile, loading } = useProfessionalProfile();
  const user = useSelector((state: RootState) => state.auth.user);

  const [description, setDescription] = useState(() => {
    if (user?.role === "PROFESSIONAL") {
      return user.profile.description ?? "";
    }
    return "";
  });

  if (!user || user.role !== "PROFESSIONAL") return null;

  const handleUpdateDescription = async () => {
    try {
      await updateProfessionalProfile({ description });
      alert("Descripción actualizada");
    } catch (error) {
      console.error("Error actualizando la descripción", error);
      alert("Error al actualizar la descripcion");
    }
  };

  return (
    <div
      className="
    bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-800 overflow-hidden "
    >
      <div className="">
        {/* Header */}
        <div className="bg-slate-50/50 dark:bg-neutral-800/30  p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
            <FileText size={16} className="text-indigo-500" />
              DESCRIPCIÓN PROFESIONAL
          </h3>

          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
            Describe tu experiencia y habilidades
          </p>
        </div>
      </div>

      <div className="m-4">
        {/* Textarea */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Escribe una descripción sobre tu experiencia y habilidades..."
          rows={5}
          className="
      w-full
      rounded-xl
      border border-white/10
     bg-white/50 dark:bg-neutral-800/30
      backdrop-blur-md
      px-3 py-2
      text-sm
      text-gray-700 dark:text-neutral-200
      placeholder:text-gray-400
      transition-all duration-300
      focus:outline-none
      focus:border-indigo-400/40
      focus:ring-1 focus:ring-blue-600
    "
        />

        {/* Button */}
        <div className="flex justify-end">
          <button
            onClick={handleUpdateDescription}
            disabled={loading}
            className="
        rounded-xl
        bg-blue-600
        px-4 py-2
        text-sm font-medium
        text-white
        transition-all duration-300
        hover:bg-blue-700
        hover:shadow-[0_8px_32px_0_rgba(99,102,241,0.25)]
        disabled:opacity-50
        disabled:cursor-not-allowed
      "
          >
            {"Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
};
