"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedProfessionals = seedProfessionals;
// src/seed/professional.seed.ts
const prisma_1 = __importDefault(require("../core/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const media_1 = require("../core/config/media");
async function seedProfessionals() {
    const cardiologia = await prisma_1.default.specialty.findUnique({
        where: { name: "Cardiología" },
    });
    const pediatria = await prisma_1.default.specialty.findUnique({
        where: { name: "Pediatría" },
    });
    if (!cardiologia || !pediatria) {
        console.error("[SEED] Las especialidades necesarias no existen. Crea primero specialties.");
        return;
    }
    const professionals = [
        {
            email: "juan.cardiologo@test.com",
            password: "Profesional123",
            name: "Juan",
            lastName: "Perez",
            phone: "555123456",
            specialtyId: cardiologia.id,
            description: "Especialista en cardiología con 10 años de experiencia",
            services: [
                {
                    name: "Consulta Cardiológica",
                    description: "Evaluación completa del corazón",
                    durationMin: 60,
                    price: 80,
                },
                {
                    name: "Electrocardiograma",
                    description: "Prueba de ECG rápida",
                    durationMin: 30,
                    price: 40,
                },
            ],
        },
        {
            email: "ana.pediatra@test.com",
            password: "Profesional123",
            name: "Ana",
            lastName: "Gomez",
            phone: "555987654",
            specialtyId: pediatria.id,
            description: "Pediatra dedicada al cuidado infantil",
            services: [
                {
                    name: "Consulta Pediátrica",
                    description: "Revisión general del niño",
                    durationMin: 45,
                    price: 50,
                },
            ],
        },
    ];
    for (const prof of professionals) {
        try {
            const existingUser = await prisma_1.default.user.findUnique({
                where: { email: prof.email },
                include: {
                    professionalProfile: {
                        include: {
                            services: true,
                            specialties: true,
                        },
                    },
                },
            });
            const hashedPassword = await bcrypt_1.default.hash(prof.password, 10);
            // ======================================================
            // 🔹 CREAR PROFESIONAL SI NO EXISTE
            // ======================================================
            if (!existingUser) {
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
                                description: prof.description,
                                verificationStatus: "APPROVED",
                                specialties: {
                                    create: {
                                        specialtyId: prof.specialtyId,
                                        status: "APPROVED",
                                    },
                                },
                                services: {
                                    create: prof.services.map((s) => ({
                                        ...s,
                                        specialtyId: prof.specialtyId,
                                    })),
                                },
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
                });
                console.log(`[SEED] Profesional creado: ${prof.email} ✅`);
                continue;
            }
            // ======================================================
            // 🔹 SI YA EXISTE → TRABAJAR SOBRE PROFILE
            // ======================================================
            const profile = existingUser.professionalProfile;
            if (!profile) {
                console.log(`[SEED] Usuario sin perfil profesional: ${prof.email}`);
                continue;
            }
            // 1️⃣ Asegurar que tenga la especialidad
            const existingRelation = profile.specialties.find((s) => s.specialtyId === prof.specialtyId);
            if (!existingRelation) {
                await prisma_1.default.professionalSpecialty.create({
                    data: {
                        professionalId: profile.id,
                        specialtyId: prof.specialtyId,
                        status: "APPROVED",
                    },
                });
                console.log(`[SEED] Especialidad agregada al profesional: ${prof.email}`);
            }
            // 2️⃣ Asegurar que la especialidad esté APPROVED
            if (existingRelation &&
                existingRelation.status !== "APPROVED") {
                await prisma_1.default.professionalSpecialty.update({
                    where: {
                        professionalId_specialtyId: {
                            professionalId: profile.id,
                            specialtyId: prof.specialtyId,
                        },
                    },
                    data: { status: "APPROVED" },
                });
                console.log(`[SEED] Especialidad aprobada para profesional: ${prof.email}`);
            }
            // 3️⃣ Agregar servicios faltantes
            const existingServiceNames = profile.services.map((s) => s.name);
            const servicesToCreate = prof.services.filter((s) => !existingServiceNames.includes(s.name));
            if (servicesToCreate.length > 0) {
                await prisma_1.default.service.createMany({
                    data: servicesToCreate.map((s) => ({
                        ...s,
                        profileId: profile.id,
                        specialtyId: prof.specialtyId,
                        isActive: true,
                    })),
                });
                console.log(`[SEED] Servicios agregados a profesional existente: ${prof.email} ✅`);
            }
            else {
                console.log(`[SEED] Profesional ya tiene todos los servicios: ${prof.email} ⚠️`);
            }
        }
        catch (error) {
            console.error(`[SEED] Error creando/actualizando profesional ${prof.email}:`, error);
        }
    }
}
