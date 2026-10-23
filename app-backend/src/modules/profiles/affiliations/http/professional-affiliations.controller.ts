/// ARCHIVO: src/modules/profiles/affiliations/http/professional-affiliations.controller.ts
/// Controlador HTTP para operaciones de afiliación ejecutadas por profesionales.

import type { Request, Response, NextFunction } from "express";
import { RequestAffiliationUseCase } from "../application/use-cases/request-affiliation.use-case";
import { SubmitAffiliationContentUseCase } from "../application/use-cases/submit-affiliation-content.use-case";
import { GetMyAffiliationUseCase } from "../application/use-cases/get-my-affiliation.use-case";
import { WithdrawAffiliationUseCase } from "../application/use-cases/withdraw-affiliation.use-case";
import { ReopenAffiliationUseCase } from "../application/use-cases/reopen-affiliation.use-case";
import { PrismaProfessionalProfileOwnerChecker } from "../infrastructure/prisma/prisma-professional-profile-owner-checker";
import { PrismaAffiliationUnitOfWork } from "../infrastructure/prisma/prisma-affiliation-unit-of-work";
import { handleAffiliationError } from "./affiliation-error-mapper";
import { AffiliationNotFoundError } from "../domain/affiliation-errors";

const profileOwnerChecker = new PrismaProfessionalProfileOwnerChecker();
const unitOfWork = new PrismaAffiliationUnitOfWork();

const requestAffiliationUseCase = new RequestAffiliationUseCase(
  profileOwnerChecker,
  unitOfWork,
);
const submitContentUseCase = new SubmitAffiliationContentUseCase(
  profileOwnerChecker,
  unitOfWork,
);
const getMyAffiliationUseCase = new GetMyAffiliationUseCase(
  profileOwnerChecker,
  unitOfWork,
);
const withdrawAffiliationUseCase = new WithdrawAffiliationUseCase(
  profileOwnerChecker,
  unitOfWork,
);
const reopenAffiliationUseCase = new ReopenAffiliationUseCase(
  profileOwnerChecker,
  unitOfWork,
);

export class ProfessionalAffiliationsController {
  /**
   * POST /api/professionals/me/affiliations
   * Solicitar afiliación a un consultorio/tenant (Apply).
   */
  static async requestAffiliation(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const { tenantId, content } = req.body;

    if (!tenantId || !content || typeof content.description !== "string") {
      return res.status(400).json({
        message: "tenantId y content (con description) son requeridos",
      });
    }

    try {
      const result = await requestAffiliationUseCase.execute({
        tenantId: Number(tenantId),
        actorUserId: req.user.id,
        content: {
          description: content.description,
          socialLinks: Array.isArray(content.socialLinks)
            ? content.socialLinks
            : [],
        },
      });

      return res.status(201).json(result);
    } catch (error) {
      return handleAffiliationError(error, res, next);
    }
  }

  /**
   * GET /api/professionals/me/affiliations
   * Consultar afiliaciones del profesional autenticado.
   */
  static async getMyAffiliations(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const tenantIdQuery = req.query.tenantId
      ? Number(req.query.tenantId)
      : undefined;

    try {
      const result = await getMyAffiliationUseCase.execute({
        actorUserId: req.user.id,
        tenantId: tenantIdQuery,
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleAffiliationError(error, res, next);
    }
  }

  /**
   * GET /api/professionals/me/affiliations/:tenantId
   * Consultar la afiliación específica del profesional en un tenant.
   */
  static async getMyAffiliationByTenant(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const tenantId = Number(req.params.tenantId);

    try {
      const result = await getMyAffiliationUseCase.execute({
        actorUserId: req.user.id,
        tenantId,
      });

      if (!result.affiliations || result.affiliations.length === 0) {
        return res.status(404).json({
          message: `No se encontró afiliación en el tenant ${tenantId}`,
        });
      }

      return res.status(200).json(result.affiliations[0]);
    } catch (error) {
      return handleAffiliationError(error, res, next);
    }
  }

  /**
   * POST /api/professionals/me/affiliations/:tenantId/revisions
   * Proponer nueva versión de contenido público (Submit Content).
   */
  static async submitContent(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const tenantId = Number(req.params.tenantId);
    const { affiliationId: rawAffiliationId, content } = req.body;

    if (!content || typeof content.description !== "string") {
      return res.status(400).json({
        message: "content con description es requerido",
      });
    }

    try {
      let affiliationId = rawAffiliationId ? Number(rawAffiliationId) : null;

      if (!affiliationId) {
        const myAff = await getMyAffiliationUseCase.execute({
          actorUserId: req.user.id,
          tenantId,
        });
        if (!myAff.affiliations || myAff.affiliations.length === 0) {
          throw new AffiliationNotFoundError(0, tenantId);
        }
        affiliationId = myAff.affiliations[0].affiliation.id;
      }

      const result = await submitContentUseCase.execute({
        tenantId,
        affiliationId,
        actorUserId: req.user.id,
        content: {
          description: content.description,
          socialLinks: Array.isArray(content.socialLinks)
            ? content.socialLinks
            : [],
        },
      });

      return res.status(201).json(result);
    } catch (error) {
      return handleAffiliationError(error, res, next);
    }
  }

  /**
   * POST /api/professionals/me/affiliations/:tenantId/withdraw
   * Retiro voluntario del profesional de una afiliación.
   */
  static async withdraw(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const tenantId = Number(req.params.tenantId);
    const { affiliationId: rawAffiliationId, reason } = req.body;

    try {
      let affiliationId = rawAffiliationId ? Number(rawAffiliationId) : null;

      if (!affiliationId) {
        const myAff = await getMyAffiliationUseCase.execute({
          actorUserId: req.user.id,
          tenantId,
        });
        if (!myAff.affiliations || myAff.affiliations.length === 0) {
          throw new AffiliationNotFoundError(0, tenantId);
        }
        affiliationId = myAff.affiliations[0].affiliation.id;
      }

      const result = await withdrawAffiliationUseCase.execute({
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
   * POST /api/professionals/me/affiliations/:tenantId/reopen
   * Reabrir una afiliación en estado REJECTED o WITHDRAWN.
   */
  static async reopen(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const tenantId = Number(req.params.tenantId);
    const { affiliationId: rawAffiliationId, content, reason } = req.body;

    try {
      let affiliationId = rawAffiliationId ? Number(rawAffiliationId) : null;

      if (!affiliationId) {
        const myAff = await getMyAffiliationUseCase.execute({
          actorUserId: req.user.id,
          tenantId,
        });
        if (!myAff.affiliations || myAff.affiliations.length === 0) {
          throw new AffiliationNotFoundError(0, tenantId);
        }
        affiliationId = myAff.affiliations[0].affiliation.id;
      }

      const result = await reopenAffiliationUseCase.execute({
        tenantId,
        affiliationId,
        actorUserId: req.user.id,
        content: content
          ? {
              description: content.description,
              socialLinks: Array.isArray(content.socialLinks)
                ? content.socialLinks
                : [],
            }
          : undefined,
        reason,
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleAffiliationError(error, res, next);
    }
  }
}
