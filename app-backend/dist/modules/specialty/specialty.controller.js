"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialtyController = void 0;
const specialty_dto_1 = require("./specialty.dto");
const specialty_service_1 = require("./specialty.service");
class SpecialtyController {
    static async create(req, res) {
        const data = specialty_dto_1.CreateSpecialtySchema.parse(req.body);
        const specialty = await specialty_service_1.SpecialtyService.create(data);
        res.status(201).json(specialty);
    }
    static async list(req, res) {
        const specialties = await specialty_service_1.SpecialtyService.list();
        res.json(specialties);
    }
    static async list_soft_delete(req, res) {
        const specialties = await specialty_service_1.SpecialtyService.list_soft_delete();
        res.status(200).json(specialties);
    }
    static async listByProfessional(req, res) {
        const profileId = Number(req.params.profileId);
        const specialties = await specialty_service_1.SpecialtyService.listByProfessional(profileId);
        res.json(specialties);
    }
    static async update(req, res) {
        const id = Number(req.params.id);
        const data = specialty_dto_1.UpdateSpecialtySchema.parse(req.body);
        const specialty = await specialty_service_1.SpecialtyService.update(id, data);
        res.json(specialty);
    }
    static async restore(req, res) {
        const id = Number(req.params.id);
        const specialty = await specialty_service_1.SpecialtyService.restore(id);
        res.json(specialty);
    }
    static async remove(req, res) {
        const id = Number(req.params.id);
        await specialty_service_1.SpecialtyService.remove(id);
        res.status(204).send();
    }
}
exports.SpecialtyController = SpecialtyController;
