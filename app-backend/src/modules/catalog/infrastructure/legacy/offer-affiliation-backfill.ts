/// ARCHIVO: src/modules/catalog/infrastructure/legacy/offer-affiliation-backfill.ts
/// Inventario, dry-run y aplicación del backfill de ofertas legacy a su afiliación (D8, Misión 3).
///
/// Etapa 1–3 de D8:
///   1. Inventario: audita todas las filas de `Service` y las afiliaciones **activas** de sus
///      respectivos profesionales.
///   2. Clasificación unívoco vs ambiguo (delegada a `offer-affiliation-mapping.ts`).
///   3. Aplicación: solo tras aprobación humana del reporte. Es idempotente y rechaza cualquier
///      entrada que no corresponda a una afiliación activa del mismo profesional, de modo que
///      nunca se asigna un tenant por defecto.
///
/// Uso (dry-run, por defecto — no escribe nada):
///   npx ts-node-dev --files -r dotenv/config -r tsconfig-paths/register \
///     src/modules/catalog/infrastructure/legacy/offer-affiliation-backfill.ts
///
/// Uso (aplicar un mapping ya aprobado):
///   ... offer-affiliation-backfill.ts --apply ./mapping-aprobado.json
/// El archivo de mapping es un JSON: [{ "serviceId": 12, "affiliationId": 3 }, ...]

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import prisma from "@/shared/database/prisma";
import {
  classifyOfferAffiliationMapping,
  summarizeOfferAffiliationInventory,
  type ActiveAffiliationCandidate,
  type LegacyOfferRow,
  type OfferAffiliationInventoryReport,
} from "./offer-affiliation-mapping";

/** Mapeo aprobado explícitamente por un humano para una oferta legacy concreta. */
export interface OfferAffiliationMappingEntry {
  serviceId: number;
  affiliationId: number;
}

export interface ApplyOfferAffiliationMappingsResult {
  applied: number;
  skipped: number;
  rejected: Array<{ serviceId: number; reason: string }>;
}

/**
 * Construye el reporte de dry-run: lee todas las ofertas y las afiliaciones activas de sus
 * profesionales y clasifica cada fila. No escribe en la base de datos.
 */
export async function buildOfferAffiliationInventory(
  db: PrismaClient = prisma
): Promise<OfferAffiliationInventoryReport> {
  const services: LegacyOfferRow[] = await db.service.findMany({
    select: { id: true, name: true, profileId: true, affiliationId: true },
    orderBy: { id: "asc" },
  });

  const profileIds = Array.from(new Set(services.map((service) => service.profileId)));

  const activeAffiliations = profileIds.length
    ? await db.professionalTenantAffiliation.findMany({
        where: {
          professionalProfileId: { in: profileIds },
          status: "ACTIVE",
        },
        select: { id: true, tenantId: true, professionalProfileId: true },
        orderBy: { id: "asc" },
      })
    : [];

  const candidatesByProfile = new Map<number, ActiveAffiliationCandidate[]>();
  for (const affiliation of activeAffiliations) {
    const candidates = candidatesByProfile.get(affiliation.professionalProfileId) ?? [];
    candidates.push({ affiliationId: affiliation.id, tenantId: affiliation.tenantId });
    candidatesByProfile.set(affiliation.professionalProfileId, candidates);
  }

  const decisions = services.map((service) =>
    classifyOfferAffiliationMapping(service, candidatesByProfile.get(service.profileId) ?? [])
  );

  return { decisions, summary: summarizeOfferAffiliationInventory(decisions) };
}

/**
 * Aplica mappings aprobados. Antes de escribir, cada entrada se valida contra la base:
 *   - la oferta debe existir;
 *   - la afiliación debe existir y estar `ACTIVE`;
 *   - la afiliación debe pertenecer al mismo profesional que la oferta.
 * Las entradas que fallan se rechazan sin escribir. La escritura usa `updateMany` condicionado a
 * `affiliationId: null`, por lo que reejecutar un mapping ya aplicado no lo sobrescribe
 * (idempotencia) ni reasigna ofertas ya vinculadas.
 */
