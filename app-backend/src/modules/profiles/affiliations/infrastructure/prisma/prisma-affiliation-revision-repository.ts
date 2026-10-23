/// ARCHIVO: src/modules/profiles/affiliations/infrastructure/prisma/prisma-affiliation-revision-repository.ts
/// Implementación basada en Prisma del puerto AffiliationRevisionRepository.
///
/// Propósito: Gestionar la persistencia, versiones e historial de revisiones/ediciones de afiliaciones.
/// Ejecuta consultas relacionales con filtrado por tenant e inserción en cascada de enlaces sociales (`socialLinks`),
/// mapeando de forma segura los enums de la base de datos a los tipos fuertemente tipados del dominio.

import type { Prisma } from "@prisma/client";
import type { SocialType as PrismaSocialType } from "@prisma/client";
import type {
    AffiliationRevisionRecord,
    AffiliationRevisionRepository,
} from "../../application/ports/affiliation-revision-repository";
import type {
    AffiliationRevisionStatus,
    SocialLinkInput,
    SocialType,
} from "../../domain/affiliation-types";
import type { ConditionalUpdateResult } from "../../application/ports/affiliation-repository";

/// Proyección reutilizable de campos de Prisma para garantizar un mapeo consistente de revisiones.
const revisionSelect = {
    id: true,
    affiliationId: true,
    status: true,
    revisionNumber: true,
    description: true,
    submittedByUserId: true,
    submittedAt: true,
    reviewedByUserId: true,
    reviewedAt: true,
    rejectionReason: true,
    createdAt: true,
    socialLinks: {
        select: {
            type: true,
            url: true,
        },
    },
} satisfies Prisma.ProfessionalAffiliationRevisionSelect;

type PrismaRevision = Prisma.ProfessionalAffiliationRevisionGetPayload<{
    select: typeof revisionSelect;
}>;

/**
 * Mapea el tipo de red social del dominio al enum nativo de Prisma.
 */
function toPrismaSocialType(type: SocialType): PrismaSocialType {
    switch (type) {
        case "FACEBOOK":
            return "FACEBOOK";
        case "INSTAGRAM":
            return "INSTAGRAM";
        case "LINKEDIN":
            return "LINKEDIN";
        case "WEBSITE":
            return "WEBSITE";
    }
}

/**
 * Mapea el enum nativo de Prisma para redes sociales al tipo correspondiente en el dominio.
 */
function toDomainSocialType(type: PrismaSocialType): SocialType {
    switch (type) {
        case "FACEBOOK":
            return "FACEBOOK";
        case "INSTAGRAM":
            return "INSTAGRAM";
        case "LINKEDIN":
            return "LINKEDIN";
        case "WEBSITE":
            return "WEBSITE";
    }
}

/**
 * Mapea el estado de revisión retornado por Prisma al enum correspondiente en el dominio.
 */
function toDomainRevisionStatus(
    status: PrismaRevision["status"],
): AffiliationRevisionStatus {
    switch (status) {
        case "PENDING_REVIEW":
            return "PENDING_REVIEW";
        case "APPROVED":
            return "APPROVED";
        case "REJECTED":
            return "REJECTED";
        case "SUPERSEDED":
            return "SUPERSEDED";
    }
}

/**
 * Mapea un registro devuelto por Prisma a la estructura fuertemente tipada del dominio (AffiliationRevisionRecord).
 */
function toRecord(record: PrismaRevision): AffiliationRevisionRecord {
    return {
        id: record.id,
        affiliationId: record.affiliationId,
        status: toDomainRevisionStatus(record.status),
        revisionNumber: record.revisionNumber,
        description: record.description,
        submittedByUserId: record.submittedByUserId,
        submittedAt: record.submittedAt,
        reviewedByUserId: record.reviewedByUserId,
        reviewedAt: record.reviewedAt,
        rejectionReason: record.rejectionReason,
        createdAt: record.createdAt,
        socialLinks: record.socialLinks.map((link) => ({
            type: toDomainSocialType(link.type),
            url: link.url,
        })),
    };
}

/**
 * Repositorio de infraestructura para la gestión de versiones y revisiones de afiliaciones.
 */
