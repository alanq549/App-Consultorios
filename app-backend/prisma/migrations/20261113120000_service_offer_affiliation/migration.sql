-- Fase 5 / Misión 3 — Oferta por afiliación (D3, D8)
--
-- Migración ADITIVA y no destructiva de datos:
--   * Agrega `Service.affiliationId` como columna NULLABLE (las filas legacy quedan con NULL).
--   * Crea el índice e la unicidad por afiliación.
--   * Reemplaza la unicidad legacy `@@unique([profileId, name])` por `@@unique([affiliationId, name])`.
--   * Agrega la FK a `ProfessionalTenantAffiliation` con ON DELETE RESTRICT.
--
-- NO se ejecuta backfill aquí: la asignación de afiliación a las filas legacy requiere el
-- inventario/mapping aprobado de D8 (ver
-- src/modules/catalog/infrastructure/legacy/offer-affiliation-backfill.ts).
-- Hasta que ese mapping se aplique y se verifique que ninguna fila queda con affiliationId NULL,
-- NO debe emitirse la migración que lo hace NOT NULL ni la que retira `profileId`.
--
-- Plan de rollback (revertir sin pérdida de datos originales):
--   ALTER TABLE "Service" DROP CONSTRAINT "Service_affiliationId_fkey";
--   DROP INDEX "Service_affiliationId_name_key";
--   DROP INDEX "Service_affiliationId_specialtyId_idx";
--   ALTER TABLE "Service" DROP COLUMN "affiliationId";
--   CREATE UNIQUE INDEX "Service_profileId_name_key" ON "Service"("profileId", "name");
-- El rollback solo es válido mientras no existan ofertas cuyo único vínculo sea `affiliationId`
-- (es decir, antes de la etapa que retira `profileId`).

-- DropIndex
DROP INDEX "Service_profileId_name_key";

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "affiliationId" INTEGER;

-- CreateIndex
CREATE INDEX "Service_affiliationId_specialtyId_idx" ON "Service"("affiliationId", "specialtyId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_affiliationId_name_key" ON "Service"("affiliationId", "name");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "ProfessionalTenantAffiliation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
