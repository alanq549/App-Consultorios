"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdmin = seedAdmin;
// src/seed/admin.seed.ts
const prisma_1 = __importDefault(require("../core/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const media_1 = require("@/core/config/media");
async function seedAdmin() {
    const adminEmail = "admin@test.com";
    const adminExists = await prisma_1.default.user.findUnique({
        where: { email: adminEmail },
    });
    if (adminExists) {
        console.log("[SEED] Admin ya existe ⚠️"); // le puse aqui un 2 para diferenciar de otro mensaje similar, y resulto ser el mismo
        return;
    }
    const hashedPassword = await bcrypt_1.default.hash("Admin123*", 10);
    await prisma_1.default.user.upsert({
        where: { email: adminEmail },
        update: {}, // si existe, no hagas nada
        create: {
            email: adminEmail,
            password: hashedPassword,
            role: "ADMIN",
            isVerified: true,
            adminProfile: {
                create: {
                    name: "Admin",
                    lastName: "Principal",
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
    });
    console.log("[SEED] Admin creado con perfil y config ✅");
}
