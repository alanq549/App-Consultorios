// src/features/specialties/components/SpecialtySelector.tsx
import { useSpecialties } from "../specialtiesHooks";
import type { Specialty } from "../types";

interface Props {
  value: number | null;
  onChange: (id: number) => void;
}

export const SpecialtySelector = ({ value, onChange }: Props) => {
  const { data: specialties, isLoading, error } = useSpecialties();

  if (isLoading) return <p>Cargando especialidades...</p>;
  if (error) return <p>Error al cargar especialidades.</p>;

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      className="p-2 border rounded"
    >
      <option value="" disabled>
        Selecciona una especialidad
      </option>
      {specialties?.map((s: Specialty) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
};
