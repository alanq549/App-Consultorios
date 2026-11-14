/// ARCHIVO: src/modules/catalog/infrastructure/legacy/offer-affiliation-mapping.ts
/// Lógica pura de clasificación de mappings de ofertas legacy a afiliación (D8, Etapa 2).
///
/// No depende de Prisma ni de red: recibe las filas ya leídas y decide en qué balde cae cada
/// servicio. Mantener la decisión como función pura hace que el inventario sea reproducible y
/// verificable sin base de datos, y que la regla de "prohibición de defaults mágicos" de D8
/// (nada se auto-asigna salvo el caso unívoco) sea auditable de forma aislada.

/** Fila mínima de `Service` requerida para clasificar el mapping de su afiliación. */
export interface LegacyOfferRow {
  id: number;
  name: string;
  profileId: number;
  affiliationId: number | null;
}

/** Afiliación activa de un profesional, candidata a recibir la oferta en el backfill. */
export interface ActiveAffiliationCandidate {
  affiliationId: number;
  tenantId: number;
}

/** Afiliación actualmente referenciada por una oferta, resuelta desde la base de datos. */
export interface CurrentAffiliationRef {
  affiliationId: number;
  professionalProfileId: number;
}

/**
 * Baldes de la Etapa 2 de D8:
 * - `UNIQUE`: el profesional tiene exactamente una afiliación activa → mapping propuesto seguro.
 * - `AMBIGUOUS`: tiene más de una afiliación activa → requiere decisión humana explícita.
 * - `ORPHAN`: no tiene ninguna afiliación activa → requiere decisión humana explícita.
 * - `ALREADY_MAPPED`: la oferta ya está vinculada a una afiliación de **su propio** profesional →
 *   se omite, garantizando un apply idempotente.
 * - `INCONSISTENT`: la oferta referencia una afiliación que no pertenece a su profesional (o que
 *   no existe). Es un **error** que requiere corrección humana, no un vínculo válido.
 */
export type OfferAffiliationMappingKind =
  | "UNIQUE"
  | "AMBIGUOUS"
  | "ORPHAN"
  | "ALREADY_MAPPED"
  | "INCONSISTENT";

/** Decisión de mapping para una oferta legacy concreta. */
export interface OfferAffiliationMappingDecision {
  serviceId: number;
  serviceName: string;
  profileId: number;
  kind: OfferAffiliationMappingKind;
  /** Afiliación ya presente en la fila (o `null` si es legacy sin vínculo). */
  currentAffiliationId: number | null;
  /** Afiliación propuesta; solo no nula en `UNIQUE` y `ALREADY_MAPPED`. */
  proposedAffiliationId: number | null;
  /** Afiliaciones activas del profesional, ordenadas de forma estable para el reporte. */
  candidateAffiliationIds: number[];
  reason: string;
}

/**
 * Clasifica una oferta legacy según las afiliaciones activas de su profesional y el vínculo que
 * la fila ya tenga.
 *
 * - Si la oferta ya referencia una afiliación, se verifica que dicha afiliación pertenezca al
 *   **mismo** profesional; si no corresponde (o no existe), se marca `INCONSISTENT` (error).
 * - Si no tiene afiliación, se propone un mapping solo cuando hay exactamente una afiliación activa
 *   (`UNIQUE`); con cero o más de una candidata la decisión es humana (D8, Etapa 2), y
 *   `proposedAffiliationId` queda en `null`.
 *
 * `currentAffiliation` debe ser la afiliación referenciada por `service.affiliationId` resuelta
 * desde la base (o `null` si la oferta no referencia ninguna o la referencia está rota).
 */
export function classifyOfferAffiliationMapping(
  service: LegacyOfferRow,
  activeAffiliations: readonly ActiveAffiliationCandidate[],
  currentAffiliation: CurrentAffiliationRef | null
): OfferAffiliationMappingDecision {
  const candidateAffiliationIds = activeAffiliations
    .map((affiliation) => affiliation.affiliationId)
    .sort((left, right) => left - right);

  const base = {
    serviceId: service.id,
    serviceName: service.name,
    profileId: service.profileId,
    currentAffiliationId: service.affiliationId,
    candidateAffiliationIds,
  };

  if (service.affiliationId !== null) {
    if (
      currentAffiliation !== null &&
      currentAffiliation.professionalProfileId === service.profileId
    ) {
      return {
        ...base,
        kind: "ALREADY_MAPPED",
        proposedAffiliationId: service.affiliationId,
        reason:
          "La oferta ya está vinculada a una afiliación de su propio profesional; se omite para mantener el apply idempotente.",
      };
    }

    return {
      ...base,
      kind: "INCONSISTENT",
      proposedAffiliationId: null,
      reason:
        currentAffiliation === null
          ? `La oferta referencia la afiliación ${service.affiliationId}, que no existe; requiere corrección humana.`
          : `La oferta referencia la afiliación ${service.affiliationId}, que pertenece a otro profesional; requiere corrección humana.`,
    };
  }

  if (activeAffiliations.length === 1) {
    return {
      ...base,
      kind: "UNIQUE",
      proposedAffiliationId: candidateAffiliationIds[0],
      reason:
        "El profesional tiene exactamente una afiliación activa; mapping propuesto unívoco.",
    };
  }

  if (activeAffiliations.length > 1) {
    return {
      ...base,
      kind: "AMBIGUOUS",
      proposedAffiliationId: null,
      reason: `El profesional tiene ${activeAffiliations.length} afiliaciones activas; requiere decisión humana.`,
    };
  }

  return {
    ...base,
    kind: "ORPHAN",
    proposedAffiliationId: null,
    reason: "El profesional no tiene afiliaciones activas; requiere decisión humana.",
  };
}

/** Contabilización del dry-run: qué se creará, qué se omitirá y qué exige decisión humana. */
export interface OfferAffiliationInventorySummary {
  services: number;
  unique: number;
  ambiguous: number;
  orphan: number;
  alreadyMapped: number;
  /** Vínculos existentes que no corresponden al profesional de la oferta: errores a corregir. */
  inconsistent: number;
  requiresHumanDecision: number;
}

export interface OfferAffiliationInventoryReport {
  decisions: OfferAffiliationMappingDecision[];
  summary: OfferAffiliationInventorySummary;
}

/**
 * Resume las decisiones del inventario. Los vínculos `INCONSISTENT` son errores y, junto con los
 * casos `AMBIGUOUS` y `ORPHAN`, quedan contabilizados como pendientes de decisión humana.
 */
export function summarizeOfferAffiliationInventory(
  decisions: readonly OfferAffiliationMappingDecision[]
): OfferAffiliationInventorySummary {
  const summary: OfferAffiliationInventorySummary = {
    services: decisions.length,
    unique: 0,
    ambiguous: 0,
    orphan: 0,
    alreadyMapped: 0,
    inconsistent: 0,
    requiresHumanDecision: 0,
  };

  for (const decision of decisions) {
    switch (decision.kind) {
      case "UNIQUE":
        summary.unique += 1;
        break;
      case "AMBIGUOUS":
        summary.ambiguous += 1;
        break;
      case "ORPHAN":
        summary.orphan += 1;
        break;
      case "ALREADY_MAPPED":
        summary.alreadyMapped += 1;
        break;
      case "INCONSISTENT":
        summary.inconsistent += 1;
        break;
    }
  }

  summary.requiresHumanDecision = summary.ambiguous + summary.orphan + summary.inconsistent;
  return summary;
}
