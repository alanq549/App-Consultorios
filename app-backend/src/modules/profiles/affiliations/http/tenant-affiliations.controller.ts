/// ARCHIVO: src/modules/profiles/affiliations/http/tenant-affiliations.controller.ts
/// Controlador HTTP para operaciones de afiliación gestionadas por el OWNER del consultorio.

import type { Request, Response, NextFunction } from "express";
import { ListTenantAffiliationsUseCase } from "../application/use-cases/list-tenant-affiliations.use-case";
import { GetTenantAffiliationUseCase } from "../application/use-cases/get-tenant-affiliation.use-case";
import { ReviewAffiliationRevisionUseCase } from "../application/use-cases/review-affiliation-revision.use-case";
import { SuspendAffiliationUseCase } from "../application/use-cases/suspend-affiliation.use-case";
import { ReactivateAffiliationUseCase } from "../application/use-cases/reactivate-affiliation.use-case";
import { OwnerWithdrawAffiliationUseCase } from "../application/use-cases/owner-withdraw-affiliation.use-case";
import { PrismaActiveMembershipChecker } from "../infrastructure/prisma/prisma-active-membership-checker";
import { PrismaAffiliationUnitOfWork } from "../infrastructure/prisma/prisma-affiliation-unit-of-work";
import { handleAffiliationError } from "./affiliation-error-mapper";
import { parseTenantId, TENANT_SELECTOR_HEADER, INVALID_TENANT_SELECTOR_MESSAGE } from "@/modules/tenancy/http/tenancy.dto";
import type { AffiliationStatus } from "../domain/affiliation-types";

const membershipChecker = new PrismaActiveMembershipChecker();
const unitOfWork = new PrismaAffiliationUnitOfWork();

const listTenantAffiliationsUseCase = new ListTenantAffiliationsUseCase(
  membershipChecker,
  unitOfWork,
);
const getTenantAffiliationUseCase = new GetTenantAffiliationUseCase(
  membershipChecker,
  unitOfWork,
);
const reviewRevisionUseCase = new ReviewAffiliationRevisionUseCase(
  membershipChecker,
  unitOfWork,
);
const suspendAffiliationUseCase = new SuspendAffiliationUseCase(
  membershipChecker,
  unitOfWork,
);
const reactivateAffiliationUseCase = new ReactivateAffiliationUseCase(
  membershipChecker,
  unitOfWork,
);
const ownerWithdrawAffiliationUseCase = new OwnerWithdrawAffiliationUseCase(
  membershipChecker,
  unitOfWork,
);

function resolveTenantId(req: Request): number | null {
  const headerVal = req.get(TENANT_SELECTOR_HEADER);
  if (headerVal) {
    return parseTenantId(headerVal);
  }
  if (req.query.tenantId && typeof req.query.tenantId === "string") {
    return parseTenantId(req.query.tenantId);
  }
  if (req.body?.tenantId) {
    return parseTenantId(String(req.body.tenantId));
  }
  return null;
}

export class TenantAffiliationsController {
  /**
   * GET /api/tenancy/affiliations
   * Listar afiliaciones del consultorio.
   */
  static async list(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: INVALID_TENANT_SELECTOR_MESSAGE });
    }

    const statusFilter = req.query.status as AffiliationStatus | undefined;

    try {
      const result = await listTenantAffiliationsUseCase.execute({
        tenantId,
        actorUserId: req.user.id,
        status: statusFilter,
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleAffiliationError(error, res, next);
    }
  }

  /**
   * GET /api/tenancy/affiliations/:affiliationId
   * Ver detalle completo de una afiliación (revisiones y auditoría).
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: INVALID_TENANT_SELECTOR_MESSAGE });
    }

    const affiliationId = Number(req.params.affiliationId);

    try {
      const result = await getTenantAffiliationUseCase.execute({
        tenantId,
        affiliationId,
        actorUserId: req.user.id,
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleAffiliationError(error, res, next);
    }
  }

  /**
   * POST /api/tenancy/affiliations/:affiliationId/revisions/:revisionId/review
   * Evaluar (aprobar o rechazar) una revisión de contenido.
   */
  static async reviewRevision(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: INVALID_TENANT_SELECTOR_MESSAGE });
    }

    const affiliationId = Number(req.params.affiliationId);
    const revisionId = Number(req.params.revisionId);
    const { decision, reason } = req.body;

    if (decision !== "APPROVE" && decision !== "REJECT") {
      return res.status(400).json({
        message: "decision debe ser 'APPROVE' o 'REJECT'",
      });
    }

    try {
      const result = await reviewRevisionUseCase.execute({
        tenantId,
        affiliationId,
        revisionId,
        reviewerUserId: req.user.id,
        decision,
        reason,
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleAffiliationError(error, res, next);
    }
  }

  /**
   * POST /api/tenancy/affiliations/:affiliationId/suspend
   * Suspender una afiliación activa (requiere motivo).
   */
  static async suspend(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: INVALID_TENANT_SELECTOR_MESSAGE });
    }

    const affiliationId = Number(req.params.affiliationId);
    const { reason } = req.body;

    try {
      const result = await suspendAffiliationUseCase.execute({
        tenantId,
        affiliationId,
        actorUserId: req.user.id,
        reason,
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleAffiliationError(error, res, next);
    }
  }

  /**
   * POST /api/tenancy/affiliations/:affiliationId/reactivate
   * Reactivar una afiliación suspendida.
   */
  static async reactivate(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: INVALID_TENANT_SELECTOR_MESSAGE });
    }

    const affiliationId = Number(req.params.affiliationId);
    const { reason } = req.body;

    try {
      const result = await reactivateAffiliationUseCase.execute({
        tenantId,
        affiliationId,
        actorUserId: req.user.id,
        reason,
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleAffiliationError(error, res, next);
    }
  }

  /**
   * POST /api/tenancy/affiliations/:affiliationId/withdraw
   * Retiro administrativo de una afiliación por parte del OWNER (requiere motivo).
   */
  static async withdraw(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: INVALID_TENANT_SELECTOR_MESSAGE });
    }

    const affiliationId = Number(req.params.affiliationId);
    const { reason } = req.body;

    try {
      const result = await ownerWithdrawAffiliationUseCase.execute({
        tenantId,
        affiliationId,
        actorUserId: req.user.id,
        reason,
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleAffiliationError(error, res, next);
    }
  }
}
