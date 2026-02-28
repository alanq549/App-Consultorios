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
}
exports.ProfessionalProfileController = ProfessionalProfileController;
