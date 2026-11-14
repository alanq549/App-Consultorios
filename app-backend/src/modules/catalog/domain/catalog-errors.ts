/// ARCHIVO: src/modules/catalog/domain/catalog-errors.ts
/// Errores de dominio para el contexto de Catalog (Taxonomía, Elegibilidad y Ofertas).

export class CatalogDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SpecialtyNotFoundError extends CatalogDomainError {
  constructor(message = "Especialidad no encontrada") {
    super(message);
  }
}

export class DuplicateSpecialtyError extends CatalogDomainError {
  constructor(message = "La especialidad ya existe") {
    super(message);
  }
}

export class SpecialtyInactiveError extends CatalogDomainError {
  constructor(message = "La especialidad no existe o está desactivada") {
    super(message);
  }
}

export class InvalidSpecialtyDataError extends CatalogDomainError {
  constructor(message = "Datos de especialidad inválidos") {
    super(message);
  }
}

export class UnauthorizedSpecialtyOperationError extends CatalogDomainError {
  constructor(message = "Operación no autorizada sobre el catálogo de especialidades") {
    super(message);
  }
}

export class ProfessionalSpecialtyNotFoundError extends CatalogDomainError {
  constructor(message = "La especialidad no está asignada al profesional") {
    super(message);
  }
}

export class ProfessionalSpecialtyAlreadyExistsError extends CatalogDomainError {
  constructor(message = "El profesional ya solicitó esta especialidad") {
    super(message);
  }
}

export class MaxPendingSpecialtiesExceededError extends CatalogDomainError {
  constructor(message = "No puedes solicitar más de 2 especialidades pendientes") {
    super(message);
  }
}

export class InvalidSpecialtyStatusError extends CatalogDomainError {
  constructor(message = "Estado de especialidad inválido") {
    super(message);
  }
}

export class InvalidSpecialtyTransitionError extends CatalogDomainError {
  constructor(message = "Transición de estado de especialidad no permitida") {
    super(message);
  }
}

export class ProfessionalProfileNotFoundError extends CatalogDomainError {
  constructor(message = "Perfil profesional no encontrado") {
    super(message);
  }
}


