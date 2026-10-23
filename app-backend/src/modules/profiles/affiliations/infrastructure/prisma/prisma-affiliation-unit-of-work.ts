/// ARCHIVO: src/modules/profiles/affiliations/infrastructure/prisma/prisma-affiliation-unit-of-work.ts
/// Implementación basada en Prisma del puerto AffiliationUnitOfWork.
///
/// Propósito: Adaptador de infraestructura que gestiona transacciones interactivas de Prisma (`prisma.$transaction`).
/// Instancia repositorios scoping su cliente al objeto de transacción `tx` (Prisma.TransactionClient) 
/// para garantizar que todas las operaciones dentro del callback se ejecuten bajo el mismo límite atómico ACID.

import type { Prisma } from "@prisma/client";

import type {
  AffiliationUnitOfWork,
  AffiliationTransactionalRepositories,
} from "../../application/ports/affiliation-unit-of-work";

import { PrismaAffiliationRepository } from "./prisma-affiliation-repository";
import { PrismaAffiliationRevisionRepository } from "./prisma-affiliation-revision-repository";
import { PrismaAffiliationAuditRepository } from "./prisma-affiliation-audit-repository";
import { PrismaActiveMembershipChecker } from "./prisma-active-membership-checker";
import { PrismaActiveTenantChecker } from "./prisma-active-tenant-checker";

import prisma from "@/shared/database/prisma";

/**
 * Adaptador de infraestructura que implementa el Unit of Work
 * utilizando transacciones interactivas de Prisma.
 */
export class PrismaAffiliationUnitOfWork
  implements AffiliationUnitOfWork
{
  /// Ejecuta un callback de trabajo dentro de un bloque transaccional interactivo de Prisma.
  ///
  /// Instancia repositorios de infraestructura concretos inyectándoles el cliente `tx`.
  /// Si el callback `work` resuelve exitosamente, Prisma realiza un `commit` automático.
  /// Si ocurre un error o excepción dentro del callback, Prisma revierte (`rollback`)
  /// automáticamente todos los cambios realizados por los repositorios.
  ///
  /// @template T - Tipo de dato retornado por el callback de trabajo.
  /// @param work - Callback asíncrono que recibe los repositorios transaccionales.
  /// @returns Resultado del callback `work` tras confirmar la transacción.
  async execute<T>(
    work: (
      repositories: AffiliationTransactionalRepositories,
    ) => Promise<T>,
  ): Promise<T> {
    // Inicia una transacción interactiva en la base de datos a través de Prisma.
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Se crean los repositorios inyectando el cliente transaccional 'tx'
      // en lugar del cliente global de Prisma.
      const repositories: AffiliationTransactionalRepositories = {
        affiliations: new PrismaAffiliationRepository(tx),
        revisions: new PrismaAffiliationRevisionRepository(tx),
        audit: new PrismaAffiliationAuditRepository(tx),
        memberships: new PrismaActiveMembershipChecker(tx),
        tenants: new PrismaActiveTenantChecker(tx as any),
      };

      // Ejecuta la lógica del caso de uso pasando el conjunto de repositorios aislados.
      return work(repositories);
    });
  }
}