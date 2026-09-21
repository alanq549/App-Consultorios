"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfessionalProfileController = void 0;
const professionalprofile_service_1 = require("./professionalprofile.service");
const professionalprofile_dto_1 = require("./professionalprofile.dto");
class ProfessionalProfileController {
    // obtener perfil profesional público por ID
    static async getPublic(req, res, next) {
        try {
            const { id } = professionalprofile_dto_1.GetProfessionalProfileParamsSchema.parse(req.params);
            const profile = await professionalprofile_service_1.ProfessionalProfileService.getPublicById(Number(id));
            if (!profile) {
                return res.status(404).json({
                    message: "Perfil profesional no encontrado",
                });
            }
            if (profile.verificationStatus !== "APPROVED") {
                return res.status(403).json({
                    message: "Perfil profesional no aprobado",
                });
            }
            res.json(profile);
        }
        catch (err) {
            next(err);
        }
    }
    static async getAllPublic(req, res, next) {
        try {
            const profiles = await professionalprofile_service_1.ProfessionalProfileService.getAllPublic();
            res.json(profiles);
        }
        catch (err) {
            next(err);
        }
    }
    // Crear socialLinks
    static async createSocialLink(req, res, next) {
        try {
            const data = professionalprofile_dto_1.CreateSocialLinkSchema.parse(req.body);
            const socialLink = await professionalprofile_service_1.ProfessionalProfileService.createSocialLink(req.user.id, data);
            res.status(201).json(socialLink);
        }
        catch (err) {
            next(err);
        }
    }
    // Actualizar socialLinks
    static async updateSocialLink(req, res, next) {
        try {
            const { id } = professionalprofile_dto_1.SocialLinkParamsSchema.parse(req.params);
            const data = professionalprofile_dto_1.UpdateSocialLinkSchema.parse(req.body);
            const socialLink = await professionalprofile_service_1.ProfessionalProfileService.updateSocialLink(req.user.id, Number(id), data);
            res.json(socialLink);
        }
        catch (err) {
            next(err);
        }
    }
    // Eliminar socialLinks:
    static async deleteSocialLink(req, res, next) {
        try {
            const { id } = professionalprofile_dto_1.SocialLinkParamsSchema.parse(req.params);
            const result = await professionalprofile_service_1.ProfessionalProfileService.deleteSocialLink(req.user.id, Number(id));
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    // Subir certificado (autenticado y con rol profesional)
    static async uploadCertificate(req, res) {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: "Archivo requerido" });
        }
        const data = professionalprofile_dto_1.CreateCertificateSchema.parse(req.body);
        const certificate = await professionalprofile_service_1.ProfessionalProfileService.createCertificate(req.user.id, {
            ...data,
            fileUrl: `/certificates/${file.filename}`,
        });
        res.json(certificate);
    }
    // Eliminar certificado:
    static async deleteCertificate(req, res, next) {
        try {
            const { id } = professionalprofile_dto_1.SocialLinkParamsSchema.parse(req.params);
            const result = await professionalprofile_service_1.ProfessionalProfileService.deleteCertificate(req.user.id, Number(id));
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ProfessionalProfileController = ProfessionalProfileController;
