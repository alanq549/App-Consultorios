"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedProfessionals = seedProfessionals;
// src/seed/professional.seed.ts
const prisma_1 = __importDefault(require("../core/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const media_1 = require("@/core/config/media");
async function seedProfessionals() {
    // Asegúrate de que las especialidades ya estén creadas
    const cardiologia = await prisma_1.default.specialty.findUnique({ where: { name: "Cardiología" } });
    const pediatria = await prisma_1.default.specialty.findUnique({ where: { name: "Pediatría" } });
    if (!cardiologia || !pediatria) {
        console.error("[SEED] Las especialidades necesarias no existen. Crea primero specialties.");
        return;
    }
    const professionals = [
        {
            email: "juan.cardiologo@test.com",
            password: "Profesional123*",
            name: "Juan",
            lastName: "Perez",
            phone: "555123456",
            specialtyId: cardiologia.id,
            description: "Especialista en cardiología con 10 años de experiencia",
            services: [
                { name: "Consulta Cardiológica", description: "Evaluación completa del corazón", durationMin: 60, price: 80 },
                { name: "Electrocardiograma", description: "Prueba de ECG rápida", durationMin: 30, price: 40 },
            ],
        },
        {
            email: "ana.pediatra@test.com",
            password: "Profesional123*",
            name: "Ana",
            lastName: "Gomez",
            phone: "555987654",
            specialtyId: pediatria.id,
            description: "Pediatra dedicada al cuidado infantil",
            services: [
                { name: "Consulta Pediátrica", description: "Revisión general del niño", durationMin: 45, price: 50 },
            ],
        },
    ];
    for (const prof of professionals) {
        try {
            const existingUser = await prisma_1.default.user.findUnique({ where: { email: prof.email } });
            if (existingUser) {
                console.log(`[SEED] Profesional ya existe: ${prof.email} ⚠️`);
                continue;
            }
            const hashedPassword = await bcrypt_1.default.hash(prof.password, 10);
            await prisma_1.default.user.create({
                data: {
                    email: prof.email,
                    password: hashedPassword,
                    role: "PROFESSIONAL",
                    isVerified: true,
                    professionalProfile: {
                        create: {
                            name: prof.name,
                            lastName: prof.lastName,
                            phone: prof.phone,
                            avatar: media_1.DEFAULT_AVATAR,
                            specialtyId: prof.specialtyId,
                            description: prof.description,
                            isVerified: true,
                            // Crear servicios directamente
                            services: {
                                create: prof.services,
                            },
                        },
                    },
                    // Configuración del usuario
                    customConfig: {
                        create: {
                            theme: "LIGHT",
                            language: "ES",
                            layout: "SIDEBAR",
                            notificationsEnabled: true,
                        },
                    },
                },
            });
            console.log(`[SEED] Profesional creado con servicios y config: ${prof.email} ✅`);
        }
        catch (error) {
            console.error(`[SEED] Error creando profesional ${prof.email}:`, error);
        }
    }
}
