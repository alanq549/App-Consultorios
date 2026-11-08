/// ARCHIVO: src/modules/profiles/application/ports/professional-profile-repository.port.ts
import { ProfessionalStatus } from "@prisma/client";
import {
  ProfessionalProfileMeDTO,
  UpdateProfessionalProfileInput,
  PublicProfessionalProfileDTO,
} from "../dtos/professional-profile.dto";
import { CatalogSpecialtyChecker } from "./catalog-specialty-checker.port";

export interface ProfessionalProfileRepository {
  findByUserId(userId: number): Promise<ProfessionalProfileMeDTO | null>;
  findById(
    id: number,
    txClient?: unknown
  ): Promise<ProfessionalProfileMeDTO | null>;
  updateByUserId(
    userId: number,
    data: UpdateProfessionalProfileInput
  ): Promise<{
    id: number;
    name: string;
    lastName: string | null;
    phone: string | null;
    description: string;
  }>;
  updateAvatar(userId: number, avatar: string): Promise<void>;

  // Public directory methods
  getPublicById(
    profileId: number,
    tenantId: number
  ): Promise<PublicProfessionalProfileDTO | null>;
  getAllPublic(tenantId: number): Promise<PublicProfessionalProfileDTO[]>;

  // Admin methods
  getAllProfiles(): Promise<unknown[]>;
  getPendingProfiles(): Promise<unknown[]>;
  setStatus(
    profileId: number,
    status: ProfessionalStatus,
    txClient?: unknown
  ): Promise<{
    id: number;
    userId: number;
    verificationStatus: ProfessionalStatus;
  }>;

  /**
   * Ejecuta una transición de estado de manera atómica (con row-level lock o transacción serializada),
   * revalidando el estado actual y los prerrequisitos de especialidad para evitar carreras concurrentes.
   */
  executeTransition(
    profileId: number,
    targetStatus: ProfessionalStatus,
    specialtyChecker: CatalogSpecialtyChecker,
    txClient?: unknown
  ): Promise<{
    id: number;
    userId: number;
    verificationStatus: ProfessionalStatus;
    previousStatus: ProfessionalStatus;
  }>;

  /**
   * Reconcilia de manera atómica bajo row-level lock (FOR UPDATE) la revocación de especialidades,
   * garantizando que concurrent approvals no puedan intercalarse y que perfiles en estados terminales
   * (como REJECTED) o PENDING no sean suspendidos indebidamente.
   */
  reconcileSpecialtyRevocation(
    profileId: number,
    specialtyChecker: CatalogSpecialtyChecker,
    txClient: unknown
  ): Promise<{
    profileSuspended: boolean;
    previousStatus: ProfessionalStatus;
  }>;
}

