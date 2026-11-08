/// ARCHIVO: tests/profiles/professional-status-machine.unit.test.ts
import { describe, expect, it } from "vitest";
import { ProfessionalStatusMachine } from "@/modules/profiles/domain/professional-status-machine";
import {
  InvalidProfileStatusTransitionError,
  ProfileMissingSpecialtyError,
} from "@/modules/profiles/domain/profile-errors";

describe("ProfessionalStatusMachine — Domain Rules (Fase 4 - D4)", () => {
  it("permite transición idempotente cuando el estado es idéntico", () => {
    expect(() =>
      ProfessionalStatusMachine.validateTransition("PENDING", "PENDING", 0)
    ).not.toThrow();

    expect(() =>
      ProfessionalStatusMachine.validateTransition("APPROVED", "APPROVED", 1)
    ).not.toThrow();
  });

  it("permite transiciones válidas desde PENDING a APPROVED si cuenta con especialidades aprobadas", () => {
    expect(() =>
      ProfessionalStatusMachine.validateTransition("PENDING", "APPROVED", 1)
    ).not.toThrow();
  });

  it("permite transiciones válidas desde PENDING a REJECTED", () => {
    expect(() =>
      ProfessionalStatusMachine.validateTransition("PENDING", "REJECTED", 0)
    ).not.toThrow();
  });

  it("rechaza transición a APPROVED si no cuenta con al menos una especialidad aprobada", () => {
    expect(() =>
      ProfessionalStatusMachine.validateTransition("PENDING", "APPROVED", 0)
    ).toThrow(ProfileMissingSpecialtyError);
  });

  it("permite transición desde APPROVED a SUSPENDED", () => {
    expect(() =>
      ProfessionalStatusMachine.validateTransition("APPROVED", "SUSPENDED", 1)
    ).not.toThrow();
  });

  it("permite transición desde SUSPENDED a APPROVED si cuenta con especialidades aprobadas", () => {
    expect(() =>
      ProfessionalStatusMachine.validateTransition("SUSPENDED", "APPROVED", 2)
    ).not.toThrow();
  });

  it("rechaza reactivación de SUSPENDED a APPROVED si ya no tiene especialidades aprobadas", () => {
    expect(() =>
      ProfessionalStatusMachine.validateTransition("SUSPENDED", "APPROVED", 0)
    ).toThrow(ProfileMissingSpecialtyError);
  });

  it("REJECTED es estado terminal: rechaza cualquier transición posterior", () => {
    expect(() =>
      ProfessionalStatusMachine.validateTransition("REJECTED", "APPROVED", 2)
    ).toThrow(InvalidProfileStatusTransitionError);

    expect(() =>
      ProfessionalStatusMachine.validateTransition("REJECTED", "PENDING", 2)
    ).toThrow(InvalidProfileStatusTransitionError);

    expect(() =>
      ProfessionalStatusMachine.validateTransition("REJECTED", "SUSPENDED", 2)
    ).toThrow(InvalidProfileStatusTransitionError);
  });

  it("canTransition devuelve booleano correctamente sin lanzar excepción", () => {
    expect(ProfessionalStatusMachine.canTransition("PENDING", "APPROVED")).toBe(true);
    expect(ProfessionalStatusMachine.canTransition("PENDING", "REJECTED")).toBe(true);
    expect(ProfessionalStatusMachine.canTransition("APPROVED", "SUSPENDED")).toBe(true);
    expect(ProfessionalStatusMachine.canTransition("SUSPENDED", "APPROVED")).toBe(true);
    expect(ProfessionalStatusMachine.canTransition("REJECTED", "APPROVED")).toBe(false);
    expect(ProfessionalStatusMachine.canTransition("PENDING", "SUSPENDED")).toBe(false);
  });
});

