"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCertificateSchema = exports.SocialLinkParamsSchema = exports.UpdateSocialLinkSchema = exports.CreateSocialLinkSchema = exports.UpdateProfessionalProfileSchema = exports.SocialLinkSchema = exports.GetProfessionalProfileParamsSchema = void 0;
// src/modules/users/professionalprofile/professionalprofile.dto.ts
const zod_1 = require("zod");
exports.GetProfessionalProfileParamsSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^\d+$/, "ID inválido"),
});
const SocialTypeEnum = zod_1.z.enum([
    "FACEBOOK",
    "INSTAGRAM",
    "LINKEDIN",
    "WEBSITE"
]);
exports.SocialLinkSchema = zod_1.z.object({
    type: SocialTypeEnum,
    url: zod_1.z.string().url("URL inválida")
});
exports.UpdateProfessionalProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
});
// DTO para las redes sociales
exports.CreateSocialLinkSchema = zod_1.z.object({
    type: SocialTypeEnum,
    url: zod_1.z.string().url("URL inválida"),
});
exports.UpdateSocialLinkSchema = zod_1.z.object({
    url: zod_1.z.string().url("URL inválida"),
});
exports.SocialLinkParamsSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^\d+$/, "ID inválido"),
});
/// dto para crear un certificado
exports.CreateCertificateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "El nombre es obligatorio"),
    issuedBy: zod_1.z.string().min(1, "La institución emisora es obligatoria"),
    issuedDate: zod_1.z
        .coerce
        .date()
        .refine((date) => !isNaN(date.getTime()), {
        message: "Fecha inválida"
    })
});
