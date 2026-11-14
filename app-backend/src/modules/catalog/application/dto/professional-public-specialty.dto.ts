/// ARCHIVO: src/modules/catalog/application/dto/professional-public-specialty.dto.ts
/// Proyección pública explícita para especialidades aprobadas de un profesional en un tenant.
/// Garantiza no filtrar estados de elegibilidad internos (PENDING, REJECTED, SUSPENDED).

export interface ProfessionalPublicSpecialtyDTO {
  specialtyId: number;
  name: string;
  description: string | null;
  specialty: {
    id: number;
    name: string;
    description: string | null;
  };
}

