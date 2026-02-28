"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfessionalProfileService = void 0;
// src/modules/users/professionalprofile/professionalprofile.service.ts
const prisma_1 = __importDefault(require("@/core/prisma"));
class ProfessionalProfileService {
    static async getPublicById(profileId) {
        const profile = await prisma_1.default.professionalProfile.findUnique({
            where: { id: profileId },
            include: {
                specialty: true,
            },
        });
        if (!profile)
            return null;
        return {
            id: profile.id,
            name: profile.name,
            lastName: profile.lastName,
            avatar: profile.avatar,
            description: profile.description,
            isVerified: profile.isVerified,
            specialty: {
                id: profile.specialty.id,
                name: profile.specialty.name,
                description: profile.specialty.description,
            },
        };
    }
    // ✅ NUEVO: listar todos los perfiles públicos
    static async getAllPublic() {
        const profiles = await prisma_1.default.professionalProfile.findMany({
            include: {
                specialty: true,
            },
        });
        return profiles.map((profile) => ({
            id: profile.id,
            name: profile.name,
            lastName: profile.lastName,
            avatar: profile.avatar,
            description: profile.description,
            isVerified: profile.isVerified,
            specialty: {
                id: profile.specialty.id,
                name: profile.specialty.name,
                description: profile.specialty.description,
            },
        }));
    }
}
exports.ProfessionalProfileService = ProfessionalProfileService;
