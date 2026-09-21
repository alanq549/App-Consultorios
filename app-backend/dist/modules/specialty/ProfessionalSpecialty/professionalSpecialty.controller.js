"use strict";
// src/modules/specialty/ProfessionalSpecialty/professionalSpecialty.controller.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfessionalSpecialtyController = void 0;
const ProfessionalSpecialty_Service_1 = require("./ProfessionalSpecialty.Service");
const prisma_1 = __importDefault(require("../../../core/prisma"));
class ProfessionalSpecialtyController {
    // profesional solicita una especialidad
    static async requestSpecialty(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    message: "Usuario no autenticado",
                });
            }
            const specialtyId = Number(req.params.specialtyId);
            if (isNaN(specialtyId)) {
                return res.status(400).json({
                    message: "specialtyId inválido",
                });
            }
            // 🔥 FIX IMPORTANTE: resolver ProfessionalProfile
            const professional = await prisma_1.default.professionalProfile.findUnique({
                where: { userId: req.user.id },
            });
            if (!professional) {
                return res.status(404).json({
                    message: "Perfil profesional no encontrado",
                });
            }
            const result = await ProfessionalSpecialty_Service_1.ProfessionalSpecialtyService.requestSpecialty(professional.id, // 👈 CORRECTO
            specialtyId);
            return res.status(201).json({
                message: "Solicitud de especialidad enviada",
                data: result,
            });
        }
        catch (error) {
            return res.status(400).json({
                message: error.message || "Error solicitando especialidad",
            });
        }
    }
    // admin aprueba / rechaza
    static async setStatus(req, res) {
        try {
            const professionalId = Number(req.params.professionalId);
            const specialtyId = Number(req.params.specialtyId);
            const { status } = req.body;
            if (isNaN(professionalId) || isNaN(specialtyId)) {
                return res.status(400).json({
                    message: "IDs inválidos",
                });
            }
            const result = await ProfessionalSpecialty_Service_1.ProfessionalSpecialtyService.setSpecialtyStatus(professionalId, specialtyId, status);
            return res.json({
                message: "Estado de especialidad actualizado",
                data: result,
            });
        }
        catch (error) {
            return res.status(400).json({
                message: error.message || "Error actualizando estado",
            });
        }
    }
}
exports.ProfessionalSpecialtyController = ProfessionalSpecialtyController;
