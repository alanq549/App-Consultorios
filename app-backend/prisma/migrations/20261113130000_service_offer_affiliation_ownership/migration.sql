-- Fase 5 / Misión 3 (corrección P1) — Garantía profesional↔afiliación en la BD
--
-- Hallazgo P1: la FK simple `affiliationId -> ProfessionalTenantAffiliation(id)` validaba que la
-- afiliación existiera, pero NO que perteneciera al mismo profesional que `Service.profileId`. Dos
-- referencias válidas por separado podían vincular la oferta al profesional/tenant equivocado.
--
-- Corrección: FK COMPUESTA `(affiliationId, profileId) -> (id, professionalProfileId)`. Con MATCH
-- SIMPLE (semántica por defecto de PostgreSQL), cuando `affiliationId` es NULL el chequeo se omite,
-- de modo que las filas legacy pendientes de backfill siguen siendo válidas; cuando está poblado,
-- el motor exige que la afiliación pertenezca al mismo profesional.
--
-- El índice único `(id, professionalProfileId)` es redundante respecto de la PK `id`, pero es el
-- destino obligatorio de la FK compuesta (PostgreSQL 9.4+), por lo que no puede omitirse.
--
-- Plan de rollback (revierte a la FK simple anterior):
--   ALTER TABLE "Service" DROP CONSTRAINT "Service_affiliationId_profileId_fkey";
--   DROP INDEX "ProfessionalTenantAffiliation_id_professionalProfileId_key";
--   ALTER TABLE "Service" ADD CONSTRAINT "Service_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "ProfessionalTenantAffiliation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_affiliationId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalTenantAffiliation_id_professionalProfileId_key" ON "ProfessionalTenantAffiliation"("id", "professionalProfileId");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_affiliationId_profileId_fkey" FOREIGN KEY ("affiliationId", "profileId") REFERENCES "ProfessionalTenantAffiliation"("id", "professionalProfileId") ON DELETE RESTRICT ON UPDATE CASCADE;
