/// ARCHIVO: tests/profiles/profiles-affiliations/domain-state-machine.unit.test.ts

import { describe, expect, it } from "vitest";

import { AffiliationStateMachine } from "@/modules/profiles/affiliations/domain/affiliation-state-machine";
import {
  ReasonRequiredError,
  SelfReviewForbiddenError,
  UnauthorizedAffiliationActionError,
} from "@/modules/profiles/affiliations/domain/affiliation-errors";

describe("AffiliationStateMachine", () => {
  /**
   * Pruebas del ciclo de vida global de la afiliación (PENDING_REVIEW, ACTIVE, SUSPENDED, etc.)
   */
  describe("affiliation transitions", () => {
    // CASOS VÁLIDOS (ÉXITO)

    it("allows PENDING_REVIEW -> ACTIVE", () => {
      // Un revisor con autoridad OWNER aprueba la afiliación pendiente
      expect(
        AffiliationStateMachine.transition(
          "PENDING_REVIEW",
          "APPROVE_AFFILIATION",
          {
            applicantUserId: 10,
            actor: {
              userId: 20,
              authority: "OWNER",
            },
          },
        ),
      ).toBe("ACTIVE");
    });

    it("allows PENDING_REVIEW -> REJECTED with reason", () => {
      // Un revisor con autoridad OWNER rechaza la afiliación proporcionando un motivo
      expect(
        AffiliationStateMachine.transition(
          "PENDING_REVIEW",
          "REJECT_AFFILIATION",
          {
            applicantUserId: 10,
            actor: {
              userId: 20,
              authority: "OWNER",
            },
            reason: "Documentación insuficiente",
          },
        ),
      ).toBe("REJECTED");
    });

    it("allows PENDING_REVIEW -> WITHDRAW", () => {
      // El mismo solicitante (SELF) retira su propuesta pendiente expresando un motivo
      expect(
        AffiliationStateMachine.transition(
          "PENDING_REVIEW",
          "WITHDRAW",
          {
            applicantUserId: 10,
            actor: {
              userId: 10,
              authority: "SELF",
            },
            reason: "El profesional retiró la solicitud",
          },
        ),
      ).toBe("WITHDRAWN");
    });

    it("allows ACTIVE -> SUSPENDED with reason", () => {
      // Un administrador (OWNER) suspende una afiliación activa indicando el motivo
      expect(
        AffiliationStateMachine.transition(
          "ACTIVE",
          "SUSPEND",
          {
            applicantUserId: 10,
            actor: {
              userId: 20,
              authority: "OWNER",
            },
            reason: "Incumplimiento detectado",
          },
        ),
      ).toBe("SUSPENDED");
    });

    it("allows SUSPENDED -> ACTIVE", () => {
      // Un administrador (OWNER) reactiva una afiliación que estaba suspendida
      expect(
        AffiliationStateMachine.transition(
          "SUSPENDED",
          "REACTIVATE",
          {
            applicantUserId: 10,
            actor: {
              userId: 20,
              authority: "OWNER",
            },
          },
        ),
      ).toBe("ACTIVE");
    });

    it("allows REJECTED -> PENDING_REVIEW", () => {
      // El solicitante (SELF) reabre una solicitud anteriormente rechazada
      expect(
        AffiliationStateMachine.transition(
          "REJECTED",
          "REOPEN",
          {
            applicantUserId: 10,
            actor: {
              userId: 10,
              authority: "SELF",
            },
          },
        ),
      ).toBe("PENDING_REVIEW");
    });

    it("allows WITHDRAWN -> PENDING_REVIEW", () => {
      // El solicitante (SELF) reabre una solicitud previamente retirada
      expect(
        AffiliationStateMachine.transition(
          "WITHDRAWN",
          "REOPEN",
          {
            applicantUserId: 10,
            actor: {
              userId: 10,
              authority: "SELF",
            },
          },
        ),
      ).toBe("PENDING_REVIEW");
    });

    // CASOS INVÁLIDOS (RECHAZOS Y ERRORES)

    it("rejects ACTIVE -> APPROVE_AFFILIATION", () => {
      // Error: No se puede "aprobar" algo que ya está activo
      expect(() =>
        AffiliationStateMachine.transition(
          "ACTIVE",
          "APPROVE_AFFILIATION",
          {
            applicantUserId: 10,
            actor: {
              userId: 20,
              authority: "OWNER",
            },
          },
        ),
      ).toThrowError("no está permitida");
    });

    it("rejects self approval", () => {
      // Error de seguridad: El solicitante (10) no puede ser el evaluador (10) incluso con autoridad OWNER
      expect(() =>
        AffiliationStateMachine.transition(
          "PENDING_REVIEW",
          "APPROVE_AFFILIATION",
          {
            applicantUserId: 10,
            actor: {
              userId: 10,
              authority: "OWNER",
            },
          },
        ),
      ).toThrowError(SelfReviewForbiddenError);
    });

    it("rejects self rejection", () => {
      // Error de seguridad: El solicitante no puede rechazar formalmente su propia revisión
      expect(() =>
        AffiliationStateMachine.transition(
          "PENDING_REVIEW",
          "REJECT_AFFILIATION",
          {
            applicantUserId: 10,
            actor: {
              userId: 10,
              authority: "OWNER",
            },
            reason: "Rechazo",
          },
        ),
      ).toThrowError(SelfReviewForbiddenError);
    });

    it("requires reason for rejection", () => {
      // Error de validación: Rechazar sin justificación por escrito
      expect(() =>
        AffiliationStateMachine.transition(
          "PENDING_REVIEW",
          "REJECT_AFFILIATION",
          {
            applicantUserId: 10,
            actor: {
              userId: 20,
              authority: "OWNER",
            },
          },
        ),
      ).toThrowError(ReasonRequiredError);
    });

    it("requires reason for suspension", () => {
      // Error de validación: Suspender sin motivo explicativo
      expect(() =>
        AffiliationStateMachine.transition(
          "ACTIVE",
          "SUSPEND",
          {
            applicantUserId: 10,
            actor: {
              userId: 20,
              authority: "OWNER",
            },
          },
        ),
      ).toThrowError(ReasonRequiredError);
    });

    it("rejects ACTIVE -> ACTIVE because no such transition exists", () => {
      // Error: Intentar "reactivar" una afiliación que ya está en estado activo
      expect(() =>
        AffiliationStateMachine.transition(
          "ACTIVE",
          "REACTIVATE",
          {
            applicantUserId: 10,
            actor: {
              userId: 20,
              authority: "OWNER",
            },
          },
        ),
      ).toThrowError("no está permitida");
    });

    // CASOS ADICIONALES OBLIGATORIOS

    it("rejects MEMBER attempting to withdraw an affiliation", () => {
      expect(() =>
        AffiliationStateMachine.transition(
          "PENDING_REVIEW",
          "WITHDRAW",
          {
            applicantUserId: 10,
            actor: {
              userId: 30,
              authority: "MEMBER",
            },
          },
        ),
      ).toThrowError(UnauthorizedAffiliationActionError);
    });

    it("rejects MEMBER attempting to suspend an affiliation", () => {
      expect(() =>
        AffiliationStateMachine.transition(
          "ACTIVE",
          "SUSPEND",
          {
            applicantUserId: 10,
            actor: {
              userId: 30,
              authority: "MEMBER",
            },
            reason: "Motivo cualquiera",
          },
        ),
      ).toThrowError(UnauthorizedAffiliationActionError);
    });

    it("rejects MEMBER attempting to reactivate an affiliation", () => {
      expect(() =>
        AffiliationStateMachine.transition(
          "SUSPENDED",
          "REACTIVATE",
          {
            applicantUserId: 10,
            actor: {
              userId: 30,
              authority: "MEMBER",
            },
          },
        ),
      ).toThrowError(UnauthorizedAffiliationActionError);
    });

    it("rejects MEMBER attempting to approve an affiliation", () => {
      expect(() =>
        AffiliationStateMachine.transition(
          "PENDING_REVIEW",
          "APPROVE_AFFILIATION",
          {
            applicantUserId: 10,
            actor: {
              userId: 30,
              authority: "MEMBER",
            },
          },
        ),
      ).toThrowError(UnauthorizedAffiliationActionError);
    });

    it("allows SELF to withdraw their own affiliation without reason", () => {
      expect(
        AffiliationStateMachine.transition(
          "PENDING_REVIEW",
          "WITHDRAW",
          {
            applicantUserId: 10,
            actor: {
              userId: 10,
              authority: "SELF",
            },
          },
        ),
      ).toBe("WITHDRAWN");
    });

    it("rejects OWNER attempting to withdraw an affiliation without reason", () => {
      expect(() =>
        AffiliationStateMachine.transition(
          "PENDING_REVIEW",
          "WITHDRAW",
          {
            applicantUserId: 10,
            actor: {
              userId: 20,
              authority: "OWNER",
            },
          },
        ),
      ).toThrowError(ReasonRequiredError);
    });

    it("allows OWNER to withdraw an affiliation with reason", () => {
      expect(
        AffiliationStateMachine.transition(
          "PENDING_REVIEW",
          "WITHDRAW",
          {
            applicantUserId: 10,
            actor: {
              userId: 20,
              authority: "OWNER",
            },
            reason: "Retiro administrativo por incumplimiento de política local",
          },
        ),
      ).toBe("WITHDRAWN");
    });
  });

  /**
   * Pruebas del ciclo de vida de revisiones de contenido (APPROVED, REJECTED, SUPERSEDED, etc.)
   */
  describe("revision transitions", () => {
    // CASOS VÁLIDOS (ÉXITO)

    it("allows PENDING_REVIEW -> APPROVED", () => {
      // Aprobación válida del contenido por un revisor con rango OWNER
      expect(
        AffiliationStateMachine.transitionRevision(
          {
            submittedByUserId: 10,
            reviewerUserId: 20,
            reviewerAuthority: "OWNER",
            revisionStatus: "PENDING_REVIEW",
          },
          "APPROVE_CONTENT",
        ),
      ).toBe("APPROVED");
    });

    it("allows PENDING_REVIEW -> REJECTED with reason", () => {
      // Rechazo de contenido por un OWNER con su correspondiente observación
      expect(
        AffiliationStateMachine.transitionRevision(
          {
            submittedByUserId: 10,
            reviewerUserId: 20,
            reviewerAuthority: "OWNER",
            revisionStatus: "PENDING_REVIEW",
          },
          "REJECT_CONTENT",
          "Contenido inválido",
        ),
      ).toBe("REJECTED");
    });

    it("allows PENDING_REVIEW -> SUPERSEDED when author replaces pending revision", () => {
      // El contenido pendiente es reemplazado por un nuevo envío del mismo autor
      expect(
        AffiliationStateMachine.transitionRevision(
          {
            submittedByUserId: 10,
            reviewerUserId: 10,
            reviewerAuthority: "SELF",
            revisionStatus: "PENDING_REVIEW",
          },
          "SUPERSEDE_CONTENT",
        ),
      ).toBe("SUPERSEDED");
    });

    // CASOS INVÁLIDOS (RECHAZOS Y ERRORES)

    it("rejects self approval of content", () => {
      // Error de seguridad: Un usuario no puede aprobar sus propios textos/propuestas incluso como OWNER
      expect(() =>
        AffiliationStateMachine.transitionRevision(
          {
            submittedByUserId: 10,
            reviewerUserId: 10,
            reviewerAuthority: "OWNER",
            revisionStatus: "PENDING_REVIEW",
          },
          "APPROVE_CONTENT",
        ),
      ).toThrowError(SelfReviewForbiddenError);
    });

    it("rejects self rejection of content", () => {
      // Error de seguridad: Tampoco se permite el auto-rechazo
      expect(() =>
        AffiliationStateMachine.transitionRevision(
          {
            submittedByUserId: 10,
            reviewerUserId: 10,
            reviewerAuthority: "OWNER",
            revisionStatus: "PENDING_REVIEW",
          },
          "REJECT_CONTENT",
          "Contenido inválido",
        ),
      ).toThrowError(SelfReviewForbiddenError);
    });

    it("requires reason when rejecting content", () => {
      // Error de validación: Falta la razón del rechazo del contenido
      expect(() =>
        AffiliationStateMachine.transitionRevision(
          {
            submittedByUserId: 10,
            reviewerUserId: 20,
            reviewerAuthority: "OWNER",
            revisionStatus: "PENDING_REVIEW",
          },
          "REJECT_CONTENT",
        ),
      ).toThrowError(ReasonRequiredError);
    });

    it("rejects approval of an obsolete revision", () => {
      // Error: Intentar evaluar una revisión que ya fue anulada/reemplazada (SUPERSEDED)
      expect(() =>
        AffiliationStateMachine.transitionRevision(
          {
            submittedByUserId: 10,
            reviewerUserId: 20,
            reviewerAuthority: "OWNER",
            revisionStatus: "SUPERSEDED",
          },
          "APPROVE_CONTENT",
        ),
      ).toThrowError("ya no está pendiente");
    });

    it("rejects approval of an already approved revision", () => {
      // Error: Intentar volver a aprobar un contenido que ya estaba previamente aprobado
      expect(() =>
        AffiliationStateMachine.transitionRevision(
          {
            submittedByUserId: 10,
            reviewerUserId: 20,
            reviewerAuthority: "OWNER",
            revisionStatus: "APPROVED",
          },
          "APPROVE_CONTENT",
        ),
      ).toThrowError("ya no está pendiente");
    });

    // CASOS ADICIONALES OBLIGATORIOS PARA REVISIÓN

    it("allows author to supersede pending revision", () => {
      expect(
        AffiliationStateMachine.transitionRevision(
          {
            submittedByUserId: 10,
            reviewerUserId: 10,
            reviewerAuthority: "SELF",
            revisionStatus: "PENDING_REVIEW",
          },
          "SUPERSEDE_CONTENT",
        ),
      ).toBe("SUPERSEDED");
    });

    it("rejects another actor attempting to supersede a revision", () => {
      expect(() =>
        AffiliationStateMachine.transitionRevision(
          {
            submittedByUserId: 10,
            reviewerUserId: 20,
            reviewerAuthority: "OWNER",
            revisionStatus: "PENDING_REVIEW",
          },
          "SUPERSEDE_CONTENT",
        ),
      ).toThrowError(UnauthorizedAffiliationActionError);
    });

    /// pruebas negativas de seguridad: un MEMBER no puede aprobar ni rechazar contenido
    it("rejects SELF withdrawing another professional's affiliation", () => {
      expect(() =>
        AffiliationStateMachine.transition(
          "ACTIVE",
          "WITHDRAW",
          {
            applicantUserId: 10,
            actor: {
              userId: 20,
              authority: "SELF",
            },
          },
        ),
      ).toThrowError(UnauthorizedAffiliationActionError);
    });

    it("rejects SELF reopening another professional's rejected affiliation", () => {
      expect(() =>
        AffiliationStateMachine.transition(
          "REJECTED",
          "REOPEN",
          {
            applicantUserId: 10,
            actor: {
              userId: 20,
              authority: "SELF",
            },
          },
        ),
      ).toThrowError(UnauthorizedAffiliationActionError);
    });

    it("rejects OWNER reopening a rejected affiliation", () => {
      expect(() =>
        AffiliationStateMachine.transition(
          "REJECTED",
          "REOPEN",
          {
            applicantUserId: 10,
            actor: {
              userId: 20,
              authority: "OWNER",
            },
          },
        ),
      ).toThrowError(UnauthorizedAffiliationActionError);
    });
  }); 
});