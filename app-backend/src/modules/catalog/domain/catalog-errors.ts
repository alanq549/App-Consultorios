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

