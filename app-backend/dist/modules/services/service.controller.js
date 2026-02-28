"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceController = void 0;
const service_service_1 = require("./service.service");
const service_dto_1 = require("./service.dto");
const prisma_1 = __importDefault(require("@/core/prisma"));
class ServiceController {
    static async create(req, res, next) {
        try {
            // 1️⃣ Obtener el professionalProfile real
            const professionalProfile = await prisma_1.default.professionalProfile.findUnique({
                where: { userId: req.user.id },
            });
            if (!professionalProfile) {
                throw new Error("Perfil profesional no existe");
            }
            // 2️⃣ Validar datos
            const data = service_dto_1.CreateServiceSchema.parse(req.body);
            // 3️⃣ Crear servicio
            const service = await service_service_1.ServiceService.create(professionalProfile.id, data);
            res.status(201).json(service);
        }
        catch (err) {
            next(err);
        }
    }
    static async listByProfessional(req, res, next) {
        try {
            const profileId = Number(req.params.profileId);
            const services = await service_service_1.ServiceService.findByProfessional(profileId);
            res.json(services);
        }
        catch (err) {
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const id = Number(req.params.id);
            const data = service_dto_1.UpdateServiceSchema.parse(req.body);
            const service = await service_service_1.ServiceService.update(id, data);
            res.json(service);
        }
        catch (err) {
            next(err);
        }
    }
    static async remove(req, res, next) {
        try {
            const id = Number(req.params.id);
            await service_service_1.ServiceService.remove(id);
            res.status(204).send();
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ServiceController = ServiceController;
