import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import QuickAppointmentModal, { type ProfessionalWithSchedule } from "@/features/appointments/components/AppointmentFlowModal";
import { useProfessionalsBySpecialty } from "@/features/professionals/professionalHooks";
import { useSpecialties } from "@/features/specialties/specialtiesHooks";
import StepSelectProfessional from "../steps/StepSelectProfessional";

// ----- Funciones simples para “codificar” / “decodificar” el profesional -----
function encodePro(pro: { user: { id: number } }) {
  return btoa(`pro-${pro.user.id}`);
}

function decodePro(token: string) {
  try {
    const decoded = atob(token);
    const id = decoded.replace("pro-", "");
    return Number(id);
  } catch {
    return null;
  }
}

// ----- Slug para la especialidad -----
function slugify(text: string) {
  return encodeURIComponent(
    text
      .toLowerCase()
      .replace(/\s+/g, "-")       // espacios → guiones
      .replace(/[^\w-]+/g, "")    // eliminar caracteres especiales
  );
}

export default function CreateAppointment() {
  const { data: specialties } = useSpecialties();
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: professionals } = useProfessionalsBySpecialty(selectedSpecialtyId ?? 0);
  const selectedProfessional = professionals?.find(p => p.user.id === selectedProfessionalId) as ProfessionalWithSchedule;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ----- Leer query params al montar -----
  useEffect(() => {
    const specSlug = searchParams.get("spec");
    if (specSlug && specialties) {
      const spec = specialties.find(s => slugify(s.name) === specSlug);
      if (spec) setSelectedSpecialtyId(spec.id);
    }

    const proToken = searchParams.get("pro");
    if (proToken && professionals) {
      const id = decodePro(proToken);
      if (id) {
        setSelectedProfessionalId(id);
        setShowModal(true);
      }
    }
  }, [searchParams, specialties, professionals]);

  // ----- Manejar selección de especialidad -----
  const handleSelectSpecialty = (specId: number, specName: string) => {
    setSelectedSpecialtyId(specId);

    const params = new URLSearchParams(searchParams);
    params.set("spec", slugify(specName));
    navigate(`/client/schedule?${params.toString()}`, { replace: false });
  };

  // ----- Manejar selección de profesional -----
  const handleSelectProfessional = (id: number) => {
    setSelectedProfessionalId(id);
    setShowModal(true);

    const prof = professionals?.find(p => p.user.id === id);
    if (prof) {
      const params = new URLSearchParams(searchParams);
      params.set("pro", encodePro(prof));
      navigate(`/client/schedule?${params.toString()}`, { replace: false });
    }
  };

  // ----- Renderizar selección de especialidad -----
  if (!selectedSpecialtyId) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-semibold mb-4 text-center text-gray-800 dark:text-white">
          Selecciona una especialidad
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {specialties?.map((spec) => (
            <button
              key={spec.id}
              onClick={() => handleSelectSpecialty(spec.id, spec.name)}
              className="bg-white/40 border border-neutral-200/60 dark:border-white/10 dark:bg-neutral-800/30 rounded-xl p-6 shadow-xl hover:bg-teal-200/20 hover:border-teal-200/50 dark:hover:bg-teal-900/10 dark:hover:border-teal-400/20 transition cursor-pointer text-center backdrop-blur-sm"
            >
              <div className="text-lg font-medium text-gray-800 dark:text-white">{spec.name}</div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">{spec.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ----- Renderizar selección de profesional -----
  if (!selectedProfessionalId) {
    return (
      <StepSelectProfessional
        specialtyId={selectedSpecialtyId}
        onSelectProfessional={handleSelectProfessional}
        onBack={() => setSelectedSpecialtyId(null)}
      />
    );
  }

 // ----- Renderizar modal de cita -----
return (
  <>
    {showModal && selectedProfessional && (
      <QuickAppointmentModal
        professional={selectedProfessional}
        onClose={() => {
          // Limpiar estado
          setShowModal(false);
          setSelectedProfessionalId(null);

          // Limpiar query params
          const params = new URLSearchParams(searchParams);
          params.delete("pro");

          // Si quieres volver al paso de seleccionar especialidad
          if (!selectedSpecialtyId) {
            navigate(`/client/schedule`, { replace: true });
          } else {
            navigate(`/client/schedule?${params.toString()}`, { replace: true });
          }
        }}
      />
    )}
  </>
);

}
