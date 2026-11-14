/// ARCHIVO: src/modules/catalog/domain/professional-specialty.entity.ts
/// Entidad de dominio para la elegibilidad profesional en una especialidad (Catalog).

import { InvalidSpecialtyTransitionError } from "./catalog-errors";

export type ProfessionalSpecialtyStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ProfessionalSpecialtyProps {
  professionalId: number;
  specialtyId: number;
  status: ProfessionalSpecialtyStatus;
  requestedAt?: Date;
  reviewedAt?: Date | null;
}

export class ProfessionalSpecialty {
  private readonly _professionalId: number;
  private readonly _specialtyId: number;
  private _status: ProfessionalSpecialtyStatus;
  private readonly _requestedAt: Date;
  private _reviewedAt: Date | null;

  constructor(props: ProfessionalSpecialtyProps) {
    if (!props.professionalId || props.professionalId <= 0) {
      throw new Error("professionalId inválido");
    }
    if (!props.specialtyId || props.specialtyId <= 0) {
      throw new Error("specialtyId inválido");
    }

    this._professionalId = props.professionalId;
    this._specialtyId = props.specialtyId;
    this._status = props.status;
    this._requestedAt = props.requestedAt ?? new Date();
    this._reviewedAt = props.reviewedAt ?? null;
  }

  static createRequest(professionalId: number, specialtyId: number): ProfessionalSpecialty {
    return new ProfessionalSpecialty({
      professionalId,
      specialtyId,
      status: "PENDING",
      requestedAt: new Date(),
      reviewedAt: null,
    });
  }

  get professionalId(): number {
    return this._professionalId;
  }

  get specialtyId(): number {
    return this._specialtyId;
  }

  get status(): ProfessionalSpecialtyStatus {
    return this._status;
  }

  get requestedAt(): Date {
    return this._requestedAt;
  }

  get reviewedAt(): Date | null {
    return this._reviewedAt;
  }

  isPending(): boolean {
    return this._status === "PENDING";
  }

  isApproved(): boolean {
    return this._status === "APPROVED";
  }

  isRejected(): boolean {
    return this._status === "REJECTED";
  }

  approve(now: Date = new Date()): void {
    this._status = "APPROVED";
    this._reviewedAt = now;
  }

  reject(now: Date = new Date()): void {
    this._status = "REJECTED";
    this._reviewedAt = now;
  }

  transitionTo(
    targetStatus: ProfessionalSpecialtyStatus,
    now: Date = new Date()
  ): void {
    if (this._status === "REJECTED") {
      throw new InvalidSpecialtyTransitionError(
        "No se puede modificar una especialidad en estado terminal REJECTED"
      );
    }

    if (this._status === targetStatus) {
      // Idempotente: ya tiene ese estado
      return;
    }

    if (targetStatus === "APPROVED") {
      this.approve(now);
    } else if (targetStatus === "REJECTED") {
      this.reject(now);
    } else {
      throw new InvalidSpecialtyTransitionError(
        `Transición no permitida de ${this._status} a ${targetStatus}`
      );
    }
  }

  toJSON() {
    return {
      professionalId: this._professionalId,
      specialtyId: this._specialtyId,
      status: this._status,
      requestedAt: this._requestedAt,
      reviewedAt: this._reviewedAt,
    };
  }
}