export class PrismaAffiliationRevisionRepository
    implements AffiliationRevisionRepository {
    constructor(
        /// Cliente de transacción inyectado por el Unit of Work.
        private readonly tx: Prisma.TransactionClient,
    ) { }

    /// Busca una revisión específica por su ID asegurando que pertenece al tenant indicado.
    async findById(
        tenantId: number,
        revisionId: number,
    ): Promise<AffiliationRevisionRecord | null> {
        const record = await this.tx.professionalAffiliationRevision.findFirst({
            where: {
                id: revisionId,
                affiliation: {
                    is: { tenantId },
                },
            },
            select: revisionSelect,
        });

        return record ? toRecord(record) : null;
    }

    /// Recupera la última revisión enviada para una afiliación (ordenada por `revisionNumber` descendente).
    async findLatestByAffiliationId(
        tenantId: number,
        affiliationId: number,
    ): Promise<AffiliationRevisionRecord | null> {
        const record = await this.tx.professionalAffiliationRevision.findFirst({
            where: {
                affiliationId,
                affiliation: {
                    is: { tenantId },
                },
            },
            orderBy: {
                revisionNumber: "desc",
            },
            select: revisionSelect,
        });

        return record ? toRecord(record) : null;
    }

    /// Recupera todas las revisiones enviadas para una afiliación dentro de un tenant.
    async findByAffiliationId(
        tenantId: number,
        affiliationId: number,
    ): Promise<AffiliationRevisionRecord[]> {
        const records = await this.tx.professionalAffiliationRevision.findMany({
            where: {
                affiliationId,
                affiliation: {
                    is: { tenantId },
                },
            },
            orderBy: {
                revisionNumber: "desc",
            },
            select: revisionSelect,
        });

        return records.map(toRecord);
    }

    /// Crea y persiste una nueva revisión asociada a una afiliación, incluyendo sus enlaces sociales en una sola operación.
    /// 
    /// @throws {Error} Lanza una excepción si la afiliación especificada no pertenece al tenant dado.
    async create(data: {
        tenantId: number;
        affiliationId: number;
        revisionNumber: number;
        description: string;
        submittedByUserId: number;
        socialLinks: SocialLinkInput[];
    }): Promise<AffiliationRevisionRecord> {
        // Verificación previa para asegurar que la afiliación pertenezca al tenant solicitado.
        const affiliation = await this.tx.professionalTenantAffiliation.findFirst({
            where: {
                id: data.affiliationId,
                tenantId: data.tenantId,
            },
            select: { id: true },
        });

        if (!affiliation) {
            throw new Error(
                "No se puede crear una revisión para una afiliación fuera del tenant.",
            );
        }

        // Inserción en cascada de la revisión junto a sus enlaces sociales (`socialLinks`).
        const record = await this.tx.professionalAffiliationRevision.create({
            data: {
                affiliationId: data.affiliationId,
                revisionNumber: data.revisionNumber,
                description: data.description,
                submittedByUserId: data.submittedByUserId,
                socialLinks: {
                    create: data.socialLinks.map((link) => ({
                        type: toPrismaSocialType(link.type),
                        url: link.url,
                    })),
                },
            },
            select: revisionSelect,
        });

        return toRecord(record);
    }

    /// Actualiza condicionalmente el estado de una revisión (ej. aprobación o rechazo) utilizando concurrencia optimista.
    ///
    /// Solo aplica los cambios si la revisión se encuentra en `expectedStatus`. En caso contrario,
    /// determina si el error fue por estar desincronizada (`STALE`) o por no existir (`NOT_FOUND`).
    async updateStatusIfCurrent(
        tenantId: number,
        revisionId: number,
        expectedStatus: AffiliationRevisionStatus,
        nextStatus: AffiliationRevisionStatus,
        data?: {
            reviewedByUserId?: number;
            reviewedAt?: Date;
            rejectionReason?: string | null;
        },
    ): Promise<ConditionalUpdateResult<AffiliationRevisionRecord>> {
        const result = await this.tx.professionalAffiliationRevision.updateMany({
            where: {
                id: revisionId,
                status: expectedStatus,
                affiliation: {
                    is: { tenantId },
                },
            },
            data: {
                status: nextStatus,
                ...(data?.reviewedByUserId !== undefined && {
                    reviewedByUserId: data.reviewedByUserId,
                }),
                ...(data?.reviewedAt !== undefined && {
                    reviewedAt: data.reviewedAt,
                }),
                ...(data?.rejectionReason !== undefined && {
                    rejectionReason: data.rejectionReason,
                }),
            },
        });

        // Si la actualización no afectó a ningún registro, investiga la causa.
        if (result.count === 0) {
            const existing = await this.tx.professionalAffiliationRevision.findFirst({
                where: {
                    id: revisionId,
                    affiliation: {
                        is: { tenantId },
                    },
                },
                select: { id: true },
            });

            return existing
                ? { updated: false, reason: "STALE" }
                : { updated: false, reason: "NOT_FOUND" };
        }

        // Recupera la revisión actualizada dentro del contexto transaccional.
        const record = await this.findById(tenantId, revisionId);

        if (!record) {
            throw new Error(
                "La revisión actualizada no se encontró dentro de la transacción.",
            );
        }

        return { updated: true, record };
    }
}