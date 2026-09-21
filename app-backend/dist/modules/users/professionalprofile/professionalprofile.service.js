"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfessionalProfileService = void 0;
// src/modules/users/professionalprofile/professionalprofile.service.ts
const prisma_1 = __importDefault(require("../../../core/prisma"));
const client_1 = require("@prisma/client");
const notifications_service_1 = require("../../../modules/notifications/notifications.service");
class ProfessionalProfileService {
    static async findByUserId(userId) {
        return prisma_1.default.professionalProfile.findUnique({
            where: { userId },
        });
    }
    static async me(userId) {
        const profile = await prisma_1.default.professionalProfile.findUnique({
            where: { userId },
            include: {
                specialties: {
                    include: { specialty: true },
                },
                socialLinks: {
                    where: {
                        type: {
                            in: ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "WEBSITE"],
                        },
                    },
                },
                certificates: true,
            },
        });
        if (!profile)
            throw new Error("Perfil profesional no existe");
        const { id, name, lastName, phone, avatar, description, verificationStatus, specialties, socialLinks, certificates, } = profile;
        return {
            id,
            name,
            lastName,
            phone,
            avatar,
            description,
            ratingAvg: profile.ratingAvg,
            ratingCount: profile.ratingCount,
            verificationStatus,
            specialties: specialties.map((ps) => ({
                id: ps.specialty.id,
                name: ps.specialty.name,
                description: ps.specialty.description,
                status: ps.status,
            })),
            socialLinks: socialLinks.map((link) => ({
                id: link.id,
                type: link.type,
                url: link.url,
            })),
            certificates: certificates.map((cert) => ({
                id: cert.id,
                name: cert.name,
                issuedBy: cert.issuedBy,
                issuedDate: cert.issuedDate,
                fileUrl: cert.fileUrl,
            })),
        };
    }
    static async getPublicById(profileId) {
        const profile = await prisma_1.default.professionalProfile.findUnique({
            where: { id: profileId },
            include: {
                specialties: {
                    where: { status: client_1.SpecialtyStatus.APPROVED },
                    include: { specialty: true },
                },
                certificates: true,
                socialLinks: true,
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
            verificationStatus: profile.verificationStatus,
            ratingAvg: profile.ratingAvg,
            ratingCount: profile.ratingCount,
            socialLinks: profile.socialLinks,
            certificates: profile.certificates.map((c) => ({
                title: c.name,
                fileUrl: c.fileUrl,
            })),
            specialties: profile.specialties.map((ps) => ({
                id: ps.specialty.id,
                name: ps.specialty.name,
                description: ps.specialty.description,
            })),
        };
    }
    // ✅ NUEVO: listar todos los perfiles aprobados con su información pública
    static async getAllPublic() {
        const profiles = await prisma_1.default.professionalProfile.findMany({
            where: {
                verificationStatus: "APPROVED",
            },
            include: {
                specialties: {
                    where: { status: client_1.SpecialtyStatus.APPROVED },
                    include: { specialty: true },
                },
                socialLinks: true,
            },
        });
        return profiles.map((profile) => ({
            id: profile.id,
            name: profile.name,
            lastName: profile.lastName,
            avatar: profile.avatar,
            description: profile.description,
            socialLinks: profile.socialLinks,
            verificationStatus: profile.verificationStatus,
            ratingAvg: profile.ratingAvg,
            ratingCount: profile.ratingCount,
            specialties: profile.specialties.map((ps) => ({
                id: ps.specialty.id,
                name: ps.specialty.name,
                description: ps.specialty.description,
            })),
        }));
    }
    // listar a todos los perfiles (solo para admin)
    static async getAllProfiles() {
        return prisma_1.default.professionalProfile.findMany({
            include: {
                specialties: {
                    include: { specialty: true },
                },
                socialLinks: true,
            },
        });
    }
    /// listar a los perfiles pendientes de aprobación (solo para admin)
    static async getPendingProfiles() {
        return prisma_1.default.professionalProfile.findMany({
            where: { verificationStatus: "PENDING" },
            include: {
                specialties: {
                    where: { status: client_1.SpecialtyStatus.APPROVED },
                    include: { specialty: true },
                },
            },
        });
    }
    // suspender o reactivar un perfil (solo para admin)
    static async setProfileStatus(profileId, newStatus) {
        const profile = await prisma_1.default.professionalProfile.findUnique({
            where: { id: profileId },
        });
        if (!profile) {
            throw new Error("Perfil profesional no encontrado");
        }
        const oldStatus = profile.verificationStatus;
        if (oldStatus === newStatus) {
            return profile;
        }
        const allowedTransitions = {
            PENDING: ["APPROVED", "REJECTED"],
            APPROVED: ["SUSPENDED"],
            SUSPENDED: ["APPROVED"],
            REJECTED: [],
        };
        if (!allowedTransitions[oldStatus].includes(newStatus)) {
            throw new Error(`Transición inválida de ${oldStatus} a ${newStatus}`);
        }
        if (newStatus === "APPROVED") {
            const approvedSpecialties = await prisma_1.default.professionalSpecialty.count({
                where: {
                    professionalId: profileId,
                    status: "APPROVED",
                },
            });
            if (approvedSpecialties === 0) {
                throw new Error("El perfil no puede aprobarse sin al menos una especialidad aprobada");
            }
        }
        const updated = await prisma_1.default.professionalProfile.update({
            where: { id: profileId },
            data: { verificationStatus: newStatus },
        });
        // 🔔 NOTIFICACIONES (SIDE EFFECT)
        if (newStatus === "APPROVED") {
            await notifications_service_1.NotificationService.notifyProfileApproved(profile.userId);
        }
        if (newStatus === "REJECTED") {
            await notifications_service_1.NotificationService.notifyProfileRejected(profile.userId);
        }
        if (newStatus === "SUSPENDED") {
            await notifications_service_1.NotificationService.notifyProfileSuspended(profile.userId);
        }
        return updated;
    }
    /// actualizar perfil
    static async updateProfile(userId, data) {
        const hasValidField = Object.values(data).some((v) => v !== undefined);
        if (!hasValidField) {
            throw new Error("No hay campos para actualizar");
        }
        const profile = await prisma_1.default.professionalProfile.update({
            where: { userId },
            data,
        });
        return {
            id: profile.id,
            name: profile.name,
            lastName: profile.lastName,
            phone: profile.phone,
            description: profile.description,
        };
    }
    //crear socialLInks
    static async createSocialLink(userId, data) {
        const profile = await prisma_1.default.professionalProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new Error("Profile no existe");
        return prisma_1.default.socialLink.create({
            data: {
                ...data,
                profileId: profile.id,
            },
        });
    }
    // actualizar socialLinks :
    static async updateSocialLink(userId, socialLinkId, data) {
        const profile = await prisma_1.default.professionalProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new Error("Profile no existe");
        const link = await prisma_1.default.socialLink.findUnique({
            where: { id: socialLinkId },
        });
        if (!link || link.profileId !== profile.id) {
            throw new Error("No autorizado");
        }
        return prisma_1.default.socialLink.update({
            where: { id: socialLinkId },
            data,
        });
    }
    // Eliminar socialLinks:
    static async deleteSocialLink(userId, socialLinkId) {
        const profile = await prisma_1.default.professionalProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new Error("Profile no existe");
        const link = await prisma_1.default.socialLink.findUnique({
            where: { id: socialLinkId },
        });
        if (!link || link.profileId !== profile.id) {
            throw new Error("No autorizado");
        }
        await prisma_1.default.socialLink.delete({
            where: { id: socialLinkId },
        });
        return { message: "Social link eliminada" };
    }
    static async createCertificate(userId, data) {
        const profile = await prisma_1.default.professionalProfile.findUnique({
            where: { userId },
        });
        if (!profile) {
            throw new Error("Profile not found");
        }
        return prisma_1.default.certificate.create({
            data: {
                ...data,
                profileId: profile.id,
            },
        });
    }
    // Eliminar certificados :
    static async deleteCertificate(userId, certificateId) {
        const profile = await prisma_1.default.professionalProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new Error("Profile no existe");
        const certificate = await prisma_1.default.certificate.findUnique({
            where: { id: certificateId },
        });
        if (!certificate || certificate.profileId !== profile.id) {
            throw new Error("No autorizado");
        }
        await prisma_1.default.certificate.delete({
            where: { id: certificateId },
        });
        return { message: "Certificado eliminado" };
    }
    static async reviewProfile(profileId, status) {
        const profile = await prisma_1.default.professionalProfile.findUnique({
            where: { id: profileId },
        });
        if (!profile) {
            throw new Error("Profile not found");
        }
        if (profile.verificationStatus === status) {
            return profile;
        }
        const updated = await prisma_1.default.professionalProfile.update({
            where: { id: profileId },
            data: { verificationStatus: status },
        });
        if (status === "APPROVED") {
            await notifications_service_1.NotificationService.notifyProfileApproved(profile.userId);
        }
        if (status === "REJECTED") {
            await notifications_service_1.NotificationService.notifyProfileRejected(profile.userId);
        }
        return updated;
    }
}
exports.ProfessionalProfileService = ProfessionalProfileService;
