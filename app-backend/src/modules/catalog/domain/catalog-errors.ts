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

/// ─── Ofertas reservables por afiliación (D3, D4, D5, D7) ───────────────────────

/// Operación de escritura denegada por D4: el actor no es el titular autorizado
/// (perfil no aprobado, membresía/afiliación inactiva o especialidad no aprobada).
export class UnauthorizedAffiliationActionError extends CatalogDomainError {
  constructor(message = "No autorizado para operar sobre la oferta en este consultorio") {
    super(message);
  }
}

/// La oferta referenciada no existe o no pertenece a la afiliación/tenant del actor.
export class ServiceOfferNotFoundError extends CatalogDomainError {
  constructor(message = "Oferta no encontrada") {
    super(message);
  }
}

/// Violación del invariante de unicidad `@@unique([affiliationId, name])` (D3).
export class ServiceOfferNameAlreadyExistsError extends CatalogDomainError {
  constructor(message = "Ya existe una oferta con ese nombre en este consultorio") {
    super(message);
  }
}

/// Datos de oferta inválidos (duración múltiplo de 15 dentro de rango, precio > 0).
export class InvalidServiceOfferDataError extends CatalogDomainError {
  constructor(message = "Datos de la oferta inválidos") {
    super(message);
  }
}

/// D5: términos contractuales (`price`, `durationMin`, `specialtyId`) inmutables si la oferta
/// ya tiene cualquier cita asociada (histórica, presente o futura), hasta snapshots de Fase 7.
export class ServiceImmutableTermsWithAppointmentsError extends CatalogDomainError {
  constructor(
    message = "No puedes modificar precio, duración o especialidad de una oferta con citas registradas",
  ) {
    super(message);
  }
}

/// D5: la oferta tiene citas pendientes o confirmadas aún no concluidas (`endDateTime > now`).
export class ServiceHasPendingAppointmentsError extends CatalogDomainError {
  constructor(
    message = "No puedes desactivar una oferta con citas pendientes o en curso",
  ) {
    super(message);
  }
}


