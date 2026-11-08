// src/modules/users/professionalprofile/professionalprofile.routes.ts
import { Router } from "express";
import type { RequestHandler } from "express";
import { ProfessionalProfileController } from "./professionalprofile.controller";
import { createUploader } from "@/core/storage/upload";
import { authMiddleware, authorizeRole } from "@/middlewares/auth.middleware";
import { ProfessionalSpecialtyController } from "@/modules/specialty/ProfessionalSpecialty/professionalSpecialty.controller";
import { requireRole } from "@/middlewares/role.middleware";
import { resolvePublicTenantMiddleware } from "@/modules/tenancy/http/resolve-public-tenant.middleware";
import { AppError } from "@/shared/errors/AppError";

const uploadCertificates = createUploader("certificates");
const router = Router();


const profileTenantNotFoundHandler: RequestHandler = (
  _req,
  _res,
  next,
) => {
  next(new AppError("Perfil profesional no encontrado", 404));
};

// Directorio público: requiere X-Tenant-ID, no authMiddleware.
router.get(
  "/Allprofiles",
  resolvePublicTenantMiddleware(),
  ProfessionalProfileController.getAllPublic,
);

// --------------------
// Social Links
// --------------------

router.post(
  "/social-links",
  authMiddleware,
  ProfessionalProfileController.createSocialLink,
);
router.patch(
  "/social-links/:id",
  authMiddleware,
  ProfessionalProfileController.updateSocialLink,
);
router.delete(
  "/social-links/:id",
  authMiddleware,
  ProfessionalProfileController.deleteSocialLink,
);

// --------------------
// Certificados
// --------------------

router.get(
  "/certificates/:id/download",
  authMiddleware,
  ProfessionalProfileController.downloadCertificate,
);
router.post(
  "/certificates",
  authMiddleware,
  uploadCertificates.single("file"),
  ProfessionalProfileController.uploadCertificate,
);
router.delete(
  "/certificates/:id",
  authMiddleware,
  ProfessionalProfileController.deleteCertificate,
);

/// speciality

router.patch(
  "/:professionalId/specialties/:specialtyId/status",
  authMiddleware,
  requireRole("ADMIN"),
  ProfessionalSpecialtyController.setStatus,
);
router.post(
  "/specialties/:specialtyId",
  authMiddleware,
  authorizeRole("PROFESSIONAL"),
  ProfessionalSpecialtyController.requestSpecialty
);

// --------------------
// Afiliaciones del Profesional
// --------------------
import professionalAffiliationRoutes from "@/modules/profiles/affiliations/http/professional-affiliations.routes";

router.use("/me/affiliations", professionalAffiliationRoutes);
router.use("/affiliations", professionalAffiliationRoutes);

// Mantener la ruta dinámica al final.
router.get(
  "/:id",
  resolvePublicTenantMiddleware(profileTenantNotFoundHandler),
  ProfessionalProfileController.getPublic,
);

export default router;
