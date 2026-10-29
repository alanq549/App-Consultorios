-- CreateTable
CREATE TABLE "ProfessionalAffiliationAuditHold" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "affiliationId" INTEGER,
    "auditEventId" INTEGER,
    "reason" TEXT NOT NULL,
    "requestedByUserId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "releasedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalAffiliationAuditHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfessionalAffiliationAuditHold_tenantId_affiliationId_idx" ON "ProfessionalAffiliationAuditHold"("tenantId", "affiliationId");

-- CreateIndex
CREATE INDEX "ProfessionalAffiliationAuditHold_auditEventId_idx" ON "ProfessionalAffiliationAuditHold"("auditEventId");

-- CreateIndex
CREATE INDEX "ProfessionalAffiliationAuditHold_expiresAt_releasedAt_idx" ON "ProfessionalAffiliationAuditHold"("expiresAt", "releasedAt");

-- AddCheckConstraint (invariantes no expresables en el esquema Prisma)
-- Un evento específico siempre exige declarar su afiliación.
ALTER TABLE "ProfessionalAffiliationAuditHold"
    ADD CONSTRAINT "ProfessionalAffiliationAuditHold_scope_check"
    CHECK ("auditEventId" IS NULL OR "affiliationId" IS NOT NULL);

-- La liberación y su actor van siempre emparejados: ambos nulos o ambos presentes.
ALTER TABLE "ProfessionalAffiliationAuditHold"
    ADD CONSTRAINT "ProfessionalAffiliationAuditHold_release_actor_check"
    CHECK (
        ("releasedAt" IS NULL AND "releasedByUserId" IS NULL)
        OR ("releasedAt" IS NOT NULL AND "releasedByUserId" IS NOT NULL)
    );

-- Una retención no puede liberarse antes de haber sido creada.
ALTER TABLE "ProfessionalAffiliationAuditHold"
    ADD CONSTRAINT "ProfessionalAffiliationAuditHold_release_after_created_check"
    CHECK ("releasedAt" IS NULL OR "releasedAt" >= "createdAt");

-- AddForeignKey
ALTER TABLE "ProfessionalAffiliationAuditHold" ADD CONSTRAINT "ProfessionalAffiliationAuditHold_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalAffiliationAuditHold" ADD CONSTRAINT "ProfessionalAffiliationAuditHold_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "ProfessionalTenantAffiliation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalAffiliationAuditHold" ADD CONSTRAINT "ProfessionalAffiliationAuditHold_auditEventId_fkey" FOREIGN KEY ("auditEventId") REFERENCES "ProfessionalAffiliationAuditEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalAffiliationAuditHold" ADD CONSTRAINT "ProfessionalAffiliationAuditHold_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalAffiliationAuditHold" ADD CONSTRAINT "ProfessionalAffiliationAuditHold_releasedByUserId_fkey" FOREIGN KEY ("releasedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
