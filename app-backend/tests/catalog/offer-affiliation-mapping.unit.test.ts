/// ARCHIVO: tests/catalog/offer-affiliation-mapping.unit.test.ts
/// Pruebas unitarias de la clasificación de mappings de ofertas legacy a afiliación (D8, Etapa 2).
///
/// Verifican la regla de "prohibición de defaults mágicos": solo el caso unívoco (exactamente una
/// afiliación activa) propone una asignación; el resto exige decisión humana. No tocan base de
/// datos: la función es pura.

import { describe, expect, it } from "vitest";
import {
  classifyOfferAffiliationMapping,
  summarizeOfferAffiliationInventory,
  type ActiveAffiliationCandidate,
  type LegacyOfferRow,
} from "@/modules/catalog/infrastructure/legacy/offer-affiliation-mapping";

function legacyService(overrides: Partial<LegacyOfferRow> = {}): LegacyOfferRow {
  return {
    id: 1,
    name: "Consulta General",
    profileId: 10,
    affiliationId: null,
    ...overrides,
  };
}

function affiliation(affiliationId: number, tenantId: number): ActiveAffiliationCandidate {
  return { affiliationId, tenantId };
}

describe("classifyOfferAffiliationMapping — Etapa 2 de D8", () => {
  it("propone la afiliación cuando el profesional tiene exactamente una activa", () => {
    const decision = classifyOfferAffiliationMapping(legacyService(), [affiliation(7, 100)]);

    expect(decision.kind).toBe("UNIQUE");
    expect(decision.proposedAffiliationId).toBe(7);
    expect(decision.candidateAffiliationIds).toEqual([7]);
    expect(decision.currentAffiliationId).toBeNull();
  });

  it("marca AMBIGUOUS y no propone nada cuando hay más de una afiliación activa", () => {
    const decision = classifyOfferAffiliationMapping(legacyService(), [
      affiliation(9, 300),
      affiliation(3, 100),
    ]);

    expect(decision.kind).toBe("AMBIGUOUS");
    expect(decision.proposedAffiliationId).toBeNull();
    // Candidatos ordenados de forma estable para el reporte.
    expect(decision.candidateAffiliationIds).toEqual([3, 9]);
  });

  it("marca ORPHAN y no propone nada cuando no hay afiliaciones activas", () => {
    const decision = classifyOfferAffiliationMapping(legacyService(), []);

    expect(decision.kind).toBe("ORPHAN");
    expect(decision.proposedAffiliationId).toBeNull();
    expect(decision.candidateAffiliationIds).toEqual([]);
  });

  it("omite las ofertas ya vinculadas sin reasignarlas (idempotencia)", () => {
    const decision = classifyOfferAffiliationMapping(
      legacyService({ affiliationId: 5 }),
      [affiliation(5, 100), affiliation(6, 200)]
    );

    expect(decision.kind).toBe("ALREADY_MAPPED");
    expect(decision.proposedAffiliationId).toBe(5);
    expect(decision.currentAffiliationId).toBe(5);
  });

  it("no propone una afiliación distinta aunque la fila tenga una afiliación previa inactiva", () => {
    // La fila ya tiene vínculo: la clasificación nunca sugiere moverla a otra candidata activa.
    const decision = classifyOfferAffiliationMapping(
      legacyService({ affiliationId: 4 }),
      [affiliation(8, 100)]
    );

    expect(decision.kind).toBe("ALREADY_MAPPED");
    expect(decision.proposedAffiliationId).toBe(4);
    expect(decision.candidateAffiliationIds).toEqual([8]);
  });
});

describe("summarizeOfferAffiliationInventory — contabilidad del dry-run", () => {
  it("cuenta los tres baldes de aceptación y las decisiones humanas", () => {
    const decisions = [
      classifyOfferAffiliationMapping(legacyService({ id: 1 }), [affiliation(1, 100)]),
      classifyOfferAffiliationMapping(legacyService({ id: 2 }), [
        affiliation(1, 100),
        affiliation(2, 200),
      ]),
      classifyOfferAffiliationMapping(legacyService({ id: 3 }), []),
      classifyOfferAffiliationMapping(legacyService({ id: 4, affiliationId: 1 }), [
        affiliation(1, 100),
      ]),
    ];

    const summary = summarizeOfferAffiliationInventory(decisions);

    expect(summary.services).toBe(4);
    expect(summary.unique).toBe(1);
    expect(summary.ambiguous).toBe(1);
    expect(summary.orphan).toBe(1);
    expect(summary.alreadyMapped).toBe(1);
    expect(summary.requiresHumanDecision).toBe(2);
  });

  it("devuelve ceros ante un inventario vacío", () => {
    const summary = summarizeOfferAffiliationInventory([]);

    expect(summary).toEqual({
      services: 0,
      unique: 0,
      ambiguous: 0,
      orphan: 0,
      alreadyMapped: 0,
      requiresHumanDecision: 0,
    });
  });
});
