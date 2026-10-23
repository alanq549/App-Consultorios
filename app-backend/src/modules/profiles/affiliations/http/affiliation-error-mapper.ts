/// ARCHIVO: src/modules/profiles/affiliations/http/affiliation-error-mapper.ts
/// Mapeador de errores de dominio de afiliaciones hacia respuestas HTTP consistentes.

import type { Response, NextFunction } from "express";
import {
  AffiliationAlreadyExistsError,
  AffiliationNotFoundError,
  DuplicateSocialLinkTypeError,
  InvalidAffiliationTransitionError,
  InvalidRevisionTransitionError,
  ObsoleteRevisionError,
  ProfessionalProfileNotFoundError,
  ReasonRequiredError,
  SelfReviewForbiddenError,
  TenantNotActiveError,
  UnauthorizedAffiliationActionError,
} from "../domain/affiliation-errors";

export function handleAffiliationError(
  error: unknown,
  res: Response,
  next: NextFunction,
) {
  if (error instanceof ProfessionalProfileNotFoundError) {
    return res.status(404).json({ message: error.message });
  }

  if (error instanceof AffiliationNotFoundError) {
    return res.status(404).json({ message: error.message });
  }

  if (error instanceof TenantNotActiveError) {
    return res.status(400).json({ message: error.message });
  }

  if (error instanceof DuplicateSocialLinkTypeError) {
    return res.status(400).json({ message: error.message });
  }

  if (error instanceof ReasonRequiredError) {
    return res.status(400).json({ message: error.message });
  }

  if (error instanceof SelfReviewForbiddenError) {
    return res.status(403).json({ message: error.message });
  }

  if (error instanceof UnauthorizedAffiliationActionError) {
    return res.status(403).json({ message: error.message });
  }

  if (error instanceof AffiliationAlreadyExistsError) {
    return res.status(409).json({ message: error.message });
  }

  if (error instanceof ObsoleteRevisionError) {
    return res.status(409).json({ message: error.message });
  }

  if (error instanceof InvalidAffiliationTransitionError) {
    return res.status(409).json({ message: error.message });
  }

  if (error instanceof InvalidRevisionTransitionError) {
    return res.status(409).json({ message: error.message });
  }

  return next(error);
}
