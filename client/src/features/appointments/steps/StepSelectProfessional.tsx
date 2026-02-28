import { useProfessionalsBySpecialty } from "@/features/professionals/professionalHooks";
import ProfessionalCard from "@/features/professionals/components/ProfessionalCard";
import { useNavigate, useSearchParams } from "react-router-dom";

type Props = {
  specialtyId: number;
  onSelectProfessional: (userId: number) => void;
  onBack: () => void; // función para regresar al paso anterior
};

export default function StepSelectProfessional({
  specialtyId,
  onSelectProfessional,
  onBack,
}: Props) {
  const {
    data: professionals,
    isLoading,
    error,
  } = useProfessionalsBySpecialty(specialtyId);

  const navigate = useNavigate();
  const [_searchParams] = useSearchParams();

 const handleBack = () => {
  navigate(`/client/schedule`, { replace: true });
  onBack();
};
  if (isLoading)
    return <p className="text-gray-500 text-center">Cargando profesionales...</p>;
  if (error)
    return <p className="text-red-500 text-center">Error cargando profesionales</p>;

  return (
    <div className="space-y-6 p-6 rounded-xl">
      <button
        onClick={handleBack}
        className="px-4 py-2 bg-white/40 dark:bg-zinc-950/10 border border-gray-200/50 dark:border-zinc-700/30 rounded-xl shadow-md hover:shadow-lg transition"
      >
        ← Volver
      </button>

      <h2 className="text-2xl font-semibold text-center text-gray-800 dark:text-white">
        Selecciona un profesional
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {professionals?.map((pro) => (
          <ProfessionalCard
            key={pro.id}
            professional={pro}
            onSelect={onSelectProfessional}
            showSelectButton={true}
          />
        ))}
      </div>
    </div>
  );
}