/// ARCHIVO: src/modules/profiles/affiliations/application/use-cases/create-audit-hold.use-case.ts
/// Caso de uso: Crear una retención de auditoría (Audit Hold) que suspende la purga física
/// de eventos de auditoría de una afiliación.
///
/// Reglas aplicadas:
/// - El actor se obtiene del contexto autenticado (`actorUserId`), nunca de un campo libre del cliente.
/// - El alcance debe ser válido: un evento específico exige declarar su afiliación.
/// - Las referencias deben existir dentro del tenant y ser consistentes entre sí
///   (`tenantId == affiliation.tenantId == event.tenantId` y `event.affiliationId == hold.affiliationId`).
///   Estas invariantes cruzan tablas y no pueden expresarse con `CHECK`, por lo que se validan aquí.
/// - Se permite más de una retención sobre el mismo alcance.

import {
  AffiliationNotFoundError,
  AuditEventNotFoundError,
  AuditHoldScopeMismatchError,
  InvalidAuditHoldScopeError,
  ReasonRequiredError,
  TenantNotActiveError,
  UnauthorizedAffiliationActionError,
} from "../../domain/affiliation-errors";
import { resolveAuditHoldScope } from "../../domain/audit-hold-scope";
import type { ActiveMembershipChecker } from "../ports/active-membership-checker";
import type { ActiveTenantChecker } from "../ports/active-tenant-checker";
import type { AffiliationAuditRepository } from "../ports/affiliation-audit-repository";
import type {
  AuditHoldRecord,
  AuditHoldRepository,
} from "../ports/affiliation-audit-hold-repository";
import type { AffiliationRepository } from "../ports/affiliation-repository";

/**
 * Datos de entrada. El actor no forma parte del contrato de entrada:
 * el caso de uso lo recibe del contexto autenticado.
 */
export interface CreateAuditHoldInput {
  tenantId: number;
  /** Usuario autenticado que solicita la retención. */
  actorUserId: number;
  /** Afiliación retenida, o `null` para abarcar todo el tenant. */
  affiliationId: number | null;
  /** Evento específico retenido, o `null` para abarcar la afiliación/tenant. */
  auditEventId: number | null;
  /** Motivo obligatorio de la retención. */
  reason: string;
  /** Expiración por tiempo, o `null` para una retención indefinida. */
  expiresAt: Date | null;
}

export interface CreateAuditHoldOutput {
  hold: AuditHoldRecord;
}

export class CreateAuditHoldUseCase {
  constructor(
    private readonly membershipChecker: ActiveMembershipChecker,
    private readonly tenantChecker: ActiveTenantChecker,
    private readonly affiliations: AffiliationRepository,
    private readonly audit: AffiliationAuditRepository,
    private readonly auditHolds: AuditHoldRepository,
  ) {}

  async execute(input: CreateAuditHoldInput): Promise<CreateAuditHoldOutput> {
    // 1. Autorización: sólo un OWNER activo del tenant puede retener su auditoría.
    const membership = await this.membershipChecker.getActiveMembership(
      input.actorUserId,
      input.tenantId,
    );
    if (!membership || membership.role !== "OWNER") {
      throw new UnauthorizedAffiliationActionError("CREATE_AUDIT_HOLD");
    }

    // 2. Motivo obligatorio.
    const reason = input.reason?.trim() ?? "";
    if (reason.length === 0) {
      throw new ReasonRequiredError();
    }

    // 3. Alcance válido.
    const scope = resolveAuditHoldScope(
      input.affiliationId,
      input.auditEventId,
    );
    if (!scope) {
      throw new InvalidAuditHoldScopeError(
        input.affiliationId,
        input.auditEventId,
      );
    }

    // 4. Tenant activo.
    const isTenantActive = await this.tenantChecker.isActiveTenant(
      input.tenantId,
    );
    if (!isTenantActive) {
      throw new TenantNotActiveError(input.tenantId);
    }

    // 5. Invariantes de referencia: la afiliación existe dentro del tenant.
    if (scope.kind !== "TENANT") {
      const affiliation = await this.affiliations.findById(
        input.tenantId,
        scope.affiliationId,
      );
      if (!affiliation) {
        throw new AffiliationNotFoundError(scope.affiliationId, input.tenantId);
      }
    }

    // 6. Invariantes de referencia: el evento existe en el tenant y pertenece a la afiliación declarada.
    if (scope.kind === "EVENT") {
      const event = await this.audit.findById(
        input.tenantId,
        scope.auditEventId,
      );
      if (!event) {
        throw new AuditEventNotFoundError(scope.auditEventId, input.tenantId);
      }
      if (event.affiliationId !== scope.affiliationId) {
        throw new AuditHoldScopeMismatchError(
          scope.auditEventId,
          scope.affiliationId,
        );
      }
    }

    // 7. Persistencia: el solicitante siempre es el actor autenticado.
    const hold = await this.auditHolds.create({
      tenantId: input.tenantId,
      affiliationId: scope.affiliationId,
      auditEventId: scope.auditEventId,
      reason,
      requestedByUserId: input.actorUserId,
      expiresAt: input.expiresAt,
    });

    return { hold };
  }
}