export async function applyOfferAffiliationMappingEntries(
  entries: readonly OfferAffiliationMappingEntry[],
  db: PrismaClient = prisma
): Promise<ApplyOfferAffiliationMappingsResult> {
  const result: ApplyOfferAffiliationMappingsResult = {
    applied: 0,
    skipped: 0,
    rejected: [],
  };

  for (const entry of entries) {
    const service = await db.service.findUnique({
      where: { id: entry.serviceId },
      select: { id: true, profileId: true, affiliationId: true },
    });

    if (!service) {
      result.rejected.push({
        serviceId: entry.serviceId,
        reason: "La oferta no existe.",
      });
      continue;
    }

    if (service.affiliationId !== null) {
      result.skipped += 1;
      continue;
    }

    const affiliation = await db.professionalTenantAffiliation.findUnique({
      where: { id: entry.affiliationId },
      select: { id: true, professionalProfileId: true, status: true },
    });

    if (!affiliation) {
      result.rejected.push({
        serviceId: entry.serviceId,
        reason: `La afiliación ${entry.affiliationId} no existe.`,
      });
      continue;
    }

    if (affiliation.status !== "ACTIVE") {
      result.rejected.push({
        serviceId: entry.serviceId,
        reason: `La afiliación ${entry.affiliationId} no está ACTIVE (estado actual: ${affiliation.status}).`,
      });
      continue;
    }

    if (affiliation.professionalProfileId !== service.profileId) {
      result.rejected.push({
        serviceId: entry.serviceId,
        reason: `La afiliación ${entry.affiliationId} pertenece a otro profesional.`,
      });
      continue;
    }

    const update = await db.service.updateMany({
      where: { id: entry.serviceId, affiliationId: null },
      data: { affiliationId: entry.affiliationId },
    });

    if (update.count === 1) {
      result.applied += 1;
    } else {
      result.skipped += 1;
    }
  }

  return result;
}

function printInventory(report: OfferAffiliationInventoryReport): void {
  const { summary } = report;

  console.log("── Dry-run: inventario de ofertas legacy → afiliación (D8) ──");
  console.log(`Total de ofertas auditadas: ${summary.services}`);
  console.log(`  · Se mapearán (afiliación activa única): ${summary.unique}`);
  console.log(`  · Ya vinculadas (se omiten):             ${summary.alreadyMapped}`);
  console.log(`  · Ambiguas (varias afiliaciones):        ${summary.ambiguous}`);
  console.log(`  · Huérfanas (sin afiliación activa):     ${summary.orphan}`);
  console.log(`  · Requieren decisión humana:             ${summary.requiresHumanDecision}`);
  console.log("");
  console.log("No se escribió nada. Para aplicar, genere un mapping aprobado y use --apply.");

  const humanDecisions = report.decisions.filter(
    (decision) => decision.kind === "AMBIGUOUS" || decision.kind === "ORPHAN"
  );

  if (humanDecisions.length > 0) {
    console.log("");
    console.log("Ofertas que requieren decisión humana:");
    for (const decision of humanDecisions) {
      console.log(
        `  · servicio ${decision.serviceId} ("${decision.serviceName}", profesional ${decision.profileId}): ${decision.reason}`
      );
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const applyIndex = args.indexOf("--apply");

  if (applyIndex === -1) {
    const report = await buildOfferAffiliationInventory();
    printInventory(report);
    return;
  }

  const mappingPath = args[applyIndex + 1];
  if (!mappingPath) {
    throw new Error(
      'Uso: --apply <ruta-mapping.json>, con [{ "serviceId": number, "affiliationId": number }]'
    );
  }

  const entries = JSON.parse(
    readFileSync(mappingPath, "utf8")
  ) as OfferAffiliationMappingEntry[];

  const result = await applyOfferAffiliationMappingEntries(entries);

  console.log("── Backfill aplicado ──");
  console.log(`Aplicados: ${result.applied}`);
  console.log(`Omitidos (ya vinculados): ${result.skipped}`);
  console.log(`Rechazados: ${result.rejected.length}`);

  for (const rejection of result.rejected) {
    console.log(`  · servicio ${rejection.serviceId}: ${rejection.reason}`);
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("[offer-affiliation-backfill] Falló:", error);
      process.exitCode = 1;
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}
