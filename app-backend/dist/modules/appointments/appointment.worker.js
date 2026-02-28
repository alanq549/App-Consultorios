"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentQueue = void 0;
const prisma_1 = __importDefault(require("../../core/prisma"));
const bullmq_1 = require("bullmq");
const connection = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: (process.env.REDIS_PASSWORD),
};
exports.appointmentQueue = new bullmq_1.Queue("appointments", { connection });
new bullmq_1.Worker("appointments", async (job) => {
    if (job.name.startsWith("cancel")) {
        await prisma_1.default.appointment.update({
            where: { id: job.data.id },
            data: { status: "CANCELLED" },
        });
    }
    if (job.name.startsWith("complete")) {
        await prisma_1.default.appointment.update({
            where: { id: job.data.id },
            data: { status: "COMPLETED" },
        });
    }
}, { connection });
console.log("🟢 Worker de citas iniciado, escuchando jobs...");
