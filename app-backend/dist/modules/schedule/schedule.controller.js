"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleController = void 0;
const prisma_1 = __importDefault(require("@/core/prisma"));
const schedule_service_1 = require("./schedule.service");
const schedule_dto_1 = require("./schedule.dto");
class ScheduleController {
    static async create(req, res, next) {
        try {
            const professionalProfile = await prisma_1.default.professionalProfile.findUnique({
                where: { userId: req.user.id },
            });
            if (!professionalProfile) {
                throw new Error("Perfil profesional no existe");
            }
            const data = schedule_dto_1.CreateScheduleSchema.parse(req.body);
            const schedule = await schedule_service_1.ScheduleService.create(professionalProfile.id, data);
            res.status(201).json(schedule);
        }
        catch (err) {
            next(err);
        }
    }
    static async listByProfessional(req, res, next) {
        try {
            const profileId = Number(req.params.profileId);
            const schedules = await schedule_service_1.ScheduleService.findByProfessional(profileId);
            res.json(schedules);
        }
        catch (err) {
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const id = Number(req.params.id);
            const data = schedule_dto_1.UpdateScheduleSchema.parse(req.body);
            const schedule = await schedule_service_1.ScheduleService.update(id, data);
            res.json(schedule);
        }
        catch (err) {
            next(err);
        }
    }
    static async remove(req, res, next) {
        try {
            const id = Number(req.params.id);
            await schedule_service_1.ScheduleService.remove(id);
            res.status(204).send();
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ScheduleController = ScheduleController;
