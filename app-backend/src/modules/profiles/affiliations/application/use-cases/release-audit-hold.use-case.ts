/// ARCHIVO: src/modules/profiles/affiliations/application/use-cases/release-audit-hold.use-case.ts
/// Caso de uso: Liberar una retención de auditoría (Audit Hold) para permitir la purga física
/// de los eventos retenidos.
///
/// Reglas aplicadas:
/// - El actor se obtiene del contexto autenticado (`actorUserId`) y se persiste como liberador.
/// - La liberación es condicional y atómica: la garantiza el repositorio, que sólo actualiza
///   una retención vigente y devuelve un resultado explícito.
/// - Una segunda liberación nunca sobrescribe la fecha ni el actor originales: se rechaza con
///   un error explícito, evitando condiciones de carrera entre solicitudes concurrentes.
/// - Una retención ajena al tenant se trata como no encontrada.

import {
  AuditHoldAlreadyReleasedError,
  AuditHoldNotFoundError,
  UnauthorizedAffiliationActionError,
} from "../../domain/affiliation-errors";
import type { ActiveMembershipChecker } from "../ports/active-membership-checker";
import type {
  AuditHoldRecord,
  AuditHoldRepository,
} from "../ports/affiliation-audit-hold-repository";

/**
 * Datos de entrada. El actor no forma parte del contrato de entrada:
 * el caso de uso lo recibe del contexto autenticado.
 */
export interface ReleaseAuditHoldInput {
  tenantId: number;
  /** Usuario autenticado que autoriza la liberación. */
  actorUserId: number;
  holdId: number;
}

export interface ReleaseAuditHoldOutput {
  hold: AuditHoldRecord;
}

export class ReleaseAuditHoldUseCase {
  constructor(
    private readonly membershipChecker: ActiveMembershipChecker,
    private readonly auditHolds: AuditHoldRepository,
  ) {}

  async execute(input: ReleaseAuditHoldInput): Promise<ReleaseAuditHoldOutput> {
    // 1. Autorización: sólo un OWNER activo del tenant puede levantar la retención.
    const membership = await this.membershipChecker.getActiveMembership(
      input.actorUserId,
      input.tenantId,
    );
    if (!membership || membership.role !== "OWNER") {
      throw new UnauthorizedAffiliationActionError("RELEASE_AUDIT_HOLD");
    }

    // 2. Liberación condicional y atómica: el repositorio decide el resultado y la base de
    //    datos asigna el instante (mismo reloj que `createdAt`).
    const result = await this.auditHolds.release(
      input.tenantId,
      input.holdId,
      input.actorUserId,
    );

    // 3. Traducción del resultado a errores de dominio.
    if (result.outcome === "NOT_FOUND") {
      throw new AuditHoldNotFoundError(input.holdId, input.tenantId);
    }
    if (result.outcome === "ALREADY_RELEASED") {
      throw new AuditHoldAlreadyReleasedError(input.holdId);
    }

    return { hold: result.hold };
  }
}
