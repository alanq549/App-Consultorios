/// ARCHIVO: src/modules/profiles/http/profile-error-mapper.ts
import { AppError } from "@/shared/errors/AppError";
import {
  ProfileDomainError,
  UserProfileNotFoundError,
  ProfileNotFoundError,
  CertificateNotFoundError,
  SocialLinkNotFoundError,
  UnauthorizedProfileAccessError,
  InvalidProfileDataError,
  InvalidProfileStatusTransitionError,
  ProfileMissingSpecialtyError,
  UnsupportedRoleError,
} from "../domain/profile-errors";

export function mapProfileErrorToHttp(error: unknown): Error {
  if (error instanceof UserProfileNotFoundError) {
    return new AppError(error.message, 404);
  }

  if (error instanceof ProfileNotFoundError) {
    return new AppError(error.message, 404);
  }

  if (error instanceof CertificateNotFoundError) {
    return new AppError(error.message, 404);
  }

  if (error instanceof SocialLinkNotFoundError) {
    return new AppError(error.message, 404);
  }

  if (error instanceof UnauthorizedProfileAccessError) {
    return new AppError(error.message, 403);
  }

  if (error instanceof InvalidProfileDataError) {
    return new AppError(error.message, 400);
  }

  if (error instanceof InvalidProfileStatusTransitionError) {
    return new AppError(error.message, 400);
  }

  if (error instanceof ProfileMissingSpecialtyError) {
    return new AppError(error.message, 400);
  }

  if (error instanceof UnsupportedRoleError) {
    return new AppError(error.message, 400);
  }

  if (error instanceof ProfileDomainError) {
    return new AppError(error.message, 400);
  }

  return error instanceof Error ? error : new Error(String(error));
}

