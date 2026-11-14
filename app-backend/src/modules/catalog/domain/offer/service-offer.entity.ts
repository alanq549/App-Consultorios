/// ARCHIVO: src/modules/catalog/domain/offer/service-offer.entity.ts
/// Entidad de dominio de la oferta clínica reservable (D3).
///
/// Una oferta pertenece estrictamente a una afiliación profesional–tenant
/// (`ProfessionalTenantAffiliation`) y sus términos comerciales nunca se heredan entre clínicas.

import { InvalidServiceOfferDataError } from "../catalog-errors";

/// Duración mínima reservable; las ofertas se alinean a la malla de agenda de 15 minutos.
export const OFFER_SLOT_MINUTES = 15;
/// Duración máxima aceptada por el contrato HTTP vigente (8 horas).
export const OFFER_MAX_DURATION_MIN = 480;

export interface ServiceOfferSpecialtyRef {
  id: number;
  name: string;
}

export interface ServiceOfferProps {
  id: number;
  name: string;
  description: string;
  durationMin: number;
  /// Precio en MXN como string decimal con exactamente dos posiciones (D7).
  price: string;
  isActive: boolean;
  profileId: number;
  affiliationId: number | null;
  specialtyId: number;
  specialty?: ServiceOfferSpecialtyRef | null;
  createdAt: Date;
  updatedAt: Date;
}

/// Términos contractuales que un profesional puede fijar al crear/actualizar la oferta.
export interface ServiceOfferTermsInput {
  durationMin: number;
  /// Precio aceptado como string o número; se normaliza a string decimal de dos posiciones.
  price: string | number;
}

export class ServiceOffer {
  private constructor(private props: ServiceOfferProps) {}

  /// Hidrata la entidad desde persistencia (no valida términos; confía en la fila almacenada).
  public static fromPersistence(props: ServiceOfferProps): ServiceOffer {
    return new ServiceOffer(props);
  }

  /// Valida los invariantes de duración y precio compartidos por crear y actualizar.
  public static assertTerms(input: ServiceOfferTermsInput): void {
    ServiceOffer.assertDuration(input.durationMin);
    ServiceOffer.assertPrice(input.price);
  }

  public static assertDuration(durationMin: number): void {
    if (!Number.isInteger(durationMin) || durationMin <= 0) {
      throw new InvalidServiceOfferDataError("La duración debe ser mayor a 0");
    }
    if (durationMin % OFFER_SLOT_MINUTES !== 0) {
      throw new InvalidServiceOfferDataError(
        "La duración debe ser múltiplo de 15 minutos",
      );
    }
  }

  public static assertPrice(price: string | number): void {
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) {
      throw new InvalidServiceOfferDataError("El precio debe ser mayor a 0");
    }
  }

  /// D7: normaliza un monto de entrada (string o número) al string decimal canónico con
  /// exactamente dos posiciones (ej. `150.00`). Rechaza más de dos decimales sin redondear
  /// ni truncar silenciosamente, y exige estrictamente `price > 0`.
  public static normalizePrice(price: string | number): string {
    const raw = (typeof price === "number" ? String(price) : price).trim();

    if (!/^\d+(\.\d+)?$/.test(raw)) {
      throw new InvalidServiceOfferDataError(
        "El precio debe ser un monto positivo en MXN con hasta 2 decimales",
      );
    }

    const [, decimals = ""] = raw.split(".");
    if (decimals.length > 2) {
      throw new InvalidServiceOfferDataError(
        "El precio no puede tener más de 2 decimales",
      );
    }

    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      throw new InvalidServiceOfferDataError("El precio debe ser mayor a 0");
    }

    return ServiceOffer.formatPrice(raw);
  }

  /// Formatea un monto decimal a string con exactamente dos posiciones, sin aritmética de
  /// punto flotante para preservar la precisión exacta de las columnas `Decimal(10, 2)` (D7).
  public static formatPrice(price: string): string {
    const [integerPart, decimalPart = ""] = price.split(".");
    return `${integerPart}.${(decimalPart + "00").slice(0, 2)}`;
  }

  public get id(): number {
    return this.props.id;
  }

  public get name(): string {
    return this.props.name;
  }

  public get description(): string {
    return this.props.description;
  }

  public get durationMin(): number {
    return this.props.durationMin;
  }

  public get price(): string {
    return this.props.price;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get profileId(): number {
    return this.props.profileId;
  }

  public get affiliationId(): number | null {
    return this.props.affiliationId;
  }

  public get specialtyId(): number {
    return this.props.specialtyId;
  }

  public get specialty(): ServiceOfferSpecialtyRef | null {
    return this.props.specialty ?? null;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /// Determina si los términos contractuales entrantes difieren de los actuales (D5).
  /// Sólo los cambios efectivos disparan el bloqueo por citas existentes.
  public termsDiffer(next: {
    durationMin?: number;
    price?: string | number;
    specialtyId?: number;
  }): boolean {
    if (
      next.durationMin !== undefined &&
      next.durationMin !== this.props.durationMin
    ) {
      return true;
    }
    if (next.price !== undefined && Number(next.price) !== Number(this.props.price)) {
      return true;
    }
    if (
      next.specialtyId !== undefined &&
      next.specialtyId !== this.props.specialtyId
    ) {
      return true;
    }
    return false;
  }

  public toSnapshot(): ServiceOfferProps {
    return { ...this.props };
  }
}
