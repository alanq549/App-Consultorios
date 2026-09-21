"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceController = void 0;
const service_service_1 = require("./service.service");
const service_dto_1 = require("./service.dto");
class ServiceController {
    static async create(req, res, next) {
        console.log("🔥 ENTRO AL CONTROLLER");
        try {
            const profileId = await service_service_1.ServiceService.getProfileIdByUser(req.user.id);
            const data = service_dto_1.CreateServiceSchema.parse(req.body);
            const service = await service_service_1.ServiceService.create(profileId, data);
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
            const profileId = await service_service_1.ServiceService.getProfileIdByUser(req.user.id);
            const service = await service_service_1.ServiceService.update(id, profileId, data);
            res.json(service);
        }
        catch (err) {
            next(err);
        }
    }
    static async remove(req, res, next) {
        try {
            const id = Number(req.params.id);
            const profileId = await service_service_1.ServiceService.getProfileIdByUser(req.user.id);
            await service_service_1.ServiceService.remove(id, profileId);
            res.status(204).send();
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ServiceController = ServiceController;
