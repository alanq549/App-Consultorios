/// ARCHIVO: src/modules/catalog/application/dto/specialty.dto.ts
import { z } from "zod";
import { Specialty } from "../../domain/specialty.entity";

export const CreateSpecialtySchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().max(500).optional().nullable(),
});

export type CreateSpecialtyDTO = z.infer<typeof CreateSpecialtySchema>;

export const UpdateSpecialtySchema = z.object({
  name: z.string().trim().min(3).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateSpecialtyDTO = z.infer<typeof UpdateSpecialtySchema>;

export interface SpecialtyResponseDTO {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toSpecialtyResponseDTO(
  entity:
    | Specialty
    | {
        id: number;
        name: string;
        description?: string | null;
        isActive: boolean;
        createdAt: Date | string;
        updatedAt: Date | string;
      },
): SpecialtyResponseDTO {
  const snapshot = entity instanceof Specialty ? entity.toSnapshot() : entity;
  return {
    id: snapshot.id,
    name: snapshot.name,
    description: snapshot.description ?? null,
    isActive: snapshot.isActive,
    createdAt:
      snapshot.createdAt instanceof Date
        ? snapshot.createdAt.toISOString()
        : String(snapshot.createdAt),
    updatedAt:
      snapshot.updatedAt instanceof Date
        ? snapshot.updatedAt.toISOString()
        : String(snapshot.updatedAt),
  };
}

