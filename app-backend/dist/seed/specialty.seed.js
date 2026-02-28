"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSpecialties = seedSpecialties;
// src/seed/specialty.seed.ts
const prisma_1 = __importDefault(require("../core/prisma"));
async function seedSpecialties() {
    const specialties = [
        { name: "Cardiología", description: "Especialidad médica del corazón y el sistema circulatorio" },
        { name: "Dermatología", description: "Diagnóstico y tratamiento de enfermedades de la piel" },
        { name: "Pediatría", description: "Atención médica para niños y adolescentes" },
        { name: "Odontología", description: "Salud bucal y cuidado de los dientes" },
        { name: "Psicología", description: "Tratamiento de trastornos mentales y emocionales" },
    ];
    for (const specialty of specialties) {
        try {
            await prisma_1.default.specialty.upsert({
                where: { name: specialty.name },
                update: {}, // si ya existe, no hagas nada
                create: {
                    name: specialty.name,
                    description: specialty.description,
                },
            });
            console.log(`[SEED] Specialty creada: ${specialty.name} ✅`);
        }
        catch (error) {
            console.error(`[SEED] Error creando specialty ${specialty.name}:`, error);
        }
    }
}
