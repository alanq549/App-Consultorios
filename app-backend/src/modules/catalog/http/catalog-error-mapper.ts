/// ARCHIVO: src/modules/catalog/http/catalog-error-mapper.ts
/// Mapeador de errores de dominio de Catalog a AppError HTTP.

import { AppError } from "@/shared/errors/AppError";
import {
  CatalogDomainError,
  SpecialtyNotFoundError,
  DuplicateSpecialtyError,
  SpecialtyInactiveError,
  InvalidSpecialtyDataError,
  UnauthorizedSpecialtyOperationError,
} from "../domain/catalog-errors";

export function mapCatalogErrorToHttp(error: unknown): Error {
  if (error instanceof SpecialtyNotFoundError) {
    return new AppError(error.message, 404);
  }

  if (error instanceof DuplicateSpecialtyError) {
    return new AppError(error.message, 409);
  }

  if (error instanceof SpecialtyInactiveError) {
    return new AppError(error.message, 400);
  }

  if (error instanceof InvalidSpecialtyDataError) {
    return new AppError(error.message, 400);
  }

  if (error instanceof UnauthorizedSpecialtyOperationError) {
    return new AppError(error.message, 403);
  }

  if (error instanceof CatalogDomainError) {
    return new AppError(error.message, 400);
  }

  return error instanceof Error ? error : new Error(String(error));
}

