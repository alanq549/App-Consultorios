"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedClients = seedClients;
// src/seed/client.seed.ts
const prisma_1 = __importDefault(require("../core/prisma"));
const client_1 = require("@prisma/client"); // enums
const bcrypt_1 = __importDefault(require("bcrypt"));
const media_1 = require("../core/config/media");
async function seedClients() {
    const clients = [
        {
            email: "maria.cliente@test.com",
            password: "Cliente123",
            name: "Maria",
            lastName: "Lopez",
            phone: "555111222",
            appointments: [
                {
                    serviceName: "Consulta Cardiológica",
                    professionalEmail: "juan.cardiologo@test.com",
                    date: new Date(Date.now() + 86400000),
                    startMin: 600,
                    endMin: 660,
                    status: client_1.AppointmentStatus.CONFIRMED,
                    payment: client_1.PaymentStatus.CONFIRMED,
                    review: { rating: 5, comment: "Excelente atención!" },
                },
            ],
        },
        {
            email: "carlos.cliente@test.com",
            password: "Cliente123",
            name: "Carlos",
            lastName: "Ramirez",
            phone: "555333444",
            appointments: [
                {
                    serviceName: "Consulta Pediátrica",
                    professionalEmail: "ana.pediatra@test.com",
                    date: new Date(Date.now() + 172800000),
                    startMin: 540,
                    endMin: 585,
                    status: client_1.AppointmentStatus.PENDING,
                    payment: client_1.PaymentStatus.PENDING,
                },
            ],
        },
    ];
    for (const client of clients) {
        try {
            const existingUser = await prisma_1.default.user.findUnique({ where: { email: client.email } });
            if (existingUser) {
                console.log(`[SEED] Cliente ya existe: ${client.email} ⚠️`);
                continue;
            }
            const hashedPassword = await bcrypt_1.default.hash(client.password, 10);
            // Crear usuario y profile del cliente
            const user = await prisma_1.default.user.create({
                data: {
                    email: client.email,
                    password: hashedPassword,
                    role: "CLIENT",
                    isVerified: true,
                    clientProfile: {
                        create: {
                            name: client.name,
                            lastName: client.lastName,
                            phone: client.phone,
                            avatar: media_1.DEFAULT_AVATAR,
                        },
                    },
                    customConfig: {
                        create: {
                            theme: "LIGHT",
                            language: "ES",
                            layout: "SIDEBAR",
                            notificationsEnabled: true,
                        },
                    },
                },
                include: { clientProfile: true }, // 🔹 Importante para usar clientProfile!.id
            });
            // Crear citas y reviews
            for (const app of client.appointments) {
                const professional = await prisma_1.default.professionalProfile.findFirst({
                    where: { user: { email: app.professionalEmail } },
                });
                if (!professional) {
                    console.log(`[SEED] Profesional no encontrado: ${app.professionalEmail}`);
                    continue;
                }
                const service = await prisma_1.default.service.findFirst({
                    where: { name: app.serviceName, profileId: professional.id },
                });
                if (!service) {
                    console.log(`[SEED] Servicio no encontrado: ${app.serviceName}`);
                    continue;
                }
                if (!user.clientProfile) {
                    console.log(`[SEED] Error: clientProfile no creado para ${client.email}`);
                    continue;
                }
                const appointment = await prisma_1.default.appointment.create({
                    data: {
                        clientProfileId: user.clientProfile.id,
                        professionalProfileId: professional.id,
                        serviceId: service.id,
                        date: app.date,
                        startMin: app.startMin,
                        endMin: app.endMin,
                        status: app.status,
                        payment: app.payment,
                        notes: app.notes ?? null,
                    },
                });
                if (app.review) {
                    await prisma_1.default.review.create({
                        data: {
                            appointmentId: appointment.id,
                            rating: app.review.rating,
                            comment: app.review.comment,
                        },
                    });
                }
                // Crear notificación de cita
                await prisma_1.default.notification.create({
                    data: {
                        userId: user.id,
                        appointmentId: appointment.id,
                        title: `Nueva cita ${app.status}`,
                        message: `Tienes una cita con ${professional.name} ${professional.lastName} el ${appointment.date.toLocaleString()}`,
                        type: "APPOINTMENT_CREATED",
                    },
                });
            }
            console.log(`[SEED] Cliente creado con citas y config: ${client.email} ✅`);
        }
        catch (error) {
            console.error(`[SEED] Error creando cliente ${client.email}:`, error);
        }
    }
}
