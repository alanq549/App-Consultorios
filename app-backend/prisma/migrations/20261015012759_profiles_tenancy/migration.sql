-- CreateEnum
CREATE TYPE "ProfessionalAffiliationStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AffiliationRevisionStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AffiliationAuditAction" AS ENUM ('APPLY', 'SUBMIT_CONTENT', 'SUPERSEDE_CONTENT', 'APPROVE_AFFILIATION', 'REJECT_AFFILIATION', 'APPROVE_CONTENT', 'REJECT_CONTENT', 'SUSPEND', 'REACTIVATE', 'WITHDRAW', 'REOPEN', 'BACKFILL');

-- AlterEnum
ALTER TYPE "TenantStatus" ADD VALUE 'INACTIVE';

-- CreateTable
CREATE TABLE "ProfessionalTenantAffiliation" (
    "id" SERIAL NOT NULL,
    "professionalProfileId" INTEGER NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "status" "ProfessionalAffiliationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalTenantAffiliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalAffiliationRevision" (
    "id" SERIAL NOT NULL,
    "affiliationId" INTEGER NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "status" "AffiliationRevisionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "description" TEXT NOT NULL,
    "submittedByUserId" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedByUserId" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalAffiliationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalAffiliationRevisionSocialLink" (
    "id" SERIAL NOT NULL,
    "revisionId" INTEGER NOT NULL,
    "type" "SocialType" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalAffiliationRevisionSocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalAffiliationAuditEvent" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "affiliationId" INTEGER NOT NULL,
    "revisionId" INTEGER,
    "actorUserId" INTEGER,
    "action" "AffiliationAuditAction" NOT NULL,
    "previousStatus" "ProfessionalAffiliationStatus",
    "nextStatus" "ProfessionalAffiliationStatus",
    "reason" TEXT,
    "changedFields" JSONB,
    "sourceReference" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalAffiliationAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfessionalTenantAffiliation_tenantId_status_idx" ON "ProfessionalTenantAffiliation"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ProfessionalTenantAffiliation_professionalProfileId_status_idx" ON "ProfessionalTenantAffiliation"("professionalProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalTenantAffiliation_professionalProfileId_tenantI_key" ON "ProfessionalTenantAffiliation"("professionalProfileId", "tenantId");

-- CreateIndex
CREATE INDEX "ProfessionalAffiliationRevision_affiliationId_status_idx" ON "ProfessionalAffiliationRevision"("affiliationId", "status");

-- CreateIndex
CREATE INDEX "ProfessionalAffiliationRevision_status_submittedAt_idx" ON "ProfessionalAffiliationRevision"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalAffiliationRevision_affiliationId_revisionNumbe_key" ON "ProfessionalAffiliationRevision"("affiliationId", "revisionNumber");

-- CreateIndex
CREATE INDEX "ProfessionalAffiliationRevisionSocialLink_revisionId_idx" ON "ProfessionalAffiliationRevisionSocialLink"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalAffiliationRevisionSocialLink_revisionId_type_key" ON "ProfessionalAffiliationRevisionSocialLink"("revisionId", "type");

-- CreateIndex
CREATE INDEX "ProfessionalAffiliationAuditEvent_tenantId_affiliationId_oc_idx" ON "ProfessionalAffiliationAuditEvent"("tenantId", "affiliationId", "occurredAt");

-- CreateIndex
CREATE INDEX "ProfessionalAffiliationAuditEvent_actorUserId_occurredAt_idx" ON "ProfessionalAffiliationAuditEvent"("actorUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "ProfessionalAffiliationAuditEvent_createdAt_idx" ON "ProfessionalAffiliationAuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "ProfessionalTenantAffiliation" ADD CONSTRAINT "ProfessionalTenantAffiliation_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalTenantAffiliation" ADD CONSTRAINT "ProfessionalTenantAffiliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalAffiliationRevision" ADD CONSTRAINT "ProfessionalAffiliationRevision_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "ProfessionalTenantAffiliation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalAffiliationRevision" ADD CONSTRAINT "ProfessionalAffiliationRevision_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalAffiliationRevision" ADD CONSTRAINT "ProfessionalAffiliationRevision_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalAffiliationRevisionSocialLink" ADD CONSTRAINT "ProfessionalAffiliationRevisionSocialLink_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ProfessionalAffiliationRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
