/// ARCHIVO: src/modules/profiles/index.ts
/// Frontera pública y exportaciones de contratos del contexto Profiles.

export type { ActiveAffiliationChecker } from "./affiliations/application/ports/active-affiliation-checker";
export { PrismaActiveAffiliationChecker } from "./affiliations/infrastructure/prisma/prisma-active-affiliation-checker";

export type { ProfilesEligibilityContract } from "./application/ports/profiles-eligibility-contract.port";
export { PrismaProfilesEligibilityService } from "./infrastructure/prisma/prisma-profiles-eligibility-service";
