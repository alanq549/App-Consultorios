"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfessionalSpecialtyService = void 0;
const prisma_1 = __importDefault(require("../../../core/prisma"));
const notifications_service_1 = require("../../../modules/notifications/notifications.service");
class ProfessionalSpecialtyService {
    /// metodo para que el profesional agregue una especialidad a su perfil, el estado inicial de la especialidad es PENDING
    static async requestSpecialty(professionalId, specialtyId) {
        return prisma_1.default.$transaction(async (tx) => {
            // 1️⃣ verificar especialidad
            const specialty = await tx.specialty.findUnique({
                where: { id: specialtyId }
            });
            if (!specialty || !specialty.isActive) {
                throw new Error("La especialidad no existe o está desactivada");
            }
            // 2️⃣ verificar si ya existe relación
            const existing = await tx.professionalSpecialty.findUnique({
                where: {
                    professionalId_specialtyId: {
                        professionalId,
                        specialtyId
                    }
                }
            });
            if (existing) {
                throw new Error("El profesional ya solicitó esta especialidad");
            }
            // 3️⃣ limitar pendientes
            const pendingCount = await tx.professionalSpecialty.count({
                where: {
                    professionalId,
                    status: "PENDING"
                }
            });
            if (pendingCount >= 2) {
                throw new Error("No puedes solicitar más de 2 especialidades pendientes");
            }
            // 4️⃣ crear solicitud
            const relation = await tx.professionalSpecialty.create({
                data: {
                    professionalId,
                    specialtyId,
                    status: "PENDING"
                }
            });
            /// mandar notificacion al profesional de que su solicitud fue enviada
            await notifications_service_1.NotificationService.notifySpecialtyRequested(professionalId);
            return relation;
        });
    }
    /// metodo para que el admin valide o rechace una especialidad asignada a un profesional, si el admin rechaza una especialidad, se verifica si el profesional tiene otras especialidades aprobadas, si no tiene ninguna se cambia el estado del perfil profesional a SUSPENDED
    static async setSpecialtyStatus(professionalId, specialtyId, newStatus) {
        const result = await prisma_1.default.$transaction(async (tx) => {
            const relation = await tx.professionalSpecialty.findUnique({
                where: {
                    professionalId_specialtyId: {
                        professionalId,
                        specialtyId,
                    },
                },
            });
            if (!relation) {
                throw new Error("La especialidad no está asignada al profesional");
            }
            const updated = await tx.professionalSpecialty.update({
                where: {
                    professionalId_specialtyId: {
                        professionalId,
                        specialtyId,
                    },
                },
                data: {
                    status: newStatus,
                    reviewedAt: new Date(),
                },
            });
            const remainingApproved = await tx.professionalSpecialty.count({
                where: {
                    professionalId,
                    status: "APPROVED",
                },
            });
            let profileSuspended = false;
            if (remainingApproved === 0) {
                await tx.professionalProfile.update({
                    where: { id: professionalId },
                    data: { verificationStatus: "SUSPENDED" },
                });
                profileSuspended = true;
            }
            return { updated, profileSuspended };
        });
        // 🔔 NOTIFICACIONES FUERA DE TRANSACCIÓN (IMPORTANTE)
        if (newStatus === "APPROVED") {
            await notifications_service_1.NotificationService.notifySpecialtyApproved(professionalId);
        }
        if (newStatus === "REJECTED") {
            await notifications_service_1.NotificationService.notifySpecialtyRejected(professionalId);
        }
        if (result.profileSuspended) {
            // podrías tener una notificación más específica
            // o reutilizar una genérica
            await notifications_service_1.NotificationService.notifyProfileSuspended(professionalId);
        }
        return { success: true };
    }
}
exports.ProfessionalSpecialtyService = ProfessionalSpecialtyService;
