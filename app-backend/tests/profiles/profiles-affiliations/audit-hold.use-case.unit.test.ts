/// ARCHIVO: tests/profiles/profiles-affiliations/audit-hold.use-case.unit.test.ts
/// Pruebas unitarias de C1: alcance de retención, creación y liberación de Audit Holds.

import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateAuditHoldUseCase } from "@/modules/profiles/affiliations/application/use-cases/create-audit-hold.use-case";
import { ReleaseAuditHoldUseCase } from "@/modules/profiles/affiliations/application/use-cases/release-audit-hold.use-case";
import { resolveAuditHoldScope } from "@/modules/profiles/affiliations/domain/audit-hold-scope";
import {
  AffiliationNotFoundError,
  AuditEventNotFoundError,
  AuditHoldAlreadyReleasedError,
  AuditHoldNotFoundError,
  AuditHoldScopeMismatchError,
  InvalidAuditHoldScopeError,
  ReasonRequiredError,
  TenantNotActiveError,
  UnauthorizedAffiliationActionError,
} from "@/modules/profiles/affiliations/domain/affiliation-errors";
import type { AffiliationRecord } from "@/modules/profiles/affiliations/application/ports/affiliation-repository";
import type { AffiliationAuditEventRecord } from "@/modules/profiles/affiliations/application/ports/affiliation-audit-repository";

describe("resolveAuditHoldScope", () => {
  it("resuelve los cuatro alcances declarados y rechaza el inválido", () => {
    expect(resolveAuditHoldScope(null, null)).toEqual({
      kind: "TENANT",
      affiliationId: null,
      auditEventId: null,
    });
    expect(resolveAuditHoldScope(10, null)).toEqual({
      kind: "AFFILIATION",
      affiliationId: 10,
      auditEventId: null,
    });
    expect(resolveAuditHoldScope(10, 900)).toEqual({
      kind: "EVENT",
      affiliationId: 10,
      auditEventId: 900,
    });
    expect(resolveAuditHoldScope(null, 900)).toBeNull();
  });
});

