/// ARCHIVO: src/modules/profiles/affiliations/infrastructure/prisma/prisma-affiliation-repository.ts
/// Implementación basada en Prisma del puerto AffiliationRepository.
///
/// Propósito: Gestionar la persistencia y consultas del ciclo de vida de afiliaciones
/// de perfiles profesionales dentro de un tenant. Operaciones ejecutadas a través
/// de una transacción (Prisma.TransactionClient) inyectada por el Unit of Work.

import type { Prisma } from "@prisma/client";
import { ProfessionalAffiliationStatus as PrismaAffiliationStatus } from "@prisma/client";

import type {
  AffiliationRecord,
  AffiliationRepository,
  ConditionalUpdateResult,
} from "../../application/ports/affiliation-repository";
import type { AffiliationStatus } from "../../domain/affiliation-types";

/**
 * Selección explícita de los campos que el repositorio necesita.
 */
const affiliationSelect = {
  id: true,
  professionalProfileId: true,
  tenantId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProfessionalTenantAffiliationSelect;

/**
 * Tipo exacto que Prisma devuelve utilizando la selección anterior.
 */
type PrismaAffiliation = Prisma.ProfessionalTenantAffiliationGetPayload<{
  select: typeof affiliationSelect;
}>;

/**
 * Convierte un estado perteneciente al dominio al enum utilizado por Prisma.
 *
 * El dominio no depende de Prisma, por eso la conversión se realiza aquí,
 * en infraestructura.
 */
function toPrismaAffiliationStatus(
  status: AffiliationStatus,
): PrismaAffiliationStatus {
  switch (status) {
    case "PENDING_REVIEW":
      return PrismaAffiliationStatus.PENDING_REVIEW;

    case "ACTIVE":
      return PrismaAffiliationStatus.ACTIVE;

    case "REJECTED":
      return PrismaAffiliationStatus.REJECTED;

    case "SUSPENDED":
      return PrismaAffiliationStatus.SUSPENDED;

    case "WITHDRAWN":
      return PrismaAffiliationStatus.WITHDRAWN;
  }
}

/**
 * Convierte el enum de Prisma al estado perteneciente al dominio.
 *
 * De esta manera, el resto de la aplicación nunca recibe tipos de Prisma.
 */
function toDomainAffiliationStatus(
  status: PrismaAffiliationStatus,
): AffiliationStatus {
  switch (status) {
    case PrismaAffiliationStatus.PENDING_REVIEW:
      return "PENDING_REVIEW";

    case PrismaAffiliationStatus.ACTIVE:
      return "ACTIVE";

    case PrismaAffiliationStatus.REJECTED:
      return "REJECTED";

    case PrismaAffiliationStatus.SUSPENDED:
      return "SUSPENDED";

    case PrismaAffiliationStatus.WITHDRAWN:
      return "WITHDRAWN";
  }
}

/**
 * Convierte un registro de Prisma al contrato definido por la aplicación.
 */
function toDomainRecord(record: PrismaAffiliation): AffiliationRecord {
  return {
    id: record.id,
    professionalProfileId: record.professionalProfileId,
    tenantId: record.tenantId,
    status: toDomainAffiliationStatus(record.status),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Repositorio de infraestructura que realiza operaciones CRUD y actualizaciones
 * condicionales de afiliaciones utilizando Prisma Client.
 */
export class PrismaAffiliationRepository implements AffiliationRepository {
  constructor(
    /// Cliente de transacción local inyectado por el Unit of Work.
    private readonly tx: Prisma.TransactionClient,
  ) { }

  /// Busca una afiliación por su ID único filtrada por tenant para garantizar aislamiento de datos.
  async findById(
    tenantId: number,
    affiliationId: number,
  ): Promise<AffiliationRecord | null> {
    const record = await this.tx.professionalTenantAffiliation.findFirst({
      where: {
        id: affiliationId,
        tenantId,
      },
      select: affiliationSelect,
    });

    return record ? toDomainRecord(record) : null;
  }

  /// Busca la afiliación existente entre un perfil profesional específico y un tenant
  /// mediante la clave única compuesta `professionalProfileId_tenantId`.
  async findByProfessionalProfileAndTenant(
    professionalProfileId: number,
    tenantId: number,
  ): Promise<AffiliationRecord | null> {
    const record =
      await this.tx.professionalTenantAffiliation.findUnique({
        where: {
          professionalProfileId_tenantId: {
            professionalProfileId,
            tenantId,
          },
        },
        select: affiliationSelect,
      });

    return record ? toDomainRecord(record) : null;
  }


  /**
   * Bloquea la fila de la afiliación dentro de la transacción actual
   * mediante un bloqueo pesimista (`FOR UPDATE`) para serializar operaciones
   * sobre sus revisiones concurrentes.
   *
   * @param tenantId - Identificador único del tenant al que pertenece la afiliación.
   * @param affiliationId - Identificador único de la afiliación a bloquear.
   * @returns Devuelve `true` si la afiliación existe y se obtuvo el bloqueo; `false` si no existe dentro del tenant.
   *
   * @throws {Error} Si el cliente de base de datos (`this.tx`) no se ejecuta dentro de una transacción activa.
   */
  async lockForRevisionWorkflow(
    tenantId: number,
    affiliationId: number,
  ): Promise<boolean> {
    // Realiza una consulta directa con `FOR UPDATE` para garantizar concurrencia segura (row-level lock)
    const rows = await this.tx.$queryRaw<Array<{ id: number }>>`
      SELECT "id"
      FROM "ProfessionalTenantAffiliation"
      WHERE "id" = ${affiliationId}
      AND "tenantId" = ${tenantId}
      FOR UPDATE
`;

    // Si devuelve filas, la afiliación existe y ha sido bloqueada hasta el commit/rollback de la transacción
    return rows.length > 0;
  }

  /// Registra y persiste una nueva afiliación entre un perfil profesional y un tenant.
  async create(data: {
    professionalProfileId: number;
    tenantId: number;
    status: AffiliationStatus;
  }): Promise<AffiliationRecord> {
    const record = await this.tx.professionalTenantAffiliation.create({
      data: {
        professionalProfileId: data.professionalProfileId,
        tenantId: data.tenantId,
        status: toPrismaAffiliationStatus(data.status),
      },
      select: affiliationSelect,
    });

    return toDomainRecord(record);
  }

  /// Ejecuta una actualización condicional atómica del estado de la afiliación (concurrencia optimista).
  ///
  /// Solo actualiza el registro si su estado actual coincide exactamente con `expectedStatus`.
  /// Si no se realiza la actualización, verifica si el fallo fue por registro inexistente (`NOT_FOUND`)
  /// o por un conflicto de estado/desincronización (`STALE`).
  async updateStatusIfCurrent(
    tenantId: number,
    affiliationId: number,
    expectedStatus: AffiliationStatus,
    nextStatus: AffiliationStatus,
  ): Promise<ConditionalUpdateResult<AffiliationRecord>> {
    // Intentar actualización atómica basada en la condición del estado esperado.
    const result = await this.tx.professionalTenantAffiliation.updateMany({
      where: {
        id: affiliationId,
        tenantId,
        status: toPrismaAffiliationStatus(expectedStatus),
      },
      data: {
        status: toPrismaAffiliationStatus(nextStatus),
      },
    });

    // Si ningún registro fue actualizado, determinar la causa del fallo.
    if (result.count === 0) {
      const existing = await this.tx.professionalTenantAffiliation.findFirst({
        where: {
          id: affiliationId,
          tenantId,
        },
        select: { id: true },
      });

      return existing
        ? { updated: false, reason: "STALE" }
        : { updated: false, reason: "NOT_FOUND" };
    }

    // Recuperar la afiliación ya actualizada dentro de la misma transacción.
    const record = await this.findById(tenantId, affiliationId);

    if (!record) {
      throw new Error(
        "La afiliación actualizada no se encontró dentro de la transacción.",
      );
    }

    return { updated: true, record };
  }
}