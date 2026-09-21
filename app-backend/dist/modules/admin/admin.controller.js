"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const professionalprofile_service_1 = require("../../modules/users/professionalprofile/professionalprofile.service");
class AdminController {
    static async reviewProfessionalProfile(req, res) {
        try {
            const profileId = Number(req.params.profileId);
            const { status } = req.body;
            if (!["APPROVED", "REJECTED"].includes(status)) {
                return res.status(400).json({
                    message: "Status inválido",
                });
            }
            const result = await professionalprofile_service_1.ProfessionalProfileService.reviewProfile(profileId, status);
            res.json({
                message: "Perfil revisado correctamente",
                profile: result,
            });
        }
        catch (error) {
            res.status(500).json({
                message: "Error al revisar perfil",
                error: error instanceof Error ? error.message : error,
            });
        }
    }
    static async getPendingProfiles(req, res) {
        try {
            const profiles = await professionalprofile_service_1.ProfessionalProfileService.getPendingProfiles();
            res.json(profiles);
        }
        catch (error) {
            res.status(500).json({
                message: "Error al obtener perfiles pendientes",
                error: error instanceof Error ? error.message : error,
            });
        }
    }
    static async getAllProfiles(req, res) {
        try {
            const profiles = await professionalprofile_service_1.ProfessionalProfileService.getAllProfiles();
            res.json(profiles);
        }
        catch (error) {
            res.status(500).json({
                message: "Error al obtener perfiles",
                error: error instanceof Error ? error.message : error,
            });
        }
    }
    static async setProfileStatus(req, res) {
        try {
            const profileId = Number(req.params.profileId);
            const { status } = req.body;
            if (!["APPROVED", "SUSPENDED"].includes(status)) {
                return res.status(400).json({
                    message: "Status inválido",
                });
            }
            const result = await professionalprofile_service_1.ProfessionalProfileService.setProfileStatus(profileId, status);
            res.json({
                message: "Estado del perfil actualizado correctamente",
                profile: result,
            });
        }
        catch (error) {
            res.status(500).json({
                message: "Error al actualizar estado del perfil",
                error: error instanceof Error ? error.message : error,
            });
        }
    }
}
exports.AdminController = AdminController;