describe("Audit Hold Use Cases (C1)", () => {
  const sampleAffiliation: AffiliationRecord = {
    id: 10,
    professionalProfileId: 5,
    tenantId: 1,
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };

  const sampleEvent: AffiliationAuditEventRecord = {
    id: 900,
    tenantId: 1,
    affiliationId: 10,
    action: "APPLY",
    actorUserId: 100,
    revisionId: null,
    previousStatus: null,
    nextStatus: "PENDING_REVIEW",
    reason: null,
    changedFields: null,
    sourceReference: null,
    occurredAt: new Date("2026-01-02T00:00:00Z"),
    createdAt: new Date("2026-01-02T00:00:00Z"),
  };

  let mockMembershipChecker: any;
  let mockTenantChecker: any;
  let mockAffiliationsRepo: any;
  let mockAuditRepo: any;
  let mockAuditHoldsRepo: any;

  let createUseCase: CreateAuditHoldUseCase;
  let releaseUseCase: ReleaseAuditHoldUseCase;

  beforeEach(() => {
    mockMembershipChecker = {
      getActiveMembership: vi.fn().mockResolvedValue({
        userId: 99,
        tenantId: 1,
        role: "OWNER",
      }),
    };

    mockTenantChecker = {
      isActiveTenant: vi.fn().mockResolvedValue(true),
    };

    mockAffiliationsRepo = {
      findById: vi.fn().mockResolvedValue(sampleAffiliation),
    };

    mockAuditRepo = {
      findById: vi.fn().mockResolvedValue(sampleEvent),
    };

    mockAuditHoldsRepo = {
      create: vi.fn().mockImplementation((input) =>
        Promise.resolve({
          id: 500,
          ...input,
          releasedAt: null,
          releasedByUserId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      release: vi.fn(),
      isEventOnHold: vi.fn(),
    };

    createUseCase = new CreateAuditHoldUseCase(
      mockMembershipChecker,
      mockTenantChecker,
      mockAffiliationsRepo,
      mockAuditRepo,
      mockAuditHoldsRepo,
    );

    releaseUseCase = new ReleaseAuditHoldUseCase(
      mockMembershipChecker,
      mockAuditHoldsRepo,
    );
  });

  describe("CreateAuditHoldUseCase", () => {
    it("crea una retención de tenant sin consultar afiliación ni evento", async () => {
      const result = await createUseCase.execute({
        tenantId: 1,
        actorUserId: 99,
        affiliationId: null,
        auditEventId: null,
        reason: "Litigio en curso",
        expiresAt: null,
      });

      expect(result.hold.affiliationId).toBeNull();
      expect(mockAuditHoldsRepo.create).toHaveBeenCalledWith({
        tenantId: 1,
        affiliationId: null,
        auditEventId: null,
        reason: "Litigio en curso",
        requestedByUserId: 99,
        expiresAt: null,
      });
      expect(mockAffiliationsRepo.findById).not.toHaveBeenCalled();
      expect(mockAuditRepo.findById).not.toHaveBeenCalled();
    });

    it("crea una retención de afiliación validando su existencia en el tenant", async () => {
      await createUseCase.execute({
        tenantId: 1,
        actorUserId: 99,
        affiliationId: 10,
        auditEventId: null,
        reason: "Revisión interna",
        expiresAt: new Date("2026-06-01T00:00:00Z"),
      });

      expect(mockAffiliationsRepo.findById).toHaveBeenCalledWith(1, 10);
      expect(mockAuditRepo.findById).not.toHaveBeenCalled();
      expect(mockAuditHoldsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ affiliationId: 10, auditEventId: null }),
      );
    });

    it("crea una retención de evento verificando que pertenece a la afiliación declarada", async () => {
      await createUseCase.execute({
        tenantId: 1,
        actorUserId: 99,
        affiliationId: 10,
        auditEventId: 900,
        reason: "Evento bajo investigación",
        expiresAt: null,
      });

      expect(mockAffiliationsRepo.findById).toHaveBeenCalledWith(1, 10);
      expect(mockAuditRepo.findById).toHaveBeenCalledWith(1, 900);
      expect(mockAuditHoldsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ affiliationId: 10, auditEventId: 900 }),
      );
    });

    it("normaliza el motivo antes de persistirlo", async () => {
      await createUseCase.execute({
        tenantId: 1,
        actorUserId: 99,
        affiliationId: null,
        auditEventId: null,
        reason: "   Litigio en curso   ",
        expiresAt: null,
      });

      expect(mockAuditHoldsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "Litigio en curso" }),
      );
    });

    it("rechaza un evento sin afiliación (alcance inválido) sin persistir", async () => {
      await expect(
        createUseCase.execute({
          tenantId: 1,
          actorUserId: 99,
          affiliationId: null,
          auditEventId: 900,
          reason: "Motivo válido",
          expiresAt: null,
        }),
      ).rejects.toThrow(InvalidAuditHoldScopeError);

      expect(mockAuditHoldsRepo.create).not.toHaveBeenCalled();
    });

    it("exige motivo obligatorio", async () => {
      await expect(
        createUseCase.execute({
          tenantId: 1,
          actorUserId: 99,
          affiliationId: null,
          auditEventId: null,
          reason: "   ",
          expiresAt: null,
        }),
      ).rejects.toThrow(ReasonRequiredError);

      expect(mockAuditHoldsRepo.create).not.toHaveBeenCalled();
    });

    it("bloquea a un actor que no es OWNER del tenant", async () => {
      mockMembershipChecker.getActiveMembership.mockResolvedValue({
        userId: 50,
        tenantId: 1,
        role: "MEMBER",
      });

      await expect(
        createUseCase.execute({
          tenantId: 1,
          actorUserId: 50,
          affiliationId: 10,
          auditEventId: null,
          reason: "Motivo válido",
          expiresAt: null,
        }),
      ).rejects.toThrow(UnauthorizedAffiliationActionError);

      expect(mockAffiliationsRepo.findById).not.toHaveBeenCalled();
      expect(mockAuditHoldsRepo.create).not.toHaveBeenCalled();
    });

    it("rechaza operar sobre un tenant inactivo", async () => {
      mockTenantChecker.isActiveTenant.mockResolvedValue(false);

      await expect(
        createUseCase.execute({
          tenantId: 1,
          actorUserId: 99,
          affiliationId: 10,
          auditEventId: null,
          reason: "Motivo válido",
          expiresAt: null,
        }),
      ).rejects.toThrow(TenantNotActiveError);

      expect(mockAuditHoldsRepo.create).not.toHaveBeenCalled();
    });

    it("rechaza una afiliación inexistente o de otro tenant", async () => {
      mockAffiliationsRepo.findById.mockResolvedValue(null);

      await expect(
        createUseCase.execute({
          tenantId: 1,
          actorUserId: 99,
          affiliationId: 10,
          auditEventId: null,
          reason: "Motivo válido",
          expiresAt: null,
        }),
      ).rejects.toThrow(AffiliationNotFoundError);

      expect(mockAuditHoldsRepo.create).not.toHaveBeenCalled();
    });

    it("rechaza un evento inexistente o de otro tenant", async () => {
      mockAuditRepo.findById.mockResolvedValue(null);

      await expect(
        createUseCase.execute({
          tenantId: 1,
          actorUserId: 99,
          affiliationId: 10,
          auditEventId: 900,
          reason: "Motivo válido",
          expiresAt: null,
        }),
      ).rejects.toThrow(AuditEventNotFoundError);

      expect(mockAuditHoldsRepo.create).not.toHaveBeenCalled();
    });

    it("rechaza un evento que pertenece a otra afiliación", async () => {
      mockAuditRepo.findById.mockResolvedValue({
        ...sampleEvent,
        affiliationId: 77,
      });

      await expect(
        createUseCase.execute({
          tenantId: 1,
          actorUserId: 99,
          affiliationId: 10,
          auditEventId: 900,
          reason: "Motivo válido",
          expiresAt: null,
        }),
      ).rejects.toThrow(AuditHoldScopeMismatchError);

      expect(mockAuditHoldsRepo.create).not.toHaveBeenCalled();
    });

    it("permite retenciones acumuladas sobre el mismo alcance", async () => {
      await createUseCase.execute({
        tenantId: 1,
        actorUserId: 99,
        affiliationId: null,
        auditEventId: null,
        reason: "Primera retención",
        expiresAt: null,
      });
      await createUseCase.execute({
        tenantId: 1,
        actorUserId: 99,
        affiliationId: null,
        auditEventId: null,
        reason: "Segunda retención",
        expiresAt: new Date("2026-12-31T00:00:00Z"),
      });

      expect(mockAuditHoldsRepo.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("ReleaseAuditHoldUseCase", () => {
    it("libera la retención usando el actor autenticado", async () => {
      const released = {
        id: 500,
        tenantId: 1,
        affiliationId: 10,
        auditEventId: null,
        reason: "Revisión interna",
        requestedByUserId: 99,
        expiresAt: null,
        releasedAt: new Date("2026-03-01T10:00:00Z"),
        releasedByUserId: 99,
        createdAt: new Date("2026-02-01T00:00:00Z"),
        updatedAt: new Date("2026-03-01T10:00:00Z"),
      };
      mockAuditHoldsRepo.release.mockResolvedValue({
        outcome: "RELEASED",
        hold: released,
      });

      const result = await releaseUseCase.execute({
        tenantId: 1,
        actorUserId: 99,
        holdId: 500,
      });

      expect(result.hold.releasedAt).toEqual(released.releasedAt);
      // El instante de liberación lo asigna la base de datos, no el caso de uso.
      expect(mockAuditHoldsRepo.release).toHaveBeenCalledWith(1, 500, 99);
    });

    it("rechaza una retención inexistente o ajena al tenant", async () => {
      mockAuditHoldsRepo.release.mockResolvedValue({ outcome: "NOT_FOUND" });

      await expect(
        releaseUseCase.execute({ tenantId: 1, actorUserId: 99, holdId: 500 }),
      ).rejects.toThrow(AuditHoldNotFoundError);
    });

    it("rechaza una segunda liberación sin sobrescribir la original", async () => {
      mockAuditHoldsRepo.release.mockResolvedValue({
        outcome: "ALREADY_RELEASED",
        hold: {
          id: 500,
          tenantId: 1,
          affiliationId: 10,
          auditEventId: null,
          reason: "Revisión interna",
          requestedByUserId: 99,
          expiresAt: null,
          releasedAt: new Date("2026-03-01T10:00:00Z"),
          releasedByUserId: 99,
          createdAt: new Date("2026-02-01T00:00:00Z"),
          updatedAt: new Date("2026-03-01T10:00:00Z"),
        },
      });

      await expect(
        releaseUseCase.execute({ tenantId: 1, actorUserId: 99, holdId: 500 }),
      ).rejects.toThrow(AuditHoldAlreadyReleasedError);
    });

    it("bloquea a un actor que no es OWNER del tenant", async () => {
      mockMembershipChecker.getActiveMembership.mockResolvedValue({
        userId: 50,
        tenantId: 1,
        role: "MEMBER",
      });

      await expect(
        releaseUseCase.execute({ tenantId: 1, actorUserId: 50, holdId: 500 }),
      ).rejects.toThrow(UnauthorizedAffiliationActionError);

      expect(mockAuditHoldsRepo.release).not.toHaveBeenCalled();
    });
  });
});
