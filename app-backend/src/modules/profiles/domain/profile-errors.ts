/// ARCHIVO: src/modules/profiles/domain/profile-errors.ts
/// Errores de dominio específicos para el módulo de Profiles (Fase 4).

export class ProfileDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UserProfileNotFoundError extends ProfileDomainError {
  constructor(message = "Usuario no existe") {
    super(message);
  }
}

export class ProfileNotFoundError extends ProfileDomainError {
  constructor(message = "Perfil no existe") {
    super(message);
  }
}

export class ClientProfileNotFoundError extends ProfileNotFoundError {
  constructor(message = "Perfil de cliente no existe") {
    super(message);
  }
}

export class ProfessionalProfileNotFoundError extends ProfileNotFoundError {
  constructor(message = "Perfil profesional no existe") {
    super(message);
  }
}

export class AdminProfileNotFoundError extends ProfileNotFoundError {
  constructor(message = "Perfil admin no existe") {
    super(message);
  }
}

export class UnsupportedRoleError extends ProfileDomainError {
  constructor(message = "Rol no soportado") {
    super(message);
  }
}

export class UnauthorizedProfileAccessError extends ProfileDomainError {
  constructor(message = "No autorizado") {
    super(message);
  }
}

export class InvalidProfileDataError extends ProfileDomainError {
  constructor(message = "No hay campos para actualizar") {
    super(message);
  }
}

export class InvalidProfileStatusTransitionError extends ProfileDomainError {
  constructor(from: string, to: string) {
    super(`Transición inválida de ${from} a ${to}`);
  }
}

export class ProfileMissingSpecialtyError extends ProfileDomainError {
  constructor(
    message = "El perfil no puede aprobarse sin al menos una especialidad aprobada"
  ) {
    super(message);
  }
}

export class CertificateNotFoundError extends ProfileDomainError {
  constructor(message = "Certificado no encontrado") {
    super(message);
  }
}

export class SocialLinkNotFoundError extends ProfileDomainError {
  constructor(message = "Social link no encontrada") {
    super(message);
  }
}

